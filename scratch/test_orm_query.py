import sys
import os

backend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
sys.path.insert(0, backend_path)

from app.database.session import SessionLocal
from app.models.models import User, Sport, Booking, Coach, Tournament

db = SessionLocal()
try:
    user_count = db.query(User).count()
    sport_count = db.query(Sport).count()
    booking_count = db.query(Booking).count()
    coach_count = db.query(Coach).count()
    tournament_count = db.query(Tournament).count()
    
    sample_sports = [s.name for s in db.query(Sport).limit(5).all()]
    admin_user = db.query(User).filter(User.role == "admin").first()
    
    print("ORM Verification: SUCCESS")
    print(f"  - Users       : {user_count} (Admin present: {admin_user.email if admin_user else 'None'})")
    print(f"  - Sports      : {sport_count} ({', '.join(sample_sports)})")
    print(f"  - Bookings    : {booking_count}")
    print(f"  - Coaches     : {coach_count}")
    print(f"  - Tournaments : {tournament_count}")
except Exception as e:
    print(f"ORM Verification failed: {e}")
    sys.exit(1)
finally:
    db.close()
