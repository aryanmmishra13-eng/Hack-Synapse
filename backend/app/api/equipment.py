from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel

from app.database.session import get_db
from app.models.models import Equipment, EquipmentRental, Sport, Booking, User
from app.schemas.schemas import EquipmentOut, EquipmentRentalOut, EquipmentCreate
from app.api.auth import get_current_user, get_current_admin

router = APIRouter(prefix="/api/equipment", tags=["Equipment Rental"])

@router.get("", response_model=List[EquipmentOut])
def get_equipment(sport_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Equipment)
    if sport_id:
        query = query.filter(Equipment.sport_id == sport_id)
    
    items = query.all()
    results = []
    for item in items:
        sport = db.query(Sport).filter(Sport.id == item.sport_id).first()
        results.append(EquipmentOut(
            id=item.id,
            sport_id=item.sport_id,
            sport_name=sport.name if sport else "Sport",
            name=item.name,
            total_qty=item.total_qty,
            available_qty=item.available_qty,
            rented_qty=item.rented_qty,
            maintenance_qty=item.maintenance_qty,
            damaged_qty=item.damaged_qty,
            lost_qty=item.lost_qty or 0,
            rental_fee=item.rental_fee,
            deposit_fee=item.deposit_fee or 0.0
        ))
    return results

@router.get("/my-rentals")
def get_my_rentals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rentals = (
        db.query(EquipmentRental)
        .join(Booking)
        .filter(Booking.user_id == current_user.id)
        .order_by(EquipmentRental.id.desc())
        .all()
    )

    results = []
    for r in rentals:
        eq = db.query(Equipment).filter(Equipment.id == r.equipment_id).first()
        booking = db.query(Booking).filter(Booking.id == r.booking_id).first()
        sport_name = eq.sport.name if (eq and eq.sport) else "Sport"
        results.append({
            "id": r.id,
            "booking_id": r.booking_id,
            "facility_name": booking.facility.name if (booking and booking.facility) else "Court",
            "booking_date": booking.booking_date if booking else "",
            "slot_time": f"{booking.start_time} - {booking.end_time}" if booking else "",
            "equipment_id": r.equipment_id,
            "equipment_name": eq.name if eq else "Equipment",
            "sport_name": sport_name,
            "quantity": r.quantity,
            "status": r.status,
            "deposit": r.deposit or 0.0,
            "expected_return_time": r.expected_return_time or (booking.end_time if booking else ""),
            "rented_at": r.rented_at,
            "returned_at": r.returned_at
        })
    return results

class RentRequest(BaseModel):
    equipment_id: int
    quantity: int = 1
    booking_id: Optional[int] = None
    expected_return_time: Optional[str] = "20:00"

class ReturnRequest(BaseModel):
    condition: Optional[str] = "GOOD"

class ManageEquipmentRequest(BaseModel):
    action: Optional[str] = "UPDATE"
    quantity: Optional[int] = 1
    condition: Optional[str] = "GOOD"
    available_qty: Optional[int] = None

