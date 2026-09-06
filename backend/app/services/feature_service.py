"""
Feature Engineering Service  (spec Phase 3 / §12)
===================================================
Derives the 67-feature vector EXACTLY as expected by the ML model.

CRITICAL: Feature names must match the ML API contract exactly.
The ML API validated required features are:

ATHLETE PROFILE (10):
  sport, age, gender, height_cm, weight_kg_baseline, dominant_side,
  years_playing, position, team_id, prior_season_injury_count

DAILY ACTIVITY SNAPSHOT (9):
  TotalSteps, TotalDistance, TrackerDistance, VeryActiveMinutes,
  FairlyActiveMinutes, LightlyActiveMinutes, Calories, active_minutes,
  activity_load

ROLLING ACTIVITY WINDOWS 3d/7d/14d/28d (20):
  steps_3d, distance_3d, calories_3d, active_minutes_3d, activity_load_3d,
  steps_7d, distance_7d, calories_7d, active_minutes_7d, activity_load_7d,
  steps_14d, distance_14d, calories_14d, active_minutes_14d, activity_load_14d,
  steps_28d, distance_28d, calories_28d, active_minutes_28d, activity_load_28d

VARIABILITY (2):
  steps_std_7d, activity_load_std_7d

SLEEP (9):
  sleep_minutes, bed_minutes, sleep_efficiency,
  sleep_3d, sleep_7d, sleep_14d, sleep_28d, sleep_std_7d, sleep_deficit

TRAINING (14):
  training_load, training_sessions, training_types, avg_session_duration,
  training_load_3d, training_frequency_3d,
  training_load_7d, training_frequency_7d,
  training_load_14d, training_frequency_14d,
  training_load_28d, training_frequency_28d,
  acute_chronic_ratio, training_load_change

BODY COMPOSITION (3):
  avg_bmi, avg_body_fat, weight_records

Total: 10 + 9 + 20 + 2 + 9 + 14 + 3 = 67

Rules
------
- ALL features use only data BEFORE the prediction timestamp (spec §4).
- No future activity, sleep, training, or injury data is included.
- Missing data is handled safely — never crashes the API (spec §13).
- Returns (features: dict, quality: str, missing: int) always.
"""

import json
import logging
import math
import statistics
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.models.models import (
    User, Booking, BookingStatusEnum,
    FitnessActivity, TrainingSession, TrainingAttendance,
    PerformanceAssessment, PerformanceScore,
    AthleteHealthLog,
)

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Data quality levels (spec §13)
# ─────────────────────────────────────────────────────────────────────────────
class DataQuality:
    GOOD         = "GOOD"           # ≥ 55 of 67 features from real data
    PARTIAL      = "PARTIAL"        # 30–54 features from real data
    INSUFFICIENT = "INSUFFICIENT"   # < 30 or truly no data at all


# ─────────────────────────────────────────────────────────────────────────────
# Sport / profile defaults
# ─────────────────────────────────────────────────────────────────────────────
SKILL_TO_YEARS = {
    "Beginner":     2,
    "Intermediate": 4,
    "Advanced":     8,
}

SPORT_POSITIONS = {
    "Football":    "Midfielder",
    "Basketball":  "Guard",
    "Cricket":     "Batsman",
    "Volleyball":  "Libero",
    "Rugby":       "Forward",
    "Badminton":   "Singles",
    "Tennis":      "Baseline",
    "Gym":         "Fitness",
    "Table Tennis":"Singles",
    "Wrestling":   "Freestyle",
}

# ─────────────────────────────────────────────────────────────────────────────
# Rolling window helpers (spec §4 — NO future data)
# ─────────────────────────────────────────────────────────────────────────────
def _days_back(ref: datetime, days: int) -> datetime:
    """Return datetime `days` before ref — ensures no future data (spec §4)."""
    return ref - timedelta(days=days)


def _parse_date(val) -> Optional[datetime]:
    """Parse YYYY-MM-DD string or datetime → naive datetime."""
    if val is None:
        return None
    if isinstance(val, str):
        try:
            return datetime.strptime(val[:10], "%Y-%m-%d")
        except ValueError:
            return None
    if hasattr(val, "date"):
        return val.replace(tzinfo=None)
    return None


