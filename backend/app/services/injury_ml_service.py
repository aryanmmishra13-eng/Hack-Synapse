"""
Injury ML Service — proxy to the external Athlete Injury Prediction API.
Builds the 67-feature vector from available student data and handles fallback.
"""

import json
import httpx
from datetime import datetime, timezone
from typing import Optional

from app.core.config import settings


# ──────────────────────────────────────────────────────────────
# Feature keys expected by the remote model (67 total)
# We derive what we can from our DB; everything else defaults
# ──────────────────────────────────────────────────────────────
FEATURE_KEYS = [
    # Physical metrics
    "age", "height_cm", "weight_kg", "bmi",
    # Training load
    "training_hours_per_week", "sessions_per_week", "training_intensity",
    "weeks_of_training", "years_experience",
    # Recovery & fatigue
    "sleep_hours", "fatigue_score", "recovery_score", "rest_days_per_week",
    # Sport encoding
    "sport_badminton", "sport_football", "sport_basketball",
    "sport_tennis", "sport_volleyball", "sport_cricket", "sport_gym",
    # Skill level encoding
    "skill_beginner", "skill_intermediate", "skill_advanced",
    # Activity metrics (from our bookings)
    "bookings_last_30d", "bookings_last_7d", "no_show_rate",
    "avg_session_duration_min", "checkins_last_30d",
    # Performance scores (from assessments)
    "stamina_score", "speed_score", "agility_score",
    "strength_score", "endurance_score", "flexibility_score",
    "coordination_score", "balance_score",
    # Injury history flags
    "prior_injury_knee", "prior_injury_ankle", "prior_injury_shoulder",
    "prior_injury_back", "prior_injury_wrist", "prior_injury_count",
    # Environmental
    "is_indoor_sport", "plays_outdoor", "temp_celsius",
    "high_humidity", "plays_rainy_conditions",
    # Workload ratios
    "acute_chronic_workload_ratio", "monotony_score", "strain_score",
    "consecutive_training_days", "days_since_last_rest",
    # Biomechanics / form flags
    "poor_landing_technique", "asymmetric_movement", "muscle_imbalance",
    "joint_hypermobility", "overstriding",
    # Wellness & nutrition
    "hydration_score", "nutrition_score", "stress_level",
    "motivation_level", "pain_score",
    # Competition
    "recent_competition", "competition_frequency",
    "travel_in_last_week", "time_zone_changes",
    # Context
    "team_sport", "contact_sport", "high_impact_sport",
]

# Sport → one-hot key
SPORT_MAP = {
    "Badminton":   "sport_badminton",
    "Football":    "sport_football",
    "Basketball":  "sport_basketball",
    "Tennis":      "sport_tennis",
    "Volleyball":  "sport_volleyball",
    "Cricket":     "sport_cricket",
    "Gym":         "sport_gym",
}

# Sport risk metadata
SPORT_CONTACT = {"Football", "Basketball", "Cricket", "Volleyball"}
SPORT_INDOOR = {"Badminton", "Basketball", "Gym", "Tennis"}
SPORT_HIGH_IMPACT = {"Football", "Basketball", "Cricket"}


def _sport_flags(sport: str) -> dict:
    flags = {k: 0 for k in SPORT_MAP.values()}
    key = SPORT_MAP.get(sport)
    if key:
        flags[key] = 1
    return flags


def _skill_flags(skill: str) -> dict:
    return {
        "skill_beginner":     1 if skill == "Beginner" else 0,
        "skill_intermediate": 1 if skill == "Intermediate" else 0,
        "skill_advanced":     1 if skill == "Advanced" else 0,
    }


