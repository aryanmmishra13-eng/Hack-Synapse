from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# --- Auth Schemas ---
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    skill_level: Optional[str] = "Intermediate"
    preferred_sport: Optional[str] = "Badminton"
    role: Optional[str] = "STUDENT"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class OTPSendRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    skill_level: Optional[str] = "Intermediate"
    preferred_sport: Optional[str] = "Badminton"

class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str

class OTPSendResponse(BaseModel):
    message: str
    expires_in_seconds: int

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    skill_level: str
    preferred_sport: Optional[str] = "Badminton"
    avatar_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Sport & Facility Schemas ---
class SportOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    icon_name: str
    image_url: Optional[str]
    is_outdoor: Optional[bool] = False
    facility_count: Optional[int] = 0
    available_facilities: Optional[int] = 0
    current_occupancy_pct: Optional[float] = 0.0
    predicted_demand_level: Optional[str] = "MEDIUM"

    class Config:
        from_attributes = True

class FacilityOut(BaseModel):
    id: int
    sport_id: int
    sport_name: Optional[str] = None
    name: str
    capacity: int
    status: str
    location: str
    available_slots_count: Optional[int] = 0

    class Config:
        from_attributes = True

# --- Equipment & Rental Schemas ---
class EquipmentOut(BaseModel):
    id: int
    sport_id: int
    sport_name: Optional[str] = None
    name: str
    total_qty: int
    available_qty: int
    rented_qty: int
    maintenance_qty: int
    damaged_qty: int
    lost_qty: Optional[int] = 0
    rental_fee: float
    deposit_fee: Optional[float] = 0.0

    class Config:
        from_attributes = True

class EquipmentCreate(BaseModel):
    sport_id: int
    name: str
    total_qty: int = 20
    rental_fee: float = 0.0
    deposit_fee: float = 0.0

class RentalItemCreate(BaseModel):
    equipment_id: int
    quantity: int = 1

class EquipmentRentalOut(BaseModel):
    id: int
    booking_id: int
    equipment_name: str
    quantity: int
    status: str
    rented_at: datetime

# --- Booking & Waitlist Schemas ---
class BookingCreate(BaseModel):
    facility_id: int
    booking_date: str  # YYYY-MM-DD
    start_time: str    # HH:MM
    end_time: str      # HH:MM
    rentals: Optional[List[RentalItemCreate]] = []

class BookingOut(BaseModel):
    id: int
    user_id: int
    facility_id: int
    facility_name: str
    sport_name: str
    booking_date: str
    start_time: str
    end_time: str
    status: str
    qr_code: Optional[str]
    created_at: datetime
    checked_in_at: Optional[datetime]
    rented_equipment: Optional[List[dict]] = []

    class Config:
        from_attributes = True

class AlternativeOption(BaseModel):
    facility_id: int
    facility_name: str
    booking_date: str
    start_time: str
    end_time: str
    availability_score: float
    predicted_demand_level: str

class BookingResponse(BaseModel):
    success: bool
    message: str
    booking: Optional[BookingOut] = None
    smart_insight: Optional[str] = None
    alternatives: List[AlternativeOption] = []
    waitlist_position: Optional[int] = None

class WaitlistCreate(BaseModel):
    facility_id: int
    booking_date: str
    start_time: str

class WaitlistOut(BaseModel):
    id: int
    user_id: int
    facility_id: int
    facility_name: str
    sport_name: str
    booking_date: str
    start_time: str
    position: int
    status: str
    users_ahead: int

# --- Coach & Training Schemas ---
class CoachOut(BaseModel):
    id: int
    user_id: int
    name: str
    email: str
    sport_id: int
    sport_name: str
    experience_years: int
    specialization: str
    bio: Optional[str]
    student_count: Optional[int] = 0

    class Config:
        from_attributes = True

class TrainingSessionCreate(BaseModel):
    sport_id: int
    facility_id: Optional[int] = None
    session_date: str
    start_time: str
    end_time: str
    title: str
    description: Optional[str] = None

class TrainingSessionOut(BaseModel):
    id: int
    coach_id: int
    coach_name: str
    sport_id: int
    sport_name: str
    facility_name: Optional[str]
    session_date: str
    start_time: str
    end_time: str
    title: str
    description: Optional[str]

# --- Performance Assessment Schemas ---
class PerformanceMetricScore(BaseModel):
    metric_name: str
    score: float
    previous_score: Optional[float] = None

class PerformanceAssessmentCreate(BaseModel):
    student_id: int
    sport_id: int
    assessment_date: str
    overall_rating: float
    observations: Optional[str] = None
    recommendations: Optional[str] = None
    scores: List[PerformanceMetricScore]

class PerformanceAssessmentOut(BaseModel):
    id: int
    student_id: int
    student_name: str
    coach_id: int
    coach_name: str
    sport_id: int
    sport_name: str
    assessment_date: str
    overall_rating: float
    observations: Optional[str]
    recommendations: Optional[str]
    scores: List[PerformanceMetricScore]

# --- Tournaments & Brackets Schemas ---
class TournamentCreate(BaseModel):
    sport_id: int
    name: str
    description: Optional[str] = None
    format: str = "Knockout"
    venue: str
    start_date: str
    end_date: str
    registration_deadline: str
    max_teams: int = 8
    max_players_per_team: int = 4
    rules: Optional[str] = None
    prize_info: Optional[str] = None

