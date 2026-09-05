from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.session import get_db
from app.models.models import Game, GamePlayer, GameStatusEnum, Sport, Facility, User, Notification
from app.schemas.schemas import GameCreate, GameOut, GamePlayerOut
from app.api.auth import get_current_user

router = APIRouter(prefix="/api/games", tags=["Play Now Games"])

@router.get("", response_model=List[GameOut])
def get_open_games(
    sport_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Game).filter(Game.status == GameStatusEnum.OPEN.value)
    if sport_id:
        query = query.filter(Game.sport_id == sport_id)

    games = query.order_by(Game.id.desc()).all()
    result = []

    for g in games:
        creator = db.query(User).filter(User.id == g.creator_id).first()
        sport = db.query(Sport).filter(Sport.id == g.sport_id).first()
        facility = db.query(Facility).filter(Facility.id == g.facility_id).first() if g.facility_id else None

        players = db.query(GamePlayer).filter(GamePlayer.game_id == g.id).all()
        players_out = []
        for gp in players:
            p_user = db.query(User).filter(User.id == gp.user_id).first()
            if p_user:
                players_out.append(GamePlayerOut(
                    user_id=p_user.id,
                    name=p_user.name,
                    skill_level=p_user.skill_level
                ))

        result.append(GameOut(
            id=g.id,
            creator_id=g.creator_id,
            creator_name=creator.name if creator else "Student",
            sport_id=g.sport_id,
            sport_name=sport.name if sport else "Sport",
            facility_name=facility.name if facility else "Campus Court",
            booking_date=g.booking_date,
            start_time=g.start_time,
            max_players=g.max_players,
            current_players=len(players_out),
            skill_level=g.skill_level,
            status=g.status,
            description=g.description,
            players=players_out
        ))

    return result

@router.post("", response_model=GameOut)
def create_open_game(
    game_in: GameCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sport = db.query(Sport).filter(Sport.id == game_in.sport_id).first()
    if not sport:
        raise HTTPException(status_code=404, detail="Sport not found")

    new_game = Game(
        creator_id=current_user.id,
        sport_id=game_in.sport_id,
        facility_id=game_in.facility_id,
        booking_date=game_in.booking_date,
        start_time=game_in.start_time,
        max_players=game_in.max_players,
        skill_level=game_in.skill_level,
        status=GameStatusEnum.OPEN.value,
        description=game_in.description
    )
    db.add(new_game)
    db.commit()
    db.refresh(new_game)

    # Creator joins game automatically
    creator_member = GamePlayer(game_id=new_game.id, user_id=current_user.id)
    db.add(creator_member)
    db.commit()

    facility = db.query(Facility).filter(Facility.id == game_in.facility_id).first() if game_in.facility_id else None

    return GameOut(
        id=new_game.id,
        creator_id=current_user.id,
        creator_name=current_user.name,
        sport_id=sport.id,
        sport_name=sport.name,
        facility_name=facility.name if facility else "Campus Court",
        booking_date=new_game.booking_date,
        start_time=new_game.start_time,
        max_players=new_game.max_players,
        current_players=1,
        skill_level=new_game.skill_level,
        status=new_game.status,
        description=new_game.description,
        players=[GamePlayerOut(user_id=current_user.id, name=current_user.name, skill_level=current_user.skill_level)]
    )

@router.post("/{game_id}/join")
def join_open_game(
    game_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    if game.status != GameStatusEnum.OPEN.value:
        raise HTTPException(status_code=400, detail="This game is no longer open")

    existing_player = db.query(GamePlayer).filter(
        GamePlayer.game_id == game_id,
        GamePlayer.user_id == current_user.id
    ).first()
    if existing_player:
        raise HTTPException(status_code=400, detail="You have already joined this game")

    current_player_count = db.query(GamePlayer).filter(GamePlayer.game_id == game_id).count()
    if current_player_count >= game.max_players:
        game.status = GameStatusEnum.FULL.value
        db.commit()
        raise HTTPException(status_code=400, detail="Game is already full")

    # Add player
    new_member = GamePlayer(game_id=game_id, user_id=current_user.id)
    db.add(new_member)
    
    # Notify game creator
    notif = Notification(
        user_id=game.creator_id,
        message=f"🎮 {current_user.name} joined your {game.sport.name if game.sport else 'sports'} game scheduled for {game.booking_date} at {game.start_time}!",
        type="GAME_JOIN"
    )
    db.add(notif)

    # If now full, update status
    if current_player_count + 1 >= game.max_players:
        game.status = GameStatusEnum.FULL.value

    db.commit()
    return {"message": "Successfully joined the game! 🔥"}