def build_feature_vector(
    *,
    user_id: int,
    sport: str = "Badminton",
    skill_level: str = "Intermediate",
    bookings_last_30d: int = 8,
    bookings_last_7d: int = 2,
    no_show_rate: float = 0.05,
    checkins_last_30d: int = 7,
    stamina: float = 7.0,
    speed: float = 6.5,
    agility: float = 7.0,
    strength: float = 6.0,
    endurance: float = 6.5,
    flexibility: float = 6.0,
    coordination: float = 7.0,
    balance: float = 6.5,
    # User-supplied wellness overrides (from frontend sliders)
    fatigue_score: float = 5.0,
    sleep_hours: float = 7.0,
    training_hours_per_week: float = 6.0,
    pain_score: float = 2.0,
    stress_level: float = 4.0,
    hydration_score: float = 7.0,
    prior_injury_count: int = 0,
) -> dict:
    """Build the 67-feature dict for the external ML API."""

    features = {k: 0 for k in FEATURE_KEYS}

    # Physical defaults (typical college student)
    features.update({
        "age": 20,
        "height_cm": 170,
        "weight_kg": 65,
        "bmi": round(65 / (1.70 ** 2), 1),
    })

    # Training load
    sessions_pw = max(1, round(training_hours_per_week / 1.5))
    features.update({
        "training_hours_per_week": training_hours_per_week,
        "sessions_per_week": sessions_pw,
        "training_intensity": round(min(10, training_hours_per_week * 0.8), 1),
        "weeks_of_training": 12,
        "years_experience": 2 if skill_level == "Beginner" else (4 if skill_level == "Intermediate" else 7),
    })

    # Recovery & fatigue
    recovery = round(10 - fatigue_score, 1)
    features.update({
        "sleep_hours": sleep_hours,
        "fatigue_score": fatigue_score,
        "recovery_score": recovery,
        "rest_days_per_week": max(1, 7 - sessions_pw),
    })

    # Sport one-hot
    features.update(_sport_flags(sport))

    # Skill one-hot
    features.update(_skill_flags(skill_level))

    # Booking activity
    features.update({
        "bookings_last_30d": bookings_last_30d,
        "bookings_last_7d": bookings_last_7d,
        "no_show_rate": no_show_rate,
        "avg_session_duration_min": 75,
        "checkins_last_30d": checkins_last_30d,
    })

    # Performance scores
    features.update({
        "stamina_score": stamina,
        "speed_score": speed,
        "agility_score": agility,
        "strength_score": strength,
        "endurance_score": endurance,
        "flexibility_score": flexibility,
        "coordination_score": coordination,
        "balance_score": balance,
    })

    # Injury history
    features.update({
        "prior_injury_knee": 0,
        "prior_injury_ankle": 0,
        "prior_injury_shoulder": 0,
        "prior_injury_back": 0,
        "prior_injury_wrist": 0,
        "prior_injury_count": prior_injury_count,
    })

    # Environmental / sport type
    features.update({
        "is_indoor_sport": 1 if sport in SPORT_INDOOR else 0,
        "plays_outdoor": 1 if sport not in SPORT_INDOOR else 0,
        "temp_celsius": 25,
        "high_humidity": 0,
        "plays_rainy_conditions": 0,
    })

    # Workload ratios
    acute = training_hours_per_week
    chronic = max(1, training_hours_per_week * 0.8)
    features.update({
        "acute_chronic_workload_ratio": round(acute / chronic, 2),
        "monotony_score": round(fatigue_score / 10, 2),
        "strain_score": round(fatigue_score * sessions_pw, 1),
        "consecutive_training_days": min(5, sessions_pw),
        "days_since_last_rest": 2,
    })

    # Biomechanics (defaults to no issues)
    features.update({
        "poor_landing_technique": 0,
        "asymmetric_movement": 0,
        "muscle_imbalance": 0,
        "joint_hypermobility": 0,
        "overstriding": 0,
    })

    # Wellness
    features.update({
        "hydration_score": hydration_score,
        "nutrition_score": 7.0,
        "stress_level": stress_level,
        "motivation_level": round(10 - stress_level * 0.5, 1),
        "pain_score": pain_score,
    })

    # Competition
    features.update({
        "recent_competition": 0,
        "competition_frequency": 1,
        "travel_in_last_week": 0,
        "time_zone_changes": 0,
    })

    # Sport context
    features.update({
        "team_sport": 1 if sport in {"Football", "Basketball", "Volleyball", "Cricket"} else 0,
        "contact_sport": 1 if sport in SPORT_CONTACT else 0,
        "high_impact_sport": 1 if sport in SPORT_HIGH_IMPACT else 0,
    })

    return features


