import React, { useState, useEffect } from 'react';
import { 
  Award, Calendar, Clock, MapPin, User, CheckCircle2, 
  XCircle, AlertCircle, Sparkles, Filter, ChevronRight, ArrowUpRight, Target
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

export const TrainingPage = () => {
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'my-attendance'
  const [sessions, setSessions] = useState([]);
  const [myAttendance, setMyAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState(null);

  const { addToast } = useNotification();

  useEffect(() => {
    fetchTrainingData();
  }, [activeTab]);

  const fetchTrainingData = async () => {
    setLoading(true);
    try {
      const [sessionsRes, attendanceRes] = await Promise.all([
        api.get('/coaches/training'),
        api.get('/coaches/my-training')
      ]);
      setSessions(sessionsRes.data);
      setMyAttendance(attendanceRes.data);
    } catch (err) {
      addToast('Failed to load training sessions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSession = async (sessionId) => {
    setEnrollingId(sessionId);
    try {
      const res = await api.post(`/coaches/training/${sessionId}/join`);
      addToast(res.data.message || 'Successfully joined training session!', 'success');
      fetchTrainingData();
      setActiveTab('my-attendance');
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to join training session', 'error');
    } finally {
      setEnrollingId(null);
    }
  };

  const joinedSessionIds = new Set(myAttendance.map(a => a.training_session_id));

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-widest mb-1.5">
            <Target className="w-3.5 h-3.5" />
            <span>VARSITY COACHING ACADEMY</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold uppercase tracking-tight text-white">
            CLINICS & DRILLS
          </h1>
          <p className="text-sm text-muted mt-1 font-sans">
            Level up your match execution through tactical coach-led conditioning sessions and registered drills.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-2 p-1 bg-black/60 border border-white/10 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('upcoming')}
            data-cursor="SESSIONS"
            className={`px-4 py-2 text-xs font-mono uppercase tracking-wider transition-all ${
              activeTab === 'upcoming'
                ? 'bg-primary text-black font-bold'
                : 'text-muted hover:text-white'
            }`}
          >
            ALL DRILLS ({sessions.length})
          </button>
          <button
            onClick={() => setActiveTab('my-attendance')}
            data-cursor="ATTENDANCE"
            className={`px-4 py-2 text-xs font-mono uppercase tracking-wider transition-all ${
              activeTab === 'my-attendance'
                ? 'bg-primary text-black font-bold'
                : 'text-muted hover:text-white'
            }`}
          >
            MY LOGS ({myAttendance.length})
          </button>
        </div>
      </div>

      {/* Sessions Grid */}
      {activeTab === 'upcoming' && (
        <div className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <div key={n} className="h-64 card-panel animate-pulse p-6"></div>
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="card-panel p-12 text-center text-muted space-y-3">
              <Calendar className="w-10 h-10 text-white/20 mx-auto" />
              <h3 className="font-display text-xl uppercase font-bold text-white">NO SESSIONS SCHEDULED</h3>
              <p className="text-xs font-mono text-muted">Coaching clinics will appear here when scheduled by varsity staff.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sessions.map((s, index) => {
                const isJoined = joinedSessionIds.has(s.id);
                return (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="card-panel p-6 flex flex-col justify-between hover:border-primary/50 transition-all space-y-5 group"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 border border-primary/30 text-primary bg-primary/10">
                          {s.sport_name}
                        </span>
                        <span className="text-[10px] font-mono uppercase text-muted">
                          CAPACITY: {s.max_students}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white group-hover:text-primary transition-colors">
                          {s.title}
                        </h3>
                        <p className="text-xs font-mono text-muted mt-1 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-primary" />
                          <span>COACH: <strong className="text-white">{s.coach_name}</strong></span>
                        </p>
                      </div>

                      <div className="p-3.5 bg-black/60 border border-white/10 space-y-2 text-xs font-mono">
                        <div className="flex items-center justify-between text-muted">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-primary" />
                            {s.session_date}
                          </span>
                          <span className="flex items-center gap-1.5 text-white font-bold">
                            <Clock className="w-3.5 h-3.5 text-primary" />
                            {s.start_time} - {s.end_time}
                          </span>
                        </div>
                        {s.venue && (
                          <div className="flex items-center gap-1.5 pt-1 text-muted border-t border-white/10">
                            <MapPin className="w-3.5 h-3.5 text-primary" />
                            <span className="truncate">{s.venue}</span>
                          </div>
                        )}
                        {s.training_focus && (
                          <div className="pt-1 text-[11px] text-muted">
                            FOCUS: <span className="text-white font-bold">{s.training_focus}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleJoinSession(s.id)}
                      disabled={isJoined || enrollingId === s.id}
                      data-cursor={isJoined ? undefined : "ENROLL"}
                      className={`w-full py-3 font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                        isJoined
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 cursor-default'
                          : 'bg-primary hover:bg-primary/90 text-black'
                      }`}
                    >
                      {isJoined ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>ROSTERED / ENROLLED</span>
                        </>
                      ) : enrollingId === s.id ? (
                        <span>PROCESSING...</span>
                      ) : (
                        <>
                          <Award className="w-4 h-4" />
                          <span>RESERVE CLINIC SEAT</span>
                        </>
                      )}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* My Attendance Tab */}
      {activeTab === 'my-attendance' && (
        <div className="space-y-4">
          {myAttendance.length === 0 ? (
            <div className="card-panel p-12 text-center text-muted space-y-3">
              <Award className="w-10 h-10 text-white/20 mx-auto" />
              <h3 className="font-display text-xl uppercase font-bold text-white">NO SESSIONS RECORDED</h3>
              <p className="text-xs font-mono text-muted max-w-sm mx-auto">
                You haven't attended or enrolled in any coaching sessions yet.
              </p>
              <button
                onClick={() => setActiveTab('upcoming')}
                className="mt-2 px-6 py-2.5 bg-primary text-black font-mono font-bold text-xs uppercase tracking-wider"
              >
                BROWSE SESSIONS
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myAttendance.map((att, index) => {
                const isPresent = att.status === 'PRESENT';
                const isAbsent = att.status === 'ABSENT';
                const isExcused = att.status === 'EXCUSED';

                return (
                  <motion.div
                    key={att.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="card-panel p-6 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 border border-white/10 bg-white/5 text-muted">
                        {att.sport_name || 'ATHLETICS'}
                      </span>
                      <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 border ${
                        isPresent
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : isAbsent
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : isExcused
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-white/5 text-muted border-white/10'
                      }`}>
                        {att.status}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white">
                        {att.title}
                      </h3>
                      <p className="text-xs font-mono text-primary mt-1">COACH: {att.coach_name}</p>
                    </div>

                    <div className="p-3.5 bg-black/60 border border-white/10 space-y-2 text-xs font-mono">
                      <div className="flex justify-between text-muted">
                        <span>TIMING:</span>
                        <span className="text-white">{att.session_date} @ {att.start_time}</span>
                      </div>
                      {att.feedback && (
                        <div className="pt-2 border-t border-white/10">
                          <span className="text-[10px] text-muted uppercase font-bold block">COACH FEEDBACK</span>
                          <p className="text-primary font-bold mt-0.5">"{att.feedback}"</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
