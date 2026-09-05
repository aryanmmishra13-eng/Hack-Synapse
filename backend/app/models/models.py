import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database.base import Base

class RoleEnum(str, enum.Enum):
    STUDENT = "STUDENT"
    ADMIN = "ADMIN"
    COACH = "COACH"

class SkillLevelEnum(str, enum.Enum):
    BEGINNER = "Beginner"
    INTERMEDIATE = "Intermediate"
    ADVANCED = "Advanced"

class FacilityStatusEnum(str, enum.Enum):
    ACTIVE = "ACTIVE"
    MAINTENANCE = "MAINTENANCE"
    CLOSED = "CLOSED"

class BookingStatusEnum(str, enum.Enum):
    CONFIRMED = "CONFIRMED"
    CHECKED_IN = "CHECKED_IN"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    NO_SHOW = "NO_SHOW"

class WaitlistStatusEnum(str, enum.Enum):
    WAITING = "WAITING"
    PROMOTED = "PROMOTED"
    EXPIRED = "EXPIRED"

class GameStatusEnum(str, enum.Enum):
    OPEN = "OPEN"
    FULL = "FULL"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class TournamentFormatEnum(str, enum.Enum):
    KNOCKOUT = "Knockout"
    ROUND_ROBIN = "Round Robin"
    LEAGUE = "League"
    GROUP_KNOCKOUT = "Group + Knockout"

# --- Users & Auth ---
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default=RoleEnum.STUDENT.value)
    skill_level = Column(String(30), default=SkillLevelEnum.INTERMEDIATE.value)
    preferred_sport = Column(String(50), default="Badminton")
    avatar_url = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    bookings = relationship("Booking", back_populates="user")
    waitlists = relationship("Waitlist", back_populates="user")
    created_games = relationship("Game", back_populates="creator")
    game_memberships = relationship("GamePlayer", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    coach_profile = relationship("Coach", back_populates="user", uselist=False)

# --- Sports & Facilities ---
class Sport(Base):
    __tablename__ = "sports"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    icon_name = Column(String(50), default="Dumbbell")
    image_url = Column(String(255), nullable=True)
    is_outdoor = Column(Boolean, default=False)

    facilities = relationship("Facility", back_populates="sport")
    coaches = relationship("Coach", back_populates="sport")
    equipment_items = relationship("Equipment", back_populates="sport")

class Facility(Base):
    __tablename__ = "facilities"

    id = Column(Integer, primary_key=True, index=True)
    sport_id = Column(Integer, ForeignKey("sports.id"), nullable=False)
    name = Column(String(100), nullable=False)
    capacity = Column(Integer, default=4)
    status = Column(String(20), default=FacilityStatusEnum.ACTIVE.value)
    location = Column(String(150), nullable=False)

    sport = relationship("Sport", back_populates="facilities")
    bookings = relationship("Booking", back_populates="facility")
    waitlists = relationship("Waitlist", back_populates="facility")
    games = relationship("Game", back_populates="facility")
    maintenance_records = relationship("Maintenance", back_populates="facility")

# --- Bookings & QR ---
class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    facility_id = Column(Integer, ForeignKey("facilities.id"), nullable=False)
    booking_date = Column(String(10), nullable=False)  # YYYY-MM-DD
    start_time = Column(String(5), nullable=False)     # HH:MM
    end_time = Column(String(5), nullable=False)       # HH:MM
    status = Column(String(20), default=BookingStatusEnum.CONFIRMED.value)
    qr_code = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    checked_in_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="bookings")
    facility = relationship("Facility", back_populates="bookings")
    rentals = relationship("EquipmentRental", back_populates="booking")

# --- Equipment & Gear Rental ---
class Equipment(Base):
    __tablename__ = "equipment"

    id = Column(Integer, primary_key=True, index=True)
    sport_id = Column(Integer, ForeignKey("sports.id"), nullable=False)
    name = Column(String(100), nullable=False)
    total_qty = Column(Integer, default=20)
    available_qty = Column(Integer, default=20)
    rented_qty = Column(Integer, default=0)
    maintenance_qty = Column(Integer, default=0)
    damaged_qty = Column(Integer, default=0)
    lost_qty = Column(Integer, default=0)
    rental_fee = Column(Float, default=0.0)
    deposit_fee = Column(Float, default=0.0)

    sport = relationship("Sport", back_populates="equipment_items")
    rentals = relationship("EquipmentRental", back_populates="equipment")

