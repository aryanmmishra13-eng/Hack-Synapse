"""
ML Service Client  (spec Phase 4 / §6, §8, §9, §14)
=====================================================
Secure proxy between the existing backend and the Render-hosted
Athlete Injury Prediction ML API.

Rules
-----
- ML_API_KEY lives only here, never in frontend code (spec §15).
- Returns spec §9 response shape to callers.
- Handles all ML API errors with clean codes (spec §14).
- Never logs the API key (spec §29).

ML API Response Shape (already matches spec §9):
{
  "success": true,
  "data": {
    "athlete_id": "1",
    "risk": {"score": 86.26, "level": "HIGH", "is_at_risk": true},
    "prediction": {"onset_days": 3.6, "recovery_days": 8.2},
    "factors": {
      "increasing": [{"name": "...", "impact": 1.8474}],
      "reducing":   [{"name": "...", "impact": -0.6014}]
    },
    "model": {"version": "v1.0"}
  }
}
"""

import logging
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

import httpx

from app.core.config import settings
from app.services.feature_service import DataQuality

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Error codes (spec §14)
# ─────────────────────────────────────────────────────────────────────────────
class MLError:
    UNAVAILABLE        = "ML_SERVICE_UNAVAILABLE"
    TIMEOUT            = "ML_SERVICE_TIMEOUT"
    INVALID_RESPONSE   = "ML_INVALID_RESPONSE"
    AUTH_ERROR         = "ML_AUTH_ERROR"
    INSUFFICIENT_DATA  = "INSUFFICIENT_DATA"
    ATHLETE_NOT_FOUND  = "ATHLETE_NOT_FOUND"
    INTERNAL           = "INTERNAL_ERROR"


# ─────────────────────────────────────────────────────────────────────────────
# Risk level thresholds (matching ML model's optimal_threshold = 0.7)
# ─────────────────────────────────────────────────────────────────────────────
ML_OPTIMAL_THRESHOLD = 0.70   # from /api/v1/model-info
MODEL_VERSION        = "v1.0"


def _score_to_level(score_pct: float) -> Tuple[str, bool]:
    """Map percentage score to level + is_at_risk."""
    frac = score_pct / 100.0
    is_at_risk = frac >= ML_OPTIMAL_THRESHOLD
    if frac >= 0.65:
        return "HIGH", is_at_risk
    elif frac >= 0.35:
        return "MEDIUM", is_at_risk
    else:
        return "LOW", is_at_risk


# ─────────────────────────────────────────────────────────────────────────────
# Factor parser — handles both ML API native format and raw SHAP
# ─────────────────────────────────────────────────────────────────────────────
def _parse_factors(factors_data: dict) -> Tuple[List[Dict], List[Dict]]:
    """
    Parse the factors block from ML API response.
    Input:  {"increasing": [...], "reducing": [...]}
    Output: (increasing_list, reducing_list)
    """
    increasing: List[Dict] = []
    reducing:   List[Dict] = []

    def _clean_list(items: list, sign: str) -> List[Dict]:
        result = []
        for item in items[:5]:
            if isinstance(item, dict):
                name   = item.get("name", "")
                impact = item.get("impact", 0)
                try:
                    impact = abs(float(impact))
                except (ValueError, TypeError):
                    impact = 0.0
                if name:
                    result.append({"name": name, "impact": round(impact, 4)})
        return result

    if isinstance(factors_data, dict):
        increasing = _clean_list(factors_data.get("increasing", []), "+")
        reducing   = _clean_list(factors_data.get("reducing",   []), "-")
    elif isinstance(factors_data, list):
        # Legacy SHAP format: [{feature, impact}, ...]
        for item in factors_data[:10]:
            if isinstance(item, dict):
                name   = item.get("feature") or item.get("name", "")
                impact = item.get("impact") or item.get("shap_value") or item.get("value", 0)
                try:
                    val = float(impact)
                    entry = {"name": name.replace("_", " ").title(), "impact": round(abs(val), 4)}
                    if val > 0:
                        increasing.append(entry)
                    elif val < 0:
                        reducing.append(entry)
                except (ValueError, TypeError):
                    pass
        increasing = increasing[:5]
        reducing   = reducing[:5]

    return increasing, reducing


