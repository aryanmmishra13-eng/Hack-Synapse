from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.session import get_db
from app.models.models import User, RoleEnum, Notification
from app.schemas.schemas import PlayerMatchOut
from app.api.auth import get_current_user

router = APIRouter(prefix="/api/players", tags=["Find Players"])

@router.get("", response_model=List[PlayerMatchOut])
@router.get("/match", response_model=List[PlayerMatchOut])
def find_compatible_players(
    sport: Optional[str] = Query(default=None),
    skill_level: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(User).filter(
        User.id != current_user.id,
        User.role == RoleEnum.STUDENT.value
    )

    if sport:
        query = query.filter(User.preferred_sport == sport)
    if skill_level:
        query = query.filter(User.skill_level == skill_level)

    candidates = query.all()
    results = []

    for candidate in candidates:
        score = 60  # Base match
        reasons = []

        # 1. Sport preference match
        if candidate.preferred_sport == current_user.preferred_sport:
            score += 25
            reasons.append(f"Same preferred sport ({current_user.preferred_sport})")
        elif candidate.preferred_sport:
            score += 10
            reasons.append(f"Plays {candidate.preferred_sport}")

        # 2. Skill level match
        if candidate.skill_level == current_user.skill_level:
            score += 15
            reasons.append(f"Similar skill level ({current_user.skill_level})")
        else:
            score += 5
            reasons.append(f"Compatible skill level ({candidate.skill_level})")

        # Cap score at 98%
        final_score = min(98, score)

        results.append(PlayerMatchOut(
            user_id=candidate.id,
            name=candidate.name,
            email=candidate.email,
            skill_level=candidate.skill_level,
            preferred_sport=candidate.preferred_sport or "Badminton",
            match_score=final_score,
            reasons=reasons
        ))

    # Sort by match score descending
    results.sort(key=lambda x: x.match_score, reverse=True)
    return results

@router.post("/invite/{user_id}")
def invite_player(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        return {"message": "User not found"}

    notif = Notification(
        user_id=target.id,
        message=f"🎾 {current_user.name} sent you a sports match invitation for {current_user.preferred_sport}!",
        type="PLAYER_INVITE"
    )
    db.add(notif)
    db.commit()

    return {"message": f"Invitation successfully sent to {target.name}!"}
