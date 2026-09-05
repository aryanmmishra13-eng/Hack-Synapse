import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, Users, PlusCircle, CheckCircle2, 
  XCircle, AlertCircle, MapPin, Award, Check, X, Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

export const CoachTrainingPage = () => {
  const [sessions, setSessions] = useState([]);
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create Session Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [sportId, setSportId] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('17:00');
  const [endTime, setEndTime] = useState('18:30');
  const [venue, setVenue] = useState('Main Stadium Field A');
  const [trainingFocus, setTrainingFocus] = useState('High Intensity Tactical Drills');
  const [maxStudents, setMaxStudents] = useState(25);
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Take Attendance Modal
  const [attendanceSession, setAttendanceSession] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [submittingAttendance, setSubmittingAttendance] = useState(false);

  const { addToast } = useNotification();

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const [sessRes, sportsRes] = await Promise.all([
        api.get('/coaches/training'),
        api.get('/sports')
      ]);
      setSessions(sessRes.data);
      setSports(sportsRes.data);
      if (sportsRes.data.length > 0 && !sportId) {
        setSportId(sportsRes.data[0].id);
      }
    } catch (err) {
      addToast('Failed to load coaching sessions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setSubmittingCreate(true);
    try {
      await api.post('/coaches/training', {
        sport_id: parseInt(sportId),
        title,
        session_date: sessionDate,
        start_time: startTime,
        end_time: endTime,
        venue,
        training_focus: trainingFocus,
        max_students: parseInt(maxStudents) || 25
      });
      addToast('Training session scheduled successfully!', 'success');
      setShowCreateModal(false);
      setTitle('');
      fetchSessions();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to schedule session', 'error');
    } finally {
      setSubmittingCreate(false);
    }
  };

  const openAttendanceModal = async (session) => {
    setAttendanceSession(session);
    setLoadingAttendance(true);
    try {
      const res = await api.get(`/coaches/training/${session.id}/attendance`);
      setAttendanceRecords(res.data);
    } catch (err) {
      addToast('Failed to load session attendance roster', 'error');
    } finally {
      setLoadingAttendance(false);
    }
  };

  const updateAttendanceStatus = (index, newStatus) => {
    const updated = [...attendanceRecords];
    updated[index].status = newStatus;
    setAttendanceRecords(updated);
  };

  const updateAttendanceFeedback = (index, feedbackText) => {
    const updated = [...attendanceRecords];
    updated[index].feedback = feedbackText;
    setAttendanceRecords(updated);
  };

  const handleSaveAttendance = async () => {
    if (!attendanceSession) return;
    setSubmittingAttendance(true);
    try {
      const payload = {
        records: attendanceRecords.map(r => ({
          student_id: r.student_id,
          status: r.status,
          feedback: r.feedback || ''
        }))
      };
      await api.post(`/coaches/training/${attendanceSession.id}/attendance`, payload);
      addToast('Attendance and drill feedback recorded successfully!', 'success');
      setAttendanceSession(null);
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to save attendance', 'error');
    } finally {
      setSubmittingAttendance(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-widest mb-1.5">
            <Target className="w-3.5 h-3.5" />
            <span>TRAINING OPERATIONS</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold uppercase tracking-tight text-white">
            CLINICS & ATTENDANCE
          </h1>
          <p className="text-sm text-muted mt-1 font-sans">
            Schedule campus conditioning clinics, manage capacity ceilings, and record athlete presence and drill notes.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          data-cursor="NEW CLINIC"
          className="px-6 py-3 bg-primary hover:bg-primary/90 text-black font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 self-start md:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>SCHEDULE CLINIC</span>
        </button>
      </div>

      {/* Sessions Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className="h-64 card-panel animate-pulse p-6"></div>
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="card-panel p-12 text-center text-muted space-y-3">
          <Calendar className="w-10 h-10 text-white/20 mx-auto" />
          <h3 className="font-display text-xl uppercase font-bold text-white">NO TRAINING SESSIONS SCHEDULED</h3>
          <p className="text-xs font-mono text-muted">Click "Schedule Clinic" to publish a new drill session.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((s, index) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="card-panel p-6 flex flex-col justify-between hover:border-primary/50 transition-all space-y-5"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 border border-primary/30 text-primary bg-primary/10">
                    {s.sport_name}
                  </span>
                  <span className="text-xs font-mono text-muted">
                    CAPACITY: {s.max_students}
                  </span>
                </div>

                <div>
                  <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white">{s.title}</h3>
                  <p className="text-xs font-mono text-muted mt-1">FOCUS: <span className="text-white">{s.training_focus}</span></p>
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
                    <div className="flex items-center gap-1.5 pt-1.5 border-t border-white/10 text-muted">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      <span className="truncate">{s.venue}</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => openAttendanceModal(s)}
                data-cursor="ATTENDANCE"
                className="w-full py-3 bg-white/5 hover:bg-primary text-white hover:text-black border border-white/10 hover:border-primary font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
              >
                <Users className="w-4 h-4" />
                <span>RECORD ATTENDANCE & FEEDBACK</span>
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Schedule Session Modal */}
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
                    SESSION SPECIFICATION
                  </div>
                  <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white mt-0.5">
                    SCHEDULE TRAINING CLINIC
                  </h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 text-muted hover:text-white border border-white/10"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateSession} className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-[10px] uppercase text-muted mb-1.5">SESSION TITLE</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tactical Corner Sequences & Pressing Drills"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
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
                    <label className="block text-[10px] uppercase text-muted mb-1.5">DATE</label>
                    <input
                      type="date"
                      required
                      value={sessionDate}
                      onChange={(e) => setSessionDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 text-xs font-mono text-white focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase text-muted mb-1.5">START TIME</label>
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 text-xs font-mono text-white focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-muted mb-1.5">END TIME</label>
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 text-xs font-mono text-white focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase text-muted mb-1.5">VENUE / ARENA</label>
                    <input
                      type="text"
                      required
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 text-xs font-mono text-white focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-muted mb-1.5">MAX ATHLETES</label>
                    <input
                      type="number"
                      min="5"
                      max="60"
                      value={maxStudents}
                      onChange={(e) => setMaxStudents(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 text-xs font-mono text-white focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-muted mb-1.5">TRAINING FOCUS & DRILL TARGET</label>
                  <input
                    type="text"
                    required
                    value={trainingFocus}
                    onChange={(e) => setTrainingFocus(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 text-xs font-mono text-white focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="w-1/2 py-3 bg-white/5 hover:bg-white/10 text-muted hover:text-white border border-white/10 uppercase font-bold"
                  >
                    DISMISS
                  </button>
                  <button
                    type="submit"
                    disabled={submittingCreate}
                    data-cursor="PUBLISH"
                    className="w-1/2 py-3 bg-primary hover:bg-primary/90 text-black uppercase font-bold tracking-wider"
                  >
                    {submittingCreate ? 'SCHEDULING...' : 'PUBLISH CLINIC'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Take Attendance Modal */}
      <AnimatePresence>
        {attendanceSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1 }}
              className="relative w-full max-w-2xl card-panel p-6 sm:p-8 space-y-6 border-white/20"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <div className="text-[10px] font-mono text-primary uppercase tracking-widest">
                    ROSTER RECORDING
                  </div>
                  <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white mt-0.5">
                    RECORD ATTENDANCE & FEEDBACK
                  </h3>
                  <p className="text-xs font-mono text-muted">
                    {attendanceSession.title} • {attendanceSession.session_date}
                  </p>
                </div>
                <button
                  onClick={() => setAttendanceSession(null)}
                  className="p-2 text-muted hover:text-white border border-white/10"
                >
                  ✕
                </button>
              </div>

              {loadingAttendance ? (
                <div className="py-12 text-center text-muted font-mono text-xs">LOADING ROSTER...</div>
              ) : attendanceRecords.length === 0 ? (
                <div className="p-8 text-center text-muted font-mono text-xs">
                  NO ATHLETES REGISTERED IN THIS SESSION YET.
                </div>
              ) : (
                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 scrollbar-none">
                  {attendanceRecords.map((rec, idx) => (
                    <div
                      key={rec.student_id}
                      className="p-4 bg-black/60 border border-white/10 space-y-3 text-xs font-mono"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="font-bold text-white uppercase text-sm font-sans">{rec.student_name}</div>
                          <div className="text-[10px] text-muted">{rec.student_email}</div>
                        </div>

                        {/* Status Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateAttendanceStatus(idx, 'PRESENT')}
                            className={`px-3 py-1.5 text-xs font-bold transition-all uppercase ${
                              rec.status === 'PRESENT'
                                ? 'bg-emerald-500 text-black'
                                : 'bg-white/5 text-muted hover:text-white border border-white/10'
                            }`}
                          >
                            PRESENT
                          </button>
                          <button
                            type="button"
                            onClick={() => updateAttendanceStatus(idx, 'ABSENT')}
                            className={`px-3 py-1.5 text-xs font-bold transition-all uppercase ${
                              rec.status === 'ABSENT'
                                ? 'bg-rose-500 text-white'
                                : 'bg-white/5 text-muted hover:text-white border border-white/10'
                            }`}
                          >
                            ABSENT
                          </button>
                          <button
                            type="button"
                            onClick={() => updateAttendanceStatus(idx, 'EXCUSED')}
                            className={`px-3 py-1.5 text-xs font-bold transition-all uppercase ${
                              rec.status === 'EXCUSED'
                                ? 'bg-amber-500 text-black'
                                : 'bg-white/5 text-muted hover:text-white border border-white/10'
                            }`}
                          >
                            EXCUSED
                          </button>
                        </div>
                      </div>

                      <input
                        type="text"
                        placeholder="Coach drill notes / performance feedback for athlete..."
                        value={rec.feedback || ''}
                        onChange={(e) => updateAttendanceFeedback(idx, e.target.value)}
                        className="w-full px-3 py-2 bg-black border border-white/10 text-white text-xs font-mono focus:border-primary focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setAttendanceSession(null)}
                  className="w-1/2 py-3 bg-white/5 hover:bg-white/10 text-muted hover:text-white border border-white/10 font-mono font-bold text-xs uppercase"
                >
                  DISMISS
                </button>
                <button
                  type="button"
                  onClick={handleSaveAttendance}
                  disabled={submittingAttendance || attendanceRecords.length === 0}
                  data-cursor="SUBMIT"
                  className="w-1/2 py-3 bg-primary hover:bg-primary/90 text-black font-mono font-bold text-xs uppercase tracking-wider"
                >
                  {submittingAttendance ? 'SAVING...' : 'SAVE & SUBMIT ROSTER'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