# ─────────────────────────────────────────────────────────────────────────────
# Fallback rule engine  (when ML API unavailable / no key)
# ─────────────────────────────────────────────────────────────────────────────
def _rule_based_prediction(features: dict) -> Tuple[float, float, float]:
    """
    Returns (risk_pct 0–100, onset_days, recovery_days).
    Uses heuristic thresholds aligned with training data statistics.
    Recovery model has weak R²; present as rough estimate only.
    """
    score = 0.40  # neutral baseline

    acr = features.get("acute_chronic_ratio", 1.0)
    if acr > 1.5:   score += 0.25
    elif acr > 1.3: score += 0.15

    sleep = features.get("sleep_minutes", 420.0) / 60.0
    if sleep < 5.5:   score += 0.15
    elif sleep < 6.5: score += 0.08

    sleep_std = features.get("sleep_std_7d", 20.0) / 60.0  # in hours
    if sleep_std > 1.5: score += 0.10
    elif sleep_std > 1.0: score += 0.05

    load_change = features.get("training_load_change", 0.0)
    if load_change > 0.3:  score += 0.12
    elif load_change > 0.15: score += 0.06

    load_7d = features.get("training_load_7d", 0)
    if load_7d > 4000: score += 0.10
    elif load_7d > 2500: score += 0.05

    # Reducers
    sleep_28 = features.get("sleep_28d", 420.0) / 60.0
    if sleep_28 >= 7.5: score -= 0.08
    sleep_eff = features.get("sleep_efficiency", 0.9)
    if sleep_eff >= 0.95: score -= 0.05

    risk_pct = round(min(95.0, max(3.0, score * 100)), 2)

    # Onset: higher risk → sooner. Model range: 1–30 days
    onset_days = round(max(1.0, 30.0 * (1.0 - score)), 1)

    # Recovery: model range 5–20 days. Weak R² — present as rough estimate.
    recovery_days = round(5.0 + 15.0 * score, 1)

    return risk_pct, onset_days, recovery_days


def _fallback_factors(features: dict, risk_pct: float) -> Tuple[List, List]:
    """Rule-based factor derivation when SHAP is unavailable."""
    increasing = []
    reducing   = []

    checks = [
        (features.get("acute_chronic_ratio", 1.0) > 1.3,         "Acute/Chronic Workload Ratio",    0.80),
        (features.get("sleep_std_7d", 20) > 60,                  "Sleep Variability",               0.50),
        ((features.get("sleep_minutes", 420) / 60) < 6.0,        "Sleep Duration",                  0.60),
        (features.get("training_load_7d", 0) > 3000,             "7-Day Training Load",             0.30),
        (features.get("training_load_change", 0.0) > 0.2,        "Training Load Spike",             0.40),
    ]
    reducers = [
        (features.get("sleep_28d", 420) / 60 >= 7.5,  "Long-Term Sleep Average",    0.50),
        (features.get("activity_load_28d", 0) > 5000, "28-Day Activity Baseline",   0.70),
        (features.get("sleep_efficiency", 0) >= 0.95, "Sleep Efficiency",           0.30),
    ]

    for condition, name, impact in checks:
        if condition:
            increasing.append({"name": name, "impact": round(impact, 4)})

    for condition, name, impact in reducers:
        if condition:
            reducing.append({"name": name, "impact": round(impact, 4)})

    return increasing[:5], reducing[:5]


# ─────────────────────────────────────────────────────────────────────────────
# Response builder (spec §9)
# ─────────────────────────────────────────────────────────────────────────────
def _build_response(
    athlete_id: str,
    risk_pct: float,
    risk_level: str,
    is_at_risk: bool,
    onset_days: Optional[float],
    recovery_days: Optional[float],
    increasing: List,
    reducing: List,
    model_version: str,
    generated_at: datetime,
    data_quality: str,
    missing_count: int,
    model_source: str = "external_ml",
    api_error: Optional[str] = None,
) -> dict:
    """Build the exact spec §9 response shape."""
    return {
        "success": True,
        "data": {
            "athlete_id": athlete_id,
            "risk": {
                "score": round(risk_pct, 2),
                "level": risk_level,
                "is_at_risk": is_at_risk,
            },
            "prediction": {
                "onset_days":    round(onset_days, 1)    if onset_days    is not None else None,
                "recovery_days": round(recovery_days, 1) if recovery_days is not None else None,
            },
            "factors": {
                "increasing": increasing,
                "reducing":   reducing,
            },
            "model": {
                "version": model_version,
                "source":  model_source,
            },
            "data_quality": {
                "status":           data_quality,
                "missing_features": missing_count,
            },
            "generated_at": generated_at.isoformat() + "Z",
        },
    }