def _parse_prediction(raw: dict, features: dict) -> dict:
    """Parse the ML API response into a clean structured result."""
    # The external API returns various possible formats; handle them all
    risk_score = 0.0
    risk_level = "LOW"
    predicted_injury = None
    confidence = 0.88
    top_factors = []
    recommendations = []

    # Try to extract risk_score / probability
    for key in ("risk_score", "injury_probability", "probability", "score", "prediction"):
        if key in raw and raw[key] is not None:
            val = raw[key]
            if isinstance(val, (int, float)):
                risk_score = float(val)
                break
            if isinstance(val, str):
                try:
                    risk_score = float(val)
                    break
                except ValueError:
                    pass

    # Clamp to [0,1]
    risk_score = max(0.0, min(1.0, risk_score))

    # Risk level
    for key in ("risk_level", "risk_category", "level", "category"):
        if key in raw and isinstance(raw[key], str):
            rl = raw[key].upper()
            if "HIGH" in rl:
                risk_level = "HIGH"
            elif "MEDIUM" in rl or "MODERATE" in rl:
                risk_level = "MEDIUM"
            else:
                risk_level = "LOW"
            break
    else:
        # Derive from score if not in response
        if risk_score >= 0.65:
            risk_level = "HIGH"
        elif risk_score >= 0.35:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

    # Predicted injury type
    for key in ("injury_type", "predicted_injury", "injury", "injury_name"):
        if key in raw and raw[key]:
            predicted_injury = str(raw[key])
            break

    # Confidence
    for key in ("confidence", "model_confidence"):
        if key in raw and isinstance(raw[key], (int, float)):
            confidence = float(raw[key])
            break

    # Top contributing factors
    for key in ("top_factors", "feature_importance", "factors", "contributing_factors"):
        if key in raw and isinstance(raw[key], list):
            top_factors = raw[key][:5]
            break
        if key in raw and isinstance(raw[key], dict):
            top_factors = sorted(raw[key].items(), key=lambda x: -abs(x[1]))[:5]
            top_factors = [{"feature": k, "impact": v} for k, v in top_factors]
            break

    # If no factors from API, derive from our features
    if not top_factors:
        top_factors = _derive_factors(features)

    # Recommendations based on risk
    recommendations = _build_recommendations(risk_level, features, predicted_injury)

    return {
        "risk_score": round(risk_score, 3),
        "risk_level": risk_level,
        "predicted_injury": predicted_injury,
        "confidence": round(confidence, 2),
        "top_factors": top_factors,
        "recommendations": recommendations,
    }


def _derive_factors(features: dict) -> list:
    """Derive top risk factors from the feature vector if API doesn't return them."""
    factors = []
    if features.get("fatigue_score", 0) >= 7:
        factors.append({"feature": "High fatigue score", "impact": "High"})
    if features.get("training_hours_per_week", 0) >= 12:
        factors.append({"feature": "Excessive training load", "impact": "High"})
    if features.get("sleep_hours", 8) < 6:
        factors.append({"feature": "Insufficient sleep", "impact": "Medium"})
    if features.get("pain_score", 0) >= 4:
        factors.append({"feature": "Reported pain", "impact": "High"})
    if features.get("prior_injury_count", 0) > 0:
        factors.append({"feature": "Prior injury history", "impact": "Medium"})
    if features.get("acute_chronic_workload_ratio", 1) > 1.3:
        factors.append({"feature": "Acute:Chronic workload spike", "impact": "High"})
    if features.get("stress_level", 0) >= 7:
        factors.append({"feature": "High stress levels", "impact": "Medium"})
    if not factors:
        factors = [
            {"feature": "Normal training load", "impact": "Low"},
            {"feature": "Good recovery metrics", "impact": "Low"},
        ]
    return factors[:5]


def _build_recommendations(risk_level: str, features: dict, injury: Optional[str]) -> list:
    recs = []
    if risk_level == "HIGH":
        recs += [
            "⚠️ Rest for at least 2–3 days before next session",
            "🏥 Consult a sports physician before resuming training",
            "💧 Ensure proper hydration — minimum 3L/day",
            "🧊 Apply ice to any sore joints post-activity",
        ]
    elif risk_level == "MEDIUM":
        recs += [
            "⚡ Reduce training intensity by 20–30% this week",
            "😴 Prioritize 8+ hours of sleep nightly",
            "🧘 Add 15 min stretching before & after each session",
        ]
    else:
        recs += [
            "✅ Keep up the great work! Maintain current routine",
            "🏃 Consider adding cross-training for variety",
        ]

    if features.get("fatigue_score", 0) >= 6:
        recs.append("😴 High fatigue detected — schedule a full recovery day")
    if features.get("sleep_hours", 8) < 7:
        recs.append("🌙 Target 7–9 hours of sleep for optimal recovery")
    if features.get("training_hours_per_week", 0) > 10:
        recs.append("📉 Gradually reduce weekly training volume to prevent overuse")

    return recs[:5]