@router.post("/rent")
def rent_equipment(
    rent_in: RentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    equipment = db.query(Equipment).filter(Equipment.id == rent_in.equipment_id).first()
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment item not found")

    if equipment.available_qty < rent_in.quantity:
        raise HTTPException(status_code=400, detail=f"Only {equipment.available_qty} {equipment.name}(s) available for rental")

    # If no booking_id passed, attach to user's most recent confirmed booking, or any active booking
    target_booking_id = rent_in.booking_id
    if not target_booking_id:
        active_booking = (
            db.query(Booking)
            .filter(Booking.user_id == current_user.id)
            .order_by(Booking.id.desc())
            .first()
        )
        if active_booking:
            target_booking_id = active_booking.id
        else:
            # Fallback to first available booking in system or create standalone
            any_b = db.query(Booking).first()
            target_booking_id = any_b.id if any_b else 1

    equipment.available_qty -= rent_in.quantity
    equipment.rented_qty += rent_in.quantity

    rental = EquipmentRental(
        booking_id=target_booking_id,
        equipment_id=rent_in.equipment_id,
        quantity=rent_in.quantity,
        status="CHECKED_OUT",
        deposit=equipment.deposit_fee or 0.0,
        expected_return_time=rent_in.expected_return_time or "20:00"
    )
    db.add(rental)
    db.commit()
    db.refresh(rental)

    return {
        "message": f"Successfully rented {rent_in.quantity}x {equipment.name}!",
        "rental_id": rental.id,
        "booking_id": target_booking_id,
        "available_remaining": equipment.available_qty
    }

@router.post("/return/{rental_id}")
def return_equipment(
    rental_id: int,
    ret_in: Optional[ReturnRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rental = db.query(EquipmentRental).filter(EquipmentRental.id == rental_id).first()
    if not rental:
        raise HTTPException(status_code=404, detail="Rental record not found")

    if rental.status == "RETURNED":
        return {"message": "Equipment has already been returned"}

    eq = db.query(Equipment).filter(Equipment.id == rental.equipment_id).first()
    if eq:
        eq.rented_qty = max(0, eq.rented_qty - rental.quantity)
        eq.available_qty = min(eq.total_qty, eq.available_qty + rental.quantity)

    rental.status = "RETURNED"
    rental.returned_at = datetime.now(timezone.utc)
    db.commit()

    return {"message": f"Successfully returned {rental.quantity}x {eq.name if eq else 'equipment'}!", "rental_id": rental.id}

@router.get("/admin/inventory", response_model=List[EquipmentOut])
def admin_get_inventory(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    return get_equipment(db=db)

@router.post("/admin/create", response_model=EquipmentOut)
def admin_create_equipment(
    eq_in: EquipmentCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    new_eq = Equipment(
        sport_id=eq_in.sport_id,
        name=eq_in.name,
        total_qty=eq_in.total_qty,
        available_qty=eq_in.total_qty,
        rented_qty=0,
        maintenance_qty=0,
        damaged_qty=0,
        lost_qty=0,
        rental_fee=eq_in.rental_fee,
        deposit_fee=eq_in.deposit_fee
    )
    db.add(new_eq)
    db.commit()
    db.refresh(new_eq)

    sport = db.query(Sport).filter(Sport.id == new_eq.sport_id).first()
    return EquipmentOut(
        id=new_eq.id,
        sport_id=new_eq.sport_id,
        sport_name=sport.name if sport else "Sport",
        name=new_eq.name,
        total_qty=new_eq.total_qty,
        available_qty=new_eq.available_qty,
        rented_qty=new_eq.rented_qty,
        maintenance_qty=new_eq.maintenance_qty,
        damaged_qty=new_eq.damaged_qty,
        lost_qty=new_eq.lost_qty,
        rental_fee=new_eq.rental_fee,
        deposit_fee=new_eq.deposit_fee
    )

@router.post("/admin/manage/{equipment_id}")
def admin_update_equipment_status(
    equipment_id: int,
    payload: Optional[dict] = None,
    action: Optional[str] = None,
    amount: int = 1,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    eq = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not eq:
        raise HTTPException(status_code=404, detail="Equipment item not found")

    act = (payload.get("action") if payload else action) or "UPDATE"
    qty = int((payload.get("quantity") if payload else amount) or 1)

    if act in ["MARK_DAMAGED", "DAMAGED"]:
        sub_qty = min(eq.available_qty, qty)
        eq.available_qty -= sub_qty
        eq.damaged_qty += sub_qty
    elif act in ["MARK_MAINTENANCE", "MAINTENANCE"]:
        sub_qty = min(eq.available_qty, qty)
        eq.available_qty -= sub_qty
        eq.maintenance_qty += sub_qty
    elif act in ["MARK_LOST", "LOST"]:
        sub_qty = min(eq.available_qty, qty)
        eq.available_qty -= sub_qty
        eq.lost_qty = (eq.lost_qty or 0) + sub_qty
    elif act in ["MARK_AVAILABLE", "AVAILABLE"]:
        if eq.maintenance_qty > 0:
            sub_qty = min(eq.maintenance_qty, qty)
            eq.maintenance_qty -= sub_qty
            eq.available_qty += sub_qty
        elif eq.damaged_qty > 0:
            sub_qty = min(eq.damaged_qty, qty)
            eq.damaged_qty -= sub_qty
            eq.available_qty += sub_qty
    elif act in ["UPDATE_QTY", "UPDATE"]:
        if payload and payload.get("available_qty") is not None:
            eq.available_qty = int(payload.get("available_qty"))
        else:
            eq.total_qty = max(0, qty)
            eq.available_qty = max(0, eq.total_qty - eq.rented_qty - eq.maintenance_qty - eq.damaged_qty - (eq.lost_qty or 0))

    db.commit()
    return {
        "message": f"Equipment '{eq.name}' inventory updated successfully!",
        "available": eq.available_qty,
        "total": eq.total_qty,
        "rented": eq.rented_qty,
        "maintenance": eq.maintenance_qty,
        "damaged": eq.damaged_qty,
        "lost": eq.lost_qty or 0
    }

