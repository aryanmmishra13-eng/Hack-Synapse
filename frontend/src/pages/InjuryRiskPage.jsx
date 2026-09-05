import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, ShieldCheck, Zap, Activity, Brain,
  Flame, Moon, Dumbbell, Droplets, Heart, ChevronRight,
  RefreshCw, CheckCircle, TrendingUp, Clock, Star
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

// ── Colour helpers ───────────────────────────────────────────────
const RISK_CONFIG = {
  LOW:    { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  label: 'LOW RISK',    icon: ShieldCheck },
  MEDIUM: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'MEDIUM RISK', icon: AlertTriangle },
  HIGH:   { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  label: 'HIGH RISK',   icon: Flame },
};

// ── Animated circular gauge ──────────────────────────────────────
function RiskGauge({ score, riskLevel }) {
  const R = 80;
  const CIRCUMFERENCE = 2 * Math.PI * R;
  const cfg = RISK_CONFIG[riskLevel] || RISK_CONFIG.LOW;
  const offset = CIRCUMFERENCE * (1 - score);
  const pct = Math.round(score * 100);

  return (
    <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>
      {/* Glow */}
      <div
        className="absolute inset-0 rounded-full blur-2xl opacity-20"
        style={{ background: cfg.color }}
      />
      <svg width={220} height={220} className="rotate-[-90deg]">
        {/* Track */}
        <circle
          cx={110} cy={110} r={R}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={14}
        />
        {/* Progress */}
        <motion.circle
          cx={110} cy={110} r={R}
          fill="none"
          stroke={cfg.color}
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          initial={{ strokeDashoffset: CIRCUMFERENCE }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 8px ${cfg.color})` }}
        />
      </svg>
      {/* Centre text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="font-black font-mono"
          style={{ fontSize: 44, color: cfg.color, lineHeight: 1 }}
        >
          {pct}%
        </motion.span>
        <span className="font-mono text-[10px] tracking-widest mt-1" style={{ color: cfg.color }}>
          RISK SCORE
        </span>
      </div>
    </div>
  );
}

// ── Slider row ───────────────────────────────────────────────────
function SliderInput({ icon: Icon, label, value, onChange, min = 0, max = 10, step = 0.5, unit = '', color = '#FF4D00' }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={14} style={{ color }} />
          <span className="font-mono text-[11px] tracking-widest text-[#888880] uppercase">{label}</span>
        </div>
        <span className="font-mono text-sm font-bold" style={{ color }}>
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${color} 0%, ${color} ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.1) ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.1) 100%)`
        }}
      />
    </div>
  );
}

// ── Factor pill ──────────────────────────────────────────────────
function FactorPill({ factor, index }) {
  const name = typeof factor === 'string' ? factor : (factor.feature || factor.name || JSON.stringify(factor));
  const impact = typeof factor === 'object' ? factor.impact : null;

  const impactColor = impact === 'High' ? '#ef4444' : impact === 'Medium' ? '#f59e0b' : '#22c55e';

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 }}
      className="flex items-center gap-3 p-3 rounded-xl border border-white/5"
      style={{ background: 'rgba(255,255,255,0.03)' }}
    >
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: impactColor || '#FF4D00' }} />
      <span className="text-sm text-[#ccc] flex-1">{name}</span>
      {impact && (
        <span className="font-mono text-[10px] tracking-widest px-2 py-0.5 rounded-full border"
          style={{ color: impactColor, borderColor: impactColor + '44', background: impactColor + '18' }}>
          {impact.toUpperCase()}
        </span>
      )}
    </motion.div>
  );
}