class EquipmentRental(Base):
    __tablename__ = "equipment_rentals"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    equipment_id = Column(Integer, ForeignKey("equipment.id"), nullable=False)
    quantity = Column(Integer, default=1)
    status = Column(String(20), default="RENTED")  # RENTED, RETURNED, DAMAGED, LOST
    deposit = Column(Float, default=0.0)
    expected_return_time = Column(String(5), nullable=True)
    rented_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    returned_at = Column(DateTime, nullable=True)

    booking = relationship("Booking", back_populates="rentals")
    equipment = relationship("Equipment", back_populates="rentals")

# --- Coach & Training Management ---
class Coach(Base):
    __tablename__ = "coaches"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sport_id = Column(Integer, ForeignKey("sports.id"), nullable=False)
    experience_years = Column(Integer, default=5)
    specialization = Column(String(100), default="Technique & Tactics")
    certifications = Column(String(200), default="Certified Athletics Coach")
    weekly_sessions = Column(Integer, default=6)
    bio = Column(Text, nullable=True)

    user = relationship("User", back_populates="coach_profile")
    sport = relationship("Sport", back_populates="coaches")
    students = relationship("CoachStudent", back_populates="coach")
    sessions = relationship("TrainingSession", back_populates="coach")

class CoachStudent(Base):
    __tablename__ = "coach_students"

    id = Column(Integer, primary_key=True, index=True)
    coach_id = Column(Integer, ForeignKey("coaches.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    coach = relationship("Coach", back_populates="students")
    student = relationship("User")

class TrainingSession(Base):
    __tablename__ = "training_sessions"

    id = Column(Integer, primary_key=True, index=True)
    coach_id = Column(Integer, ForeignKey("coaches.id"), nullable=False)
    sport_id = Column(Integer, ForeignKey("sports.id"), nullable=False)
    facility_id = Column(Integer, ForeignKey("facilities.id"), nullable=True)
    session_date = Column(String(10), nullable=False)
    start_time = Column(String(5), nullable=False)
    end_time = Column(String(5), nullable=False)
    max_students = Column(Integer, default=20)
    training_focus = Column(String(100), default="Technique & Drills")
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)

    coach = relationship("Coach", back_populates="sessions")
    sport = relationship("Sport")
    facility = relationship("Facility")
    attendances = relationship("TrainingAttendance", back_populates="session")

class TrainingAttendance(Base):
    __tablename__ = "training_attendance"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("training_sessions.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    attended = Column(Boolean, default=True)
    status = Column(String(20), default="PRESENT")  # PRESENT, ABSENT, EXCUSED, CANCELLED
    notes = Column(Text, nullable=True)

    session = relationship("TrainingSession", back_populates="attendances")
    student = relationship("User")

# --- Performance Assessment System ---
class PerformanceAssessment(Base):
    __tablename__ = "performance_assessments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    coach_id = Column(Integer, ForeignKey("coaches.id"), nullable=False)
    sport_id = Column(Integer, ForeignKey("sports.id"), nullable=False)
    assessment_date = Column(String(10), nullable=False)
    overall_rating = Column(Float, default=75.0)
    observations = Column(Text, nullable=True)
    recommendations = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    student = relationship("User")
    coach = relationship("Coach")
    sport = relationship("Sport")
    scores = relationship("PerformanceScore", back_populates="assessment", cascade="all, delete-orphan")

class PerformanceScore(Base):
    __tablename__ = "performance_scores"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("performance_assessments.id"), nullable=False)
    metric_name = Column(String(100), nullable=False)
    score = Column(Float, nullable=False)
    previous_score = Column(Float, nullable=True)

    assessment = relationship("PerformanceAssessment", back_populates="scores")

# --- Tournaments & Brackets ---
class Tournament(Base):
    __tablename__ = "tournaments"

    id = Column(Integer, primary_key=True, index=True)
    sport_id = Column(Integer, ForeignKey("sports.id"), nullable=False)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    format = Column(String(50), default=TournamentFormatEnum.KNOCKOUT.value)
    venue = Column(String(150), nullable=False)
    start_date = Column(String(10), nullable=False)
    end_date = Column(String(10), nullable=False)
    registration_deadline = Column(String(10), nullable=False)
    max_teams = Column(Integer, default=8)
    max_players_per_team = Column(Integer, default=4)
    rules = Column(Text, nullable=True)
    prize_info = Column(String(150), nullable=True)
    status = Column(String(30), default="UPCOMING")  # UPCOMING, ONGOING, COMPLETED

    sport = relationship("Sport")
    teams = relationship("TournamentTeam", back_populates="tournament")
    matches = relationship("TournamentMatch", back_populates="tournament")

class TournamentTeam(Base):
    __tablename__ = "tournament_teams"

    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), nullable=False)
    team_name = Column(String(100), nullable=False)
    captain_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(20), default="REGISTERED")
    points = Column(Integer, default=0)
    wins = Column(Integer, default=0)
    losses = Column(Integer, default=0)
    matches_played = Column(Integer, default=0)

    tournament = relationship("Tournament", back_populates="teams")
    captain = relationship("User")
    players = relationship("TournamentPlayer", back_populates="team")

