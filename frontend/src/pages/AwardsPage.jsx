import React, { useState, useEffect } from 'react';
import { 
  Medal, Trophy, Award, Crown, CheckCircle2, 
  Lock, Sparkles, Star, Flame, Zap, ShieldCheck 
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

export const AwardsPage = () => {
  const [medals, setMedals] = useState([]);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  const { addToast } = useNotification();

  useEffect(() => {
    fetchAwards();
  }, []);

  const fetchAwards = async () => {
    setLoading(true);
    try {
      const [mRes, bRes] = await Promise.all([
        api.get('/achievements/my-medals'),
        api.get('/achievements/my-badges')
      ]);
      setMedals(mRes.data);
      setBadges(bRes.data);
    } catch (err) {
      addToast('Failed to load trophy cabinet', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-widest mb-1.5">
            <Crown className="w-3.5 h-3.5" />
            <span>HONORS & HALL OF FAME</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold uppercase tracking-tight text-white">
            TROPHY VAULT & BADGES
          </h1>
          <p className="text-sm text-muted mt-1 font-sans">
            Authenticated tournament victories, podium placements, and campus athletic milestone achievements.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs self-start md:self-auto">
          <div className="p-4 bg-black/60 border border-primary/40 text-center min-w-[110px]">
            <div className="text-3xl font-display font-bold text-primary">{medals.length}</div>
            <div className="text-[10px] font-mono text-muted uppercase mt-0.5">PODIUMS</div>
          </div>
          <div className="p-4 bg-black/60 border border-white/10 text-center min-w-[110px]">
            <div className="text-3xl font-display font-bold text-white">
              {badges.filter(b => b.unlocked).length} <span className="text-xs text-muted font-mono">/ {badges.length}</span>
            </div>
            <div className="text-[10px] font-mono text-muted uppercase mt-0.5">UNLOCKED</div>
          </div>
        </div>
      </div>

      {/* Trophy Cabinet Showcase */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          <h2 className="text-xl font-display font-bold uppercase tracking-tight text-white">
            CHAMPIONSHIP PODIUM MEDALS
          </h2>
        </div>

        {medals.length === 0 ? (
          <div className="card-panel p-12 text-center text-muted space-y-3">
            <Trophy className="w-10 h-10 text-white/20 mx-auto" />
            <h3 className="font-display text-xl uppercase font-bold text-white">TROPHY SHELF READY FOR VICTORY</h3>
            <p className="text-xs font-mono text-muted max-w-sm mx-auto">
              Enroll in varsity tournament knockout brackets to earn gold and silver honors for your team.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {medals.map((m, index) => {
              const isGold = m.medal_type === 'GOLD';
              const isSilver = m.medal_type === 'SILVER';

              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="card-panel p-6 flex flex-col justify-between hover:border-primary/50 transition-all space-y-5"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 border border-primary/40 bg-black flex items-center justify-center text-primary">
                        {m.award_type === 'TROPHY' ? (
                          <Trophy className="w-6 h-6" />
                        ) : (
                          <Medal className="w-6 h-6" />
                        )}
                      </div>
                      <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-1 border ${
                        isGold
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : isSilver
                          ? 'bg-white/10 text-white border-white/30'
                          : 'bg-amber-800/20 text-amber-500 border-amber-800/30'
                      }`}>
                        {m.medal_type} {m.award_type}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white">
                        {m.tournament_name}
                      </h3>
                      <p className="text-xs font-mono text-muted mt-1 uppercase">
                        DISCIPLINE: <span className="text-white">{m.sport_name}</span>
                      </p>
                    </div>

                    <div className="p-3.5 bg-black/60 border border-white/10 space-y-1.5 text-xs font-mono">
                      {m.team_name && (
                        <div className="flex justify-between text-muted">
                          <span>SQUAD:</span>
                          <span className="font-bold text-white uppercase">{m.team_name}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-muted">
                        <span>CONFERRED:</span>
                        <span className="text-primary">{m.awarded_at?.split('T')[0] || 'CHAMPIONSHIP FINALS'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10 text-[10px] font-mono text-muted flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                    <span>AUTHENTICATED ATHLETIC CREDENTIAL</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Gamified Achievement Badges */}
      <div className="space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-primary" />
          <h2 className="text-xl font-display font-bold uppercase tracking-tight text-white">
            ATHLETIC MILESTONES & BADGES
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {badges.map((b, index) => {
            const isUnlocked = b.unlocked;
            return (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`card-panel p-6 transition-all ${
                  isUnlocked ? 'border-primary/40 hover:border-primary' : 'opacity-40 border-white/5'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 border shrink-0 flex items-center justify-center ${
                    isUnlocked ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-black border-white/10 text-white/20'
                  }`}>
                    {isUnlocked ? <Sparkles className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-display font-bold uppercase text-lg text-white truncate">{b.title}</h4>
                      {isUnlocked && (
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-xs font-mono text-muted leading-relaxed line-clamp-2">{b.description}</p>

                    {/* Progress Bar */}
                    <div className="pt-2">
                      <div className="flex justify-between text-[10px] font-mono text-muted mb-1">
                        <span>PROGRESS</span>
                        <span>{isUnlocked ? '100%' : `${b.progress || 0}%`}</span>
                      </div>
                      <div className="w-full h-1 bg-white/10 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            isUnlocked ? 'bg-primary' : 'bg-white/40'
                          }`}
                          style={{ width: `${isUnlocked ? 100 : (b.progress || 20)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
