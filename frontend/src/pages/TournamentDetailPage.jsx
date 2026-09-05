import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Trophy, ArrowLeft, Calendar, Users, Award, 
  CheckCircle, Clock, ShieldCheck, ChevronRight, Sparkles, Swords
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

export const TournamentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useNotification();

  const [tournament, setTournament] = useState(null);
  const [bracketMatches, setBracketMatches] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [activeView, setActiveView] = useState('bracket'); // 'bracket' | 'leaderboard' | 'teams'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTournamentDetails();
  }, [id]);

  const fetchTournamentDetails = async () => {
    setLoading(true);
    try {
      const [tRes, bRes, lRes] = await Promise.all([
        api.get(`/tournaments/${id}`),
        api.get(`/tournaments/${id}/bracket`),
        api.get(`/tournaments/${id}/leaderboard`)
      ]);
      setTournament(tRes.data);
      setBracketMatches(bRes.data);
      setLeaderboard(lRes.data);
    } catch (err) {
      addToast('Failed to load tournament bracket', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="font-mono text-xs uppercase tracking-widest text-primary animate-pulse">
          LOADING BRACKET DATA...
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="card-panel p-12 text-center text-muted font-mono space-y-4">
        <p>TOURNAMENT NOT FOUND</p>
        <button onClick={() => navigate('/app/tournaments')} className="px-4 py-2 bg-primary text-black font-bold uppercase text-xs">
          BACK TO TOURNAMENTS
        </button>
      </div>
    );
  }

  // Group bracket matches by round
  const rounds = {};
  (bracketMatches || []).forEach(m => {
    const rName = m.round_name || m.round || 'Round 1';
    if (!rounds[rName]) rounds[rName] = [];
    rounds[rName].push(m);
  });

  return (
    <div className="space-y-8 pb-16">
      {/* Back button */}
      <button
        onClick={() => navigate('/app/tournaments')}
        className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4 text-primary" />
        <span>BACK TO TOURNAMENTS</span>
      </button>

      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-white/10 pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 border border-primary/30 text-primary bg-primary/10">
              {tournament.sport_name || tournament.sport?.name || 'VARSITY'}
            </span>
            <span className="text-xs font-mono text-muted">• {tournament.format?.replace('_', ' ') || 'KNOCKOUT'}</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold uppercase tracking-tight text-white">
            {tournament.name}
          </h1>
          <p className="text-xs text-muted max-w-xl font-sans">{tournament.description}</p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-2 p-1 bg-black/60 border border-white/10 self-start lg:self-auto">
          <button
            onClick={() => setActiveView('bracket')}
            className={`px-4 py-2 text-xs font-mono uppercase tracking-wider transition-all ${
              activeView === 'bracket'
                ? 'bg-primary text-black font-bold'
                : 'text-muted hover:text-white'
            }`}
          >
            BRACKET TREE
          </button>
          <button
            onClick={() => setActiveView('leaderboard')}
            className={`px-4 py-2 text-xs font-mono uppercase tracking-wider transition-all ${
              activeView === 'leaderboard'
                ? 'bg-primary text-black font-bold'
                : 'text-muted hover:text-white'
            }`}
          >
            STANDINGS
          </button>
          <button
            onClick={() => setActiveView('teams')}
            className={`px-4 py-2 text-xs font-mono uppercase tracking-wider transition-all ${
              activeView === 'teams'
                ? 'bg-primary text-black font-bold'
                : 'text-muted hover:text-white'
            }`}
          >
            SQUADS ({tournament.teams?.length || 0})
          </button>
        </div>
      </div>

      {/* Bracket View */}
      {activeView === 'bracket' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Swords className="w-4 h-4 text-primary" />
              <h2 className="text-xl font-display font-bold uppercase tracking-tight text-white">
                LIVE KNOCKOUT PROGRESSION TREE
              </h2>
            </div>
            <span className="text-xs font-mono text-muted">WINNERS ADVANCE PERPETUALLY</span>
          </div>

          {bracketMatches.length === 0 ? (
            <div className="card-panel p-12 text-center text-muted space-y-3">
              <Trophy className="w-10 h-10 text-white/20 mx-auto" />
              <h3 className="font-display text-xl uppercase font-bold text-white">SEEDING IN PROGRESS</h3>
              <p className="text-xs font-mono text-muted">Official bracket matches are being generated by tournament administrators.</p>
            </div>
          ) : (
            <div className="overflow-x-auto pb-6 scrollbar-none">
              <div className="flex items-start gap-8 min-w-[760px]">
                {Object.entries(rounds).map(([roundName, matches], rIdx) => (
                  <div key={roundName} className="flex-1 space-y-4">
                    <div className="p-3 bg-white/5 border border-white/10 text-center font-mono text-xs font-bold uppercase text-primary tracking-wider">
                      {roundName}
                    </div>

                    <div className="space-y-4">
                      {matches.map(m => {
                        const isCompleted = m.status === 'COMPLETED';
                        const team1IsWinner = isCompleted && m.winner_team_id === m.team1_id;
                        const team2IsWinner = isCompleted && m.winner_team_id === m.team2_id;
                        const score1 = m.team1_score !== undefined && m.team1_score !== null ? m.team1_score : (m.score_team1 !== null ? m.score_team1 : '-');
                        const score2 = m.team2_score !== undefined && m.team2_score !== null ? m.team2_score : (m.score_team2 !== null ? m.score_team2 : '-');

                        return (
                          <div
                            key={m.id}
                            className={`card-panel p-4 space-y-3 transition-all ${
                              isCompleted
                                ? 'border-white/10'
                                : 'border-primary/40'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono text-muted uppercase">
                              <span>MATCH #{m.id}</span>
                              <span className={isCompleted ? 'text-white' : 'text-primary font-bold'}>
                                {m.status}
                              </span>
                            </div>

                            {/* Team 1 */}
                            <div className={`p-3 border flex items-center justify-between text-xs font-mono transition-colors ${
                              team1IsWinner 
                                ? 'bg-primary/10 border-primary/40 text-primary font-bold' 
                                : 'bg-black/60 border-white/10 text-white'
                            }`}>
                              <span className="truncate uppercase">{m.team1_name || 'TBD'}</span>
                              <span className="font-bold text-sm pl-2">
                                {score1}
                              </span>
                            </div>

                            <div className="text-[9px] font-mono text-center text-muted uppercase tracking-widest">VS</div>

                            {/* Team 2 */}
                            <div className={`p-3 border flex items-center justify-between text-xs font-mono transition-colors ${
                              team2IsWinner 
                                ? 'bg-primary/10 border-primary/40 text-primary font-bold' 
                                : 'bg-black/60 border-white/10 text-white'
                            }`}>
                              <span className="truncate uppercase">{m.team2_name || 'TBD'}</span>
                              <span className="font-bold text-sm pl-2">
                                {score2}
                              </span>
                            </div>

                            {m.scheduled_time && (
                              <div className="text-[10px] font-mono text-muted flex items-center gap-1 justify-center pt-1">
                                <Clock className="w-3 h-3 text-primary" />
                                <span>{m.scheduled_time}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard View */}
      {activeView === 'leaderboard' && (
        <div className="card-panel p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <div className="text-[10px] font-mono text-primary uppercase tracking-widest">OFFICIAL STANDINGS</div>
              <h2 className="text-2xl font-display font-bold uppercase tracking-tight text-white mt-0.5">
                POINTS TABLE
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono text-white">
              <thead className="bg-black/60 text-muted uppercase text-[10px] tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">RANK</th>
                  <th className="py-3 px-4">SQUAD</th>
                  <th className="py-3 px-4 text-center">PLAYED</th>
                  <th className="py-3 px-4 text-center">WON</th>
                  <th className="py-3 px-4 text-center">LOST</th>
                  <th className="py-3 px-4 text-center">DIFF</th>
                  <th className="py-3 px-4 text-right">PTS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {leaderboard.map((row, idx) => (
                  <tr key={row.team_id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4 font-bold text-primary">
                      {idx === 0 ? '01' : idx === 1 ? '02' : idx === 2 ? '03' : String(idx + 1).padStart(2, '0')}
                    </td>
                    <td className="py-4 px-4 font-bold uppercase">{row.team_name}</td>
                    <td className="py-4 px-4 text-center text-muted">{row.played}</td>
                    <td className="py-4 px-4 text-center text-emerald-400 font-bold">{row.won}</td>
                    <td className="py-4 px-4 text-center text-rose-400">{row.lost}</td>
                    <td className="py-4 px-4 text-center text-muted">{row.goal_diff > 0 ? `+${row.goal_diff}` : row.goal_diff}</td>
                    <td className="py-4 px-4 text-right font-bold text-primary text-base">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Squads View */}
      {activeView === 'teams' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournament.teams?.map((team) => (
            <div key={team.id} className="card-panel p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white">{team.name}</h3>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 border border-primary/30 text-primary bg-primary/10">
                  CAPTAIN: {team.captain_name}
                </span>
              </div>
              <div className="text-xs font-mono text-muted bg-black/60 p-3.5 border border-white/10 space-y-1">
                <span className="text-[10px] text-muted uppercase font-bold block">REGISTERED ROSTER</span>
                <p className="text-white">
                  {team.roster_members?.length > 0 ? team.roster_members.join(', ') : 'Standard varsity roster'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
