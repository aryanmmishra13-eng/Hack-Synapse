import React, { useState, useEffect } from 'react';
import { 
  Trophy, PlusCircle, Calendar, Users, Edit3, 
  CheckCircle2, Sparkles, ChevronRight, Award, ShieldCheck, Swords
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

export const AdminTournamentsPage = () => {
  const [tournaments, setTournaments] = useState([]);
  const [sports, setSports] = useState([]);
  const [selectedTourney, setSelectedTourney] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create Tournament Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [sportId, setSportId] = useState('');
  const [format, setFormat] = useState('KNOCKOUT');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [maxTeams, setMaxTeams] = useState(8);
  const [description, setDescription] = useState('');
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Score Entry Modal
  const [scoringMatch, setScoringMatch] = useState(null);
  const [scoreTeam1, setScoreTeam1] = useState(0);
  const [scoreTeam2, setScoreTeam2] = useState(0);
  const [matchStatus, setMatchStatus] = useState('COMPLETED');
  const [submittingScore, setSubmittingScore] = useState(false);

  const { addToast } = useNotification();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [tRes, sRes] = await Promise.all([
        api.get('/tournaments'),
        api.get('/sports')
      ]);
      setTournaments(tRes.data);
      setSports(sRes.data);
      if (sRes.data.length > 0 && !sportId) {
        setSportId(sRes.data[0].id);
      }
      if (tRes.data.length > 0) {
        loadTournamentBracket(tRes.data[0]);
      }
    } catch (err) {
      addToast('Failed to load tournaments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadTournamentBracket = async (tourney) => {
    setSelectedTourney(tourney);
    try {
      const res = await api.get(`/tournaments/${tourney.id}/bracket`);
      setMatches(res.data);
    } catch (err) {
      addToast('Failed to load tournament matches', 'error');
    }
  };

  const handleCreateTournament = async (e) => {
    e.preventDefault();
    setSubmittingCreate(true);
    try {
      await api.post('/tournaments/create', {
        name,
        sport_id: parseInt(sportId),
        format,
        start_date: startDate,
        end_date: endDate || null,
        max_teams: parseInt(maxTeams) || 8,
        description
      });
      addToast(`Created tournament "${name}"!`, 'success');
      setShowCreateModal(false);
      setName('');
      setDescription('');
      fetchInitialData();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to create tournament', 'error');
    } finally {
      setSubmittingCreate(false);
    }
  };

  const openScoreModal = (match) => {
    setScoringMatch(match);
    setScoreTeam1(match.score_team1 !== null ? match.score_team1 : 0);
    setScoreTeam2(match.score_team2 !== null ? match.score_team2 : 0);
    setMatchStatus('COMPLETED');
  };

  const handleScoreSubmit = async (e) => {
    e.preventDefault();
    if (!scoringMatch) return;
    setSubmittingScore(true);
    try {
      const res = await api.post(`/tournaments/match/${scoringMatch.id}/score`, {
        score_team1: parseInt(scoreTeam1),
        score_team2: parseInt(scoreTeam2),
        status: matchStatus
      });
      addToast(res.data.message || 'Match score updated and bracket advanced!', 'success');
      setScoringMatch(null);
      if (selectedTourney) {
        loadTournamentBracket(selectedTourney);
      }
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to submit match score', 'error');
    } finally {
      setSubmittingScore(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-widest mb-1.5">
            <Trophy className="w-3.5 h-3.5" />
            <span>BRACKET ENGINE & MATCH CONTROL</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold uppercase tracking-tight text-white">
            TOURNAMENT OPERATIONS
          </h1>
          <p className="text-sm text-muted mt-1 font-sans">
            Schedule university championship brackets, input match scores, and execute automated progression algorithms.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          data-cursor="NEW LEAGUE"
          className="px-6 py-3 bg-primary hover:bg-primary/90 text-black font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 self-start md:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>PROVISION TOURNAMENT</span>
        </button>
      </div>

      {/* Tournament Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {tournaments.map(t => (
          <button
            key={t.id}
            onClick={() => loadTournamentBracket(t)}
            data-cursor="SELECT"
            className={`px-4 py-2 text-xs font-mono uppercase tracking-wider whitespace-nowrap border transition-all ${
              selectedTourney?.id === t.id
                ? 'bg-primary text-black font-bold border-primary'
                : 'bg-black/60 text-muted hover:text-white border-white/10'
            }`}
          >
            {t.name} ({t.sport_name})
          </button>
        ))}
      </div>

      {/* Selected Tournament Match Control Table */}
      {selectedTourney && (
        <div className="card-panel p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 border border-primary/30 text-primary bg-primary/10">
                  {selectedTourney.sport_name}
                </span>
                <span className="text-xs font-mono text-muted">• {selectedTourney.format}</span>
              </div>
              <h2 className="text-3xl font-display font-bold uppercase tracking-tight text-white mt-1">
                {selectedTourney.name}
              </h2>
            </div>
            <div className="text-xs font-mono text-muted">
              <span className="text-primary font-bold">AUTO-PROGRESSION: </span>
              Completing matches automatically advances winners.
            </div>
          </div>

          {matches.length === 0 ? (
            <div className="p-12 text-center text-muted font-mono text-xs space-y-2">
              <Trophy className="w-8 h-8 mx-auto text-white/20" />
              <p>NO MATCHES SEEDED FOR THIS CHAMPIONSHIP YET.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono text-white">
                <thead className="bg-black/60 text-muted uppercase text-[10px] tracking-wider border-b border-white/10">
                  <tr>
                    <th className="py-3 px-4">MATCH</th>
                    <th className="py-3 px-4">MATCHUP</th>
                    <th className="py-3 px-4 text-center">SCORE</th>
                    <th className="py-3 px-4 text-center">STATUS</th>
                    <th className="py-3 px-4 text-center">WINNER</th>
                    <th className="py-3 px-4 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {matches.map(m => {
                    const isCompleted = m.status === 'COMPLETED';
                    const winnerName = m.winner_team_id 
                      ? (m.winner_team_id === m.team1_id ? m.team1_name : m.team2_name)
                      : null;

                    return (
                      <tr key={m.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-4 px-4 font-bold text-white">
                          <div>MATCH #{m.id}</div>
                          <div className="text-[10px] text-primary uppercase font-bold">{m.round}</div>
                        </td>

                        <td className="py-4 px-4">
                          <span className="font-bold uppercase text-white font-sans text-sm">{m.team1_name || 'TBD'}</span>
                          <span className="text-muted mx-2 font-bold font-mono">VS</span>
                          <span className="font-bold uppercase text-white font-sans text-sm">{m.team2_name || 'TBD'}</span>
                        </td>

                        <td className="py-4 px-4 text-center font-bold text-base">
                          {m.score_team1 !== null ? `${m.score_team1} - ${m.score_team2}` : '- : -'}
                        </td>

                        <td className="py-4 px-4 text-center">
                          <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 border ${
                            isCompleted ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-primary/10 text-primary border-primary/30'
                          }`}>
                            {m.status}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-center font-bold text-emerald-400 uppercase">
                          {winnerName || '-'}
                        </td>

                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => openScoreModal(m)}
                            disabled={!m.team1_name || !m.team2_name}
                            data-cursor="SCORE"
                            className="px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-black font-bold uppercase text-xs tracking-wider transition-all inline-flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>ENTER SCORE</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create Tournament Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg card-panel p-6 sm:p-8 space-y-6 border-white/20"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <div className="text-[10px] font-mono text-primary uppercase tracking-widest">
                    CHAMPIONSHIP SCHEDULER
                  </div>
                  <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white mt-0.5">
                    LAUNCH TOURNAMENT
                  </h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 text-muted hover:text-white border border-white/10"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateTournament} className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-[10px] uppercase text-muted mb-1.5">TOURNAMENT TITLE</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Monsoon Badminton Championship 2026"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 text-xs font-mono text-white focus:border-primary focus:outline-none font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase text-muted mb-1.5">DISCIPLINE</label>
                    <select
                      value={sportId}
                      onChange={(e) => setSportId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 text-xs font-mono text-white focus:border-primary focus:outline-none font-bold"
                    >
                      {sports.map(sp => (
                        <option key={sp.id} value={sp.id}>{sp.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase text-muted mb-1.5">FORMAT</label>
                    <select
                      value={format}
                      onChange={(e) => setFormat(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 text-xs font-mono text-white focus:border-primary focus:outline-none"
                    >
                      <option value="KNOCKOUT">Single Elimination Knockout</option>
                      <option value="ROUND_ROBIN">Round Robin</option>
                      <option value="LEAGUE">Campus League</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase text-muted mb-1.5">START DATE</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 text-xs font-mono text-white focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-muted mb-1.5">END DATE</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 text-xs font-mono text-white focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-muted mb-1.5">DESCRIPTION</label>
                  <textarea
                    rows={2}
                    placeholder="Official rules and squad roster qualifications."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 text-xs font-mono text-white focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="w-1/2 py-3 bg-white/5 hover:bg-white/10 text-muted hover:text-white border border-white/10 font-bold uppercase"
                  >
                    DISMISS
                  </button>
                  <button
                    type="submit"
                    disabled={submittingCreate}
                    data-cursor="LAUNCH"
                    className="w-1/2 py-3 bg-primary hover:bg-primary/90 text-black font-bold uppercase tracking-wider"
                  >
                    {submittingCreate ? 'CREATING...' : 'LAUNCH LEAGUE'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Enter Match Score Modal */}
      <AnimatePresence>
        {scoringMatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md card-panel p-6 sm:p-8 space-y-6 border-white/20"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <div className="text-[10px] font-mono text-primary uppercase tracking-widest">
                    MATCH RESULT
                  </div>
                  <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white mt-0.5">
                    INPUT MATCH SCORE
                  </h3>
                  <p className="text-xs font-mono text-muted">Match #{scoringMatch.id} • {scoringMatch.round}</p>
                </div>
                <button
                  onClick={() => setScoringMatch(null)}
                  className="p-2 text-muted hover:text-white border border-white/10"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleScoreSubmit} className="space-y-4 text-xs font-mono">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-black/80 border border-white/10 space-y-2 text-center">
                    <div className="font-bold text-white uppercase text-sm font-sans truncate">{scoringMatch.team1_name}</div>
                    <label className="block text-[10px] text-muted uppercase">FINAL SCORE</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={scoreTeam1}
                      onChange={(e) => setScoreTeam1(e.target.value)}
                      className="w-full text-center py-2 bg-black border border-white/10 text-3xl font-display font-bold text-white focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="p-4 bg-black/80 border border-white/10 space-y-2 text-center">
                    <div className="font-bold text-white uppercase text-sm font-sans truncate">{scoringMatch.team2_name}</div>
                    <label className="block text-[10px] text-muted uppercase">FINAL SCORE</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={scoreTeam2}
                      onChange={(e) => setScoreTeam2(e.target.value)}
                      className="w-full text-center py-2 bg-black border border-white/10 text-3xl font-display font-bold text-white focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="p-3.5 bg-primary/10 border border-primary/20 text-muted space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-primary">
                    <Sparkles className="w-4 h-4" />
                    <span>AUTOMATED ADVANCEMENT PROTOCOL</span>
                  </div>
                  <p className="text-[11px] font-sans">
                    Winning squad automatically advances to next bracket tier. If Finals, Gold and Silver medals are auto-conferred.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setScoringMatch(null)}
                    className="w-1/2 py-3 bg-white/5 hover:bg-white/10 text-muted hover:text-white border border-white/10 font-bold uppercase"
                  >
                    DISMISS
                  </button>
                  <button
                    type="submit"
                    disabled={submittingScore}
                    data-cursor="CONFIRM"
                    className="w-1/2 py-3 bg-primary hover:bg-primary/90 text-black font-bold uppercase tracking-wider"
                  >
                    {submittingScore ? 'ADVANCING...' : 'CONFIRM SCORE'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
