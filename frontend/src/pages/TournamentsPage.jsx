import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trophy, Calendar, Users, Shield, Award, ChevronRight, 
  PlusCircle, CheckCircle2, Sparkles, Filter, ArrowUpRight, Crown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

export const TournamentsPage = () => {
  const [tournaments, setTournaments] = useState([]);
  const [sports, setSports] = useState([]);
  const [selectedSport, setSelectedSport] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Register modal
  const [registerModalTourney, setRegisterModalTourney] = useState(null);
  const [teamName, setTeamName] = useState('');
  const [captainName, setCaptainName] = useState('');
  const [rosterMembers, setRosterMembers] = useState('');
  const [submittingReg, setSubmittingReg] = useState(false);

  const navigate = useNavigate();
  const { addToast } = useNotification();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tRes, sRes] = await Promise.all([
        api.get('/tournaments'),
        api.get('/sports')
      ]);
      setTournaments(tRes.data);
      setSports(sRes.data);
    } catch (err) {
      addToast('Failed to load tournaments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!registerModalTourney) return;
    setSubmittingReg(true);
    try {
      const membersArray = rosterMembers
        ? rosterMembers.split(',').map(s => s.trim()).filter(Boolean)
        : [];
      await api.post(`/tournaments/${registerModalTourney.id}/register`, {
        team_name: teamName,
        captain_name: captainName,
        roster_members: membersArray
      });
      addToast(`Team "${teamName}" registered successfully!`, 'success');
      setRegisterModalTourney(null);
      setTeamName('');
      setCaptainName('');
      setRosterMembers('');
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to register team', 'error');
    } finally {
      setSubmittingReg(false);
    }
  };

  const filteredTournaments = tournaments.filter(t => {
    const matchSport = selectedSport === 'ALL' || t.sport_name?.toLowerCase() === selectedSport.toLowerCase();
    const matchStatus = selectedStatus === 'ALL' || t.status === selectedStatus;
    return matchSport && matchStatus;
  });

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-widest mb-1.5">
            <Trophy className="w-3.5 h-3.5" />
            <span>VARSITY CHAMPIONSHIP SERIES</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold uppercase tracking-tight text-white">
            TOURNAMENTS & LEAGUES
          </h1>
          <p className="text-sm text-muted mt-1 font-sans">
            Official bracket elimination tournaments, group stage championship leagues, and varsity squad registrations.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs self-start md:self-auto">
          <div className="p-4 bg-black/60 border border-primary/40 text-center min-w-[110px]">
            <div className="text-3xl font-display font-bold text-primary">{tournaments.length}</div>
            <div className="text-[10px] font-mono text-muted uppercase mt-0.5">LEAGUES</div>
          </div>
          <div className="p-4 bg-black/60 border border-emerald-500/30 text-center min-w-[110px]">
            <div className="text-3xl font-display font-bold text-emerald-400">
              {tournaments.filter(t => t.status === 'ONGOING').length}
            </div>
            <div className="text-[10px] font-mono text-muted uppercase mt-0.5">ACTIVE NOW</div>
          </div>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Sport pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedSport('ALL')}
            className={`px-4 py-2 text-xs font-mono uppercase tracking-wider whitespace-nowrap border transition-all ${
              selectedSport === 'ALL'
                ? 'bg-primary text-black font-bold border-primary'
                : 'bg-black/50 text-muted hover:text-white border-white/10'
            }`}
          >
            ALL DISCIPLINES
          </button>
          {sports.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedSport(s.name)}
              className={`px-4 py-2 text-xs font-mono uppercase tracking-wider whitespace-nowrap border transition-all ${
                selectedSport === s.name
                  ? 'bg-primary text-black font-bold border-primary'
                  : 'bg-black/50 text-muted hover:text-white border-white/10'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-2 p-1 bg-black/60 border border-white/10 self-start lg:self-auto">
          {['ALL', 'ONGOING', 'UPCOMING', 'COMPLETED'].map(st => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-all ${
                selectedStatus === st
                  ? 'bg-white/15 text-white font-bold'
                  : 'text-muted hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Tournaments Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className="h-64 card-panel animate-pulse p-6"></div>
          ))}
        </div>
      ) : filteredTournaments.length === 0 ? (
        <div className="card-panel p-12 text-center text-muted space-y-3">
          <Trophy className="w-10 h-10 text-white/20 mx-auto" />
          <h3 className="font-display text-xl uppercase font-bold text-white">NO TOURNAMENTS FOUND</h3>
          <p className="text-xs font-mono text-muted">Adjust filter criteria to view active championship tournaments.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTournaments.map((t, index) => {
            const isOngoing = t.status === 'ONGOING';
            const isCompleted = t.status === 'COMPLETED';
            const canRegister = t.status === 'UPCOMING' || t.status === 'ONGOING';

            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="card-panel p-6 flex flex-col justify-between hover:border-primary/50 transition-all space-y-5 group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 border border-white/10 bg-white/5 text-muted">
                      {t.sport_name}
                    </span>
                    <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 border ${
                      isOngoing
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 animate-pulse'
                        : isCompleted
                        ? 'bg-white/5 text-muted border-white/10'
                        : 'bg-primary/10 text-primary border-primary/30'
                    }`}>
                      {t.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white group-hover:text-primary transition-colors">
                      {t.name}
                    </h3>
                    <p className="text-xs font-mono text-muted mt-1 line-clamp-2">
                      {t.description || `${t.format.replace('_', ' ')} championship with active bracket progression.`}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono p-3.5 bg-black/60 border border-white/10">
                    <div>
                      <span className="text-[9px] text-muted uppercase block">FORMAT</span>
                      <span className="text-white font-bold">{t.format.replace('_', ' ')}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-muted uppercase block">SQUADS</span>
                      <span className="text-white font-bold">{t.teams_count} / {t.max_teams}</span>
                    </div>
                    <div className="col-span-2 flex items-center gap-1.5 pt-2 border-t border-white/10 text-muted">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      <span>{t.start_date} {t.end_date ? `to ${t.end_date}` : ''}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => navigate(`/app/tournaments/${t.id}`)}
                    data-cursor="BRACKET"
                    className="w-full py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                  >
                    <span>VIEW BRACKET & ROSTER</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {canRegister && (
                    <button
                      onClick={() => setRegisterModalTourney(t)}
                      data-cursor="REGISTER"
                      className="w-full py-3 bg-primary hover:bg-primary/90 text-black font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>REGISTER SQUAD</span>
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Register Squad Modal */}
      <AnimatePresence>
        {registerModalTourney && (
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
                    VARSITY REGISTRATION
                  </div>
                  <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white mt-0.5">
                    ENROLL SQUAD
                  </h3>
                  <p className="text-xs font-mono text-muted">{registerModalTourney.name}</p>
                </div>
                <button
                  onClick={() => setRegisterModalTourney(null)}
                  className="p-2 text-muted hover:text-white border border-white/10"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleRegister} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-muted mb-1.5">SQUAD / TEAM NAME</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Phoenix Titans"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 text-xs font-mono text-white focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-muted mb-1.5">CAPTAIN ATHLETE NAME</label>
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    value={captainName}
                    onChange={(e) => setCaptainName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 text-xs font-mono text-white focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-muted mb-1.5">ROSTER MEMBERS (COMMA-SEPARATED)</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Aryan S., Devansh K., Rohit V."
                    value={rosterMembers}
                    onChange={(e) => setRosterMembers(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 text-xs font-mono text-white focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="p-3.5 bg-white/5 border border-white/10 text-muted space-y-1">
                  <div className="flex items-center gap-1.5 font-mono text-xs text-primary uppercase font-bold">
                    <Shield className="w-4 h-4" />
                    <span>SEEDING & FAIR PLAY</span>
                  </div>
                  <p className="text-[11px] font-sans">
                    Squad enrollment enters your roster directly into the official championship bracket tree.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setRegisterModalTourney(null)}
                    className="w-1/2 py-3 bg-white/5 hover:bg-white/10 text-muted hover:text-white border border-white/10 font-mono text-xs uppercase font-bold"
                  >
                    DISMISS
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReg}
                    data-cursor="CONFIRM"
                    className="w-1/2 py-3 bg-primary hover:bg-primary/90 text-black font-mono text-xs uppercase font-bold tracking-wider"
                  >
                    {submittingReg ? 'REGISTERING...' : 'CONFIRM SQUAD'}
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
