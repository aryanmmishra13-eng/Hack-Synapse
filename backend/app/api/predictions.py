"""
Injury Prediction API  (spec §8, §9, §11, §12, §14, §22, §27, §29)
====================================================================
Route prefix: /api/predictions  (follows existing /api/* convention)

Endpoints
---------
GET  /api/predictions/injury-risk/{user_id}          — cached prediction
POST /api/predictions/injury-risk/{user_id}/refresh  — force new prediction
GET  /api/predictions/injury-risk/{user_id}/history  — paginated history
GET  /api/predictions/ml-status                      — admin ML monitoring
GET  /api/predictions/demand                         — existing demand endpoint (preserved)
"""

import json
import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.auth import get_current_user, get_current_admin
from app.core.config import settings
from app.database.session import get_db
from app.models.models import (
    Booking, BookingStatusEnum, InjuryPrediction, User, RoleEnum,
    AthleteHealthLog,
)
from app.services.feature_service import build_feature_vector, DataQuality
from app.services.injury_ml_service import injury_ml_client, MLError
from app.services.ml_service import ml_service            # existing demand model

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/predictions", tags=["Predictions"])


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────
def _is_cache_valid(record: InjuryPrediction) -> bool:
    """True if cached prediction is still within ML_PREDICTION_CACHE_MINUTES."""
    if not record or not record.created_at:
        return False
    age_minutes = (datetime.utcnow() - record.created_at.replace(tzinfo=None)).total_seconds() / 60
    return age_minutes < settings.ML_PREDICTION_CACHE_MINUTES


def _serialize_prediction(record: InjuryPrediction) -> dict:
    """Convert DB record to spec §9 shape."""
    increasing = json.loads(record.increasing_factors) if record.increasing_factors else []
    reducing   = json.loads(record.reducing_factors)   if record.reducing_factors   else []

    return {
        "success": True,
        "data": {
            "athlete_id": str(record.user_id),
            "risk": {
                "score":      round(record.risk_score, 2),
                "level":      record.risk_level,
                "is_at_risk": record.is_at_risk or False,
            },
            "prediction": {
                "onset_days":    round(record.predicted_onset_days, 1)    if record.predicted_onset_days    is not None else None,
                "recovery_days": round(record.predicted_recovery_days, 1) if record.predicted_recovery_days is not None else None,
            },
            "factors": {
                "increasing": increasing,
                "reducing":   reducing,
            },
            "model": {
                "version": record.model_version or "v1.0",
            },
            "data_quality": {
                "status":           record.data_quality or "GOOD",
                "missing_features": record.missing_feature_count or 0,
            },
            "generated_at": record.generated_at.isoformat() + "Z" if record.generated_at else record.created_at.isoformat() + "Z",
            "cached": True,
        },
    }


def _authorize_athlete_access(current_user: User, target_user_id: int, db: Session):
    """
    Authorization rules (spec §12):
    - STUDENT → own data only
    - COACH   → own data + assigned students
    - ADMIN   → all athletes
    """
    if current_user.role == RoleEnum.ADMIN.value:
        return  # full access

    if current_user.role == RoleEnum.STUDENT.value:
        if current_user.id != target_user_id:
            raise HTTPException(status_code=403, detail="You can only access your own injury risk data.")
        return

    if current_user.role == RoleEnum.COACH.value:
        # Coach can view their assigned students
        from app.models.models import CoachStudent, Coach
        coach = db.query(Coach).filter(Coach.user_id == current_user.id).first()
        if not coach:
            if current_user.id != target_user_id:
                raise HTTPException(status_code=403, detail="Access denied.")
            return
        assigned_ids = {cs.student_id for cs in coach.students}
        assigned_ids.add(current_user.id)   # coach can see their own too
        if target_user_id not in assigned_ids:
            raise HTTPException(status_code=403, detail="This athlete is not assigned to you.")
        return

    raise HTTPException(status_code=403, detail="Access denied.")