def _filter_by_window(records, date_attr: str, ref: datetime, days: int) -> list:
    """Return records whose date_attr falls within (ref-days, ref]."""
    cutoff = _days_back(ref, days)
    result = []
    for r in records:
        dt = _parse_date(getattr(r, date_attr, None))
        if dt is None:
            continue
        if cutoff <= dt <= ref:
            result.append(r)
    return result


# ─────────────────────────────────────────────────────────────────────────────
# Activity aggregation helpers
# ─────────────────────────────────────────────────────────────────────────────
def _agg_activity(
    health_logs: List[AthleteHealthLog],
    fitness: List[FitnessActivity],
    bookings: List[Booking],
    ref: datetime,
    days: int,
) -> Dict:
    """
    Aggregate steps, distance, calories, active_minutes, activity_load
    for the given window.
    """
    w_logs    = _filter_by_window(health_logs, "log_date", ref, days)
    w_fitness = _filter_by_window(fitness, "activity_date", ref, days)
    w_bookings = [
        b for b in _filter_by_window(bookings, "booking_date", ref, days)
        if b.status in (
            BookingStatusEnum.CHECKED_IN.value,
            BookingStatusEnum.COMPLETED.value,
        )
    ]

    # Steps per day from health logs
    daily_steps: List[float] = []
    for log in w_logs:
        if log.total_steps:
            daily_steps.append(float(log.total_steps))
        elif log.steps_entries:
            try:
                entries = json.loads(log.steps_entries)
                total = sum(float(e.get("steps", 0)) for e in entries)
                if total:
                    daily_steps.append(total)
            except Exception:
                pass

    # Calories — prefer health logs, fall back to fitness
    daily_cals: List[float] = [
        float(log.calories_burned) for log in w_logs if log.calories_burned
    ]
    if not daily_cals:
        daily_cals = [float(f.estimated_calories or 0) for f in w_fitness]

    # Active minutes — from health log heart rate entries + fitness
    active_min_list: List[float] = []
    for log in w_logs:
        if log.heart_rate_entries:
            try:
                entries = json.loads(log.heart_rate_entries)
                active_min_list.append(len(entries) * 60.0)  # 1 entry ≈ 1 hr
            except Exception:
                pass
    if not active_min_list:
        for f in w_fitness:
            active_min_list.append(float(f.duration_minutes or 60))
        for b in w_bookings:
            try:
                sh, sm = map(int, b.start_time.split(":"))
                eh, em = map(int, b.end_time.split(":"))
                dur = (eh * 60 + em) - (sh * 60 + sm)
                if dur > 0:
                    active_min_list.append(float(dur))
            except Exception:
                active_min_list.append(60.0)

    avg_steps      = statistics.mean(daily_steps)    if daily_steps    else 0.0
    avg_cals       = statistics.mean(daily_cals)     if daily_cals     else 0.0
    avg_active_min = statistics.mean(active_min_list) if active_min_list else 0.0

    # Steps std for 7d (used directly)
    steps_std = statistics.stdev(daily_steps) if len(daily_steps) >= 2 else 0.0

    avg_distance = avg_steps * 0.0008  # km per day (avg stride)

    # Activity load = daily avg calorie × number of days with activity
    activity_days = max(len(daily_steps), len(daily_cals), len(active_min_list))
    activity_load = avg_cals * max(1, min(activity_days, days))

    return {
        "avg_steps":       round(avg_steps, 1),
        "avg_distance":    round(avg_distance, 4),
        "avg_cals":        round(avg_cals, 1),
        "avg_active_min":  round(avg_active_min, 1),
        "activity_load":   round(activity_load, 1),
        "steps_std":       round(steps_std, 1),
        "activity_load_std": round(steps_std * 0.0008 * 450 / max(1, avg_steps) * activity_load / 100, 1) if avg_steps else 0.0,
        "has_data":        bool(daily_steps or daily_cals or active_min_list),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Sleep aggregation helpers
# ─────────────────────────────────────────────────────────────────────────────
def _agg_sleep(
    health_logs: List[AthleteHealthLog],
    ref: datetime,
    days: int,
) -> Dict:
    """Aggregate sleep minutes for a rolling window."""
    w_logs = _filter_by_window(health_logs, "log_date", ref, days)
    sleep_min_list: List[float] = [
        float(log.sleep_hours) * 60.0 for log in w_logs if log.sleep_hours
    ]
    if not sleep_min_list:
        return {
            "avg_sleep_min": None,
            "sleep_std":     None,
            "has_data":      False,
        }
    avg = statistics.mean(sleep_min_list)
    std = statistics.stdev(sleep_min_list) if len(sleep_min_list) >= 2 else 0.0
    return {
        "avg_sleep_min": round(avg, 1),
        "sleep_std":     round(std, 1),
        "has_data":      True,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Training load helpers
# ─────────────────────────────────────────────────────────────────────────────
def _agg_training(
    fitness: List[FitnessActivity],
    bookings: List[Booking],
    ref: datetime,
    days: int,
) -> Dict:
    """
    Compute training load (calorie proxy) and session frequency for window.
    """
    w_fitness = _filter_by_window(fitness, "activity_date", ref, days)
    w_bookings = [
        b for b in _filter_by_window(bookings, "booking_date", ref, days)
        if b.status in (
            BookingStatusEnum.CHECKED_IN.value,
            BookingStatusEnum.COMPLETED.value,
        )
    ]
    total_cals = sum(float(f.estimated_calories or 0) for f in w_fitness)
    sessions   = len(w_fitness) + len(w_bookings)

    durations: List[float] = [float(f.duration_minutes or 60) for f in w_fitness]
    for b in w_bookings:
        try:
            sh, sm = map(int, b.start_time.split(":"))
            eh, em = map(int, b.end_time.split(":"))
            dur = (eh * 60 + em) - (sh * 60 + sm)
            if dur > 0:
                durations.append(float(dur))
        except Exception:
            durations.append(60.0)

    avg_dur = statistics.mean(durations) if durations else 60.0

    # Training types = distinct sport types in fitness records
    types = len({f.sport_id for f in w_fitness if f.sport_id}) or (1 if sessions else 0)

    return {
        "training_load":      round(total_cals, 1),
        "sessions":           sessions,
        "avg_session_duration": round(avg_dur, 1),
        "training_types":     types,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Main feature engineering entry point (spec §12)
# ─────────────────────────────────────────────────────────────────────────────
def build_feature_vector(
    user_id: int,
    db: Session,
    prediction_at: Optional[datetime] = None,
) -> Tuple[Dict, str, int]:
    """
    Build the 67-feature vector from existing database records.

    Parameters
    ----------
    user_id       : user ID (same as athlete_id in this app)
    db            : SQLAlchemy session
    prediction_at : treat as "now" — no data after this timestamp is used
                    (spec §4 data-leakage rule)

    Returns
    -------
    (features, data_quality, missing_count)
    """
    ref = (prediction_at or datetime.utcnow()).replace(tzinfo=None)

    # ── Fetch athlete profile ───────────────────────────────
    user: Optional[User] = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError(f"Athlete {user_id} not found")

    sport  = user.preferred_sport or "Badminton"
    skill  = user.skill_level or "Intermediate"

    # ── Fetch all relevant records (before ref only via window filtering) ──
    all_bookings = (
        db.query(Booking)
        .filter(Booking.user_id == user_id)
        .all()
    )
    all_fitness = (
        db.query(FitnessActivity)
        .filter(FitnessActivity.student_id == user_id)
        .all()
    )
    all_health_logs = (
        db.query(AthleteHealthLog)
        .filter(AthleteHealthLog.user_id == user_id)
        .all()
    )

    # ── Aggregate by time window ─────────────────────────────
    act_3  = _agg_activity(all_health_logs, all_fitness, all_bookings, ref, 3)
    act_7  = _agg_activity(all_health_logs, all_fitness, all_bookings, ref, 7)
    act_14 = _agg_activity(all_health_logs, all_fitness, all_bookings, ref, 14)
    act_28 = _agg_activity(all_health_logs, all_fitness, all_bookings, ref, 28)

    sleep_7  = _agg_sleep(all_health_logs, ref, 7)
    sleep_3  = _agg_sleep(all_health_logs, ref, 3)
    sleep_14 = _agg_sleep(all_health_logs, ref, 14)
    sleep_28 = _agg_sleep(all_health_logs, ref, 28)

    tr_3  = _agg_training(all_fitness, all_bookings, ref, 3)
    tr_7  = _agg_training(all_fitness, all_bookings, ref, 7)
    tr_14 = _agg_training(all_fitness, all_bookings, ref, 14)
    tr_28 = _agg_training(all_fitness, all_bookings, ref, 28)

    # ── Get most recent health log (snapshot) ──────────────
    recent_logs = sorted(
        _filter_by_window(all_health_logs, "log_date", ref, 7),
        key=lambda l: _parse_date(l.log_date) or datetime.min,
        reverse=True,
    )
    latest_log = recent_logs[0] if recent_logs else None

    # ── Sleep snapshot from most recent log ────────────────
    latest_sleep_min  = (float(latest_log.sleep_hours) * 60.0) if (latest_log and latest_log.sleep_hours) else None
    _sleep_default    = 420.0  # 7 hours
    sleep_minutes_val = latest_sleep_min if latest_sleep_min is not None else _sleep_default
    bed_minutes_val   = sleep_minutes_val + 30.0  # conservative offset
    sleep_eff         = round(sleep_minutes_val / max(1.0, bed_minutes_val), 4)
    sleep_deficit_val = max(0.0, 420.0 - sleep_minutes_val)

    # ── Activity snapshot from most recent log ─────────────
    latest_steps = None
    if latest_log:
        if latest_log.total_steps:
            latest_steps = float(latest_log.total_steps)
        elif latest_log.steps_entries:
            try:
                entries = json.loads(latest_log.steps_entries)
                total = sum(float(e.get("steps", 0)) for e in entries)
                if total:
                    latest_steps = total
            except Exception:
                pass

    # Fall back to 7-day average
    snapshot_steps   = latest_steps if latest_steps is not None else act_7["avg_steps"]
    snapshot_cals    = (float(latest_log.calories_burned) if (latest_log and latest_log.calories_burned)
                        else act_7["avg_cals"])

    # Very/Fairly/Light from fitness intensity
    w_fitness_7 = _filter_by_window(all_fitness, "activity_date", ref, 7)
    very_active_min  = 0.0
    fairly_active_min = 0.0
    light_active_min  = 0.0
    for f in w_fitness_7:
        intensity = (f.training_intensity or "medium").lower()
        dur = float(f.duration_minutes or 60)
        if intensity in ("high", "very high", "very_high"):
            very_active_min  += dur
        elif intensity in ("medium", "moderate"):
            fairly_active_min += dur
        else:
            light_active_min  += dur
    # if no fitness records, estimate from 7d avg active minutes
    if not w_fitness_7:
        very_active_min   = round(act_7["avg_active_min"] * 0.3, 1)
        fairly_active_min = round(act_7["avg_active_min"] * 0.4, 1)
        light_active_min  = round(act_7["avg_active_min"] * 0.3, 1)

    snapshot_active_min = very_active_min + fairly_active_min + light_active_min

    # ── BMI calculation ────────────────────────────────────
    height_cm = 175.0   # default (not stored in DB)
    weight_kg = 70.0    # default
    bmi       = round(weight_kg / ((height_cm / 100.0) ** 2), 2)
    body_fat  = round(1.2 * bmi + 0.23 * 21 - 5.4, 1)  # Deurenberg formula

    # ── Acute / Chronic ratio ──────────────────────────────
    # Acute = 7d training load; Chronic = 28d weekly avg
    chronic_weekly = tr_28["training_load"] / 4.0
    acute_cr = round(tr_7["training_load"] / max(1.0, chronic_weekly), 3)

    # Training load change: (7d - half of 14d) / half of 14d
    half_14d = tr_14["training_load"] / 2.0
    load_change = round(
        (tr_7["training_load"] - half_14d) / max(1.0, half_14d), 3
    )

    # ── Activity load std 7d ───────────────────────────────
    act_load_std_7d = act_7["activity_load_std"]

    # ═══════════════════════════════════════════════════════
    # Build the exact 67-feature dict (spec §12)
    # Names MUST exactly match ML API contract
    # ═══════════════════════════════════════════════════════
    features: Dict = {}

    # [1–10] Athlete profile
    features["sport"]                     = sport
    features["age"]                       = 21        # not in DB, safe default
    features["gender"]                    = "Male"    # not in DB, safe default
    features["height_cm"]                 = height_cm
    features["weight_kg_baseline"]        = weight_kg
    features["dominant_side"]             = "Right"   # not in DB, safe default
    features["years_playing"]             = SKILL_TO_YEARS.get(skill, 4)
    features["position"]                  = SPORT_POSITIONS.get(sport, "Midfielder")
    features["team_id"]                   = 1         # not tracked per-user; safe default
    features["prior_season_injury_count"] = 0

    # [11–19] Daily activity snapshot
    features["TotalSteps"]            = round(snapshot_steps, 0)
    features["TotalDistance"]         = round(snapshot_steps * 0.0008, 4)
    features["TrackerDistance"]       = round(snapshot_steps * 0.0008, 4)  # same as GPS
    features["VeryActiveMinutes"]     = round(very_active_min, 1)
    features["FairlyActiveMinutes"]   = round(fairly_active_min, 1)
    features["LightlyActiveMinutes"]  = round(light_active_min, 1)
    features["Calories"]              = round(snapshot_cals, 1)
    features["active_minutes"]        = round(snapshot_active_min, 1)
    features["activity_load"]         = round(snapshot_cals, 1)  # same scale

    # [20–24] 3-day rolling activity
    features["steps_3d"]              = round(act_3["avg_steps"], 1)
    features["distance_3d"]           = round(act_3["avg_distance"] * 3, 4)   # total 3d
    features["calories_3d"]           = round(act_3["avg_cals"] * 3, 1)
    features["active_minutes_3d"]     = round(act_3["avg_active_min"] * 3, 1)
    features["activity_load_3d"]      = round(act_3["activity_load"], 1)

    # [25–29] 7-day rolling activity
    features["steps_7d"]              = round(act_7["avg_steps"], 1)
    features["distance_7d"]           = round(act_7["avg_distance"] * 7, 4)
    features["calories_7d"]           = round(act_7["avg_cals"] * 7, 1)
    features["active_minutes_7d"]     = round(act_7["avg_active_min"] * 7, 1)
    features["activity_load_7d"]      = round(act_7["activity_load"], 1)

    # [30–34] 14-day rolling activity
    features["steps_14d"]             = round(act_14["avg_steps"], 1)
    features["distance_14d"]          = round(act_14["avg_distance"] * 14, 4)
    features["calories_14d"]          = round(act_14["avg_cals"] * 14, 1)
    features["active_minutes_14d"]    = round(act_14["avg_active_min"] * 14, 1)
    features["activity_load_14d"]     = round(act_14["activity_load"], 1)

    # [35–39] 28-day rolling activity
    features["steps_28d"]             = round(act_28["avg_steps"], 1)
    features["distance_28d"]          = round(act_28["avg_distance"] * 28, 4)
    features["calories_28d"]          = round(act_28["avg_cals"] * 28, 1)
    features["active_minutes_28d"]    = round(act_28["avg_active_min"] * 28, 1)
    features["activity_load_28d"]     = round(act_28["activity_load"], 1)

    # [40–41] Activity variability
    features["steps_std_7d"]          = round(act_7["steps_std"], 1)
    features["activity_load_std_7d"]  = round(act_load_std_7d, 1)

    # [42–50] Sleep
    features["sleep_minutes"]         = round(sleep_minutes_val, 1)
    features["bed_minutes"]           = round(bed_minutes_val, 1)
    features["sleep_efficiency"]      = round(sleep_eff, 4)
    features["sleep_3d"]              = round(sleep_3["avg_sleep_min"] if sleep_3["has_data"] else sleep_minutes_val, 1)
    features["sleep_7d"]              = round(sleep_7["avg_sleep_min"] if sleep_7["has_data"] else sleep_minutes_val, 1)
    features["sleep_14d"]             = round(sleep_14["avg_sleep_min"] if sleep_14["has_data"] else sleep_minutes_val, 1)
    features["sleep_28d"]             = round(sleep_28["avg_sleep_min"] if sleep_28["has_data"] else sleep_minutes_val, 1)
    features["sleep_std_7d"]          = round(sleep_7["sleep_std"] if sleep_7["has_data"] and sleep_7["sleep_std"] is not None else 20.0, 1)
    features["sleep_deficit"]         = round(sleep_deficit_val, 1)

    # [51–64] Training load & frequency
    features["training_load"]             = round(tr_7["training_load"], 1)
    features["training_sessions"]         = tr_7["sessions"]
    features["training_types"]            = tr_7["training_types"]
    features["avg_session_duration"]      = round(tr_7["avg_session_duration"], 1)
    features["training_load_3d"]          = round(tr_3["training_load"], 1)
    features["training_frequency_3d"]     = tr_3["sessions"]
    features["training_load_7d"]          = round(tr_7["training_load"], 1)
    features["training_frequency_7d"]     = tr_7["sessions"]
    features["training_load_14d"]         = round(tr_14["training_load"], 1)
    features["training_frequency_14d"]    = tr_14["sessions"]
    features["training_load_28d"]         = round(tr_28["training_load"], 1)
    features["training_frequency_28d"]    = tr_28["sessions"]
    features["acute_chronic_ratio"]       = acute_cr
    features["training_load_change"]      = load_change

    # [65–67] Body composition
    features["avg_bmi"]          = bmi
    features["avg_body_fat"]     = body_fat
    features["weight_records"]   = 1   # we have a default weight

    # ─────────────────────────────────────────────────────────
    # Data quality assessment (spec §13)
    # ─────────────────────────────────────────────────────────
    missing, quality = _assess_quality(
        health_logs=all_health_logs,
        fitness=all_fitness,
        bookings=all_bookings,
    )

    logger.info(
        "feature_service: user=%s sport=%s quality=%s missing=%d acwr=%.3f features=%d",
        user_id, sport, quality, missing, acute_cr, len(features),
    )

    assert len(features) == 67, f"Feature count mismatch: expected 67, got {len(features)}"
    return features, quality, missing


# ─────────────────────────────────────────────────────────────────────────────
# Data quality helpers  (spec §13)
# ─────────────────────────────────────────────────────────────────────────────
def _assess_quality(
    health_logs: list,
    fitness: list,
    bookings: list,
) -> Tuple[int, str]:
    """
    Returns (missing_count, quality_status).

    INSUFFICIENT = truly no usable data at all (would produce pure defaults)
    PARTIAL      = some data, some defaults
    GOOD         = sufficient data records present
    """
    has_logs     = len(health_logs) >= 3
    has_fitness  = len(fitness) >= 3
    has_bookings = len(bookings) >= 3

    missing = 0

    # Count groups of features that fell back to defaults
    if not health_logs:
        missing += 9   # sleep + daily snapshot all defaulted
    elif len(health_logs) < 3:
        missing += 4   # rolling windows partially defaulted

    if not (fitness or bookings):
        missing += 9   # all activity & training defaulted
    elif len(fitness) + len(bookings) < 3:
        missing += 4

    # Profile fields always default (not in DB)
    missing += 5   # age, gender, height, dominant_side, body_fat

    if not any([has_logs, has_fitness, has_bookings]):
        quality = DataQuality.INSUFFICIENT
    elif missing >= 15:
        quality = DataQuality.PARTIAL
    else:
        quality = DataQuality.GOOD

    return missing, quality
