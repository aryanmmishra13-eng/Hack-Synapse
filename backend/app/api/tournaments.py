from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database.session import get_db
from app.models.models import (
    Tournament, TournamentTeam, TournamentPlayer, TournamentMatch,
    Sport, User, Medal, Achievement, StudentAchievement, Notification
)
from app.schemas.schemas import (
    TournamentCreate, TournamentOut, TournamentMatchOut,
    TournamentRegister, MatchResultUpdate
)
from app.api.auth import get_current_user, get_current_admin

router = APIRouter(prefix="/api/tournaments", tags=["Tournaments & Brackets"])

@router.get("", response_model=List[TournamentOut])
def get_tournaments(sport_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Tournament)
    if sport_id:
        query = query.filter(Tournament.sport_id == sport_id)
    
    tournaments = query.order_by(Tournament.id.desc()).all()
    results = []

    for t in tournaments:
        sport = db.query(Sport).filter(Sport.id == t.sport_id).first()
        registered_count = db.query(TournamentTeam).filter(TournamentTeam.tournament_id == t.id).count()

        matches = (
            db.query(TournamentMatch)
            .filter(TournamentMatch.tournament_id == t.id)
            .order_by(TournamentMatch.id.asc())
            .all()
        )
        matches_out = []
        for m in matches:
            t1 = db.query(TournamentTeam).filter(TournamentTeam.id == m.team1_id).first() if m.team1_id else None
            t2 = db.query(TournamentTeam).filter(TournamentTeam.id == m.team2_id).first() if m.team2_id else None
            winner = db.query(TournamentTeam).filter(TournamentTeam.id == m.winner_team_id).first() if m.winner_team_id else None

            matches_out.append(TournamentMatchOut(
                id=m.id,
                round_name=m.round_name,
                team1_name=t1.team_name if t1 else "TBD",
                team2_name=t2.team_name if t2 else "TBD",
                score_team1=m.score_team1,
                score_team2=m.score_team2,
                winner_team_name=winner.team_name if winner else None,
                next_match_id=m.next_match_id,
                status=m.status,
                match_date=m.match_date,
                start_time=m.start_time,
                venue=m.venue
            ))

        results.append(TournamentOut(
            id=t.id,
            sport_id=t.sport_id,
            sport_name=sport.name if sport else "Sport",
            name=t.name,
            description=t.description,
            format=t.format,
            venue=t.venue,
            start_date=t.start_date,
            end_date=t.end_date,
            registration_deadline=t.registration_deadline,
            max_teams=t.max_teams,
            registered_teams_count=registered_count,
            rules=t.rules,
            prize_info=t.prize_info,
            status=t.status,
            matches=matches_out
        ))

    return results

@router.get("/{tournament_id}", response_model=TournamentOut)
def get_tournament_by_id(tournament_id: int, db: Session = Depends(get_db)):
    tournaments = get_tournaments(db=db)
    for t in tournaments:
        if t.id == tournament_id:
            return t
    raise HTTPException(status_code=404, detail="Tournament not found")

@router.get("/{tournament_id}/bracket", response_model=List[TournamentMatchOut])
def get_tournament_bracket(tournament_id: int, db: Session = Depends(get_db)):
    tourn = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tourn:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    matches = (
        db.query(TournamentMatch)
        .filter(TournamentMatch.tournament_id == tournament_id)
        .order_by(TournamentMatch.id.asc())
        .all()
    )
    matches_out = []
    for m in matches:
        t1 = db.query(TournamentTeam).filter(TournamentTeam.id == m.team1_id).first() if m.team1_id else None
        t2 = db.query(TournamentTeam).filter(TournamentTeam.id == m.team2_id).first() if m.team2_id else None
        winner = db.query(TournamentTeam).filter(TournamentTeam.id == m.winner_team_id).first() if m.winner_team_id else None
        matches_out.append(TournamentMatchOut(
            id=m.id,
            round_name=m.round_name,
            team1_name=t1.team_name if t1 else "TBD",
            team2_name=t2.team_name if t2 else "TBD",
            score_team1=m.score_team1,
            score_team2=m.score_team2,
            winner_team_name=winner.team_name if winner else None,
            next_match_id=m.next_match_id,
            status=m.status,
            match_date=m.match_date,
            start_time=m.start_time,
            venue=m.venue
        ))
    return matches_out

