import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  ClipboardList, User, Award, TrendingUp, Sparkles, 
  CheckCircle2, PlusCircle, ArrowRight, ShieldCheck, Target
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

export const CoachAssessmentsPage = () => {
  const location = useLocation();
  const preselectedStudent = location.state?.targetStudent;

  const [students, setStudents] = useState([]);
  const [sports, setSports] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedStudentId, setSelectedStudentId] = useState(preselectedStudent?.id || '');
  const [selectedSportId, setSelectedSportId] = useState('');
  const [pace, setPace] = useState(8);
  const [stamina, setStamina] = useState(8);
  const [technique, setTechnique] = useState(8);
  const [agility, setAgility] = useState(8);
  const [tactical, setTactical] = useState(8);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { addToast } = useNotification();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [studRes, sportsRes, histRes] = await Promise.all([
        api.get('/coaches/students'),
        api.get('/sports'),
        api.get('/performance/history')
      ]);
      setStudents(studRes.data);
      setSports(sportsRes.data);
      setHistory(histRes.data);

      if (studRes.data.length > 0 && !selectedStudentId) {
        setSelectedStudentId(studRes.data[0].id);
      }
      if (sportsRes.data.length > 0) {
        setSelectedSportId(sportsRes.data[0].id);
      }
    } catch (err) {
      addToast('Failed to load assessment data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculatedRating = ((pace + stamina + technique + agility + tactical) / 5).toFixed(1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedSportId) return;

    setSubmitting(true);
    try {
      await api.post('/coaches/assessments', {
        student_id: parseInt(selectedStudentId),
        sport_id: parseInt(selectedSportId),
        overall_rating: parseFloat(calculatedRating),
        notes,
        metrics: {
          pace: parseFloat(pace),
          stamina: parseFloat(stamina),
          technique: parseFloat(technique),
          agility: parseFloat(agility),
          tactical: parseFloat(tactical)
        }
      });
      addToast('Athlete assessment submitted successfully!', 'success');
      setNotes('');
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to submit assessment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="border-b border-white/10 pb-6">
        <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-widest mb-1.5">
          <Target className="w-3.5 h-3.5" />
          <span>QUANTIFIED ATHLETE EVALUATION</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-display font-bold uppercase tracking-tight text-white">
          SKILL ASSESSMENTS & DRILL AUDIT
        </h1>
        <p className="text-sm text-muted mt-1 font-sans">
          Log formal multi-lateral biometric assessments with quantified multi-attribute rating scales.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Evaluation Form (7 Cols) */}
        <div className="lg:col-span-7 card-panel p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <div className="text-[10px] font-mono text-primary uppercase tracking-widest">
                VERIFIED OBSERVATION SHEET
              </div>
              <h2 className="text-2xl font-display font-bold uppercase tracking-tight text-white mt-0.5">
                NEW EVALUATION ENTRY
              </h2>
            </div>
            <div className="p-3 bg-black/80 border border-primary/40 text-center min-w-[100px]">
              <div className="text-2xl font-display font-bold text-primary">{calculatedRating} <span className="text-xs font-mono text-muted">/ 10</span></div>
              <div className="text-[9px] font-mono uppercase text-muted">MEAN SCORE</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 text-xs font-mono">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      {s.name} ({s.preferred_sport || 'Athlete'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-muted mb-1.5">DISCIPLINE</label>
                <select
                  value={selectedSportId}
                  onChange={(e) => setSelectedSportId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 text-xs font-mono text-white focus:border-primary focus:outline-none font-bold"
                  required
                >
                  {sports.map(sp => (
                    <option key={sp.id} value={sp.id}>{sp.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Metric Sliders */}
            <div className="space-y-4 p-5 bg-black/60 border border-white/10">
              <div className="text-[10px] font-mono text-primary uppercase tracking-widest mb-2">
                MULTI-ATTRIBUTE SCORING (1 — 10)
              </div>

              {/* Pace */}
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted uppercase">Pace & Acceleration Velocity</span>
                  <span className="text-primary font-bold">{pace} / 10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={pace}
                  onChange={(e) => setPace(parseFloat(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              {/* Stamina */}
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted uppercase">Aerobic Capacity & Stamina</span>
                  <span className="text-primary font-bold">{stamina} / 10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={stamina}
                  onChange={(e) => setStamina(parseFloat(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              {/* Technique */}
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted uppercase">Technical Execution & Ball Handling</span>
                  <span className="text-primary font-bold">{technique} / 10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={technique}
                  onChange={(e) => setTechnique(parseFloat(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              {/* Agility */}
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted uppercase">Lateral Deceleration & Agility</span>
                  <span className="text-primary font-bold">{agility} / 10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={agility}
                  onChange={(e) => setAgility(parseFloat(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              {/* Tactical */}
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted uppercase">Tactical Match IQ & Spatial Positioning</span>
                  <span className="text-primary font-bold">{tactical} / 10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={tactical}
                  onChange={(e) => setTactical(parseFloat(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>
            </div>

            {/* Coach Notes */}
            <div>
              <label className="block text-[10px] uppercase text-muted mb-1.5">
                COACH OBSERVATION & PRESCRIBED DRILLS
              </label>
              <textarea
                rows={3}
                required
                placeholder="e.g. Demonstrated exceptional transition acceleration. Prescribe lateral cone footwork drills for tighter positioning."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 text-xs font-mono text-white focus:border-primary focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              data-cursor="PUBLISH"
              className="w-full py-3 bg-primary hover:bg-primary/90 text-black font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              <span>{submitting ? 'RECORDING EVALUATION...' : 'PUBLISH FORMAL ASSESSMENT'}</span>
            </button>
          </form>
        </div>

        {/* Assessment Log Feed (5 Cols) */}
        <div className="lg:col-span-5 card-panel p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <div className="text-[10px] font-mono text-primary uppercase tracking-widest">CHRONOLOGY</div>
              <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white mt-0.5">
                EVALUATION LOGS
              </h3>
            </div>
            <span className="text-xs font-mono text-muted">{history.length} LOGGED</span>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 scrollbar-none">
            {history.length === 0 ? (
              <p className="text-xs font-mono text-muted text-center py-8">NO EVALUATIONS SUBMITTED YET.</p>
            ) : (
              history.map(item => (
                <div
                  key={item.id}
                  className="p-4 bg-black/60 border border-white/10 space-y-2 text-xs font-mono"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white uppercase text-sm font-sans">
                      {item.student_name || 'Athlete'}
                    </span>
                    <span className="font-bold px-2 py-0.5 border border-primary/30 text-primary bg-primary/10">
                      {item.overall_rating.toFixed(1)} / 10
                    </span>
                  </div>

                  <div className="text-[10px] text-muted flex items-center justify-between">
                    <span className="uppercase">{item.sport_name}</span>
                    <span>{item.assessment_date}</span>
                  </div>

                  {item.notes && (
                    <p className="text-[11px] text-white/80 italic pt-1 border-t border-white/10">
                      "{item.notes}"
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