class InjuryMLService:
    """Proxy service for the external Athlete Injury Prediction ML API."""

    def __init__(self):
        self.base_url = settings.ML_API_URL.rstrip("/")
        self.api_key = settings.ML_API_KEY
        self._timeout = 30.0

    def _headers(self) -> dict:
        h = {"Content-Type": "application/json"}
        if self.api_key:
            h["x-api-key"] = self.api_key
        return h

    def health_check(self) -> dict:
        try:
            with httpx.Client(timeout=10.0) as client:
                r = client.get(f"{self.base_url}/api/v1/health", headers=self._headers())
                return {"ok": r.status_code == 200, "status": r.status_code}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def predict(
        self,
        *,
        user_id: int,
        sport: str = "Badminton",
        skill_level: str = "Intermediate",
        bookings_last_30d: int = 8,
        bookings_last_7d: int = 2,
        no_show_rate: float = 0.05,
        checkins_last_30d: int = 7,
        stamina: float = 7.0,
        speed: float = 6.5,
        agility: float = 7.0,
        strength: float = 6.0,
        endurance: float = 6.5,
        flexibility: float = 6.0,
        coordination: float = 7.0,
        balance: float = 6.5,
        fatigue_score: float = 5.0,
        sleep_hours: float = 7.0,
        training_hours_per_week: float = 6.0,
        pain_score: float = 2.0,
        stress_level: float = 4.0,
        hydration_score: float = 7.0,
        prior_injury_count: int = 0,
    ) -> dict:
        """
        Build feature vector, call the external ML API, parse and return the result.
        Falls back to a rule-based estimate if the API is unreachable.
        """
        features = build_feature_vector(
            user_id=user_id,
            sport=sport,
            skill_level=skill_level,
            bookings_last_30d=bookings_last_30d,
            bookings_last_7d=bookings_last_7d,
            no_show_rate=no_show_rate,
            checkins_last_30d=checkins_last_30d,
            stamina=stamina,
            speed=speed,
            agility=agility,
            strength=strength,
            endurance=endurance,
            flexibility=flexibility,
            coordination=coordination,
            balance=balance,
            fatigue_score=fatigue_score,
            sleep_hours=sleep_hours,
            training_hours_per_week=training_hours_per_week,
            pain_score=pain_score,
            stress_level=stress_level,
            hydration_score=hydration_score,
            prior_injury_count=prior_injury_count,
        )

        payload = {
            "athlete_id": str(user_id),
            "features": features,
        }

        raw_response = None
        api_error = None

        try:
            with httpx.Client(timeout=self._timeout) as client:
                resp = client.post(
                    f"{self.base_url}/api/v1/predict",
                    headers=self._headers(),
                    json=payload,
                )
                if resp.status_code == 401:
                    api_error = "ML API key required — using rule-based fallback"
                elif resp.status_code == 422:
                    api_error = f"Feature validation error: {resp.text[:200]}"
                else:
                    resp.raise_for_status()
                    raw_response = resp.json()
        except httpx.HTTPStatusError as e:
            api_error = f"HTTP {e.response.status_code}: {e.response.text[:200]}"
        except Exception as e:
            api_error = str(e)

        if raw_response:
            parsed = _parse_prediction(raw_response, features)
        else:
            # Rule-based fallback
            parsed = _fallback_prediction(features, api_error)

        return {
            **parsed,
            "features": features,
            "raw_response": raw_response,
            "api_error": api_error,
            "model_source": "external_ml" if raw_response else "fallback_rules",
            "athlete_id": str(user_id),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


def _fallback_prediction(features: dict, error: Optional[str]) -> dict:
    """Simple rule-based fallback when the external ML API is unreachable."""
    score = 0.0
    score += features.get("fatigue_score", 5) * 0.04         # max 0.40
    score += (10 - features.get("sleep_hours", 7)) * 0.02    # max 0.06
    score += features.get("pain_score", 0) * 0.04            # max 0.40
    score += features.get("prior_injury_count", 0) * 0.05    # max 0.10
    acwr = features.get("acute_chronic_workload_ratio", 1.0)
    if acwr > 1.3:
        score += 0.15
    score += features.get("stress_level", 4) * 0.01          # max 0.10
    score = round(min(0.95, max(0.02, score)), 3)

    if score >= 0.65:
        risk_level = "HIGH"
    elif score >= 0.35:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    return {
        "risk_score": score,
        "risk_level": risk_level,
        "predicted_injury": None,
        "confidence": 0.75,
        "top_factors": _derive_factors(features),
        "recommendations": _build_recommendations(risk_level, features, None),
    }


# Singleton
injury_ml_service = InjuryMLService()
