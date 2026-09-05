import React, { useState, useEffect } from 'react';
import { 
  Award, Users, PlusCircle, Mail, Phone, 
  CheckCircle2, ShieldCheck, UserCheck, Calendar, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

export const AdminCoachesPage = () => {
  const [coaches, setCoaches] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Assign Student Modal
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [submittingAssign, setSubmittingAssign] = useState(false);

  const { addToast } = useNotification();

  useEffect(() => {
    fetchCoachesAndStudents();
  }, []);

  const fetchCoachesAndStudents = async () => {
    setLoading(true);
    try {
      const [coachRes, studRes] = await Promise.all([
        api.get('/coaches'),
        api.get('/admin/students/reports')
      ]);
      setCoaches(coachRes.data);
      setStudents(studRes.data);
      if (studRes.data.length > 0) {
        setSelectedStudentId(studRes.data[0].id);
      }
    } catch (err) {
      addToast('Failed to load coach directory', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignStudent = async (e) => {
    e.preventDefault();
    if (!selectedCoach || !selectedStudentId) return;
    setSubmittingAssign(true);
    try {
      await api.post(`/coaches/${selectedCoach.id}/assign-student`, {
        student_id: parseInt(selectedStudentId)
      });
      addToast(`Assigned athlete to Coach ${selectedCoach.name}!`, 'success');
      setSelectedCoach(null);
      fetchCoachesAndStudents();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to assign athlete', 'error');
    } finally {
      setSubmittingAssign(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-widest mb-1.5">
            <Award className="w-3.5 h-3.5" />
            <span>FACULTY & COACHING ACADEMY</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold uppercase tracking-tight text-white">
            COACH DIRECTORY & STAFF
          </h1>
          <p className="text-sm text-muted mt-1 font-sans">
            Campus coaching faculty, discipline specializations, training caps, and varsity student assignment.
          </p>
        </div>
      </div>

      {/* Coaches Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className="h-64 card-panel animate-pulse p-6"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coaches.map((coach, index) => (
            <motion.div
              key={coach.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="card-panel p-6 flex flex-col justify-between hover:border-primary/50 transition-all space-y-5"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 border border-primary/30 text-primary bg-primary/10">
                      {coach.specialization || coach.specialization_sport || coach.sport_name || 'General Athletics'}
                    </span>
                    <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white mt-2">
                      {coach.name}
                    </h3>
                    <p className="text-xs font-mono text-muted flex items-center gap-1.5 mt-0.5">
                      <Mail className="w-3.5 h-3.5 text-primary" />
                      <span>{coach.email}</span>
                    </p>
                  </div>
                  <div className="w-12 h-12 border border-primary/40 bg-black flex items-center justify-center font-display font-bold text-xl text-primary">
                    {coach.name.charAt(0)}
                  </div>
                </div>

                <div className="space-y-2 p-3.5 bg-black/60 border border-white/10 text-xs font-mono">
                  <div className="flex justify-between text-muted">
                    <span>ACCREDITATION:</span>
                    <span className="text-white font-bold">{coach.certifications || 'National Level / AFC'}</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>CLINICS / WK:</span>
                    <span className="text-white font-bold">{coach.weekly_sessions || 6} SESSIONS</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>ROSTER CEILING:</span>
                    <span className="text-primary font-bold">{coach.max_students || 30} ATHLETES</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedCoach(coach)}
                data-cursor="ASSIGN"
                className="w-full py-3 bg-primary hover:bg-primary/90 text-black font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                <span>ASSIGN ATHLETE TO ROSTER</span>
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Assign Student Modal */}
      <AnimatePresence>
        {selectedCoach && (
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
                    ROSTER ALLOCATION
                  </div>
                  <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white mt-0.5">
                    ASSIGN ATHLETE
                  </h3>
                  <p className="text-xs font-mono text-muted">
                    COACH {selectedCoach.name} ({selectedCoach.specialization || 'Athletics'})
                  </p>
                </div>
                <button
                  onClick={() => setSelectedCoach(null)}
                  className="p-2 text-muted hover:text-white border border-white/10"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAssignStudent} className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-[10px] uppercase text-muted mb-1.5">SELECT STUDENT ATHLETE</label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 text-xs font-mono text-white focus:border-primary focus:outline-none font-bold"
                    required
                  >
                    {students.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} — {s.preferred_sport || 'Multi-sport'} ({s.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3.5 bg-black/80 border border-white/10 text-muted space-y-1">
                  <p className="font-bold text-white uppercase text-xs">SUPERVISED ROSTER INCLUSION</p>
                  <p className="text-[11px] font-sans">
                    Assigned athletes appear directly in the coach's console for drill evaluations and attendance logging.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCoach(null)}
                    className="w-1/2 py-3 bg-white/5 hover:bg-white/10 text-muted hover:text-white border border-white/10 font-bold uppercase"
                  >
                    DISMISS
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAssign}
                    data-cursor="CONFIRM"
                    className="w-1/2 py-3 bg-primary hover:bg-primary/90 text-black font-bold uppercase tracking-wider"
                  >
                    {submittingAssign ? 'ASSIGNING...' : 'COMMIT ASSIGNMENT'}
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
