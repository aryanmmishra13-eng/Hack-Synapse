from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.database.session import get_db
from app.models.models import Facility, Sport, Booking, User, Notification
from app.schemas.schemas import WeatherReportOut
from app.api.auth import get_current_user, get_current_admin

router = APIRouter(prefix="/api/weather", tags=["Weather Integration"])

@router.get("/report", response_model=WeatherReportOut)
def get_facility_weather(
    facility_id: int,
    date: Optional[str] = Query(default=None),
    hour: int = Query(default=18),
    db: Session = Depends(get_db)
):
    facility = db.query(Facility).filter(Facility.id == facility_id).first()
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")

    date_str = date or datetime.now().strftime("%Y-%m-%d")
    is_outdoor = facility.sport.is_outdoor if facility.sport else False

    # Simulate realistic backend weather service
    if is_outdoor:
        temp_c = 28.5
        rain_probability = 82.0 if hour >= 18 else 20.0
        condition = "Heavy Rain & Thunderstorms" if rain_probability > 70 else "Partly Cloudy"
        wind_kph = 18.0
        risk_level = "WARNING" if rain_probability > 70 else "NORMAL"
        recommendation = "Consider rescheduling outdoor session due to 82% rain probability." if risk_level == "WARNING" else "Ideal weather for outdoor match."
    else:
        temp_c = 24.0
        rain_probability = 10.0
        condition = "Indoor Controlled Climate"
        wind_kph = 0.0
        risk_level = "NORMAL"
        recommendation = "Indoor climate controlled. No weather disruption expected."

    return WeatherReportOut(
        facility_id=facility.id,
        facility_name=facility.name,
        sport_name=facility.sport.name if facility.sport else "Sports",
        date=date_str,
        hour=hour,
        temp_c=temp_c,
        rain_probability=rain_probability,
        condition=condition,
        wind_kph=wind_kph,
        risk_level=risk_level,
        recommendation=recommendation
    )

@router.get("/admin/risks")
def admin_get_weather_risks(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Returns outdoor bookings affected by severe weather risks.
    """
    today_str = datetime.now().strftime("%Y-%m-%d")

    outdoor_facilities = db.query(Facility).join(Sport).filter(Sport.is_outdoor == True).all()
    affected_items = []

    for fac in outdoor_facilities:
        bookings = db.query(Booking).filter(
            Booking.facility_id == fac.id,
            Booking.booking_date == today_str,
            Booking.status == "CONFIRMED"
        ).all()

        if bookings:
            affected_items.append({
                "facility_id": fac.id,
                "facility_name": fac.name,
                "sport_name": fac.sport.name,
                "affected_bookings_count": len(bookings),
                "rain_probability": 82.0,
                "risk_level": "WARNING",
                "recommended_reschedule_time": "Tomorrow 10:00 AM (Indoor Hall B)"
            })

    return affected_items

@router.post("/admin/reschedule")
def admin_approve_weather_reschedule(
    facility_id: int,
    new_facility_id: int,
    new_time: str = "10:00",
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    today_str = datetime.now().strftime("%Y-%m-%d")

    bookings = db.query(Booking).filter(
        Booking.facility_id == facility_id,
        Booking.booking_date == today_str,
        Booking.status == "CONFIRMED"
    ).all()

    new_fac = db.query(Facility).filter(Facility.id == new_facility_id).first()

    for b in bookings:
        b.facility_id = new_facility_id
        b.start_time = new_time
        
        # Notify student
        notif = Notification(
            user_id=b.user_id,
            message=f"🌧️ Weather alert: Your booking for {b.facility.name} was safely rescheduled to {new_fac.name if new_fac else 'Indoor Court'} at {new_time}.",
            type="WEATHER_RESCHEDULE"
        )
        db.add(notif)

    db.commit()
    return {"message": f"Successfully rescheduled {len(bookings)} booking(s) to indoor facility!", "affected_count": len(bookings)}
