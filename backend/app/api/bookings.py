from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from app.database.session import get_db
from app.models.models import (
    Booking, BookingStatusEnum, Facility, Sport, User,
    Waitlist, WaitlistStatusEnum, Notification
)
from app.schemas.schemas import BookingCreate, BookingResponse, BookingOut, AlternativeOption
from app.api.auth import get_current_user, get_current_admin
from app.services.ml_service import ml_service
from app.services.email_service import send_booking_confirmation_email

router = APIRouter(prefix="/api/bookings", tags=["Bookings"])

@router.post("", response_model=BookingResponse)
def create_booking(
    booking_in: BookingCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Lock / fetch facility with transaction
    facility = db.query(Facility).filter(Facility.id == booking_in.facility_id).first()
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")

    if facility.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Facility is currently under maintenance or closed")

    # Concurrency control check: count active confirmed/checked-in bookings for this exact slot
    existing_count = (
        db.query(Booking)
        .filter(
            Booking.facility_id == booking_in.facility_id,
            Booking.booking_date == booking_in.booking_date,
            Booking.start_time == booking_in.start_time,
            Booking.status.in_([BookingStatusEnum.CONFIRMED.value, BookingStatusEnum.CHECKED_IN.value])
        )
        .count()
    )

    # Calculate ML insight for smart notification before confirm
    hour_int = int(booking_in.start_time.split(":")[0])
    sport_name = facility.sport.name if facility.sport else "Sports"
    pred = ml_service.predict_demand(sport_name, booking_in.booking_date, hour_int)
    
    smart_insight = f"{pred['demand_level']} demand expected ({pred['predicted_demand']} active sessions) at {booking_in.start_time}."

    # If facility capacity is full -> DO NOT create confirmed booking
    if existing_count >= facility.capacity:
        # Generate Smart Alternatives
        other_facilities = db.query(Facility).filter(
            Facility.sport_id == facility.sport_id,
            Facility.id != facility.id,
            Facility.status == "ACTIVE"
        ).all()

        alternatives = []
        for alt_f in other_facilities:
            alt_booked = db.query(Booking).filter(
                Booking.facility_id == alt_f.id,
                Booking.booking_date == booking_in.booking_date,
                Booking.start_time == booking_in.start_time,
                Booking.status.in_([BookingStatusEnum.CONFIRMED.value, BookingStatusEnum.CHECKED_IN.value])
            ).count()
            
            if alt_booked < alt_f.capacity:
                avail_score = round(((alt_f.capacity - alt_booked) / alt_f.capacity) * 100.0, 1)
                alternatives.append(AlternativeOption(
                    facility_id=alt_f.id,
                    facility_name=alt_f.name,
                    booking_date=booking_in.booking_date,
                    start_time=booking_in.start_time,
                    end_time=booking_in.end_time,
                    availability_score=avail_score,
                    predicted_demand_level=pred["demand_level"]
                ))

        # Check alternative time slots on same facility
        alt_hours = [f"{h:02d}:00" for h in [hour_int + 1, hour_int - 1] if 6 <= h <= 21]
        for alt_t in alt_hours:
            alt_t_end = f"{int(alt_t.split(':')[0])+1:02d}:00"
            t_booked = db.query(Booking).filter(
                Booking.facility_id == facility.id,
                Booking.booking_date == booking_in.booking_date,
                Booking.start_time == alt_t,
                Booking.status.in_([BookingStatusEnum.CONFIRMED.value, BookingStatusEnum.CHECKED_IN.value])
            ).count()

            if t_booked < facility.capacity:
                avail_score = round(((facility.capacity - t_booked) / facility.capacity) * 100.0, 1)
                alternatives.append(AlternativeOption(
                    facility_id=facility.id,
                    facility_name=f"{facility.name} (at {alt_t})",
                    booking_date=booking_in.booking_date,
                    start_time=alt_t,
                    end_time=alt_t_end,
                    availability_score=avail_score,
                    predicted_demand_level=pred["demand_level"]
                ))

        # Calculate current waitlist position
        waitlist_pos = db.query(Waitlist).filter(
            Waitlist.facility_id == booking_in.facility_id,
            Waitlist.booking_date == booking_in.booking_date,
            Waitlist.start_time == booking_in.start_time,
            Waitlist.status == WaitlistStatusEnum.WAITING.value
        ).count() + 1

        return BookingResponse(
            success=False,
            message=f"Sorry, {facility.name} is fully booked at {booking_in.start_time}. Would you like to join the waitlist or pick a recommended alternative?",
            booking=None,
            smart_insight=smart_insight,
            alternatives=alternatives[:3],
            waitlist_position=waitlist_pos
        )

    # Slot available -> Create atomic booking
    qr_payload = f"CSH-QR-{uuid.uuid4().hex[:10].upper()}"
    new_booking = Booking(
        user_id=current_user.id,
        facility_id=booking_in.facility_id,
        booking_date=booking_in.booking_date,
        start_time=booking_in.start_time,
        end_time=booking_in.end_time,
        status=BookingStatusEnum.CONFIRMED.value,
        qr_code=qr_payload
    )
    db.add(new_booking)
    
    # Create notification
    notif = Notification(
        user_id=current_user.id,
        message=f"Booking confirmed for {facility.name} on {booking_in.booking_date} at {booking_in.start_time}.",
        type="CONFIRMATION"
    )
    db.add(notif)
    db.commit()
    db.refresh(new_booking)

    # Send booking confirmation email in background (non-blocking)
    background_tasks.add_task(
        send_booking_confirmation_email,
        current_user.name, current_user.email, facility.name,
        sport_name, new_booking.booking_date,
        new_booking.start_time, new_booking.end_time,
        new_booking.qr_code
    )

    booking_out = BookingOut(
        id=new_booking.id,
        user_id=new_booking.user_id,
        facility_id=new_booking.facility_id,
        facility_name=facility.name,
        sport_name=sport_name,
        booking_date=new_booking.booking_date,
        start_time=new_booking.start_time,
        end_time=new_booking.end_time,
        status=new_booking.status,
        qr_code=new_booking.qr_code,
        created_at=new_booking.created_at,
        checked_in_at=new_booking.checked_in_at
    )

    return BookingResponse(
        success=True,
        message="Booking successfully confirmed!",
        booking=booking_out,
        smart_insight=smart_insight,
        alternatives=[]
    )

@router.get("/my", response_model=List[BookingOut])
@router.get("/my-bookings", response_model=List[BookingOut])
def get_my_bookings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    bookings = (
        db.query(Booking)
        .filter(Booking.user_id == current_user.id)
        .order_by(Booking.id.desc())
        .all()
    )

    result = []
    for b in bookings:
        facility = db.query(Facility).filter(Facility.id == b.facility_id).first()
        facility_name = facility.name if facility else "Facility"
        sport_name = facility.sport.name if (facility and facility.sport) else "Sport"

        result.append(BookingOut(
            id=b.id,
            user_id=b.user_id,
            facility_id=b.facility_id,
            facility_name=facility_name,
            sport_name=sport_name,
            booking_date=b.booking_date,
            start_time=b.start_time,
            end_time=b.end_time,
            status=b.status,
            qr_code=b.qr_code,
            created_at=b.created_at,
            checked_in_at=b.checked_in_at
        ))
    return result

@router.delete("/{booking_id}")
def cancel_booking(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id, Booking.user_id == current_user.id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found or not owned by user")

    booking.status = BookingStatusEnum.CANCELLED.value
    
    # Check if there is a waitlist for this facility & date & time -> Auto promote!
    next_waitlist = (
        db.query(Waitlist)
        .filter(
            Waitlist.facility_id == booking.facility_id,
            Waitlist.booking_date == booking.booking_date,
            Waitlist.start_time == booking.start_time,
            Waitlist.status == WaitlistStatusEnum.WAITING.value
        )
        .order_by(Waitlist.position.asc())
        .first()
    )

    promoted_msg = ""
    if next_waitlist:
        next_waitlist.status = WaitlistStatusEnum.PROMOTED.value
        # Create new confirmed booking for waitlisted user
        promoted_booking = Booking(
            user_id=next_waitlist.user_id,
            facility_id=next_waitlist.facility_id,
            booking_date=next_waitlist.booking_date,
            start_time=next_waitlist.start_time,
            end_time=booking.end_time,
            status=BookingStatusEnum.CONFIRMED.value,
            qr_code=f"CSH-QR-{uuid.uuid4().hex[:10].upper()}"
        )
        db.add(promoted_booking)
        
        # Notify waitlisted user
        notif = Notification(
            user_id=next_waitlist.user_id,
            message=f"🎉 Good news! A slot opened for {next_waitlist.facility.name} on {next_waitlist.booking_date} at {next_waitlist.start_time}. Your booking has been automatically confirmed!",
            type="WAITLIST_PROMOTION"
        )
        db.add(notif)
        promoted_msg = f" Waitlist user #{next_waitlist.position} was automatically promoted and notified."

    db.commit()
    return {"message": f"Booking successfully cancelled.{promoted_msg}"}

@router.post("/{booking_id}/checkin")
def checkin_booking(
    booking_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin-only endpoint: mark a booking as CHECKED_IN after scanning player QR pass."""
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status == BookingStatusEnum.CHECKED_IN.value:
        return {"message": "Player is already checked in!", "status": "CHECKED_IN"}

    if booking.status == BookingStatusEnum.CANCELLED.value:
        raise HTTPException(status_code=400, detail="Cannot check in a cancelled booking")

    booking.status = BookingStatusEnum.CHECKED_IN.value
    booking.checked_in_at = datetime.now(timezone.utc)

    # Notify the student their entry was approved
    notif = Notification(
        user_id=booking.user_id,
        message=f"✅ Entry approved by admin! You are checked in. Have a great session! 🎾🏀🏸",
        type="CHECKIN_SUCCESS"
    )
    db.add(notif)
    db.commit()

    return {"message": "Check-in approved successfully! Player has been granted entry.", "status": "CHECKED_IN"}