class TournamentPlayer(Base):
    __tablename__ = "tournament_players"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("tournament_teams.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_substitute = Column(Boolean, default=False)

    team = relationship("TournamentTeam", back_populates="players")
    student = relationship("User")

class TournamentMatch(Base):
    __tablename__ = "tournament_matches"

    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), nullable=False)
    round_name = Column(String(50), nullable=False)  # Quarter Finals, Semi Finals, Final
    team1_id = Column(Integer, ForeignKey("tournament_teams.id"), nullable=True)
    team2_id = Column(Integer, ForeignKey("tournament_teams.id"), nullable=True)
    score_team1 = Column(Integer, default=0)
    score_team2 = Column(Integer, default=0)
    winner_team_id = Column(Integer, ForeignKey("tournament_teams.id"), nullable=True)
    next_match_id = Column(Integer, ForeignKey("tournament_matches.id"), nullable=True)
    status = Column(String(30), default="SCHEDULED")  # SCHEDULED, LIVE, COMPLETED
    match_date = Column(String(10), nullable=False)
    start_time = Column(String(5), nullable=False)
    venue = Column(String(100), nullable=False)

    tournament = relationship("Tournament", back_populates="matches")
    team1 = relationship("TournamentTeam", foreign_keys=[team1_id])
    team2 = relationship("TournamentTeam", foreign_keys=[team2_id])
    winner_team = relationship("TournamentTeam", foreign_keys=[winner_team_id])

# --- Medals, Awards & Gamified Badges ---
class Medal(Base):
    __tablename__ = "medals"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), nullable=True)
    award_name = Column(String(150), nullable=False)
    sport_name = Column(String(50), nullable=False)
    position = Column(String(50), nullable=False)  # Gold Medal, Silver Medal, Champion
    year = Column(String(4), nullable=False)
    award_type = Column(String(50), default="MEDAL")  # MEDAL, TROPHY, CERTIFICATE
    team_name = Column(String(100), nullable=True)
    certificate_url = Column(String(255), nullable=True)

    student = relationship("User")
    tournament = relationship("Tournament")

class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False)  # EARLY_BIRD, STREAK_MASTER, TEN_CHECKINS
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    target_count = Column(Integer, default=10)
    icon_name = Column(String(50), default="Award")

class StudentAchievement(Base):
    __tablename__ = "student_achievements"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    achievement_id = Column(Integer, ForeignKey("achievements.id"), nullable=False)
    progress = Column(Integer, default=0)
    unlocked = Column(Boolean, default=False)
    unlocked_at = Column(DateTime, nullable=True)

    student = relationship("User")
    achievement = relationship("Achievement")

