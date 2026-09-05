"""
In-memory OTP store for email verification during registration.

Stores pending registrations keyed by email with a 10-minute TTL.
No database migration required — data is ephemeral.
"""

import random
import threading
from datetime import datetime, timedelta, timezone
from typing import Optional

OTP_TTL_MINUTES = 10

# Thread-safe lock for the in-memory store
_lock = threading.Lock()

# Structure: { email_lowercase: PendingRegistration }
_store: dict = {}


class PendingRegistration:
    def __init__(
        self,
        otp: str,
        name: str,
        password_hash: str,
        skill_level: str,
        preferred_sport: str,
    ):
        self.otp = otp
        self.name = name
        self.password_hash = password_hash
        self.skill_level = skill_level
        self.preferred_sport = preferred_sport
        self.expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_TTL_MINUTES)
        self.attempts = 0  # Track failed attempts

    def is_expired(self) -> bool:
        return datetime.now(timezone.utc) > self.expires_at

    def seconds_remaining(self) -> int:
        delta = self.expires_at - datetime.now(timezone.utc)
        return max(0, int(delta.total_seconds()))


def generate_otp() -> str:
    """Generate a secure 6-digit numeric OTP."""
    return f"{random.SystemRandom().randint(0, 999999):06d}"


def store_otp(
    email: str,
    name: str,
    password_hash: str,
    skill_level: str,
    preferred_sport: str,
) -> str:
    """
    Generate a new OTP, store it with the pending registration data,
    and return the OTP string.
    """
    otp = generate_otp()
    key = email.lower().strip()
    pending = PendingRegistration(
        otp=otp,
        name=name,
        password_hash=password_hash,
        skill_level=skill_level,
        preferred_sport=preferred_sport,
    )
    with _lock:
        _store[key] = pending
    return otp


def get_pending(email: str) -> Optional[PendingRegistration]:
    """Retrieve a pending registration by email (returns None if missing/expired)."""
    key = email.lower().strip()
    with _lock:
        pending = _store.get(key)
    if pending is None:
        return None
    if pending.is_expired():
        with _lock:
            _store.pop(key, None)
        return None
    return pending


def verify_otp(email: str, otp: str) -> tuple[bool, str]:
    """
    Verify the OTP for an email.
    Returns (success: bool, message: str).
    Removes the entry on success.
    """
    key = email.lower().strip()
    with _lock:
        pending = _store.get(key)

    if pending is None:
        return False, "OTP not found or expired. Please request a new one."

    if pending.is_expired():
        with _lock:
            _store.pop(key, None)
        return False, "OTP has expired. Please request a new one."

    pending.attempts += 1
    if pending.attempts > 5:
        with _lock:
            _store.pop(key, None)
        return False, "Too many failed attempts. Please request a new OTP."

    if pending.otp != otp.strip():
        remaining = pending.seconds_remaining()
        return False, f"Invalid OTP. {5 - pending.attempts + 1} attempts remaining ({remaining}s left)."

    # Success — remove from store
    with _lock:
        _store.pop(key, None)

    return True, "OTP verified successfully."


def clear_pending(email: str):
    """Manually clear a pending registration (e.g., on cancel)."""
    key = email.lower().strip()
    with _lock:
        _store.pop(key, None)