def _run_and_store_prediction(user_id: int, db: Session) -> dict:
    """
    Full pipeline: feature engineering → ML API → persist → return response.
    (spec §6 steps 1–11)
    """
    t0 = time.time()

    # 1. Validate athlete exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"success": False, "error": {"code": MLError.ATHLETE_NOT_FOUND, "message": "Athlete not found."}}

    # 2-5. Feature engineering
    try:
        features, data_quality, missing_count = build_feature_vector(user_id=user_id, db=db)
        logger.info(
            "predict: user=%d quality=%s missing=%d features=%d",
            user_id, data_quality, missing_count, len(features),
        )
    except Exception as exc:
        logger.exception("Feature engineering failed for user=%d: %s", user_id, exc)
        return {"success": False, "error": {"code": MLError.INTERNAL, "message": "Failed to process athlete data."}}

    # 6-9. Call ML service
    result = injury_ml_client.predict(
        athlete_id=str(user_id),
        features=features,
        data_quality=data_quality,
        missing_count=missing_count,
    )

    if not result.get("success"):
        return result  # pass through error cleanly

    data = result["data"]
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)

    # 10. Persist prediction (spec §6 step 10, §10, §28)
    try:
        record = InjuryPrediction(
            user_id=user_id,
            risk_score=data["risk"]["score"],
            risk_level=data["risk"]["level"],
            is_at_risk=data["risk"]["is_at_risk"],
            predicted_onset_days=data["prediction"].get("onset_days"),
            predicted_recovery_days=data["prediction"].get("recovery_days"),
            increasing_factors=json.dumps(data["factors"]["increasing"]),
            reducing_factors=json.dumps(data["factors"]["reducing"]),
            model_version=data["model"]["version"],
            data_quality=data["data_quality"]["status"],
            missing_feature_count=data["data_quality"]["missing_features"],
            generated_at=now_utc,
            ml_raw_response=None,   # not stored — keeps it lean (spec §9)
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        result["data"]["prediction_id"] = record.id

        logger.info(
            "predict: stored prediction_id=%d user=%d risk=%.1f%% level=%s model=%s latency_ms=%d",
            record.id, user_id,
            data["risk"]["score"], data["risk"]["level"],
            data["model"]["version"],
            round((time.time() - t0) * 1000),
        )
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to persist prediction for user=%d: %s", user_id, exc)
        # Return result anyway — don't fail the user just because persistence failed

    result["data"]["cached"] = False
    return result


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/predictions/injury-risk/{user_id}
# Returns cached prediction or generates new one (spec §11)
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/injury-risk/{user_id}")
def get_injury_risk(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns cached prediction if within ML_PREDICTION_CACHE_MINUTES,
    otherwise generates a new prediction.
    """
    _authorize_athlete_access(current_user, user_id, db)

    # Check cache (spec §11)
    latest = (
        db.query(InjuryPrediction)
        .filter(InjuryPrediction.user_id == user_id)
        .order_by(InjuryPrediction.created_at.desc())
        .first()
    )

    if latest and _is_cache_valid(latest):
        logger.info("predict: cache hit for user=%d age=%.1fmin", user_id,
                    (datetime.utcnow() - latest.created_at.replace(tzinfo=None)).total_seconds() / 60)
        return _serialize_prediction(latest)

    # Cache miss → generate
    return _run_and_store_prediction(user_id, db)


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/predictions/injury-risk/{user_id}/refresh
# Force a fresh prediction (spec §22)
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/injury-risk/{user_id}/refresh")
def refresh_injury_risk(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Force generation of a new prediction, bypassing cache."""
    _authorize_athlete_access(current_user, user_id, db)
    return _run_and_store_prediction(user_id, db)


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/predictions/injury-risk/{user_id}/history
# Paginated prediction history (spec §21)
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/injury-risk/{user_id}/history")
def get_injury_risk_history(
    user_id: int,
    limit: int = Query(default=10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns paginated injury prediction history for an athlete."""
    _authorize_athlete_access(current_user, user_id, db)

    records = (
        db.query(InjuryPrediction)
        .filter(InjuryPrediction.user_id == user_id)
        .order_by(InjuryPrediction.created_at.desc())
        .limit(limit)
        .all()
    )

    return {
        "success": True,
        "athlete_id": str(user_id),
        "count": len(records),
        "history": [
            {
                "id": r.id,
                "risk": {
                    "score": round(r.risk_score, 2),
                    "level": r.risk_level,
                    "is_at_risk": r.is_at_risk or False,
                },
                "prediction": {
                    "onset_days":    round(r.predicted_onset_days, 1)    if r.predicted_onset_days    is not None else None,
                    "recovery_days": round(r.predicted_recovery_days, 1) if r.predicted_recovery_days is not None else None,
                },
                "model": {"version": r.model_version or "v1.0"},
                "data_quality": {"status": r.data_quality or "GOOD"},
                "generated_at": r.generated_at.isoformat() + "Z" if r.generated_at else r.created_at.isoformat() + "Z",
            }
            for r in records
        ],
    }


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/predictions/ml-status
# Admin ML monitoring (spec §27) — admin only
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/ml-status")
def ml_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Admin ML monitoring endpoint.
    Returns ML API health, model info, prediction stats.
    """
    if current_user.role not in (RoleEnum.ADMIN.value, RoleEnum.COACH.value):
        raise HTTPException(status_code=403, detail="Admin or Coach access required.")

    health = injury_ml_client.health_check()
    model_info = injury_ml_client.model_info()

    # Prediction stats from DB
    total_preds = db.query(InjuryPrediction).count()
    latest_pred = (
        db.query(InjuryPrediction)
        .order_by(InjuryPrediction.created_at.desc())
        .first()
    )
    at_risk_count = db.query(InjuryPrediction).filter(InjuryPrediction.is_at_risk == True).count()
    avg_risk = db.query(InjuryPrediction).with_entities(
        __import__("sqlalchemy").func.avg(InjuryPrediction.risk_score)
    ).scalar()

    return {
        "ml_api": {
            "status": "ONLINE" if health.get("ok") else "OFFLINE",
            "url": settings.ML_API_URL,
            "has_api_key": health.get("has_api_key", False),
        },
        "model": {
            "version":            model_info.get("model_version", "v1.0"),
            "injury_features":    model_info.get("injury_features", 67),
            "optimal_threshold":  model_info.get("optimal_threshold", 0.70),
            "metrics":            model_info.get("metrics", {}),
        },
        "stats": {
            "total_predictions":     total_preds,
            "at_risk_predictions":   at_risk_count,
            "average_risk_score":    round(float(avg_risk), 2) if avg_risk else 0.0,
            "last_prediction_at":    latest_pred.created_at.isoformat() + "Z" if latest_pred else None,
            "cache_minutes":         settings.ML_PREDICTION_CACHE_MINUTES,
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/predictions/health-log/{user_id}
# Save a day's health log (wearable data entry) — kept from previous work
# ─────────────────────────────────────────────────────────────────────────────
from pydantic import BaseModel
from typing import List as TList

class HourlyEntry(BaseModel):
    hour: int          # 0–23
    value: float       # bpm or steps

class DailyHealthLogIn(BaseModel):
    date: str
    heart_rate_entries: Optional[TList[HourlyEntry]] = None
    resting_hr: Optional[float] = None
    max_hr: Optional[float] = None
    steps_entries: Optional[TList[HourlyEntry]] = None
    total_steps: Optional[int] = None
    calories_burned: Optional[float] = None
    sleep_hours: Optional[float] = None
    sleep_quality: Optional[float] = None   # 1–10

class HealthLogBatchIn(BaseModel):
    logs: TList[DailyHealthLogIn]


@router.post("/health-log/{user_id}")
def save_health_logs(
    user_id: int,
    body: HealthLogBatchIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upsert 7-day health logs for an athlete (wearable data)."""
    _authorize_athlete_access(current_user, user_id, db)

    saved = 0
    for log in body.logs:
        hr_entries = [{"hour": e.hour, "bpm": e.value} for e in (log.heart_rate_entries or [])]
        st_entries = [{"hour": e.hour, "steps": e.value} for e in (log.steps_entries or [])]
        total_steps = log.total_steps or (sum(e["steps"] for e in st_entries) if st_entries else None)

        existing = (
            db.query(AthleteHealthLog)
            .filter(AthleteHealthLog.user_id == user_id, AthleteHealthLog.log_date == log.date)
            .first()
        )
        if existing:
            if hr_entries:   existing.heart_rate_entries = json.dumps(hr_entries)
            if log.resting_hr:  existing.resting_hr = log.resting_hr
            if log.max_hr:      existing.max_hr = log.max_hr
            if st_entries:      existing.steps_entries = json.dumps(st_entries)
            if total_steps:     existing.total_steps = total_steps
            if log.calories_burned: existing.calories_burned = log.calories_burned
            if log.sleep_hours:     existing.sleep_hours = log.sleep_hours
            if log.sleep_quality:   existing.sleep_quality = log.sleep_quality
        else:
            new_log = AthleteHealthLog(
                user_id=user_id,
                log_date=log.date,
                heart_rate_entries=json.dumps(hr_entries) if hr_entries else None,
                resting_hr=log.resting_hr,
                max_hr=log.max_hr,
                steps_entries=json.dumps(st_entries) if st_entries else None,
                total_steps=total_steps,
                calories_burned=log.calories_burned,
                sleep_hours=log.sleep_hours,
                sleep_quality=log.sleep_quality,
            )
            db.add(new_log)
        saved += 1

    db.commit()
    return {"success": True, "saved": saved}


@router.get("/health-log/{user_id}")
def get_health_logs(
    user_id: int,
    days: int = Query(default=7, ge=1, le=30),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns recent health logs for an athlete."""
    _authorize_athlete_access(current_user, user_id, db)

    logs = (
        db.query(AthleteHealthLog)
        .filter(AthleteHealthLog.user_id == user_id)
        .order_by(AthleteHealthLog.log_date.desc())
        .limit(days)
        .all()
    )

    def serialize_log(l):
        return {
            "date": l.log_date,
            "heart_rate_entries": json.loads(l.heart_rate_entries) if l.heart_rate_entries else [],
            "resting_hr": l.resting_hr,
            "max_hr": l.max_hr,
            "steps_entries": json.loads(l.steps_entries) if l.steps_entries else [],
            "total_steps": l.total_steps,
            "calories_burned": l.calories_burned,
            "sleep_hours": l.sleep_hours,
            "sleep_quality": l.sleep_quality,
        }

    return {"success": True, "logs": [serialize_log(l) for l in logs]}


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/predictions/demand  (existing — preserved unchanged)
# ─────────────────────────────────────────────────────────────────────────────
from datetime import datetime as dt_class

@router.get("/demand")
def get_demand_prediction(
    sport: str = Query(..., description="Sport name e.g. Badminton, Football"),
    date: str = Query(default_factory=lambda: dt_class.now().strftime("%Y-%m-%d")),
    hour: int = Query(default=18, ge=0, le=23),
):
    """Existing facility demand prediction — unchanged."""
    return ml_service.predict_demand(sport, date, hour)