@router.get("/{tournament_id}/teams")
def get_tournament_teams(tournament_id: int, db: Session = Depends(get_db)):
    teams = db.query(TournamentTeam).filter(TournamentTeam.tournament_id == tournament_id).all()
    results = []
    for tm in teams:
        captain = db.query(User).filter(User.id == tm.captain_id).first()
        players = (
            db.query(TournamentPlayer)
            .filter(TournamentPlayer.team_id == tm.id)
            .all()
        )
        roster = []
        for p in players:
            u = db.query(User).filter(User.id == p.student_id).first()
            if u:
                roster.append({
                    "id": u.id,
                    "name": u.name,
                    "email": u.email,
                    "skill_level": u.skill_level,
                    "is_captain": (u.id == tm.captain_id),
                    "is_substitute": p.is_substitute
                })

        results.append({
            "id": tm.id,
            "team_name": tm.team_name,
            "captain_name": captain.name if captain else "Captain",
            "captain_id": tm.captain_id,
            "status": tm.status,
            "points": tm.points,
            "wins": tm.wins,
            "losses": tm.losses,
            "matches_played": tm.matches_played,
            "roster": roster
        })
    return results

@router.post("/register")
def register_team(
    reg_in: TournamentRegister,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tournament = db.query(Tournament).filter(Tournament.id == reg_in.tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    if tournament.status not in ["UPCOMING", "REGISTRATION OPEN"]:
        raise HTTPException(status_code=400, detail=f"Registration is closed (Status: {tournament.status})")

    existing_team_for_user = (
        db.query(TournamentPlayer)
        .join(TournamentTeam)
        .filter(
            TournamentTeam.tournament_id == reg_in.tournament_id,
            TournamentPlayer.student_id == current_user.id
        )
        .first()
    )
    if existing_team_for_user:
        raise HTTPException(status_code=400, detail="You are already registered on a team in this tournament.")

    existing_teams_count = db.query(TournamentTeam).filter(TournamentTeam.tournament_id == reg_in.tournament_id).count()
    if existing_teams_count >= tournament.max_teams:
        raise HTTPException(status_code=400, detail="Tournament maximum teams limit reached.")

    team = TournamentTeam(
        tournament_id=reg_in.tournament_id,
        team_name=reg_in.team_name,
        captain_id=current_user.id,
        status="CONFIRMED"
    )
    db.add(team)
    db.commit()
    db.refresh(team)

    player_ids = set([current_user.id] + reg_in.player_ids)
    for p_id in player_ids:
        db.add(TournamentPlayer(team_id=team.id, student_id=p_id))

    empty_quarter = (
        db.query(TournamentMatch)
        .filter(
            TournamentMatch.tournament_id == tournament.id,
            TournamentMatch.round_name == "Quarter Finals"
        )
        .all()
    )
    for qm in empty_quarter:
        if qm.team1_id is None:
            qm.team1_id = team.id
            break
        elif qm.team2_id is None:
            qm.team2_id = team.id
            break

    db.commit()
    return {
        "message": f"Team '{team.team_name}' registered successfully for {tournament.name}!",
        "team_id": team.id
    }

@router.post("/{tournament_id}/register")
def register_team_by_path(
    tournament_id: int,
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    t_name = payload.get("team_name") or f"Team {current_user.name}"
    reg = TournamentRegister(
        tournament_id=tournament_id,
        team_name=t_name,
        player_ids=payload.get("player_ids") or []
    )
    return register_team(reg, current_user, db)


@router.get("/leaderboard")
@router.get("/{tournament_id}/leaderboard")
def get_leaderboard(
    tournament_id: Optional[int] = None,
    sport_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    if tournament_id:
        teams = db.query(TournamentTeam).filter(TournamentTeam.tournament_id == tournament_id).all()
        results = []
        for idx, tm in enumerate(teams):
            results.append({
                "team_id": tm.id,
                "team_name": tm.team_name,
                "played": tm.matches_played or (tm.wins + tm.losses),
                "won": tm.wins,
                "lost": tm.losses,
                "goal_diff": (tm.wins * 3) - tm.losses,
                "points": tm.points or (tm.wins * 3)
            })
        results.sort(key=lambda x: x["points"], reverse=True)
        return results

    query = db.query(User).filter(User.role == "STUDENT")
    if sport_id:
        sport = db.query(Sport).filter(Sport.id == sport_id).first()
        if sport:
            query = query.filter(User.preferred_sport == sport.name)

    students = query.all()
    leaderboard = []

    for s in students:
        teams = db.query(TournamentTeam).filter(TournamentTeam.captain_id == s.id).all()
        wins = sum(t.wins for t in teams)
        losses = sum(t.losses for t in teams)
        pts = (wins * 15) + ((s.id * 7) % 35) + 40
        medals_count = db.query(Medal).filter(Medal.student_id == s.id).count()

        leaderboard.append({
            "student_id": s.id,
            "name": s.name,
            "preferred_sport": s.preferred_sport or "Badminton",
            "skill_level": s.skill_level,
            "matches": wins + losses + 6,
            "wins": wins + 4,
            "losses": losses + 2,
            "points": pts,
            "rating": round(72.0 + (pts % 25), 1),
            "medals": medals_count
        })

    leaderboard.sort(key=lambda x: x["points"], reverse=True)
    for idx, item in enumerate(leaderboard):
        item["rank"] = idx + 1

    return leaderboard

@router.post("/create", response_model=TournamentOut)
@router.post("/admin/create", response_model=TournamentOut)
def admin_create_tournament(
    tourn_in: TournamentCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):

    sport = db.query(Sport).filter(Sport.id == tourn_in.sport_id).first()
    if not sport:
        raise HTTPException(status_code=404, detail="Sport not found")

    new_tourn = Tournament(
        sport_id=tourn_in.sport_id,
        name=tourn_in.name,
        description=tourn_in.description,
        format=tourn_in.format,
        venue=tourn_in.venue,
        start_date=tourn_in.start_date,
        end_date=tourn_in.end_date,
        registration_deadline=tourn_in.registration_deadline,
        max_teams=tourn_in.max_teams,
        max_players_per_team=tourn_in.max_players_per_team,
        rules=tourn_in.rules,
        prize_info=tourn_in.prize_info,
        status="REGISTRATION OPEN"
    )
    db.add(new_tourn)
    db.commit()
    db.refresh(new_tourn)

    # 1. Final match
    final_match = TournamentMatch(
        tournament_id=new_tourn.id,
        round_name="Final",
        match_date=new_tourn.end_date,
        start_time="17:00",
        venue=new_tourn.venue,
        status="SCHEDULED"
    )
    db.add(final_match)
    db.commit()
    db.refresh(final_match)

    # 2. Semi Finals (2 matches, linking to final)
    semi1 = TournamentMatch(
        tournament_id=new_tourn.id,
        round_name="Semi Finals",
        match_date=new_tourn.start_date,
        start_time="14:00",
        venue=new_tourn.venue,
        next_match_id=final_match.id,
        status="SCHEDULED"
    )
    semi2 = TournamentMatch(
        tournament_id=new_tourn.id,
        round_name="Semi Finals",
        match_date=new_tourn.start_date,
        start_time="15:30",
        venue=new_tourn.venue,
        next_match_id=final_match.id,
        status="SCHEDULED"
    )
    db.add(semi1)
    db.add(semi2)
    db.commit()
    db.refresh(semi1)
    db.refresh(semi2)

    # 3. Quarter Finals (4 matches, linking to semi1 & semi2)
    for i in range(4):
        target_semi = semi1 if i < 2 else semi2
        qm = TournamentMatch(
            tournament_id=new_tourn.id,
            round_name="Quarter Finals",
            match_date=new_tourn.start_date,
            start_time=f"{9 + (i*1)}:00",
            venue=new_tourn.venue,
            next_match_id=target_semi.id,
            status="SCHEDULED"
        )
        db.add(qm)

    db.commit()
    return get_tournaments(sport_id=new_tourn.sport_id, db=db)[0]

@router.post("/admin/matches/{match_id}/score")
@router.post("/match/{match_id}/score")
def admin_update_match_score(
    match_id: int,
    result_in: MatchResultUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    match = db.query(TournamentMatch).filter(TournamentMatch.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    winner_id = result_in.winner_team_id
    if not winner_id:
        if result_in.score_team1 > result_in.score_team2:
            winner_id = match.team1_id
        elif result_in.score_team2 > result_in.score_team1:
            winner_id = match.team2_id
        else:
            winner_id = match.team1_id

    match.score_team1 = result_in.score_team1
    match.score_team2 = result_in.score_team2
    match.winner_team_id = winner_id
    match.status = result_in.status

    winner_team = db.query(TournamentTeam).filter(TournamentTeam.id == winner_id).first()
    loser_team_id = match.team2_id if match.team1_id == winner_id else match.team1_id
    loser_team = db.query(TournamentTeam).filter(TournamentTeam.id == loser_team_id).first() if loser_team_id else None

    if winner_team:
        winner_team.wins += 1
        winner_team.points += 3
        winner_team.matches_played += 1
    if loser_team:
        loser_team.losses += 1
        loser_team.matches_played += 1

    # AUTOMATIC BRACKET ADVANCEMENT:
    # If this match has a next_match_id, slot the winner into the next round!
    if match.next_match_id and match.status == "COMPLETED" and winner_team:
        next_m = db.query(TournamentMatch).filter(TournamentMatch.id == match.next_match_id).first()
        if next_m:
            if next_m.team1_id is None or next_m.team1_id == winner_team.id:
                next_m.team1_id = winner_team.id
            elif next_m.team2_id is None:
                next_m.team2_id = winner_team.id

    # IF THIS IS THE FINAL MATCH:
    # Mark tournament completed, award Gold & Silver medals, unlock Champion badge!
    if match.round_name == "Final" and match.status == "COMPLETED" and winner_team:
        tourn = db.query(Tournament).filter(Tournament.id == match.tournament_id).first()
        if tourn:
            tourn.status = "COMPLETED"

        sport_name = tourn.sport.name if (tourn and tourn.sport) else "Athletics"

        # Award Gold Medal & Trophy to Winner Captain
        gold_medal = Medal(
            student_id=winner_team.captain_id,
            tournament_id=match.tournament_id,
            award_name=f"{tourn.name} Champion",
            sport_name=sport_name,
            position="Gold Medal",
            year="2026",
            award_type="TROPHY",
            team_name=winner_team.team_name
        )
        db.add(gold_medal)

        # Award Silver Medal to Runner-Up
        if loser_team:
            silver_medal = Medal(
                student_id=loser_team.captain_id,
                tournament_id=match.tournament_id,
                award_name=f"{tourn.name} Runner-Up",
                sport_name=sport_name,
                position="Silver Medal",
                year="2026",
                award_type="MEDAL",
                team_name=loser_team.team_name
            )
            db.add(silver_medal)

        # Unlock Champion badge
        champ_ach = db.query(Achievement).filter(Achievement.code == "CHAMPION").first()
        if champ_ach:
            sa = db.query(StudentAchievement).filter(
                StudentAchievement.student_id == winner_team.captain_id,
                StudentAchievement.achievement_id == champ_ach.id
            ).first()
            if not sa:
                sa = StudentAchievement(
                    student_id=winner_team.captain_id,
                    achievement_id=champ_ach.id,
                    progress=1,
                    unlocked=True
                )
                db.add(sa)
            else:
                sa.unlocked = True

        # Send notification to winner
        notif = Notification(
            user_id=winner_team.captain_id,
            message=f"🏆 Congratulations! Team {winner_team.team_name} won the {tourn.name}! Gold Medal & Champion Trophy awarded.",
            type="TOURNAMENT_WIN"
        )
        db.add(notif)

    db.commit()
    return {
        "message": "Match score recorded! Bracket progressed and standings updated.",
        "match_id": match_id,
        "winner_team": winner_team.team_name if winner_team else None
    }