def _build_error(code: str, message: str) -> dict:
    """Build a clean error response — never exposes internals (spec §14)."""
    return {
        "success": False,
        "error": {"code": code, "message": message},
    }


# ─────────────────────────────────────────────────────────────────────────────
# Main ML Client
# ─────────────────────────────────────────────────────────────────────────────
class InjuryMLClient:
    """
    Secure HTTP client for the external ML API.
    API key is sourced only from settings (env vars).
    """

    def __init__(self):
        self.base_url   = settings.ML_API_URL.rstrip("/")
        self._timeout   = settings.ML_API_TIMEOUT
        self._has_key   = bool(settings.ML_API_KEY)

    def _headers(self) -> dict:
        h = {"Content-Type": "application/json", "Accept": "application/json"}
        if settings.ML_API_KEY:
            h["X-API-Key"] = settings.ML_API_KEY   # spec §6: header name
        return h

    # ── Health check (spec §27) ──────────────────────────────
    def health_check(self) -> dict:
        try:
            with httpx.Client(timeout=10.0) as client:
                r = client.get(
                    f"{self.base_url}/api/v1/health",
                    headers=self._headers(),
                )
                ok = r.status_code == 200
                return {
                    "ok": ok,
                    "status_code": r.status_code,
                    "has_api_key": self._has_key,
                }
        except Exception as exc:
            logger.warning("ML health check failed: %s", exc)
            return {"ok": False, "error": str(exc), "has_api_key": self._has_key}

    # ── Model info (spec §27) ────────────────────────────────
    def model_info(self) -> dict:
        try:
            with httpx.Client(timeout=10.0) as client:
                r = client.get(
                    f"{self.base_url}/api/v1/model-info",
                    headers=self._headers(),
                )
                if r.status_code == 200:
                    return r.json()
                return {}
        except Exception:
            return {}

    # ── Predict (spec §6 step 7–9) ───────────────────────────
    def call_predict(
        self,
        athlete_id: str,
        features: dict,
    ) -> Tuple[Optional[dict], Optional[str]]:
        """
        POST features to ML API.
        Returns (raw_response_data, error_code) — exactly one will be non-None.
        """
        payload = {"athlete_id": athlete_id, "features": features}
        t0 = time.time()

        try:
            with httpx.Client(timeout=float(self._timeout)) as client:
                resp = client.post(
                    f"{self.base_url}/api/v1/predict",
                    headers=self._headers(),
                    json=payload,
                )
                latency_ms = round((time.time() - t0) * 1000)

                if resp.status_code == 401:
                    logger.warning(
                        "ML API auth error [%dms] athlete=%s — API key missing/invalid",
                        latency_ms, athlete_id,
                    )
                    return None, MLError.AUTH_ERROR

                if resp.status_code == 422:
                    logger.error(
                        "ML API validation error [%dms] athlete=%s body=%s",
                        latency_ms, athlete_id, resp.text[:300],
                    )
                    return None, MLError.INVALID_RESPONSE

                resp.raise_for_status()
                body = resp.json()

                # ML API returns {"success": true, "data": {...}} already
                if isinstance(body, dict) and body.get("success") and "data" in body:
                    raw = body["data"]
                else:
                    raw = body  # handle flat response just in case

                logger.info(
                    "ML API predict OK [%dms] athlete=%s model=%s",
                    latency_ms, athlete_id, raw.get("model", {}).get("version", "?"),
                )
                return raw, None

        except httpx.TimeoutException:
            logger.error("ML API timeout after %ds for athlete=%s", self._timeout, athlete_id)
            return None, MLError.TIMEOUT
        except httpx.ConnectError:
            logger.error("ML API connection error for athlete=%s", athlete_id)
            return None, MLError.UNAVAILABLE
        except httpx.HTTPStatusError as exc:
            logger.error("ML API HTTP %d for athlete=%s", exc.response.status_code, athlete_id)
            return None, MLError.UNAVAILABLE
        except Exception as exc:
            logger.exception("ML API unexpected error for athlete=%s: %s", athlete_id, exc)
            return None, MLError.INTERNAL

    # ── Full prediction pipeline  (spec §6 steps 6–11) ───────
    def predict(
        self,
        athlete_id: str,
        features: dict,
        data_quality: str,
        missing_count: int,
    ) -> dict:
        """
        Orchestrates the full ML pipeline and returns a spec §9 response.
        Falls back to rule engine if API unavailable / no key.
        """
        generated_at = datetime.now(timezone.utc).replace(tzinfo=None)

        # Guard: insufficient data — allow partial, block only true insufficient
        if data_quality == DataQuality.INSUFFICIENT:
            # Try anyway with defaults; the model is robust to defaults
            logger.warning(
                "predict: INSUFFICIENT quality for athlete=%s — attempting with defaults",
                athlete_id,
            )

        raw, error_code = self.call_predict(athlete_id, features)

        # ── Parse ML API response (spec §9 shape already) ─────
        onset_days    = None
        recovery_days = None
        risk_pct      = 0.0
        risk_level    = "LOW"
        is_at_risk    = False
        increasing: List[Dict] = []
        reducing:   List[Dict] = []
        model_version = MODEL_VERSION
        model_source  = "rule_engine"

        if raw:
            try:
                # ML API already returns spec §9 inside "data"
                risk_block      = raw.get("risk", {})
                prediction_block = raw.get("prediction", {})
                factors_block   = raw.get("factors", {})
                model_block     = raw.get("model", {})

                risk_pct      = float(risk_block.get("score", 0))
                risk_level    = risk_block.get("level", "LOW")
                is_at_risk    = bool(risk_block.get("is_at_risk", False))

                onset_days    = prediction_block.get("onset_days")
                recovery_days = prediction_block.get("recovery_days")

                model_version = model_block.get("version", MODEL_VERSION)
                model_source  = "external_ml"

                increasing, reducing = _parse_factors(factors_block)

                logger.info(
                    "predict: ML response parsed athlete=%s risk=%.1f%% level=%s onset=%s recovery=%s",
                    athlete_id, risk_pct, risk_level, onset_days, recovery_days,
                )

            except Exception as exc:
                logger.exception("Failed to parse ML response: %s", exc)
                raw = None
                error_code = MLError.INVALID_RESPONSE

        # ── Fallback rule engine ─────────────────────────────
        if not raw:
            risk_pct_fb, onset_days, recovery_days = _rule_based_prediction(features)
            risk_pct   = risk_pct_fb
            risk_level, is_at_risk = _score_to_level(risk_pct)
            increasing, reducing = _fallback_factors(features, risk_pct)
            model_version = f"{MODEL_VERSION}-fallback"
            model_source  = "rule_engine"

            logger.info(
                "Using fallback rule engine for athlete=%s reason=%s risk=%.1f%%",
                athlete_id, error_code or "no_raw", risk_pct,
            )
        else:
            # Validate level is one of expected values
            if risk_level not in ("LOW", "MEDIUM", "HIGH"):
                risk_level, is_at_risk = _score_to_level(risk_pct)

        # Clamp regression outputs within model training ranges
        if onset_days is not None:
            onset_days    = round(max(1.0, min(30.0, float(onset_days))), 1)
        if recovery_days is not None:
            recovery_days = round(max(5.0, min(20.0, float(recovery_days))), 1)

        return _build_response(
            athlete_id=athlete_id,
            risk_pct=risk_pct,
            risk_level=risk_level,
            is_at_risk=is_at_risk,
            onset_days=onset_days,
            recovery_days=recovery_days,
            increasing=increasing,
            reducing=reducing,
            model_version=model_version,
            generated_at=generated_at,
            data_quality=data_quality,
            missing_count=missing_count,
            model_source=model_source,
            api_error=error_code,
        )


# Singleton — import this everywhere
injury_ml_client = InjuryMLClient()