class TournamentMatchOut(BaseModel):
    id: int
    round_name: str
    team1_name: Optional[str] = "TBD"
    team2_name: Optional[str] = "TBD"
    score_team1: Optional[int] = None
    score_team2: Optional[int] = None
    winner_team_name: Optional[str] = None
    next_match_id: Optional[int] = None
    status: str
    match_date: str
    start_time: str
    venue: str

class TournamentOut(BaseModel):
    id: int
    sport_id: int
    sport_name: str
    name: str
    description: Optional[str]
    format: str
    venue: str
    start_date: str
    end_date: str
    registration_deadline: str
    max_teams: int
    registered_teams_count: int
    rules: Optional[str]
    prize_info: Optional[str]
    status: str
    matches: List[TournamentMatchOut] = []

class TournamentRegister(BaseModel):
    tournament_id: int
    team_name: str
    player_ids: List[int] = []

class MatchResultUpdate(BaseModel):
    score_team1: int
    score_team2: int
    winner_team_id: Optional[int] = None
    status: str = "COMPLETED"

# --- Medals, Achievements & Resume Schemas ---
class MedalOut(BaseModel):
    id: int
    award_name: str
    sport_name: str
    position: str
    year: str
    award_type: Optional[str] = "MEDAL"
    team_name: Optional[str] = None
    certificate_url: Optional[str]

class AchievementOut(BaseModel):
    id: int
    code: str
    title: str
    description: str
    target_count: int
    progress: int
    unlocked: bool
    unlocked_at: Optional[datetime]

class SportsResumeOut(BaseModel):
    student_name: str
    primary_sport: str
    skill_level: str
    overall_rating: float
    coach_name: Optional[str]
    total_training_hours: int
    total_checkins: int
    tournament_wins: int
    medals_count: int
    trophies_count: int
    medals: List[MedalOut]
    unlocked_badges: List[AchievementOut]
    recent_metric_improvements: List[dict]

# --- Weather & Fitness Schemas ---
class WeatherReportOut(BaseModel):
    facility_id: int
    facility_name: str
    sport_name: str
    date: str
    hour: int
    temp_c: float
    rain_probability: float
    condition: str
    wind_kph: float
    risk_level: str
    recommendation: str

class FitnessStatsOut(BaseModel):
    total_play_hours: float
    total_training_hours: float
    total_bookings: int
    completed_checkins: int
    current_streak: int
    longest_streak: int
    tournament_participations: int
    tournament_wins: int
    estimated_calories_burned: float

# --- Game & Player Matching Schemas ---
class GameCreate(BaseModel):
    sport_id: int
    facility_id: Optional[int] = None
    booking_date: str
    start_time: str
    max_players: int = 4
    skill_level: str = "Intermediate"
    description: Optional[str] = None

class GamePlayerOut(BaseModel):
    user_id: int
    name: str
    skill_level: str

class GameOut(BaseModel):
    id: int
    creator_id: int
    creator_name: str
    sport_id: int
    sport_name: str
    facility_name: Optional[str]
    booking_date: str
    start_time: str
    max_players: int
    current_players: int
    skill_level: str
    status: str
    description: Optional[str]
    players: List[GamePlayerOut]

class PlayerMatchOut(BaseModel):
    user_id: int
    name: str
    email: str
    skill_level: str
    preferred_sport: str
    match_score: int
    reasons: List[str]

# --- Admin & Analytics Schemas ---
class AdminDashboardStats(BaseModel):
    total_facilities: int
    active_bookings_today: int
    today_check_ins: int
    today_no_shows: int
    overall_utilization_pct: float
    waitlisted_users_count: int
    total_equipment_rented: Optional[int] = 0
    upcoming_tournaments_count: Optional[int] = 0

class WhatIfRequest(BaseModel):
    sport_id: int
    additional_courts: int

class WhatIfResponse(BaseModel):
    sport_name: str
    current_capacity: int
    new_capacity: int
    predicted_peak_demand: int
    current_shortage: int
    projected_shortage: int
    recommendation: str

class PolicyUpdateRequest(BaseModel):
    policy_mode: str
    usage_weight: float
    waitlist_weight: float
    peak_weight: float
    noshow_weight: float

# --- QR Scanner & Check-in Schemas ---
class QRVerifyRequest(BaseModel):
    qr_code: str

class PlayerInfo(BaseModel):
    id: int
    name: str
    email: str
    role: str
    skill_level: Optional[str] = None
    preferred_sport: Optional[str] = None
    avatar_url: Optional[str] = None

class RentedEquipmentInfo(BaseModel):
    name: str
    quantity: int

class QRVerifyResponse(BaseModel):
    valid: bool
    message: str
    can_approve: bool
    booking: Optional[BookingOut] = None
    player: Optional[PlayerInfo] = None
    rentals: List[RentedEquipmentInfo] = []
    is_today: bool = False
    warning: Optional[str] = None

class QRApproveRequest(BaseModel):
    qr_code: Optional[str] = None
    booking_id: Optional[int] = None
    notes: Optional[str] = None

class QRApproveResponse(BaseModel):
    success: bool
    message: str
    booking: BookingOut
    player: PlayerInfo
    checked_in_at: datetime

class CheckInAuditRecord(BaseModel):
    id: int
    booking_id: int
    player_id: int
    player_name: str
    player_email: str
    facility_name: str
    sport_name: str
    booking_date: str
    slot_time: str
    checked_in_at: datetime
    status: str

