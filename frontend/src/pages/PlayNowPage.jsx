import React, { useState, useEffect } from 'react';
import { 
  Gamepad2, Users, Plus, CheckCircle2, Clock, Sparkles, Trophy, User, ArrowUpRight, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

export const PlayNowPage = () => {
  const [games, setGames] = useState([]);
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Game Form
  const [sportId, setSportId] = useState('');
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('18:00');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [skillLevel, setSkillLevel] = useState('Intermediate');
  const [description, setDescription] = useState('Need players for a friendly match!');

  const { addToast } = useNotification();

  useEffect(() => {
    fetchGames();
    fetchSports();
  }, []);

  const fetchGames = async () => {
    try {
      const res = await api.get('/games');
      setGames(res.data);
    } catch (err) {
      addToast('Failed to load open games', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSports = async () => {
    try {
      const res = await api.get('/sports');
      setSports(res.data);
      if (res.data.length > 0) setSportId(res.data[0].id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleJoinGame = async (gameId) => {
    try {
      const res = await api.post(`/games/${gameId}/join`);
      addToast(res.data.message, 'success');
      fetchGames();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to join game', 'error');
    }
  };

  const handleCreateGame = async (e) => {
    e.preventDefault();
    try {
      await api.post('/games', {
        sport_id: parseInt(sportId),
        booking_date: bookingDate,
        start_time: startTime,
        max_players: parseInt(maxPlayers),
        skill_level: skillLevel,
        description
      });
      addToast('Open game lobby created successfully!', 'success');
      setShowCreateModal(false);
      fetchGames();
    } catch (err) {
      addToast('Failed to create open game', 'error');
    }
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-widest mb-1.5">
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>PICKUP MATCH PROTOCOL</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold uppercase tracking-tight text-white">
            PLAY NOW — OPEN LOBBIES
          </h1>
          <p className="text-sm text-muted mt-1 font-sans">
            Drop into unranked pickup games or host your own multi-athlete match lobby on campus.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          data-cursor="HOST"
          className="px-6 py-3 bg-primary hover:bg-primary/90 text-black font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>INITIALIZE LOBBY</span>
        </button>
      </div>

      {/* Games Matrix */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-56 card-panel animate-pulse p-6"></div>
          ))}
        </div>
      ) : games.length === 0 ? (
        <div className="card-panel p-12 text-center text-muted space-y-3">
          <Gamepad2 className="w-10 h-10 text-white/20 mx-auto" />
          <h3 className="font-display text-xl uppercase font-bold text-white">NO ACTIVE MATCH LOBBIES</h3>
          <p className="text-xs font-mono text-muted max-w-sm mx-auto">
            All current pickup games are full or finished. Create a new open lobby to summon players.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {games.map((game, index) => {
            const needed = game.max_players - game.current_players;
            return (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="card-panel p-6 flex flex-col justify-between hover:border-primary/50 transition-all space-y-5"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 border border-primary/30 text-primary bg-primary/10">
                      {game.sport_name}
                    </span>

                    <span className="text-[10px] font-mono uppercase text-amber-400 border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5">
                      TIER: {game.skill_level}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white">
                      {game.facility_name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs font-mono text-muted">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      <span>{game.booking_date} // {game.start_time}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-white/5 border border-white/10 text-xs font-mono text-muted italic">
                    "{game.description}"
                  </div>

                  <div className="flex items-center justify-between pt-2 text-xs font-mono">
                    <div className="flex items-center gap-2 text-white">
                      <Users className="w-4 h-4 text-primary" />
                      <span>ROSTER: {game.current_players}/{game.max_players}</span>
                    </div>

                    <span className={`font-bold ${needed > 0 ? 'text-primary' : 'text-white/30'}`}>
                      {needed > 0 ? `NEEDS ${needed} ATHLETE${needed > 1 ? 'S' : ''}` : 'ROSTER FULL'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleJoinGame(game.id)}
                  disabled={needed === 0}
                  data-cursor={needed > 0 ? "JOIN" : undefined}
                  className={`w-full py-3 font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    needed > 0
                      ? 'bg-primary hover:bg-primary/90 text-black'
                      : 'bg-white/5 text-muted border border-white/10 cursor-not-allowed'
                  }`}
                >
                  <Gamepad2 className="w-4 h-4" />
                  <span>{needed > 0 ? 'ENTER MATCH LOBBY' : 'LOBBY AT CAPACITY'}</span>
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Game Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md card-panel p-6 sm:p-8 space-y-6 border-white/20"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <div className="text-[10px] font-mono text-primary uppercase tracking-widest">
                    SESSION SETUP
                  </div>
                  <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white mt-0.5">
                    HOST PICKUP LOBBY
                  </h3>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="text-muted hover:text-white">✕</button>
              </div>

              <form onSubmit={handleCreateGame} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-muted mb-1.5">DISCIPLINE</label>
                  <select
                    value={sportId}
                    onChange={(e) => setSportId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-black/60 border border-white/10 text-xs font-mono text-white focus:border-primary focus:outline-none"
                  >
                    {sports.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-muted mb-1.5">DATE</label>
                    <input
                      type="date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full px-3 py-2 bg-black/60 border border-white/10 text-xs font-mono text-white focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-muted mb-1.5">TIME</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-2 bg-black/60 border border-white/10 text-xs font-mono text-white focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-muted mb-1.5">CAPACITY</label>
                    <input
                      type="number"
                      min="2"
                      max="22"
                      value={maxPlayers}
                      onChange={(e) => setMaxPlayers(e.target.value)}
                      className="w-full px-3 py-2 bg-black/60 border border-white/10 text-xs font-mono text-white focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-muted mb-1.5">DIFFICULTY</label>
                    <select
                      value={skillLevel}
                      onChange={(e) => setSkillLevel(e.target.value)}
                      className="w-full px-3 py-2.5 bg-black/60 border border-white/10 text-xs font-mono text-white focus:border-primary focus:outline-none"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-muted mb-1.5">SESSION DIRECTIVE</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Seeking 2 players for 3v3 half-court..."
                    className="w-full px-3 py-2.5 bg-black/60 border border-white/10 text-xs font-mono text-white focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="w-1/2 py-3 bg-white/5 hover:bg-white/10 text-muted hover:text-white border border-white/10 font-mono text-xs uppercase font-bold"
                  >
                    DISCARD
                  </button>
                  <button
                    type="submit"
                    data-cursor="BROADCAST"
                    className="w-1/2 py-3 bg-primary hover:bg-primary/90 text-black font-mono text-xs uppercase font-bold tracking-wider"
                  >
                    BROADCAST
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
