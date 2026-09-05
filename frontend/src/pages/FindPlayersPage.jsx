import React, { useState, useEffect } from 'react';
import { Users, Sparkles, Send, Trophy, CheckCircle, Search, Zap, Crosshair } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

export const FindPlayersPage = () => {
  const [players, setPlayers] = useState([]);
  const [sportFilter, setSportFilter] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const { addToast } = useNotification();

  useEffect(() => {
    fetchPlayers();
  }, [sportFilter, skillFilter]);

  const fetchPlayers = async () => {
    setLoading(true);
    try {
      let url = '/players/match?';
      if (sportFilter) url += `sport=${encodeURIComponent(sportFilter)}&`;
      if (skillFilter) url += `skill_level=${encodeURIComponent(skillFilter)}&`;
      
      const res = await api.get(url);
      setPlayers(res.data);
    } catch (err) {
      addToast('Failed to load player recommendations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async (userId, name) => {
    try {
      await api.post(`/players/invite/${userId}`);
      addToast(`Sports match invitation sent to ${name}!`, 'success');
    } catch (err) {
      addToast('Failed to send invitation', 'error');
    }
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-widest mb-1.5">
            <Crosshair className="w-3.5 h-3.5" />
            <span>AI MATCHMAKING ENGINE</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold uppercase tracking-tight text-white">
            COMPATIBLE ATHLETES
          </h1>
          <p className="text-sm text-muted mt-1 font-sans">
            Algorithmically paired sparring partners based on historical pace, discipline rating, and active court availability.
          </p>
        </div>
      </div>

      {/* Filter Matrix */}
      <div className="card-panel p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-mono text-muted uppercase">
          <Search className="w-4 h-4 text-primary" />
          <span>ROSTER CRITERIA:</span>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full sm:w-auto">
          <select
            value={sportFilter}
            onChange={(e) => setSportFilter(e.target.value)}
            className="px-3 py-2 bg-black/60 border border-white/10 text-xs font-mono text-white focus:border-primary focus:outline-none"
          >
            <option value="">ALL DISCIPLINES</option>
            <option value="Badminton">Badminton</option>
            <option value="Football">Football</option>
            <option value="Basketball">Basketball</option>
            <option value="Tennis">Tennis</option>
            <option value="Volleyball">Volleyball</option>
            <option value="Cricket">Cricket</option>
            <option value="Gym">Gym</option>
          </select>

          <select
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            className="px-3 py-2 bg-black/60 border border-white/10 text-xs font-mono text-white focus:border-primary focus:outline-none"
          >
            <option value="">ALL TIERS</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
        </div>
      </div>

      {/* Player Matrix */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-52 card-panel animate-pulse p-6"></div>
          ))}
        </div>
      ) : players.length === 0 ? (
        <div className="card-panel p-12 text-center text-muted space-y-3">
          <Users className="w-10 h-10 text-white/20 mx-auto" />
          <h3 className="font-display text-xl uppercase font-bold text-white">NO ATHLETES MATCH CRITERIA</h3>
          <p className="text-xs font-mono text-muted max-w-sm mx-auto">
            Adjust your discipline or skill filters to broaden the matchmaking pool.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {players.map((p, index) => (
            <motion.div
              key={p.user_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="card-panel p-6 flex flex-col justify-between hover:border-primary/50 transition-all space-y-5"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 border border-primary/40 bg-black flex items-center justify-center font-display font-bold text-xl text-primary">
                      {p.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-xl font-display font-bold uppercase tracking-tight text-white">
                        {p.name}
                      </h3>
                      <p className="text-xs font-mono text-muted uppercase">
                        {p.preferred_sport} • <span className="text-white">{p.skill_level}</span>
                      </p>
                    </div>
                  </div>

                  {/* Match Score Badge */}
                  <div className="text-right">
                    <div className="text-3xl font-display font-bold text-primary tracking-tight">
                      {p.match_score}%
                    </div>
                    <div className="text-[9px] font-mono text-muted uppercase tracking-wider">
                      AFFINITY SCORE
                    </div>
                  </div>
                </div>

                {/* Match Reasons */}
                <div className="p-3.5 bg-white/5 border border-white/10 space-y-1.5 text-xs font-mono">
                  {p.reasons.map((r, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-muted">
                      <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleSendInvite(p.user_id, p.name)}
                data-cursor="INVITE"
                className="w-full py-3 bg-white/5 hover:bg-primary text-white hover:text-black border border-white/10 hover:border-primary font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>DISPATCH CHALLENGE INVITE</span>
              </button>
            </motion.div>
          ))}
        </div>
      )}

    </div>
  );
};
