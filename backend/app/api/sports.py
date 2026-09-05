from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.database.session import get_db
from app.models.models import Sport, Facility, Booking, BookingStatusEnum, Maintenance, FacilityStatusEnum
from app.schemas.schemas import SportOut, FacilityOut
from app.services.ml_service import ml_service

router = APIRouter(prefix="/api/sports", tags=["Sports & Facilities"])

@router.get("", response_model=List[SportOut])
def get_sports(db: Session = Depends(get_db)):
    sports = db.query(Sport).all()
    today_str = datetime.now().strftime("%Y-%m-%d")
    current_hour = datetime.now().hour

    result = []
    for sport in sports:
        facilities = db.query(Facility).filter(Facility.sport_id == sport.id).all()
        facility_count = len(facilities)
        
        # Calculate current booked slots vs total capacity
        total_capacity = sum(f.capacity for f in facilities) if facilities else 1
        active_bookings = (
            db.query(Booking)
            .join(Facility)
            .filter(
                Facility.sport_id == sport.id,
                Booking.booking_date == today_str,
                Booking.status.in_([BookingStatusEnum.CONFIRMED.value, BookingStatusEnum.CHECKED_IN.value])
            ).count()
        )
        
        occupancy_pct = min(100.0, round((active_bookings / max(1, total_capacity * 4)) * 100, 1))
        avail_facilities = sum(1 for f in facilities if f.status == FacilityStatusEnum.ACTIVE.value)

        # ML Prediction for demand level
        pred_res = ml_service.predict_demand(sport.name, today_str, current_hour)

        result.append(SportOut(
            id=sport.id,
            name=sport.name,
            description=sport.description,
            icon_name=sport.icon_name,
            image_url=sport.image_url,
            facility_count=facility_count,
            available_facilities=avail_facilities,
            current_occupancy_pct=occupancy_pct,
            predicted_demand_level=pred_res["demand_level"]
        ))
    return result

@router.get("/{sport_id}/facilities", response_model=List[FacilityOut])
def get_facilities_by_sport(sport_id: int, db: Session = Depends(get_db)):
    sport = db.query(Sport).filter(Sport.id == sport_id).first()
    if not sport:
        raise HTTPException(status_code=404, detail="Sport not found")
    
    facilities = db.query(Facility).filter(Facility.sport_id == sport_id).all()
    result = []
    for f in facilities:
        result.append(FacilityOut(
            id=f.id,
            sport_id=f.sport_id,
            sport_name=sport.name,
            name=f.name,
            capacity=f.capacity,
            status=f.status,
            location=f.location,
            available_slots_count=12 if f.status == FacilityStatusEnum.ACTIVE.value else 0
        ))
    return result

@router.get("/facilities/{facility_id}/slots")
def get_facility_time_slots(
    facility_id: int, 
    date: Optional[str] = Query(default=None), 
    db: Session = Depends(get_db)
):
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")

    facility = db.query(Facility).filter(Facility.id == facility_id).first()
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")

    # Time slots from 06:00 to 22:00
    all_time_slots = [
        "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
        "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
        "18:00", "19:00", "20:00", "21:00"
    ]

    # Check maintenance
    under_maintenance = (facility.status == FacilityStatusEnum.MAINTENANCE.value)

    slots_detail = []
    for t_slot in all_time_slots:
        hour_int = int(t_slot.split(":")[0])
        
        # Check active bookings for this facility, date, start_time
        booked_count = db.query(Booking).filter(
            Booking.facility_id == facility_id,
            Booking.booking_date == date,
            Booking.start_time == t_slot,
            Booking.status.in_([BookingStatusEnum.CONFIRMED.value, BookingStatusEnum.CHECKED_IN.value])
        ).count()

        # ML prediction for this hour
        pred = ml_service.predict_demand(facility.sport.name if facility.sport else "Sports", date, hour_int)

        if under_maintenance:
            status_code = "MAINTENANCE"
            color_badge = "⚫ Maintenance"
        elif booked_count >= facility.capacity:
            status_code = "FULL"
            color_badge = "🔴 Full"
        elif booked_count >= (facility.capacity - 1):
            status_code = "LIMITED"
            color_badge = "🟡 Limited"
        else:
            status_code = "AVAILABLE"
            color_badge = "🟢 Available"

        slots_detail.append({
            "time": t_slot,
            "end_time": f"{hour_int+1:02d}:00",
            "booked_count": booked_count,
            "capacity": facility.capacity,
            "status": status_code,
            "badge": color_badge,
            "predicted_demand": pred["predicted_demand"],
            "demand_level": pred["demand_level"]
        })

    return {
        "facility_id": facility.id,
        "facility_name": facility.name,
        "location": facility.location,
        "sport_name": facility.sport.name if facility.sport else "",
        "date": date,
        "capacity": facility.capacity,
        "status": facility.status,
        "slots": slots_detail
    }
