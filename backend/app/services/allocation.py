from sqlalchemy.orm import Session
from app.models.models import Booking, BookingStatusEnum, Waitlist, AllocationPolicy, User

class FairAllocationEngine:
    def calculate_fairness_score(self, db: Session, user_id: int) -> float:
        """
        Calculates a student's priority score based on configurable fairness rules:
        Higher score = Higher priority.
        """
        # Fetch current policy or default
        policy = db.query(AllocationPolicy).first()
        if not policy:
            usage_w = 0.30
            waitlist_w = 0.30
            peak_w = 0.20
            noshow_w = 0.20
        else:
            usage_w = policy.usage_weight
            waitlist_w = policy.waitlist_weight
            peak_w = policy.peak_weight
            noshow_w = policy.noshow_weight

        # 1. Total confirmed/completed bookings in last 30 days (lower usage gives higher priority score)
        total_user_bookings = db.query(Booking).filter(Booking.user_id == user_id).count()
        usage_factor = max(0.0, 1.0 - (total_user_bookings / 20.0))  # Scale up to 20 bookings

        # 2. Waitlist history & time
        total_waitlists = db.query(Waitlist).filter(Waitlist.user_id == user_id).count()
        waitlist_factor = min(1.0, total_waitlists / 5.0)

        # 3. Peak hour booking frequency
        peak_bookings = db.query(Booking).filter(
            Booking.user_id == user_id,
            Booking.start_time.in_(["17:00", "18:00", "19:00", "20:00"])
        ).count()
        peak_factor = max(0.0, 1.0 - (peak_bookings / 10.0))

        # 4. No-show penalty
        no_shows = db.query(Booking).filter(
            Booking.user_id == user_id,
            Booking.status == BookingStatusEnum.NO_SHOW.value
        ).count()
        noshow_factor = max(0.0, 1.0 - (no_shows * 0.25))

        # Weighted priority score (0.0 to 100.0)
        final_score = (
            (usage_factor * usage_w) +
            (waitlist_factor * waitlist_w) +
            (peak_factor * peak_w) +
            (noshow_factor * noshow_w)
        ) * 100.0

        return round(final_score, 1)

allocation_engine = FairAllocationEngine()