// ── History card ─────────────────────────────────────────────────
function HistoryCard({ record, index }) {
  const cfg = RISK_CONFIG[record.risk_level] || RISK_CONFIG.LOW;
  const Icon = cfg.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="flex items-center gap-4 p-3 rounded-xl border border-white/5"
      style={{ background: 'rgba(255,255,255,0.03)' }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: cfg.bg }}>
        <Icon size={16} style={{ color: cfg.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-mono text-[11px] tracking-widest" style={{ color: cfg.color }}>
          {cfg.label}
        </p>
        <p className="text-xs text-[#555] mt-0.5">
          {record.created_at ? new Date(record.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
        </p>
      </div>
      <span className="font-black font-mono text-xl" style={{ color: cfg.color }}>
        {Math.round(record.risk_score * 100)}%
      </span>
    </motion.div>
  );
}


// ── Main Page ────────────────────────────────────────────────────
export const InjuryRiskPage = () => {
  const { user } = useAuth();
  const { addToast } = useNotification();

  // Wellness inputs
  const [fatigue, setFatigue]         = useState(5);
  const [sleep, setSleep]             = useState(7);
  const [training, setTraining]       = useState(6);
  const [pain, setPain]               = useState(2);
  const [stress, setStress]           = useState(4);
  const [hydration, setHydration]     = useState(7);
  const [priorInjuries, setPrior]     = useState(0);

  // Results
  const [prediction, setPrediction]   = useState(null);
  const [history, setHistory]         = useState([]);
  const [loading, setLoading]         = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [mlStatus, setMlStatus]       = useState(null);

  const userId = user?.id;

  // Load history + ML health on mount
  useEffect(() => {
    if (!userId) return;
    loadHistory();
    checkMlHealth();
  }, [userId]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get(`/predictions/injury-risk/${userId}`);
      if (res.data.latest) setPrediction(res.data.latest);
      setHistory(res.data.history || []);
    } catch {
      // no predictions yet — that's fine
    } finally {
      setHistoryLoading(false);
    }
  };

  const checkMlHealth = async () => {
    try {
      const res = await api.get('/predictions/ml-health');
      setMlStatus(res.data?.external_ml_api?.ok ? 'online' : 'fallback');
    } catch {
      setMlStatus('fallback');
    }
  };

  const runPrediction = async () => {
    if (!userId) { addToast('Please log in first', 'error'); return; }
    setLoading(true);
    try {
      const res = await api.post('/predictions/injury-risk', {
        user_id: userId,
        fatigue_score: fatigue,
        sleep_hours: sleep,
        training_hours_per_week: training,
        pain_score: pain,
        stress_level: stress,
        hydration_score: hydration,
        prior_injury_count: priorInjuries,
      });
      setPrediction(res.data);
      addToast('Injury risk analysis complete!', 'success');
      loadHistory();
    } catch (err) {
      addToast('Prediction failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const cfg = prediction ? (RISK_CONFIG[prediction.risk_level] || RISK_CONFIG.LOW) : RISK_CONFIG.LOW;
  const RiskIcon = cfg.icon;

  return (
    <div className="space-y-8 pb-16">

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center gap-3 mb-2">
          <p className="font-mono text-[10px] tracking-[0.2em] text-[#888880] uppercase">
            AI-POWERED · INJURY PREVENTION
          </p>
          <div className="h-px flex-1 bg-white/10" />
          {/* ML API status badge */}
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${mlStatus === 'online' ? 'bg-[#22c55e] animate-pulse' : 'bg-[#f59e0b]'}`} />
            <span className="font-mono text-[10px] tracking-widest text-[#888880]">
              ML API {mlStatus === 'online' ? 'ONLINE' : mlStatus === 'fallback' ? 'FALLBACK' : 'CHECKING...'}
            </span>
          </div>
        </div>
        <h1
          className="font-display font-black uppercase leading-[0.9]"
          style={{ fontSize: 'clamp(32px,5vw,64px)', letterSpacing: '-0.025em' }}
        >
          INJURY RISK<br />
          <span style={{ color: '#FF4D00' }}>ANALYSIS.</span>
        </h1>
        <p className="text-[#888880] text-sm mt-3 max-w-lg">
          Powered by the Athlete Injury Prediction ML model. Fill in your current wellness metrics,
          then run the analysis to get a personalised risk assessment.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ── Left: Wellness Inputs ── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="rounded-2xl border border-white/8 p-6"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          <div className="flex items-center gap-2 mb-6">
            <Brain size={16} className="text-[#FF4D00]" />
            <h2 className="font-mono text-xs tracking-widest text-[#888880] uppercase">Wellness Inputs</h2>
          </div>

          <div className="space-y-5">
            <SliderInput icon={Flame}     label="Fatigue Level"          value={fatigue}   onChange={setFatigue}   color="#ef4444" />
            <SliderInput icon={Moon}      label="Sleep Hours"             value={sleep}     onChange={setSleep}     min={3} max={12} step={0.5} unit="h" color="#a78bfa" />
            <SliderInput icon={Dumbbell}  label="Training Hours / Week"   value={training}  onChange={setTraining}  min={0} max={25} step={0.5} unit="h" color="#FF4D00" />
            <SliderInput icon={Heart}     label="Pain Score"              value={pain}      onChange={setPain}      color="#f43f5e" />
            <SliderInput icon={Activity}  label="Stress Level"            value={stress}    onChange={setStress}    color="#f59e0b" />
            <SliderInput icon={Droplets}  label="Hydration Score"         value={hydration} onChange={setHydration} color="#38bdf8" />

            {/* Prior injuries counter */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-[#f59e0b]" />
                <span className="font-mono text-[11px] tracking-widest text-[#888880] uppercase">Prior Injuries</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPrior(Math.max(0, priorInjuries - 1))}
                  className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center text-[#888880] hover:text-white hover:border-white/30 transition-colors"
                >−</button>
                <span className="font-mono font-bold text-sm w-5 text-center text-[#FF4D00]">{priorInjuries}</span>
                <button
                  onClick={() => setPrior(Math.min(10, priorInjuries + 1))}
                  className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center text-[#888880] hover:text-white hover:border-white/30 transition-colors"
                >+</button>
              </div>
            </div>
          </div>

          {/* Run button */}
          <motion.button
            onClick={runPrediction}
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            className="w-full mt-8 h-12 rounded-xl font-mono font-bold tracking-widest text-sm uppercase flex items-center justify-center gap-3 transition-all"
            style={{
              background: loading ? 'rgba(255,77,0,0.3)' : 'linear-gradient(135deg, #FF4D00, #ff7a45)',
              color: '#fff',
              boxShadow: loading ? 'none' : '0 0 24px rgba(255,77,0,0.35)',
            }}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
                ANALYSING...
              </>
            ) : (
              <>
                <Zap size={16} />
                {prediction ? 'RE-ANALYSE' : 'RUN ANALYSIS'}
              </>
            )}
          </motion.button>

          {/* Sport & skill info from profile */}
          {user && (
            <div className="mt-4 flex gap-3">
              <div className="flex-1 p-3 rounded-xl border border-white/5 bg-white/[0.02] text-center">
                <p className="font-mono text-[10px] text-[#555] tracking-widest uppercase mb-1">Sport</p>
                <p className="font-bold text-sm text-[#F2F0EB]">{user.preferred_sport || 'Badminton'}</p>
              </div>
              <div className="flex-1 p-3 rounded-xl border border-white/5 bg-white/[0.02] text-center">
                <p className="font-mono text-[10px] text-[#555] tracking-widest uppercase mb-1">Skill Level</p>
                <p className="font-bold text-sm text-[#F2F0EB]">{user.skill_level || 'Intermediate'}</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* ── Right: Results ── */}
        <div className="space-y-4">

          {/* Gauge + Risk Badge */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="rounded-2xl border p-6 flex flex-col items-center"
            style={{
              borderColor: prediction ? cfg.color + '33' : 'rgba(255,255,255,0.08)',
              background: prediction ? cfg.bg : 'rgba(255,255,255,0.02)',
            }}
          >
            {prediction ? (
              <>
                <RiskGauge score={prediction.risk_score} riskLevel={prediction.risk_level} />

                {/* Risk level badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center gap-2 px-5 py-2 rounded-full border font-mono font-bold tracking-widest text-sm mt-4"
                  style={{ borderColor: cfg.color + '55', color: cfg.color, background: cfg.bg }}
                >
                  <RiskIcon size={14} />
                  {cfg.label}
                </motion.div>

                {/* Confidence + source */}
                <div className="flex gap-4 mt-4">
                  <div className="text-center">
                    <p className="font-mono text-[10px] text-[#555] tracking-widest uppercase">Confidence</p>
                    <p className="font-bold text-sm text-[#F2F0EB] mt-0.5">
                      {Math.round((prediction.confidence || 0.85) * 100)}%
                    </p>
                  </div>
                  <div className="w-px bg-white/10" />
                  <div className="text-center">
                    <p className="font-mono text-[10px] text-[#555] tracking-widest uppercase">Source</p>
                    <p className="font-bold text-sm mt-0.5" style={{ color: mlStatus === 'online' ? '#22c55e' : '#f59e0b' }}>
                      {prediction.model_source === 'external_ml' ? 'ML MODEL' : 'RULE ENGINE'}
                    </p>
                  </div>
                  {prediction.predicted_injury && (
                    <>
                      <div className="w-px bg-white/10" />
                      <div className="text-center">
                        <p className="font-mono text-[10px] text-[#555] tracking-widest uppercase">Predicted</p>
                        <p className="font-bold text-xs mt-0.5 text-[#F2F0EB]">{prediction.predicted_injury}</p>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="py-12 flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl border border-white/10 flex items-center justify-center">
                  <Brain size={28} className="text-[#444]" />
                </div>
                <div>
                  <p className="font-mono text-xs tracking-widest text-[#555] uppercase">No Analysis Yet</p>
                  <p className="text-[#444] text-sm mt-1">Fill in your wellness inputs and run the analysis</p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Top Factors */}
          <AnimatePresence>
            {prediction?.top_factors?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.3 }}
                className="rounded-2xl border border-white/8 p-5"
                style={{ background: 'rgba(255,255,255,0.02)' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={14} className="text-[#FF4D00]" />
                  <h3 className="font-mono text-[11px] tracking-widest text-[#888880] uppercase">
                    Top Risk Factors
                  </h3>
                </div>
                <div className="space-y-2">
                  {prediction.top_factors.map((f, i) => (
                    <FactorPill key={i} factor={f} index={i} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Recommendations ── */}
      <AnimatePresence>
        {prediction?.recommendations?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl border border-white/8 p-6"
            style={{ background: 'rgba(255,255,255,0.02)' }}
          >
            <div className="flex items-center gap-2 mb-5">
              <Star size={14} className="text-[#FF4D00]" />
              <h3 className="font-mono text-[11px] tracking-widest text-[#888880] uppercase">
                Recommendations
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {prediction.recommendations.map((rec, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.07 }}
                  className="p-4 rounded-xl border border-white/5 flex gap-3 items-start"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  <CheckCircle size={14} className="text-[#FF4D00] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-[#ccc] leading-relaxed">{rec}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Prediction History ── */}
      {(historyLoading || history.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-2xl border border-white/8 p-6"
          style={{ background: 'rgba(255,255,255,0.02)' }}
        >
          <div className="flex items-center gap-2 mb-5">
            <Clock size={14} className="text-[#888880]" />
            <h3 className="font-mono text-[11px] tracking-widest text-[#888880] uppercase">
              Recent Predictions
            </h3>
          </div>
          {historyLoading ? (
            <div className="flex items-center gap-3 text-[#444]">
              <div className="w-4 h-4 border border-[#333] border-t-[#FF4D00] animate-spin rounded-full" />
              <span className="font-mono text-xs tracking-widest">LOADING...</span>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((r, i) => <HistoryCard key={r.id} record={r} index={i} />)}
            </div>
          )}
        </motion.div>
      )}

    </div>
  );
};

export default InjuryRiskPage;
