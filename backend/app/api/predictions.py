import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Query, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.services.ml_service import ml_service
from app.services.injury_ml_service import injury_ml_service
from app.database.session import SessionLocal
from app.models.models import (
    User, InjuryPrediction, Booking, BookingStatusEnum
)

router = APIRouter(prefix="/api/predictions", tags=["Predictions"])


# ─────────────────────────────────────────────────────────────────
# Dependency
# ─────────────────────────────────────────────────────────────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ─────────────────────────────────────────────────────────────────
# Existing demand prediction endpoint
# ─────────────────────────────────────────────────────────────────
@router.get("/demand")
def get_demand_prediction(
    sport: str = Query(..., description="Sport name e.g. Badminton, Football"),
    date: str = Query(default_factory=lambda: datetime.now().strftime("%Y-%m-%d")),
    hour: int = Query(default=18, ge=0, le=23)
):
    prediction = ml_service.predict_demand(sport, date, hour)
    return prediction


# ─────────────────────────────────────────────────────────────────
# Injury Risk Prediction — request body schema
# ─────────────────────────────────────────────────────────────────
class InjuryRiskRequest(BaseModel):
    user_id: int
    # Wellness sliders from frontend (user-supplied, 0-10 scale unless noted)
    fatigue_score: float = 5.0
    sleep_hours: float = 7.0
    training_hours_per_week: float = 6.0
    pain_score: float = 2.0
    stress_level: float = 4.0
    hydration_score: float = 7.0
    prior_injury_count: int = 0


# ─────────────────────────────────────────────────────────────────
# POST /api/predictions/injury-risk
# ─────────────────────────────────────────────────────────────────
@router.post("/injury-risk")
def predict_injury_risk(body: InjuryRiskRequest, db: Session = Depends(get_db)):
    """
    Calls the external Athlete Injury Prediction ML API with a 67-feature vector
    built from the student's profile, booking history, and wellness inputs.
    Saves result to DB and returns structured prediction.
    """
    # 1. Fetch user profile
    user = db.query(User).filter(User.id == body.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 2. Derive activity metrics from booking history
    from datetime import timedelta
    now = datetime.utcnow()
    thirty_days_ago = now - timedelta(days=30)
    seven_days_ago = now - timedelta(days=7)

    bookings_30 = (
        db.query(Booking)
        .filter(
            Booking.user_id == body.user_id,
            Booking.created_at >= thirty_days_ago,
        )
        .all()
    )
    bookings_7 = [b for b in bookings_30 if b.created_at >= seven_days_ago]

    total_30 = len(bookings_30)
    checkins_30 = sum(
        1 for b in bookings_30
        if b.status in (BookingStatusEnum.CHECKED_IN.value, BookingStatusEnum.COMPLETED.value)
    )
    no_shows_30 = sum(1 for b in bookings_30 if b.status == BookingStatusEnum.NO_SHOW.value)
    no_show_rate = round(no_shows_30 / max(1, total_30), 3)

    # 3. Fetch latest performance assessment scores if available
    stamina = speed = agility = strength = endurance = flexibility = coordination = balance = 7.0
    try:
        from app.models.models import CoachAssessment
        latest_assessment = (
            db.query(CoachAssessment)
            .filter(CoachAssessment.student_id == body.user_id)
            .order_by(CoachAssessment.assessment_date.desc())
            .first()
        )
        if latest_assessment and latest_assessment.metrics:
            m = json.loads(latest_assessment.metrics) if isinstance(latest_assessment.metrics, str) else latest_assessment.metrics
            stamina    = float(m.get("stamina",    stamina))
            speed      = float(m.get("speed",      speed))
            agility    = float(m.get("agility",    agility))
            strength   = float(m.get("strength",   strength))
            endurance  = float(m.get("endurance",  endurance))
            flexibility= float(m.get("flexibility",flexibility))
            coordination=float(m.get("coordination",coordination))
            balance    = float(m.get("balance",    balance))
    except Exception:
        pass  # assessment model may not exist; use defaults

    # 4. Call ML service
    result = injury_ml_service.predict(
        user_id=body.user_id,
        sport=user.preferred_sport or "Badminton",
        skill_level=user.skill_level or "Intermediate",
        bookings_last_30d=total_30,
        bookings_last_7d=len(bookings_7),
        no_show_rate=no_show_rate,
        checkins_last_30d=checkins_30,
        stamina=stamina,
        speed=speed,
        agility=agility,
        strength=strength,
        endurance=endurance,
        flexibility=flexibility,
        coordination=coordination,
        balance=balance,
        fatigue_score=body.fatigue_score,
        sleep_hours=body.sleep_hours,
        training_hours_per_week=body.training_hours_per_week,
        pain_score=body.pain_score,
        stress_level=body.stress_level,
        hydration_score=body.hydration_score,
        prior_injury_count=body.prior_injury_count,
    )

    # 5. Persist prediction to DB
    try:
        record = InjuryPrediction(
            user_id=body.user_id,
            risk_score=result["risk_score"],
            risk_level=result["risk_level"],
            predicted_injury=result.get("predicted_injury"),
            confidence=result.get("confidence"),
            top_factors=json.dumps(result.get("top_factors", [])),
            recommendations=json.dumps(result.get("recommendations", [])),
            features_used=json.dumps(result.get("features", {})),
            ml_raw_response=json.dumps(result.get("raw_response")),
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        result["prediction_id"] = record.id
    except Exception:
        db.rollback()

    # Strip raw internals before returning
    result.pop("features", None)
    result.pop("raw_response", None)

    return result


# ─────────────────────────────────────────────────────────────────
# GET /api/predictions/injury-risk/{user_id}
# Returns latest + last 5 predictions for a user
# ─────────────────────────────────────────────────────────────────
@router.get("/injury-risk/{user_id}")
def get_injury_predictions(user_id: int, db: Session = Depends(get_db)):
    records = (
        db.query(InjuryPrediction)
        .filter(InjuryPrediction.user_id == user_id)
        .order_by(InjuryPrediction.created_at.desc())
        .limit(5)
        .all()
    )
    if not records:
        return {"latest": None, "history": []}

    def serialize(r):
        return {
            "id": r.id,
            "risk_score": r.risk_score,
            "risk_level": r.risk_level,
            "predicted_injury": r.predicted_injury,
            "confidence": r.confidence,
            "top_factors": json.loads(r.top_factors) if r.top_factors else [],
            "recommendations": json.loads(r.recommendations) if r.recommendations else [],
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }

    return {
        "latest": serialize(records[0]),
        "history": [serialize(r) for r in records],
    }


# ─────────────────────────────────────────────────────────────────
# GET /api/predictions/ml-health
# Checks connectivity to the external ML API
# ─────────────────────────────────────────────────────────────────
@router.get("/ml-health")
def ml_api_health():
    """Check if the external Athlete Injury Prediction API is reachable."""
    result = injury_ml_service.health_check()
    return {"external_ml_api": result}