# --- Weather Logs & Fitness ---
class WeatherLog(Base):
    __tablename__ = "weather_logs"

    id = Column(Integer, primary_key=True, index=True)
    facility_id = Column(Integer, ForeignKey("facilities.id"), nullable=False)
    date = Column(String(10), nullable=False)
    hour = Column(Integer, nullable=False)
    temp_c = Column(Float, default=26.0)
    rain_probability = Column(Float, default=15.0)
    condition = Column(String(100), default="Partly Cloudy")
    wind_kph = Column(Float, default=12.0)
    risk_level = Column(String(20), default="NORMAL")  # NORMAL, WARNING, SEVERE
    status = Column(String(30), default="CLEAR")

    facility = relationship("Facility")

class FitnessActivity(Base):
    __tablename__ = "fitness_activities"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sport_id = Column(Integer, ForeignKey("sports.id"), nullable=False)
    duration_minutes = Column(Integer, default=60)
    estimated_calories = Column(Float, default=450.0)
    training_intensity = Column(String(30), default="High")
    activity_date = Column(String(10), nullable=False)

    student = relationship("User")
    sport = relationship("Sport")

# --- Existing Tables ---
class Waitlist(Base):
    __tablename__ = "waitlists"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    facility_id = Column(Integer, ForeignKey("facilities.id"), nullable=False)
    booking_date = Column(String(10), nullable=False)
    start_time = Column(String(5), nullable=False)
    position = Column(Integer, nullable=False)
    status = Column(String(20), default=WaitlistStatusEnum.WAITING.value)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="waitlists")
    facility = relationship("Facility", back_populates="waitlists")

class Game(Base):
    __tablename__ = "games"

    id = Column(Integer, primary_key=True, index=True)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sport_id = Column(Integer, ForeignKey("sports.id"), nullable=False)
    facility_id = Column(Integer, ForeignKey("facilities.id"), nullable=True)
    booking_date = Column(String(10), nullable=False)
    start_time = Column(String(5), nullable=False)
    max_players = Column(Integer, default=4)
    skill_level = Column(String(30), default=SkillLevelEnum.INTERMEDIATE.value)
    status = Column(String(20), default=GameStatusEnum.OPEN.value)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    creator = relationship("User", back_populates="created_games")
    sport = relationship("Sport")
    facility = relationship("Facility", back_populates="games")
    players = relationship("GamePlayer", back_populates="game", cascade="all, delete-orphan")

class GamePlayer(Base):
    __tablename__ = "game_players"

    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(Integer, ForeignKey("games.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    joined_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    game = relationship("Game", back_populates="players")
    user = relationship("User", back_populates="game_memberships")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="INFO")
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="notifications")

class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    sport_id = Column(Integer, ForeignKey("sports.id"), nullable=False)
    prediction_date = Column(String(10), nullable=False)
    hour = Column(Integer, nullable=False)
    predicted_demand = Column(Float, nullable=False)
    confidence = Column(Float, default=0.90)
    demand_level = Column(String(20), default="MEDIUM")

    sport = relationship("Sport")

class Maintenance(Base):
    __tablename__ = "maintenance"

    id = Column(Integer, primary_key=True, index=True)
    facility_id = Column(Integer, ForeignKey("facilities.id"), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    reason = Column(String(255), nullable=False)
    status = Column(String(20), default="SCHEDULED")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    facility = relationship("Facility", back_populates="maintenance_records")

class UserActivity(Base):
    __tablename__ = "user_activity"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sport_id = Column(Integer, ForeignKey("sports.id"), nullable=True)
    action = Column(String(100), nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class AllocationPolicy(Base):
    __tablename__ = "allocation_policy"

    id = Column(Integer, primary_key=True, index=True)
    policy_mode = Column(String(50), default="Balanced")
    usage_weight = Column(Float, default=0.30)
    waitlist_weight = Column(Float, default=0.30)
    peak_weight = Column(Float, default=0.20)
    noshow_weight = Column(Float, default=0.20)
