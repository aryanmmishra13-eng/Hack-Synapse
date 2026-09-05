import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Calendar, Users, ChevronRight, Award, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

export const CoachTournamentsPage = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { addToast } = useNotification();

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tournaments');
      setTournaments(res.data);
    } catch (err) {
      addToast('Failed to load tournaments', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="border-b border-white/10 pb-6">
        <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-widest mb-1.5">
          <Trophy className="w-3.5 h-3.5" />
          <span>VARSITY SCOUTING & LEAGUE OPERATIONS</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-display font-bold uppercase tracking-tight text-white">
          TOURNAMENTS & MATCH SCOUTING
        </h1>
        <p className="text-sm text-muted mt-1 font-sans">
          Scout athlete match performances across active elimination brackets, squad rosters, and championship tables.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-56 card-panel animate-pulse p-6"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((t, index) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="card-panel p-6 flex flex-col justify-between hover:border-primary/50 transition-all space-y-5"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 border border-white/10 bg-white/5 text-muted">
                    {t.sport_name}
                  </span>
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 border border-primary/30 text-primary bg-primary/10">
                    {t.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white">{t.name}</h3>
                  <p className="text-xs font-mono text-muted mt-1 uppercase">{t.format.replace('_', ' ')} • {t.teams_count} SQUADS</p>
                </div>

                <div className="p-3.5 bg-black/60 border border-white/10 text-xs font-mono text-muted flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <span>{t.start_date} {t.end_date ? `to ${t.end_date}` : ''}</span>
                </div>
              </div>

              <button
                onClick={() => navigate(`/app/tournaments/${t.id}`)}
                data-cursor="SCOUT"
                className="w-full py-3 bg-white/5 hover:bg-primary text-white hover:text-black border border-white/10 hover:border-primary font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
              >
                <span>INSPECT BRACKET & MATCH LOGS</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
