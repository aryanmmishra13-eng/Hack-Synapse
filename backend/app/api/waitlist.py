from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database.session import get_db
from app.models.models import Waitlist, WaitlistStatusEnum, Facility, User, Notification
from app.schemas.schemas import WaitlistCreate, WaitlistOut
from app.api.auth import get_current_user

router = APIRouter(prefix="/api/waitlist", tags=["Waitlist"])

@router.post("", response_model=WaitlistOut)
def join_waitlist(
    waitlist_in: WaitlistCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    facility = db.query(Facility).filter(Facility.id == waitlist_in.facility_id).first()
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")

    # Check existing waitlist entry
    existing = db.query(Waitlist).filter(
        Waitlist.user_id == current_user.id,
        Waitlist.facility_id == waitlist_in.facility_id,
        Waitlist.booking_date == waitlist_in.booking_date,
        Waitlist.start_time == waitlist_in.start_time,
        Waitlist.status == WaitlistStatusEnum.WAITING.value
    ).first()

    if existing:
        users_ahead = db.query(Waitlist).filter(
            Waitlist.facility_id == waitlist_in.facility_id,
            Waitlist.booking_date == waitlist_in.booking_date,
            Waitlist.start_time == waitlist_in.start_time,
            Waitlist.status == WaitlistStatusEnum.WAITING.value,
            Waitlist.position < existing.position
        ).count()

        return WaitlistOut(
            id=existing.id,
            user_id=existing.user_id,
            facility_id=existing.facility_id,
            facility_name=facility.name,
            sport_name=facility.sport.name if facility.sport else "",
            booking_date=existing.booking_date,
            start_time=existing.start_time,
            position=existing.position,
            status=existing.status,
            users_ahead=users_ahead
        )

    # Determine position
    count = db.query(Waitlist).filter(
        Waitlist.facility_id == waitlist_in.facility_id,
        Waitlist.booking_date == waitlist_in.booking_date,
        Waitlist.start_time == waitlist_in.start_time,
        Waitlist.status == WaitlistStatusEnum.WAITING.value
    ).count()

    new_pos = count + 1

    new_waitlist = Waitlist(
        user_id=current_user.id,
        facility_id=waitlist_in.facility_id,
        booking_date=waitlist_in.booking_date,
        start_time=waitlist_in.start_time,
        position=new_pos,
        status=WaitlistStatusEnum.WAITING.value
    )
    db.add(new_waitlist)
    
    # Send confirmation notification
    notif = Notification(
        user_id=current_user.id,
        message=f"Added to waitlist position #{new_pos} for {facility.name} on {waitlist_in.booking_date} at {waitlist_in.start_time}.",
        type="WAITLIST"
    )
    db.add(notif)
    db.commit()
    db.refresh(new_waitlist)

    return WaitlistOut(
        id=new_waitlist.id,
        user_id=new_waitlist.user_id,
        facility_id=new_waitlist.facility_id,
        facility_name=facility.name,
        sport_name=facility.sport.name if facility.sport else "",
        booking_date=new_waitlist.booking_date,
        start_time=new_waitlist.start_time,
        position=new_waitlist.position,
        status=new_waitlist.status,
        users_ahead=new_pos - 1
    )

@router.get("/my", response_model=List[WaitlistOut])
def get_my_waitlist(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    entries = db.query(Waitlist).filter(Waitlist.user_id == current_user.id).all()
    result = []
    for e in entries:
        facility = db.query(Facility).filter(Facility.id == e.facility_id).first()
        users_ahead = db.query(Waitlist).filter(
            Waitlist.facility_id == e.facility_id,
            Waitlist.booking_date == e.booking_date,
            Waitlist.start_time == e.start_time,
            Waitlist.status == WaitlistStatusEnum.WAITING.value,
            Waitlist.position < e.position
        ).count()

        result.append(WaitlistOut(
            id=e.id,
            user_id=e.user_id,
            facility_id=e.facility_id,
            facility_name=facility.name if facility else "Facility",
            sport_name=facility.sport.name if (facility and facility.sport) else "Sport",
            booking_date=e.booking_date,
            start_time=e.start_time,
            position=e.position,
            status=e.status,
            users_ahead=users_ahead
        ))
    return result
