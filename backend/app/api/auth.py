from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import User, RoleEnum
from app.schemas.schemas import (
    UserRegister, UserLogin, TokenResponse, UserOut,
    OTPSendRequest, OTPVerifyRequest, OTPSendResponse,
)
from app.core.security import verify_password, get_password_hash, create_access_token, decode_access_token
from app.services.email_service import send_welcome_email, send_login_notification, send_otp_email
from app.services import otp_store

router = APIRouter(prefix="/api/auth", tags=["Auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = int(payload["sub"])
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != RoleEnum.ADMIN.value:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# ── Step 1: Send OTP ─────────────────────────────────────────────────────────

@router.post("/send-otp", response_model=OTPSendResponse)
def send_otp(body: OTPSendRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Accepts registration details, sends a 6-digit OTP to the student's email.
    The registration is NOT created yet — it is held in memory until OTP is verified.
    """
    # Reject if email already exists
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    # Validate password length early
    if len(body.password) < 6:
        raise HTTPException(status_code=422, detail="Password must be at least 6 characters.")

    # Hash password now so it isn't stored plain
    hashed_pw = get_password_hash(body.password)
    skill = body.skill_level or "Intermediate"
    sport = body.preferred_sport or "Badminton"

    # Store in OTP store (replaces any existing pending entry for same email)
    otp = otp_store.store_otp(
        email=body.email,
        name=body.name,
        password_hash=hashed_pw,
        skill_level=skill,
        preferred_sport=sport,
    )

    # Send OTP email non-blocking
    background_tasks.add_task(send_otp_email, body.name, body.email, otp)

    return OTPSendResponse(
        message=f"A 6-digit verification code has been sent to {body.email}.",
        expires_in_seconds=600,
    )


# ── Step 2: Verify OTP & Create Account ──────────────────────────────────────

@router.post("/register", response_model=TokenResponse)
def register(body: OTPVerifyRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Verify the OTP and create the student account.
    Accepts { email, otp }. Registration data is retrieved from the OTP store.
    """
    # Check OTP store
    pending = otp_store.get_pending(body.email)
    if pending is None:
        raise HTTPException(
            status_code=400,
            detail="No pending registration found for this email. Please request a new OTP."
        )

    ok, msg = otp_store.verify_otp(body.email, body.otp)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)

    # Guard: double-check email not taken (race condition safety)
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    # Create user
    new_user = User(
        name=pending.name,
        email=body.email,
        password_hash=pending.password_hash,
        role=RoleEnum.STUDENT.value,
        skill_level=pending.skill_level,
        preferred_sport=pending.preferred_sport,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Send welcome email in background
    background_tasks.add_task(send_welcome_email, new_user.name, new_user.email, new_user.role)

    token = create_access_token(subject=new_user.id, role=new_user.role)
    return TokenResponse(
        access_token=token,
        user={
            "id": new_user.id,
            "name": new_user.name,
            "email": new_user.email,
            "role": new_user.role,
            "skill_level": new_user.skill_level,
            "preferred_sport": new_user.preferred_sport,
        }
    )


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Send login activity email in background (non-blocking)
    background_tasks.add_task(send_login_notification, user.name, user.email, user.role)

    token = create_access_token(subject=user.id, role=user.role)
    return TokenResponse(
        access_token=token,
        user={
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "skill_level": user.skill_level,
            "preferred_sport": user.preferred_sport,
        }
    )

@router.get("/me", response_model=UserOut)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user
