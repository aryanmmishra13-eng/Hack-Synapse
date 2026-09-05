import os
import sys
import random
from datetime import datetime, timedelta, timezone

# Add parent directory to sys.path so we can import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database.session import SessionLocal, engine
from app.database.base import Base
from app.models.models import (
    User, RoleEnum, SkillLevelEnum, Sport, Facility, FacilityStatusEnum,
    Booking, BookingStatusEnum, Waitlist, WaitlistStatusEnum, Game, GameStatusEnum, GamePlayer,
    Notification, AllocationPolicy, Equipment, EquipmentRental, Coach, CoachStudent,
    TrainingSession, TrainingAttendance, PerformanceAssessment, PerformanceScore,
    Tournament, TournamentTeam, TournamentPlayer, TournamentMatch,
    Medal, Achievement, StudentAchievement, WeatherLog, FitnessActivity
)
from app.core.security import get_password_hash

def seed_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    print("[SEED] Seeding Campus Sports Hub Database...")

    # 1. Seed Users (50+ Students, 8+ Coaches, 1 Admin)
    demo_student_pw = get_password_hash("password123")
    demo_admin_pw = get_password_hash("admin123")
    demo_coach_pw = get_password_hash("coach123")

    student_demo = User(
        name="Aryan Sharma",
        email="student@campus.com",
        password_hash=demo_student_pw,
        role=RoleEnum.STUDENT.value,
        skill_level=SkillLevelEnum.INTERMEDIATE.value,
        preferred_sport="Badminton"
    )
    admin_demo = User(
        name="Campus Sports Admin",
        email="admin@campus.com",
        password_hash=demo_admin_pw,
        role=RoleEnum.ADMIN.value,
        skill_level=SkillLevelEnum.ADVANCED.value,
        preferred_sport="Tennis"
    )

    db.add(student_demo)
    db.add(admin_demo)

    # 52 Additional Students (Total 53 Students)
    student_names = [
        "Rahul Verma", "Priya Patel", "Ananya Singh", "Rohan Mehta", "Sneha Gupta", 
        "Karan Kumar", "Vikram Das", "Neha Reddy", "Aman Joshi", "Divya Nair",
        "Kabir Roy", "Tanvi Shah", "Siddharth Malhotra", "Isha Agarwal", "Rishabh Pant",
        "Hardik Pandya", "Shubman Gill", "K L Rahul", "Jasprit Bumrah", "Ravindra Jadeja",
        "Smriti Mandhana", "Harmanpreet Kaur", "Jemimah Rodrigues", "Shafali Verma", "Deepti Sharma",
        "Sanju Samson", "Yuzvendra Chahal", "Mohammed Shami", "Kuldeep Yadav", "Surya Kumar",
        "Manish Pandey", "Axar Patel", "Shardul Thakur", "Deepak Chahar", "Ishan Kishan",
        "Prithvi Shaw", "Washington Sundar", "Ruturaj Gaikwad", "Devdutt Padikkal", "Arshdeep Singh",
        "Umran Malik", "Tilak Varma", "Rinku Singh", "Yashasvi Jaiswal", "Jitesh Sharma",
        "Mukesh Kumar", "Avesh Khan", "Ravi Bishnoi", "Shivam Dube", "Dhruv Jurel", "Mayank Yadav", "Nitish Reddy"
    ]

    sports_prefs = ["Badminton", "Football", "Basketball", "Tennis", "Volleyball", "Cricket", "Gym"]
    skills = ["Beginner", "Intermediate", "Advanced"]

    students = [student_demo]
    for i, name in enumerate(student_names):
        u = User(
            name=name,
            email=f"student{i+1}@campus.edu",
            password_hash=demo_student_pw,
            role=RoleEnum.STUDENT.value,
            skill_level=skills[i % 3],
            preferred_sport=sports_prefs[i % len(sports_prefs)]
        )
        db.add(u)
        students.append(u)

    db.commit()
    print(f"[OK] Created Demo Accounts & {len(students)} Students")

    # 2. Seed Sports (7 Sports)
    sports_data = [
        {"name": "Badminton", "desc": "Indoor wooden courts with professional LED illumination", "icon": "Activity", "is_outdoor": False},
        {"name": "Football", "desc": "Full-size synthetic turf and grass pitch grounds", "icon": "CircleDot", "is_outdoor": True},
        {"name": "Basketball", "desc": "Hardwood indoor and outdoor acrylic courts", "icon": "Dumbbell", "is_outdoor": False},
        {"name": "Tennis", "desc": "Championship hard courts with night floodlights", "icon": "Trophy", "is_outdoor": True},
        {"name": "Volleyball", "desc": "Standard beach & indoor wooden floor courts", "icon": "Target", "is_outdoor": False},
        {"name": "Cricket", "desc": "Practice turf nets & campus cricket pavilion", "icon": "Zap", "is_outdoor": True},
        {"name": "Gym", "desc": "High-performance strength & cardio zone", "icon": "Flame", "is_outdoor": False}
    ]

    sports_db = {}
    for s_info in sports_data:
        sp = Sport(
            name=s_info["name"],
            description=s_info["desc"],
            icon_name=s_info["icon"],
            is_outdoor=s_info["is_outdoor"]
        )
        db.add(sp)
        db.commit()
        db.refresh(sp)
        sports_db[s_info["name"]] = sp

    # 3. Seed Facilities (15 Facilities)
    facilities_list = [
        ("Badminton", "Badminton Court 1", 4, "Indoor Sports Complex Hall A"),
        ("Badminton", "Badminton Court 2", 4, "Indoor Sports Complex Hall A"),
        ("Badminton", "Badminton Court 3", 4, "Indoor Sports Complex Hall A"),
        ("Badminton", "Badminton Court 4", 4, "Indoor Sports Complex Hall B"),
        ("Badminton", "Badminton Court 5", 4, "Indoor Sports Complex Hall B"),
        ("Football", "Football Ground Alpha", 22, "East Campus Sports Arena"),
        ("Football", "Football Ground Beta", 22, "West Athletic Turf"),
        ("Basketball", "Basketball Court 1", 10, "Student Union Arena"),
        ("Basketball", "Basketball Court 2", 10, "Student Union Arena"),
        ("Basketball", "Basketball Outdoor Court", 10, "North Campus Plaza"),
        ("Tennis", "Tennis Court 1 (Pro)", 4, "Varsity Tennis Center"),
        ("Tennis", "Tennis Court 2", 4, "Varsity Tennis Center"),
        ("Volleyball", "Volleyball Beach Arena", 12, "South Recreation Ground"),
        ("Cricket", "Cricket Practice Nets 1-4", 16, "Cricket Pavilion"),
        ("Gym", "Campus Fitness Center", 40, "Recreation Center Level 2")
    ]

    facilities_db = []
    for sp_name, f_name, cap, loc in facilities_list:
        fac = Facility(
            sport_id=sports_db[sp_name].id,
            name=f_name,
            capacity=cap,
            status=FacilityStatusEnum.ACTIVE.value,
            location=loc
        )
        db.add(fac)
        facilities_db.append(fac)

    db.commit()
    print("[OK] Created 7 Sports & 15 Facilities")

    # 4. Seed Coaches (8 Coaches across Sports)
    coaches_data = [
        {"name": "Coach Rahul Sharma", "email": "coach.rahul@campus.com", "sport": "Badminton", "exp": 9, "spec": "Singles Footwork & Smash Velocity", "cert": "BWF Level 2 Certified Coach", "bio": "Former national-level badminton player specializing in speed, anticipation, and tactical shot placement."},
        {"name": "Coach Priya Nair", "email": "coach.priya@campus.com", "sport": "Football", "exp": 7, "spec": "Midfield Playmaking & Tactical Positioning", "cert": "AFC 'B' License Coaching Diploma", "bio": "Passionate football strategist focused on spatial awareness, high-pressing transition, and endurance."},
        {"name": "Coach Vikram Rathore", "email": "coach.vikram@campus.com", "sport": "Basketball", "exp": 11, "spec": "Fast-Break Offense & Shooting Mechanics", "cert": "FIBA Level 1 Certified Instructor", "bio": "Varsity basketball head coach emphasizing defensive discipline and three-point shooting consistency."},
        {"name": "Coach Ananya Sen", "email": "coach.ananya@campus.com", "sport": "Tennis", "exp": 8, "spec": "Baseline Power & Serve Placement", "cert": "ITF Level 2 Master Coach", "bio": "Specializes in modern topspin mechanics, mental resilience during long rallies, and tournament preparation."},
        {"name": "Coach Devendra Singh", "email": "coach.dev@campus.com", "sport": "Cricket", "exp": 14, "spec": "Top-Order Batting & Bowling Economy", "cert": "BCCI Level 2 Coach", "bio": "Experienced cricket mentor with deep expertise in batting posture, spin variation, and captaincy tactics."},
        {"name": "Coach Sunita Rao", "email": "coach.sunita@campus.com", "sport": "Volleyball", "exp": 6, "spec": "Spike Trajectory & Quick Reflex Defense", "cert": "FIVB Level 1 Certified Coach", "bio": "Dedicated volleyball trainer specializing in vertical jump enhancement and team blocking structures."},
        {"name": "Coach Michael Chang", "email": "coach.michael@campus.com", "sport": "Gym", "exp": 10, "spec": "Functional Strength & Athletic Conditioning", "cert": "CSCS Certified Strength Specialist", "bio": "Elite strength coach designing periodized athletic programming for university varsity teams."},
        {"name": "Coach Meera Joshi", "email": "coach.meera@campus.com", "sport": "Badminton", "exp": 5, "spec": "Doubles Chemistry & Net Play", "cert": "BWF Level 1 Coach", "bio": "Focused on developing fast-twitch reactions, net taps, and mixed-doubles strategic rotations."}
    ]

    coaches_db = []
    for c_info in coaches_data:
        u_coach = User(
            name=c_info["name"],
            email=c_info["email"],
            password_hash=demo_coach_pw,
            role=RoleEnum.COACH.value,
            skill_level="Advanced",
            preferred_sport=c_info["sport"]
        )
        db.add(u_coach)
        db.commit()
        db.refresh(u_coach)

        coach_profile = Coach(
            user_id=u_coach.id,
            sport_id=sports_db[c_info["sport"]].id,
            experience_years=c_info["exp"],
            specialization=c_info["spec"],
            certifications=c_info["cert"],
            weekly_sessions=6,
            bio=c_info["bio"]
        )
        db.add(coach_profile)
        db.commit()
        db.refresh(coach_profile)
        coaches_db.append(coach_profile)

    # Assign students to coaches
    for i, st in enumerate(students):
        assigned_coach = coaches_db[i % len(coaches_db)]
        cs = CoachStudent(coach_id=assigned_coach.id, student_id=st.id)
        db.add(cs)

    db.commit()
    print(f"[OK] Created {len(coaches_db)} Coaches & Athlete Assignments")

    # 5. Seed Equipment (32 Equipment Items across all sports)
    equipment_items_data = [
        ("Badminton", "Yonex Astrox 88D Pro Racket", 35, 1.5, 5.0),
        ("Badminton", "Li-Ning G-Force Feather Shuttle Tube (12)", 50, 2.0, 0.0),
        ("Badminton", "Yonex Nanoflare 700 Racket", 25, 1.5, 5.0),
        ("Badminton", "Badminton Non-Marking Shoes (Sizes 7-11)", 20, 1.0, 10.0),
        ("Badminton", "Agility Ladder & Training Cones Set", 15, 0.0, 5.0),

        ("Football", "Adidas FIFA Pro Match Ball (Size 5)", 30, 0.0, 5.0),
        ("Football", "Puma Training Cones & Slalom Poles", 25, 0.0, 2.0),
        ("Football", "Nike Vapor Grip Goalkeeper Gloves", 12, 1.0, 8.0),
        ("Football", "Football Shin Guards Pair", 40, 0.5, 2.0),
        ("Football", "Tactical Training Mesh Bibs (Set of 10)", 20, 0.0, 0.0),

        ("Basketball", "Spalding NBA Official Leather Ball (Size 7)", 30, 0.0, 5.0),
        ("Basketball", "Wilson Evolution Game Basketball (Size 6)", 20, 0.0, 5.0),
        ("Basketball", "Basketball Rebounding Training Belt", 10, 1.0, 5.0),
        ("Basketball", "Dribbling Blindfold & Heavy Trainer Ball", 12, 0.5, 5.0),

        ("Tennis", "Wilson Pro Staff 97 Racket", 25, 2.0, 10.0),
        ("Tennis", "Babolat Pure Drive Racket", 25, 2.0, 10.0),
        ("Tennis", "Head Tour Tennis Ball Can (4 Balls)", 60, 1.5, 0.0),
        ("Tennis", "Tennis Ball Hopper & Pick-up Basket", 10, 0.0, 5.0),

        ("Cricket", "SG Full Size English Willow Bat (Player Grade)", 18, 2.5, 15.0),
        ("Cricket", "SS Kashmir Willow Club Bat", 25, 1.5, 10.0),
        ("Cricket", "Cricket Leather Balls (Red/White Box of 6)", 40, 2.0, 0.0),
        ("Cricket", "Shrey Master Class Cricket Helmet", 15, 1.0, 10.0),
        ("Cricket", "SG Pro Batting Leg Pads Pair", 20, 1.0, 10.0),
        ("Cricket", "Kookaburra Wicket Keeping Gloves & Inners", 10, 1.5, 10.0),
        ("Cricket", "Batting Gloves Pair (Right & Left Handed)", 25, 0.5, 5.0),

        ("Volleyball", "Mikasa V200W Official Game Ball", 25, 0.0, 5.0),
        ("Volleyball", "Molten Indoor Volleyball", 25, 0.0, 5.0),
        ("Volleyball", "Volleyball Knee Pads Pair", 30, 0.5, 2.0),
        ("Volleyball", "Antenna & Court Boundary Indicator Set", 8, 0.0, 5.0),

        ("Gym", "Olympic Barbell & Bumper Plate Set (100kg)", 10, 0.0, 0.0),
        ("Gym", "Leather Weightlifting Belt", 20, 0.5, 5.0),
        ("Gym", "High-Resistance Loop Bands Set", 35, 0.0, 2.0)
    ]

    equipment_db = []
    for sp_name, eq_name, qty, fee, dep in equipment_items_data:
        rented = random.randint(2, min(8, qty // 3))
        maint = random.randint(0, 2)
        damaged = random.randint(0, 1)
        avail = qty - rented - maint - damaged

        eq = Equipment(
            sport_id=sports_db[sp_name].id,
            name=eq_name,
            total_qty=qty,
            available_qty=avail,
            rented_qty=rented,
            maintenance_qty=maint,
            damaged_qty=damaged,
            lost_qty=0,
            rental_fee=fee,
            deposit_fee=dep
        )
        db.add(eq)
        equipment_db.append(eq)

    db.commit()
    print(f"[OK] Created {len(equipment_db)} Equipment Inventory Items")

    # 6. Seed Bookings (120+ Bookings) & Equipment Rentals
    today = datetime.now()
    dates = [(today + timedelta(days=d)).strftime("%Y-%m-%d") for d in range(-10, 8)]
    time_slots = ["06:00", "08:00", "10:00", "14:00", "16:00", "17:00", "18:00", "19:00", "20:00"]

    created_bookings = []
    for d in dates:
        for f in facilities_db:
            chosen_slots = random.sample(time_slots, random.randint(1, 3))
            for t in chosen_slots:
                h = int(t.split(":")[0])
                u = random.choice(students)
                if d < today.strftime("%Y-%m-%d"):
                    status = BookingStatusEnum.CHECKED_IN.value
                elif d == today.strftime("%Y-%m-%d"):
                    status = random.choice([BookingStatusEnum.CONFIRMED.value, BookingStatusEnum.CHECKED_IN.value])
                else:
                    status = BookingStatusEnum.CONFIRMED.value

                b = Booking(
                    user_id=u.id,
                    facility_id=f.id,
                    booking_date=d,
                    start_time=t,
                    end_time=f"{h+1:02d}:00",
                    status=status,
                    qr_code=f"CSH-QR-{random.randint(100000, 999999)}"
                )
                db.add(b)
                created_bookings.append(b)

    db.commit()

    # Attach equipment rentals to 35+ bookings
    for b in created_bookings[:40]:
        sport = db.query(Facility).filter(Facility.id == b.facility_id).first().sport
        sport_eq = [e for e in equipment_db if e.sport_id == sport.id]
        if sport_eq:
            chosen_eq = random.choice(sport_eq)
            r = EquipmentRental(
                booking_id=b.id,
                equipment_id=chosen_eq.id,
                quantity=random.randint(1, 2),
                status="RETURNED" if b.status == "CHECKED_IN" and b.booking_date < today.strftime("%Y-%m-%d") else "RENTED",
                deposit=chosen_eq.deposit_fee,
                expected_return_time=b.end_time
            )
            db.add(r)

    db.commit()
    print(f"[OK] Created {len(created_bookings)} Bookings & 40 Connected Equipment Rentals")

    # 7. Seed Training Sessions (35+ Sessions) & Student Attendance Records
    training_titles = [
        ("Badminton", "Smash Power & Footwork Agility Clinic", "Drills focused on scissor jump smashes, recovery steps, and defensive backhand lifts."),
        ("Badminton", "High-Tempo Doubles Rotation & Net Taps", "Fast-paced flat rally drills, intercepting pushes at the net, and rotation timing."),
        ("Football", "Counter-Attack Transition & Finishing Drills", "3v2 and 4v3 counter-press transition exercises followed by first-time box finishing."),
        ("Football", "Set-Piece Tactics & Defensive Wall Positioning", "Corner kick delivery schemes, near-post flick routines, and defensive zone coverage."),
        ("Basketball", "Pick & Roll Execution & 3-Point Shot Mechanics", "Screen setting angles, pocket passes, pick-and-pop spacing, and catch-and-shoot reps."),
        ("Basketball", "Fast-Break Transition Defense & Box-Outs", "Preventing transition layups, communication on switch defense, and rebounding leverage."),
        ("Tennis", "Heavy Topspin Baseline Rally Consistency", "Cross-court deep rally targets, inside-out forehands, and aggressive slice defense."),
        ("Cricket", "T20 Death Overs Batting & Power Hitting", "Ramps, sweeps, clearing front leg for lofted drives, and yorker defense."),
        ("Cricket", "Fast Bowling Yorker Length & Slower Variations", "Targeting base of stumps with reverse swing and back-of-the-hand slower balls."),
        ("Volleyball", "Spike Approach Speed & 3-Meter Attacks", "Three-step explosive approach, wrist snap for downward trajectory, and tip defense."),
        ("Gym", "Varsity Athlete Deadlift & Power Clean Mechanics", "Explosive triple extension, barbell path optimization, and posterior chain loading.")
    ]

    training_sessions_db = []
    for i, (sp_name, title, desc) in enumerate(training_titles * 3 + training_titles[:2]):  # 35 sessions
        sp = sports_db[sp_name]
        fac = next((f for f in facilities_db if f.sport_id == sp.id), facilities_db[0])
        coach = next((c for c in coaches_db if c.sport_id == sp.id), coaches_db[0])
        session_d = (today + timedelta(days=(i % 14) - 5)).strftime("%Y-%m-%d")
        start_h = 7 if (i % 2 == 0) else 17

        ts = TrainingSession(
            coach_id=coach.id,
            sport_id=sp.id,
            facility_id=fac.id,
            session_date=session_d,
            start_time=f"{start_h:02d}:00",
            end_time=f"{start_h+1:02d}:30",
            title=title,
            description=desc,
            max_students=16,
            training_focus="High Performance Drills"
        )
        db.add(ts)
        training_sessions_db.append(ts)

    db.commit()

    # Seed Attendance for these sessions
    attendance_count = 0
    for ts in training_sessions_db:
        # Enroll 6 to 10 students
        att_students = random.sample(students, random.randint(6, 10))
        for st in att_students:
            status_val = random.choices(["PRESENT", "ABSENT", "EXCUSED"], weights=[80, 12, 8])[0]
            att = TrainingAttendance(
                session_id=ts.id,
                student_id=st.id,
                attended=(status_val == "PRESENT"),
                status=status_val,
                notes="Showed sharp tactical awareness and high intensity." if status_val == "PRESENT" else None
            )
            db.add(att)
            attendance_count += 1

    db.commit()
    print(f"[OK] Created {len(training_sessions_db)} Training Sessions & {attendance_count} Attendance Records")

    # 8. Seed Performance Assessments (35+ Historical Evaluations)
    sport_metrics_catalog = {
        "Badminton": ["Smash Accuracy", "Serve Accuracy", "Footwork", "Agility", "Stamina", "Reaction Time", "Rally Consistency"],
        "Football": ["Passing", "Shooting", "Sprint Speed", "Stamina", "Tackling", "Positioning"],
        "Basketball": ["Shooting", "Passing", "Dribbling", "Speed", "Rebounds", "Defense"],
        "Cricket": ["Batting", "Bowling", "Strike Rate", "Economy", "Fielding", "Reaction Time"],
        "Tennis": ["Forehand", "Backhand", "Serve Speed", "Court Mobility", "Stamina"],
        "Volleyball": ["Spiking", "Serving", "Blocking", "Digging", "Agility"],
        "Gym": ["Bench Press", "Squat Form", "Cardio Endurance", "Core Stability"]
    }

    # Focus 5 assessments specifically on Aryan Sharma to demonstrate progression
    aryan_assessments = [
        {"date": (today - timedelta(days=60)).strftime("%Y-%m-%d"), "rating": 68.0, "scores": [62, 65, 60, 64, 70, 66, 68], "obs": "Good baseline technique. Needs improved lateral footwork speed and split-step anticipation.", "rec": "Dedicate 20 mins daily to 6-corner shadow footwork."},
        {"date": (today - timedelta(days=45)).strftime("%Y-%m-%d"), "rating": 72.5, "scores": [67, 68, 66, 69, 74, 71, 72], "obs": "Footwork recovery from backhand corner has improved. Smash timing is cleaner.", "rec": "Increase jump smash repetition with high resistance bands."},
        {"date": (today - timedelta(days=30)).strftime("%Y-%m-%d"), "rating": 76.0, "scores": [73, 72, 72, 75, 78, 76, 75], "obs": "Excellent reaction time during flat drive exchanges. Backhand clears reach baseline.", "rec": "Work on net tumble variations and deception."},
        {"date": (today - timedelta(days=15)).strftime("%Y-%m-%d"), "rating": 79.5, "scores": [78, 77, 78, 80, 81, 80, 79], "obs": "Footwork improved by +18 points since start of semester. Agility is sharp and consistent.", "rec": "Ready for varsity championship competition."},
        {"date": (today - timedelta(days=2)).strftime("%Y-%m-%d"), "rating": 83.0, "scores": [82, 80, 82, 84, 85, 83, 84], "obs": "Peak tournament form. Exceptional lateral speed and tactical rally patience.", "rec": "Maintain current high-intensity match conditioning."}
    ]

    badminton_sp = sports_db["Badminton"]
    badminton_coach = coaches_db[0]

    for a_data in aryan_assessments:
        pa = PerformanceAssessment(
            student_id=student_demo.id,
            coach_id=badminton_coach.id,
            sport_id=badminton_sp.id,
            assessment_date=a_data["date"],
            overall_rating=a_data["rating"],
            observations=a_data["obs"],
            recommendations=a_data["rec"]
        )
        db.add(pa)
        db.commit()
        db.refresh(pa)

        metrics = sport_metrics_catalog["Badminton"]
        for m_name, score in zip(metrics, a_data["scores"]):
            ps = PerformanceScore(
                assessment_id=pa.id,
                metric_name=m_name,
                score=float(score),
                previous_score=float(score - random.randint(3, 7))
            )
            db.add(ps)

    # Add 30 additional assessments across other students
    for i, st in enumerate(students[1:31]):
        sp = sports_db[st.preferred_sport]
        coach = next((c for c in coaches_db if c.sport_id == sp.id), coaches_db[0])
        metrics = sport_metrics_catalog.get(sp.name, sport_metrics_catalog["Badminton"])
        base_rating = 70.0 + (i % 18)

        pa = PerformanceAssessment(
            student_id=st.id,
            coach_id=coach.id,
            sport_id=sp.id,
            assessment_date=(today - timedelta(days=(i * 2) % 30)).strftime("%Y-%m-%d"),
            overall_rating=base_rating,
            observations=f"Shows strong potential in {metrics[0]} and consistent athletic engagement.",
            recommendations=f"Target drills on {metrics[-1]} to balance overall performance profile."
        )
        db.add(pa)
        db.commit()
        db.refresh(pa)

        for m_name in metrics:
            score_val = float(random.randint(65, 88))
            ps = PerformanceScore(
                assessment_id=pa.id,
                metric_name=m_name,
                score=score_val,
                previous_score=score_val - float(random.randint(2, 6))
            )
            db.add(ps)

    db.commit()
    print("[OK] Created 35 Performance Assessments & Historical Progression Curves")

    # 9. Seed Tournaments (5 Major Tournaments)
    tournaments_data = [
        {
            "sport": "Badminton",
            "name": "Campus Badminton Championship 2026",
            "desc": "The flagship inter-departmental badminton doubles tournament featuring varsity seeds and open contenders.",
            "format": "Knockout",
            "venue": "Indoor Sports Complex Court 1 & 2",
            "start": (today - timedelta(days=2)).strftime("%Y-%m-%d"),
            "end": (today + timedelta(days=3)).strftime("%Y-%m-%d"),
            "deadline": (today - timedelta(days=5)).strftime("%Y-%m-%d"),
            "max_teams": 8,
            "status": "ONGOING",
            "rules": "Best of 3 sets to 21 points. BWF official scoring and service rules apply.",
            "prize": "Gold & Silver Medals + Trophy + $500 Campus Sports Grant"
        },
        {
            "sport": "Football",
            "name": "Inter-College Champions League",
            "desc": "Annual 11v11 university tournament contested by academic departments and sports societies.",
            "format": "League",
            "venue": "East Campus Arena (Football Ground Alpha)",
            "start": (today + timedelta(days=5)).strftime("%Y-%m-%d"),
            "end": (today + timedelta(days=15)).strftime("%Y-%m-%d"),
            "deadline": (today + timedelta(days=2)).strftime("%Y-%m-%d"),
            "max_teams": 10,
            "status": "REGISTRATION OPEN",
            "rules": "90-minute regulation matches with standard FIFA laws. 3 points for win, 1 for draw.",
            "prize": "University Rolling Trophy & Commemorative Medals"
        },
        {
            "sport": "Cricket",
            "name": "Campus T20 Super Cup",
            "desc": "High-intensity white ball T20 cricket tournament under stadium pavilion lights.",
            "format": "Group + Knockout",
            "venue": "Main Cricket Pavilion Oval",
            "start": (today + timedelta(days=10)).strftime("%Y-%m-%d"),
            "end": (today + timedelta(days=20)).strftime("%Y-%m-%d"),
            "deadline": (today + timedelta(days=6)).strftime("%Y-%m-%d"),
            "max_teams": 8,
            "status": "UPCOMING",
            "rules": "20 overs per side, maximum 4 overs per bowler. Powerplay overs 1-6.",
            "prize": "T20 Gold Cup & Best Batsman / Bowler Awards"
        },
        {
            "sport": "Tennis",
            "name": "Varsity Hardcourt Tennis Open",
            "desc": "Singles and doubles knockout bracket championship on the championship hardcourts.",
            "format": "Knockout",
            "venue": "Varsity Tennis Center (Court 1 & 2)",
            "start": (today - timedelta(days=12)).strftime("%Y-%m-%d"),
            "end": (today - timedelta(days=8)).strftime("%Y-%m-%d"),
            "deadline": (today - timedelta(days=15)).strftime("%Y-%m-%d"),
            "max_teams": 8,
            "status": "COMPLETED",
            "rules": "Best of 3 sets with tiebreaker at 6-6 in all sets.",
            "prize": "Championship Trophy & Gold Medals"
        },
        {
            "sport": "Basketball",
            "name": "3v3 Spring Jam Hoops",
            "desc": "Fast-paced half-court 3v3 basketball showdown with 12-minute running clocks.",
            "format": "Knockout",
            "venue": "Student Union Basketball Arena",
            "start": (today + timedelta(days=7)).strftime("%Y-%m-%d"),
            "end": (today + timedelta(days=9)).strftime("%Y-%m-%d"),
            "deadline": (today + timedelta(days=4)).strftime("%Y-%m-%d"),
            "max_teams": 8,
            "status": "REGISTRATION OPEN",
            "rules": "12-minute game or first team to 21 points. 1 point inside the arc, 2 points beyond.",
            "prize": "Champions Banner & Sports Gear Vouchers"
        }
    ]

    tournaments_db = []
    for t_data in tournaments_data:
        t = Tournament(
            sport_id=sports_db[t_data["sport"]].id,
            name=t_data["name"],
            description=t_data["desc"],
            format=t_data["format"],
            venue=t_data["venue"],
            start_date=t_data["start"],
            end_date=t_data["end"],
            registration_deadline=t_data["deadline"],
            max_teams=t_data["max_teams"],
            max_players_per_team=4,
            rules=t_data["rules"],
            prize_info=t_data["prize"],
            status=t_data["status"]
        )
        db.add(t)
        db.commit()
        db.refresh(t)
        tournaments_db.append(t)

    # 10. Seed Teams & Bracket Matches for Campus Badminton Championship
    badminton_tourn = tournaments_db[0]
    team_names = [
        "Smash Titans (Aryan / Mayank)", "Thunder Shuttles (Rahul / Shivansh)",
        "Net Ninjas (Priya / Sneha)", "Court Conquerors (Karan / Vikram)",
        "Ace Spikers (Ananya / Divya)", "Aero Strikers (Aman / Rohan)",
        "Feather Kings (Kabir / Tanvi)", "Velocity Duo (Siddharth / Isha)"
    ]

    badminton_teams = []
    for i, tname in enumerate(team_names):
        captain = students[i]
        team = TournamentTeam(
            tournament_id=badminton_tourn.id,
            team_name=tname,
            captain_id=captain.id,
            status="CONFIRMED",
            wins=2 if i == 0 else (1 if i == 1 else 0),
            losses=0 if i in [0, 1] else 1,
            points=6 if i == 0 else (3 if i == 1 else 0),
            matches_played=2 if i in [0, 1] else 1
        )
        db.add(team)
        db.commit()
        db.refresh(team)
        badminton_teams.append(team)

        # Add players
        partner = students[(i + 8) % len(students)]
        db.add(TournamentPlayer(team_id=team.id, student_id=captain.id))
        db.add(TournamentPlayer(team_id=team.id, student_id=partner.id))

    db.commit()

    # Create Bracket Tree: Final -> Semi Finals -> Quarter Finals
    # 1. Final
    final_match = TournamentMatch(
        tournament_id=badminton_tourn.id,
        round_name="Final",
        team1_id=badminton_teams[0].id,  # Smash Titans (Aryan)
        team2_id=badminton_teams[1].id,  # Thunder Shuttles (Rahul)
        score_team1=21,
        score_team2=17,
        winner_team_id=badminton_teams[0].id,
        status="LIVE",
        match_date=today.strftime("%Y-%m-%d"),
        start_time="19:00",
        venue="Court 1 (Championship Mat)"
    )
    db.add(final_match)
    db.commit()
    db.refresh(final_match)

    # 2. Semi Finals (linked to final)
    semi1 = TournamentMatch(
        tournament_id=badminton_tourn.id,
        round_name="Semi Finals",
        team1_id=badminton_teams[0].id,
        team2_id=badminton_teams[2].id,
        score_team1=21,
        score_team2=15,
        winner_team_id=badminton_teams[0].id,
        next_match_id=final_match.id,
        status="COMPLETED",
        match_date=(today - timedelta(days=1)).strftime("%Y-%m-%d"),
        start_time="16:00",
        venue="Court 1"
    )
    semi2 = TournamentMatch(
        tournament_id=badminton_tourn.id,
        round_name="Semi Finals",
        team1_id=badminton_teams[1].id,
        team2_id=badminton_teams[3].id,
        score_team1=21,
        score_team2=19,
        winner_team_id=badminton_teams[1].id,
        next_match_id=final_match.id,
        status="COMPLETED",
        match_date=(today - timedelta(days=1)).strftime("%Y-%m-%d"),
        start_time="17:30",
        venue="Court 2"
    )
    db.add(semi1)
    db.add(semi2)
    db.commit()
    db.refresh(semi1)
    db.refresh(semi2)

    # 3. Quarter Finals (4 matches)
    q_pairs = [
        (badminton_teams[0], badminton_teams[4], semi1, 21, 14, badminton_teams[0].id),
        (badminton_teams[2], badminton_teams[5], semi1, 21, 18, badminton_teams[2].id),
        (badminton_teams[1], badminton_teams[6], semi2, 21, 12, badminton_teams[1].id),
        (badminton_teams[3], badminton_teams[7], semi2, 21, 16, badminton_teams[3].id)
    ]

    for idx, (t1, t2, parent_semi, s1, s2, w_id) in enumerate(q_pairs):
        qm = TournamentMatch(
            tournament_id=badminton_tourn.id,
            round_name="Quarter Finals",
            team1_id=t1.id,
            team2_id=t2.id,
            score_team1=s1,
            score_team2=s2,
            winner_team_id=w_id,
            next_match_id=parent_semi.id,
            status="COMPLETED",
            match_date=(today - timedelta(days=2)).strftime("%Y-%m-%d"),
            start_time=f"{10 + idx}:00",
            venue=f"Court {1 + (idx % 2)}"
        )
        db.add(qm)

    db.commit()
    print("[OK] Created 5 Tournaments, 8 Teams, and Full Linked Knockout Bracket")

    # 11. Seed Medals & Awards (16 Awards)
    medals_data = [
        (student_demo.id, "Gold Medal", "Inter-College Badminton Championship 2026", "Badminton", "2026", "TROPHY", "Smash Titans"),
        (student_demo.id, "Gold Medal", "State Universities Doubles Cup", "Badminton", "2025", "MEDAL", "Aryan & Mayank"),
        (student_demo.id, "Silver Medal", "Campus Tennis Invitational", "Tennis", "2025", "MEDAL", "Aryan Mishra"),
        (students[1].id, "Silver Medal", "Campus Badminton Championship 2026", "Badminton", "2026", "MEDAL", "Thunder Shuttles"),
        (students[2].id, "Bronze Medal", "Inter-College Badminton Championship 2026", "Badminton", "2026", "MEDAL", "Net Ninjas"),
        (students[3].id, "Gold Medal", "Varsity Hardcourt Tennis Open 2026", "Tennis", "2026", "TROPHY", "Karan Kumar"),
        (students[4].id, "Silver Medal", "Varsity Hardcourt Tennis Open 2026", "Tennis", "2026", "MEDAL", "Ananya Sen"),
        (students[5].id, "Gold Medal", "Campus 5-a-side Futsal League", "Football", "2025", "TROPHY", "Red Devils"),
        (students[6].id, "Gold Medal", "Annual Cricket Premier Cup", "Cricket", "2025", "TROPHY", "Royal Strikers"),
        (students[7].id, "Certificate", "Best Defender - Inter-College Football", "Football", "2025", "CERTIFICATE", None),
        (students[8].id, "Gold Medal", "Campus 3v3 Basketball Spring Open", "Basketball", "2025", "MEDAL", "Downtown Ballers"),
        (students[9].id, "Silver Medal", "Inter-Department Volleyball Championship", "Volleyball", "2025", "MEDAL", "Spike Squad"),
        (students[10].id, "Certificate", "Highest Run Scorer - Cricket Trophy", "Cricket", "2025", "CERTIFICATE", None),
        (students[11].id, "Gold Medal", "Campus Doubles Badminton Open", "Badminton", "2024", "MEDAL", "Campus Duo"),
        (students[12].id, "Bronze Medal", "State Athletics 5000m Meet", "Gym", "2024", "MEDAL", None),
        (student_demo.id, "Certificate", "Sportsman of the Year Nominee", "Badminton", "2025", "CERTIFICATE", None)
    ]

    for st_id, pos, award, sp, yr, atype, tm in medals_data:
        m = Medal(
            student_id=st_id,
            tournament_id=badminton_tourn.id,
            award_name=award,
            sport_name=sp,
            position=pos,
            year=yr,
            award_type=atype,
            team_name=tm,
            certificate_url=f"/certificates/{st_id}_{yr}.pdf"
        )
        db.add(m)

    # 12. Seed Achievement Badges Catalog & Student Progress
    badges_catalog = [
        ("EARLY_BIRD", "Early Bird", "Complete your first sports session or court booking before 7:00 AM", 1, "Sun"),
        ("STREAK_MASTER", "Streak Master", "Maintain an active 10-day training & booking attendance streak", 10, "Flame"),
        ("TEN_CHECKINS", "10 Check-ins", "Complete 10 verified front desk facility check-ins", 10, "CheckCircle2"),
        ("TOURNAMENT_WARRIOR", "Tournament Warrior", "Participate as captain or player in 5 campus tournaments", 5, "Swords"),
        ("CHAMPION", "Champion", "Win a sanctioned campus tournament championship", 1, "Trophy"),
        ("SPORTS_LEGEND", "Sports Legend", "Accumulate over 100 verified athletic training sessions", 100, "Crown")
    ]

    achievements_db = []
    for code, title, desc, target, icon in badges_catalog:
        ach = Achievement(
            code=code,
            title=title,
            description=desc,
            target_count=target,
            icon_name=icon
        )
        db.add(ach)
        achievements_db.append(ach)

    db.commit()

    # Assign unlocked badges for Aryan Sharma
    for ach in achievements_db:
        if ach.code in ["EARLY_BIRD", "TEN_CHECKINS", "CHAMPION"]:
            sa = StudentAchievement(
                student_id=student_demo.id,
                achievement_id=ach.id,
                progress=ach.target_count,
                unlocked=True,
                unlocked_at=datetime.now() - timedelta(days=random.randint(5, 30))
            )
        else:
            sa = StudentAchievement(
                student_id=student_demo.id,
                achievement_id=ach.id,
                progress=7 if ach.code == "STREAK_MASTER" else (3 if ach.code == "TOURNAMENT_WARRIOR" else 42),
                unlocked=False
            )
        db.add(sa)

    # 13. Seed Fitness Activities & Weather Logs
    for st in students[:15]:
        fa = FitnessActivity(
            student_id=st.id,
            sport_id=sports_db[st.preferred_sport].id,
            duration_minutes=random.choice([60, 75, 90]),
            estimated_calories=float(random.randint(380, 680)),
            training_intensity="High" if st.skill_level == "Advanced" else "Moderate",
            activity_date=(today - timedelta(days=random.randint(0, 5))).strftime("%Y-%m-%d")
        )
        db.add(fa)

    # Weather Logs for outdoor facilities
    outdoor_facs = [f for f in facilities_db if f.sport.is_outdoor]
    for ofac in outdoor_facs:
        wl = WeatherLog(
            facility_id=ofac.id,
            date=today.strftime("%Y-%m-%d"),
            hour=18,
            temp_c=27.5,
            rain_probability=82.0,
            condition="Heavy Rain & Thunderstorms",
            wind_kph=22.0,
            risk_level="WARNING",
            status="RAIN_PREDICTED"
        )
        db.add(wl)

    # 14. Seed Policy & Notifications
    policy = AllocationPolicy(
        policy_mode="Balanced",
        usage_weight=0.30,
        waitlist_weight=0.30,
        peak_weight=0.20,
        noshow_weight=0.20
    )
    db.add(policy)

    welcome_notif = Notification(
        user_id=student_demo.id,
        message="🏆 Welcome to Campus Sports Hub! Your profile is verified as an active student athlete.",
        type="SYSTEM"
    )
    db.add(welcome_notif)

    db.commit()
    print("[SUCCESS] Comprehensive Database Seeding Complete!")

if __name__ == "__main__":
    seed_database()
