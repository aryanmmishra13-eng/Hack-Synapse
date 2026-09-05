from fastapi import APIRouter, Query
from datetime import datetime
from app.services.ml_service import ml_service

router = APIRouter(prefix="/api/predictions", tags=["Predictions"])

@router.get("/demand")
def get_demand_prediction(
    sport: str = Query(..., description="Sport name e.g. Badminton, Football"),
    date: str = Query(default_factory=lambda: datetime.now().strftime("%Y-%m-%d")),
    hour: int = Query(default=18, ge=0, le=23)
):
    prediction = ml_service.predict_demand(sport, date, hour)
    return prediction
