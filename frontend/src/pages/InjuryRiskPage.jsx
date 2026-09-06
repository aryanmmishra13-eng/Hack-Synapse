/**
 * InjuryRiskPage  (spec §17–§26)
 *
 * Features
 * --------
 * - Risk score gauge + risk level badge        (spec §18)
 * - Onset estimate + recovery estimate         (spec §19)
 * - SHAP factor bar chart (increasing/reducing)(spec §20)
 * - Prediction history table                  (spec §21)
 * - Refresh prediction button                 (spec §22)
 * - Loading / skeleton states                 (spec §23)
 * - Empty state (no data yet)                 (spec §24)
 * - Error state with Retry                    (spec §25)
 * - Medical + recovery disclaimers            (spec §26)
 * - 7-day health log entry                    (existing feature)
 * - Data quality indicator
 *
 * Never calls ML API directly — all calls through existing backend (spec §15).
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ShieldCheck, Flame, Activity, Brain,
  TrendingUp, TrendingDown, RefreshCw, Clock, Info,
  ChevronDown, ChevronUp, Calendar, Heart, Footprints,
  Bed, Star, Plus, Trash2, BarChart2, Timer, ArrowRight,
  Zap, CheckCircle, AlertCircle, Wifi, WifiOff
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

// ── Risk config ──────────────────────────────────────────────────────────────
const RISK_CONFIG = {
  LOW:    { color: '#22c55e', bg: 'rgba(34,197,94,0.10)',   label: 'LOW RISK',    tagline: 'Looking good — maintain your routine.', Icon: ShieldCheck },
  MEDIUM: { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', label: 'MEDIUM RISK', tagline: 'Model indicates increased risk — monitor closely.', Icon: AlertTriangle },
  HIGH:   { color: '#ef4444', bg: 'rgba(239,68,68,0.10)',  label: 'HIGH RISK',   tagline: 'Elevated injury risk detected — consider reducing load.', Icon: Flame },
};

// ── Circular gauge ───────────────────────────────────────────────────────────
function RiskGauge({ score, level }) {
  const R = 72, C = 2 * Math.PI * R;
  const cfg = RISK_CONFIG[level] || RISK_CONFIG.LOW;
  const pct = Math.round(score);
  return (
    <div className="relative flex items-center justify-center" style={{ width: 188, height: 188 }}>
      <div className="absolute inset-0 rounded-full blur-2xl opacity-15" style={{ background: cfg.color }} />
      <svg width={188} height={188} className="rotate-[-90deg]">
        <circle cx={94} cy={94} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
        <motion.circle cx={94} cy={94} r={R} fill="none"
          stroke={cfg.color} strokeWidth={10} strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - score / 100) }}
          transition={{ duration: 1.3, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 6px ${cfg.color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }} className="font-black font-mono leading-none"
          style={{ fontSize: 38, color: cfg.color }}>
          {pct}%
        </motion.span>
        <span className="font-mono text-[9px] tracking-widest mt-1" style={{ color: cfg.color }}>RISK SCORE</span>
      </div>
    </div>
  );
}

// ── SHAP factor bar ──────────────────────────────────────────────────────────
function ShapBar({ name, impact, maxImpact, color }) {
  const pct = Math.min(100, (impact / Math.max(0.001, maxImpact)) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#bbb] truncate max-w-[70%]">{name}</span>
        <span className="font-mono text-[10px]" style={{ color }}>{impact.toFixed(3)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5">
        <motion.div className="h-full rounded-full" style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// ── Skeleton card ────────────────────────────────────────────────────────────
function Skeleton({ h = 'h-6', w = 'w-full' }) {
  return <div className={`${h} ${w} rounded-lg bg-white/5 animate-pulse`} />;
}

function PredictionSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex justify-center py-8">
        <div className="w-48 h-48 rounded-full bg-white/5 animate-pulse" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton h="h-20" />
        <Skeleton h="h-20" />
      </div>
      <Skeleton h="h-32" />
      <Skeleton h="h-24" />
    </div>
  );
}

// ── Data quality badge ───────────────────────────────────────────────────────
function QualityBadge({ status, missing }) {
  const cfg = {
    GOOD:         { color: '#22c55e', label: 'Good data quality' },
    PARTIAL:      { color: '#f59e0b', label: 'Partial data' },
    INSUFFICIENT: { color: '#ef4444', label: 'Insufficient data' },
  }[status] || { color: '#888', label: status };
  return (
    <div className="flex items-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
      <span className="font-mono text-[10px] text-[#666]">{cfg.label}</span>
      {missing > 0 && <span className="font-mono text-[10px] text-[#444]">({missing} defaults)</span>}
    </div>
  );
}

// ── Day health log card ──────────────────────────────────────────────────────
function DayLogCard({ day, log, onChange }) {
  const [open, setOpen] = useState(false);
  const [hrIn, setHrIn]  = useState({ hour: '', bpm: '' });
  const [stIn, setStIn]  = useState({ hour: '', steps: '' });
  const hasData = (log.heart_rate_entries?.length > 0) || log.calories_burned || log.sleep_hours;

  const addHr = () => {
    if (!hrIn.hour || !hrIn.bpm) return;
    onChange({ ...log, heart_rate_entries: [...(log.heart_rate_entries||[]), { hour: +hrIn.hour, bpm: +hrIn.bpm }] });
    setHrIn({ hour:'', bpm:'' });
  };
  const addSt = () => {
    if (!stIn.hour || !stIn.steps) return;
    const updated = [...(log.steps_entries||[]), { hour: +stIn.hour, steps: +stIn.steps }];
    onChange({ ...log, steps_entries: updated, total_steps: updated.reduce((s,e)=>s+e.steps,0) });
    setStIn({ hour:'', steps:'' });
  };

  return (
    <div className="rounded-xl border border-white/6 overflow-hidden bg-[#111111]">
      <button onClick={() => setOpen(o=>!o)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-3">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center border border-white/8 ${hasData ? 'bg-[rgba(255,77,0,0.12)]' : 'bg-white/3'}`}>
            <Calendar size={12} style={{ color: hasData ? '#FF4D00' : '#333' }} />
          </div>
          <div className="text-left">
            <p className="font-mono text-xs font-bold text-[#ddd]">{day.label}</p>
            <p className="font-mono text-[10px] text-[#444]">{day.date}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasData && <span className="font-mono text-[9px] tracking-widest text-[#FF4D00] bg-[rgba(255,77,0,0.08)] px-2 py-0.5 rounded-full">DATA</span>}
          {open ? <ChevronUp size={13} className="text-[#444]" /> : <ChevronDown size={13} className="text-[#444]" />}
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height:0,opacity:0 }} animate={{ height:'auto',opacity:1 }} exit={{ height:0,opacity:0 }}
            transition={{ duration: 0.22 }} className="overflow-hidden">
            <div className="p-4 pt-0 border-t border-white/5 space-y-4">

              {/* HR */}
              <div>
                <label className="font-mono text-[10px] text-[#444] mb-2 flex items-center gap-1.5 uppercase tracking-widest">
                  <Heart size={10} className="text-[#f43f5e]" /> Heart Rate (active hours only)
                </label>
                {(log.heart_rate_entries||[]).map((e,i)=>(
                  <div key={i} className="inline-flex items-center gap-1.5 mr-2 mb-2 px-2 py-1 rounded-lg border border-white/8 text-xs bg-[rgba(244,63,94,0.06)]">
                    <span className="text-[#777]">{String(e.hour).padStart(2,'0')}:00</span>
                    <span className="font-bold text-[#f43f5e]">{e.bpm} bpm</span>
                    <button onClick={()=>onChange({...log,heart_rate_entries:(log.heart_rate_entries||[]).filter((_,j)=>j!==i)})}
                      className="text-[#444] hover:text-[#f43f5e]"><Trash2 size={9}/></button>
                  </div>
                ))}
                <div className="flex gap-2 mt-1">
                  <input type="number" min={0} max={23} placeholder="Hour" value={hrIn.hour}
                    onChange={e=>setHrIn(p=>({...p,hour:e.target.value}))}
                    className="flex-1 bg-white/4 border border-white/8 rounded-lg px-3 py-2 text-sm text-[#ddd] outline-none focus:border-[#f43f5e]/30" />
                  <input type="number" placeholder="BPM" value={hrIn.bpm}
                    onChange={e=>setHrIn(p=>({...p,bpm:e.target.value}))}
                    className="flex-1 bg-white/4 border border-white/8 rounded-lg px-3 py-2 text-sm text-[#ddd] outline-none focus:border-[#f43f5e]/30" />
                  <button onClick={addHr} className="px-3 py-2 rounded-lg bg-[rgba(244,63,94,0.12)] border border-[#f43f5e]/20 text-[#f43f5e] hover:bg-[rgba(244,63,94,0.2)]">
                    <Plus size={13}/>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {[['resting_hr','Resting HR'],['max_hr','Max HR']].map(([k,l])=>(
                    <div key={k}>
                      <label className="font-mono text-[9px] text-[#444] mb-1 block">{l}</label>
                      <input type="number" placeholder="bpm" value={log[k]||''}
                        onChange={e=>onChange({...log,[k]:e.target.value?+e.target.value:null})}
                        className="w-full bg-white/4 border border-white/8 rounded-lg px-3 py-2 text-sm text-[#ddd] outline-none" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Steps */}
              <div>
                <label className="font-mono text-[10px] text-[#444] mb-2 flex items-center gap-1.5 uppercase tracking-widest">
                  <Footprints size={10} className="text-[#38bdf8]" /> Steps (active hours)
                </label>
                {(log.steps_entries||[]).map((e,i)=>(
                  <div key={i} className="inline-flex items-center gap-1.5 mr-2 mb-2 px-2 py-1 rounded-lg border border-white/8 text-xs bg-[rgba(56,189,248,0.06)]">
                    <span className="text-[#777]">{String(e.hour).padStart(2,'0')}:00</span>
                    <span className="font-bold text-[#38bdf8]">{e.steps}</span>
                    <button onClick={()=>{const u=(log.steps_entries||[]).filter((_,j)=>j!==i);onChange({...log,steps_entries:u,total_steps:u.reduce((s,x)=>s+x.steps,0)||null})}}
                      className="text-[#444] hover:text-[#38bdf8]"><Trash2 size={9}/></button>
                  </div>
                ))}
                <div className="flex gap-2 mt-1">
                  <input type="number" min={0} max={23} placeholder="Hour" value={stIn.hour}
                    onChange={e=>setStIn(p=>({...p,hour:e.target.value}))}
                    className="flex-1 bg-white/4 border border-white/8 rounded-lg px-3 py-2 text-sm text-[#ddd] outline-none focus:border-[#38bdf8]/30" />
                  <input type="number" placeholder="Steps" value={stIn.steps}
                    onChange={e=>setStIn(p=>({...p,steps:e.target.value}))}
                    className="flex-1 bg-white/4 border border-white/8 rounded-lg px-3 py-2 text-sm text-[#ddd] outline-none focus:border-[#38bdf8]/30" />
                  <button onClick={addSt} className="px-3 py-2 rounded-lg bg-[rgba(56,189,248,0.1)] border border-[#38bdf8]/20 text-[#38bdf8] hover:bg-[rgba(56,189,248,0.2)]">
                    <Plus size={13}/>
                  </button>
                </div>
              </div>

              {/* Calories + Sleep */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { k:'calories_burned', l:'Calories (kcal)', ph:'e.g. 450' },
                  { k:'sleep_hours',     l:'Sleep (hrs)',     ph:'e.g. 7.5' },
                  { k:'sleep_quality',   l:'Sleep Quality',  ph:'1–10' },
                ].map(({k,l,ph})=>(
                  <div key={k}>
                    <label className="font-mono text-[9px] text-[#444] mb-1 block">{l}</label>
                    <input type="number" placeholder={ph} value={log[k]||''}
                      onChange={e=>onChange({...log,[k]:e.target.value?+e.target.value:null})}
                      className="w-full bg-white/4 border border-white/8 rounded-lg px-3 py-2 text-sm text-[#ddd] outline-none" />
                  </div>
                ))}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Build last-N-days ────────────────────────────────────────────────────────
function buildDays(n = 7) {
  const names = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (n - 1 - i));
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth()+1).padStart(2,'0');
    const dd   = String(d.getDate()).padStart(2,'0');
    return {
      date: `${yyyy}-${mm}-${dd}`,
      label: i === n-1 ? 'Today' : i === n-2 ? 'Yesterday' : `${names[d.getDay()]} ${dd}/${mm}`,
    };
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// Main page
// ══════════════════════════════════════════════════════════════════════════════
export const InjuryRiskPage = () => {
  const { user }     = useAuth();
  const { addToast } = useNotification();

  const [prediction, setPrediction]   = useState(null);   // spec §9 data object
  const [history,    setHistory]      = useState([]);
  const [loading,    setLoading]      = useState(true);   // initial load
  const [refreshing, setRefreshing]   = useState(false);  // refresh action
  const [error,      setError]        = useState(null);   // {code, message}
  const [activeTab,  setActiveTab]    = useState('result'); // 'result'|'history'|'log'

  const DAYS = buildDays(7);
  const [logs, setLogs] = useState(() =>
    DAYS.reduce((acc,d) => ({...acc, [d.date]: { date:d.date, heart_rate_entries:[], steps_entries:[] }}), {})
  );

  const userId = user?.id;

  // ── Load on mount ──────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    initialLoad();
  }, [userId]);

  const initialLoad = async () => {
    setLoading(true);
    setError(null);
    try {
      const [riskRes, histRes, logRes] = await Promise.allSettled([
        api.get(`/predictions/injury-risk/${userId}`),
        api.get(`/predictions/injury-risk/${userId}/history`),
        api.get(`/predictions/health-log/${userId}`),
      ]);

      if (riskRes.status === 'fulfilled') {
        const d = riskRes.value.data;
        if (d.success) setPrediction(d.data);
        else setError(d.error);
      } else {
        const errData = riskRes.reason?.response?.data;
        setError(errData?.error || { code: 'LOAD_ERROR', message: 'Could not load prediction.' });
      }

      if (histRes.status === 'fulfilled' && histRes.value.data.success) {
        setHistory(histRes.value.data.history || []);
      }

      if (logRes.status === 'fulfilled' && logRes.value.data.success) {
        const existing = {};
        (logRes.value.data.logs || []).forEach(l => { existing[l.date] = l; });
        setLogs(prev => ({ ...prev, ...existing }));
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Refresh prediction (spec §22) ──────────────────────────
  const handleRefresh = async () => {
    if (!userId || refreshing) return;
    setRefreshing(true);
    setError(null);

    // Save health logs first
    const logsArray = DAYS.map(d => logs[d.date]).filter(l =>
      l && ((l.heart_rate_entries?.length > 0) || l.calories_burned || l.sleep_hours)
    );
    if (logsArray.length > 0) {
      try {
        await api.post(`/predictions/health-log/${userId}`, {
          logs: logsArray.map(l => ({
            ...l,
            heart_rate_entries: (l.heart_rate_entries||[]).map(e=>({ hour:e.hour, value:e.bpm })),
            steps_entries:      (l.steps_entries||[]).map(e=>({ hour:e.hour, value:e.steps })),
          })),
        });
      } catch {} // non-critical
    }

    try {
      const res = await api.post(`/predictions/injury-risk/${userId}/refresh`);
      if (res.data.success) {
        setPrediction(res.data.data);
        addToast('Prediction refreshed successfully', 'success');
        // Reload history
        const histRes = await api.get(`/predictions/injury-risk/${userId}/history`);
        if (histRes.data.success) setHistory(histRes.data.history || []);
      } else {
        setError(res.data.error);
        addToast(res.data.error?.message || 'Prediction failed', 'error');
      }
    } catch (err) {
      const errData = err.response?.data;
      const errObj = errData?.error || { code: 'REFRESH_ERROR', message: 'Failed to refresh prediction. Please try again.' };
      setError(errObj);
      addToast(errObj.message, 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const updateLog = useCallback((date, newLog) => {
    setLogs(prev => ({ ...prev, [date]: newLog }));
  }, []);

  const pred = prediction;
  const cfg  = pred ? (RISK_CONFIG[pred.risk?.level] || RISK_CONFIG.LOW) : RISK_CONFIG.LOW;

  const increasing = pred?.factors?.increasing || [];
  const reducing   = pred?.factors?.reducing   || [];
  const maxInc = Math.max(...increasing.map(f=>f.impact), 0.001);
  const maxRed = Math.max(...reducing.map(f=>f.impact), 0.001);

  // ── Loading skeleton (spec §23) ─────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 pb-16">
        <div>
          <Skeleton h="h-4" w="w-48" />
          <div className="mt-3 space-y-1">
            <Skeleton h="h-10" w="w-72" />
            <Skeleton h="h-10" w="w-48" />
          </div>
        </div>
        <PredictionSkeleton />
        <p className="font-mono text-xs text-[#444] text-center animate-pulse">
          Analysing recent athlete data…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">

      {/* ── Header ── */}
      <motion.div initial={{ opacity:0,y:14 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.45 }}>
        <div className="flex items-center gap-3 mb-2">
          <p className="font-mono text-[10px] tracking-[0.2em] text-[#888880] uppercase">AI · INJURY PREVENTION SYSTEM</p>
          <div className="h-px flex-1 bg-white/8" />
          {pred && (
            <QualityBadge status={pred.data_quality?.status} missing={pred.data_quality?.missing_features} />
          )}
        </div>
        <h1 className="font-display font-black uppercase leading-[0.9]"
          style={{ fontSize:'clamp(28px,4.5vw,60px)', letterSpacing:'-0.025em' }}>
          INJURY RISK<br /><span style={{ color:'#FF4D00' }}>ANALYSIS.</span>
        </h1>
        <p className="text-[#666] text-sm mt-2 max-w-xl">
          Machine-learning analysis of your training load, sleep, and activity patterns.
        </p>
      </motion.div>

      {/* ── Tab nav ── */}
      <div className="flex gap-1 p-1 rounded-xl border border-white/6 bg-[#0d0d0d] w-fit">
        {[
          { id:'result',  label:'Risk Analysis' },
          { id:'history', label:'History' },
          { id:'log',     label:'7-Day Log' },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className="px-4 py-2 rounded-lg font-mono text-[11px] tracking-widest uppercase transition-all"
            style={{
              background: activeTab === id ? 'rgba(255,77,0,0.12)' : 'transparent',
              color:      activeTab === id ? '#FF4D00' : '#555',
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* ═══════════════════ RESULT TAB ══════════════════════ */}
      <AnimatePresence mode="wait">
      {activeTab === 'result' && (
        <motion.div key="result" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}
          className="space-y-4">

          {/* ── Error state (spec §25) ── */}
          {error && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}}
              className="p-5 rounded-xl border border-[#ef4444]/20 bg-[rgba(239,68,68,0.06)] space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle size={14} className="text-[#ef4444]" />
                <span className="font-mono text-[11px] text-[#ef4444] tracking-widest uppercase">
                  {error.code === 'ML_SERVICE_UNAVAILABLE' ? 'Prediction service temporarily unavailable'
                   : error.code === 'INSUFFICIENT_DATA'    ? 'Insufficient data for prediction'
                   : 'Prediction Error'}
                </span>
              </div>
              <p className="text-sm text-[#888]">{error.message}</p>
              {error.code === 'INSUFFICIENT_DATA' && (
                <p className="text-xs text-[#666]">
                  Continue recording activity, sleep and training data for at least 3–5 days to generate a prediction.
                  Use the <strong className="text-[#FF4D00]">7-Day Log</strong> tab to add your health data.
                </p>
              )}
              <button onClick={handleRefresh} disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 font-mono text-[11px] text-[#aaa] hover:text-white hover:border-white/20 transition-colors">
                <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
                {refreshing ? 'Retrying…' : 'Retry'}
              </button>
            </motion.div>
          )}

          {/* ── Empty state (spec §24) ── */}
          {!error && !pred && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}}
              className="py-16 flex flex-col items-center gap-5 text-center">
              <div className="w-16 h-16 rounded-2xl border border-white/8 flex items-center justify-center bg-[#111]">
                <Brain size={26} className="text-[#333]" />
              </div>
              <div>
                <p className="font-mono text-xs tracking-widest text-[#444] uppercase">Not enough data yet</p>
                <p className="text-[#333] text-sm mt-1 max-w-xs">
                  Continue recording activity, sleep and training data to generate a prediction.
                </p>
              </div>
              <button onClick={handleRefresh} disabled={refreshing}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[rgba(255,77,0,0.12)] border border-[#FF4D00]/20 font-mono text-sm text-[#FF4D00] hover:bg-[rgba(255,77,0,0.2)] transition-colors">
                <Zap size={13} />
                {refreshing ? 'Generating…' : 'Generate Prediction'}
              </button>
            </motion.div>
          )}

          {/* ── Prediction results ── */}
          {pred && (
            <>
              {/* Gauge card */}
              <div className="rounded-2xl border p-5 flex flex-col items-center gap-4"
                style={{ borderColor: cfg.color+'25', background: cfg.bg }}>
                {refreshing ? (
                  <div className="py-10 flex flex-col items-center gap-3">
                    <div className="w-12 h-12 border-2 border-[#FF4D00] border-t-transparent animate-spin rounded-full" />
                    <p className="font-mono text-xs text-[#666]">Analysing recent athlete data…</p>
                  </div>
                ) : (
                  <>
                    <RiskGauge score={pred.risk.score} level={pred.risk.level} />
                    <motion.div initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}} transition={{delay:0.5}}
                      className="flex items-center gap-2 px-5 py-2 rounded-full border font-mono font-bold tracking-widest text-sm"
                      style={{ borderColor:cfg.color+'40', color:cfg.color, background:cfg.bg }}>
                      <cfg.Icon size={14} />
                      {cfg.label}
                    </motion.div>
                    <p className="text-sm text-center" style={{ color: cfg.color+'cc' }}>{cfg.tagline}</p>

                    {/* Metadata row */}
                    <div className="flex flex-wrap gap-4 justify-center pt-1">
                      <div className="text-center">
                        <p className="font-mono text-[9px] text-[#444] uppercase tracking-widest">Source</p>
                        <p className="font-mono text-xs font-bold mt-0.5" style={{ color: pred.model?.source==='external_ml' ? '#22c55e' : '#f59e0b' }}>
                          {pred.model?.source === 'external_ml' ? 'ML MODEL' : 'RULE ENGINE'}
                        </p>
                      </div>
                      <div className="w-px bg-white/8" />
                      <div className="text-center">
                        <p className="font-mono text-[9px] text-[#444] uppercase tracking-widest">Model</p>
                        <p className="font-mono text-xs font-bold mt-0.5 text-[#ddd]">{pred.model?.version || 'v1.0'}</p>
                      </div>
                      {pred.risk.is_at_risk !== undefined && (
                        <>
                          <div className="w-px bg-white/8" />
                          <div className="text-center">
                            <p className="font-mono text-[9px] text-[#444] uppercase tracking-widest">At Risk</p>
                            <p className="font-mono text-xs font-bold mt-0.5" style={{ color: pred.risk.is_at_risk ? '#ef4444' : '#22c55e' }}>
                              {pred.risk.is_at_risk ? 'YES' : 'NO'}
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Cached / generated at */}
                    <div className="flex items-center gap-2">
                      {pred.cached && <span className="font-mono text-[9px] text-[#444]">CACHED</span>}
                      <Clock size={10} className="text-[#444]" />
                      <span className="font-mono text-[9px] text-[#444]">
                        {pred.generated_at ? new Date(pred.generated_at).toLocaleString('en-IN') : '—'}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Onset + Recovery */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label:'Estimated Onset', val:pred.prediction?.onset_days, unit:'days', color:'#f59e0b', icon:Timer, sub:'Until potential injury risk' },
                  { label:'Est. Recovery', val:pred.prediction?.recovery_days, unit:'days', color:'#22c55e', icon:RefreshCw, sub:'If injury occurs (rough estimate)' },
                ].map(({ label, val, unit, color, icon:Icon, sub }) => (
                  <div key={label} className="p-4 rounded-xl border border-white/6 bg-[#111111]">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon size={12} style={{ color }} />
                      <span className="font-mono text-[10px] text-[#555] uppercase tracking-widest">{label}</span>
                    </div>
                    <span className="font-black text-2xl" style={{ color }}>
                      {val != null ? Math.round(val) : '—'}
                      <span className="text-sm font-normal text-[#555] ml-1">{unit}</span>
                    </span>
                    <p className="text-xs text-[#444] mt-1">{sub}</p>
                  </div>
                ))}
              </div>

              {/* SHAP Factors (spec §20) */}
              {(increasing.length > 0 || reducing.length > 0) && (
                <div className="rounded-2xl border border-white/7 p-5 bg-[#111111]">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart2 size={13} className="text-[#FF4D00]" />
                    <span className="font-mono text-[11px] tracking-widest text-[#666] uppercase">Factors contributing to this prediction</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Increasing */}
                    {increasing.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-3">
                          <TrendingUp size={11} className="text-[#ef4444]" />
                          <span className="font-mono text-[10px] text-[#ef4444] uppercase tracking-widest">Increasing risk</span>
                        </div>
                        <div className="space-y-2.5">
                          {increasing.map((f,i) => (
                            <ShapBar key={i} name={f.name} impact={f.impact} maxImpact={maxInc} color="#ef4444" />
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Reducing */}
                    {reducing.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-3">
                          <TrendingDown size={11} className="text-[#22c55e]" />
                          <span className="font-mono text-[10px] text-[#22c55e] uppercase tracking-widest">Reducing risk</span>
                        </div>
                        <div className="space-y-2.5">
                          {reducing.map((f,i) => (
                            <ShapBar key={i} name={f.name} impact={f.impact} maxImpact={maxRed} color="#22c55e" />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Refresh button (spec §22) */}
              <motion.button
                onClick={handleRefresh} disabled={refreshing}
                whileHover={{ scale: refreshing ? 1 : 1.01 }}
                whileTap={{ scale: refreshing ? 1 : 0.99 }}
                className="w-full h-12 rounded-xl flex items-center justify-center gap-3 font-mono font-bold text-sm tracking-widest uppercase transition-all"
                style={{
                  background: refreshing ? 'rgba(255,77,0,0.15)' : 'linear-gradient(135deg,#FF4D00,#ff7a45)',
                  color: '#fff',
                  boxShadow: refreshing ? 'none' : '0 0 20px rgba(255,77,0,0.3)',
                }}>
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                {refreshing ? 'Refreshing…' : 'Refresh Prediction'}
              </motion.button>

              {/* Disclaimer (spec §26) */}
              <div className="p-4 rounded-xl border border-white/5 bg-[#0d0d0d] space-y-2">
                <div className="flex items-start gap-2">
                  <Info size={12} className="text-[#444] mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-[#444] leading-relaxed">
                    This prediction is generated by a machine-learning model using available athlete data.
                    It is intended for <strong className="text-[#666]">risk awareness and decision support</strong>,
                    not medical diagnosis. Consult a qualified sports physician before making training decisions.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Info size={12} className="text-[#444] mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-[#444] leading-relaxed">
                    <strong className="text-[#666]">Recovery duration is an estimate</strong> and may vary
                    significantly based on injury severity, treatment, and rehabilitation.
                    (Model R² = 0.24)
                  </p>
                </div>
              </div>
            </>
          )}
        </motion.div>
      )}

      {/* ═══════════════════ HISTORY TAB (spec §21) ═════════════ */}
      {activeTab === 'history' && (
        <motion.div key="history" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}
          className="space-y-3">
          {history.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-mono text-[11px] text-[#444] uppercase tracking-widest">No prediction history yet</p>
              <p className="text-[#333] text-sm mt-2">Generate your first prediction to begin tracking.</p>
            </div>
          ) : (
            history.map((r, i) => {
              const c = RISK_CONFIG[r.risk?.level] || RISK_CONFIG.LOW;
              const RIcon = c.Icon;
              return (
                <motion.div key={r.id || i}
                  initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{ delay: i*0.04 }}
                  className="flex items-center gap-4 p-4 rounded-xl border border-white/6 bg-[#111111]">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: c.bg }}>
                    <RIcon size={16} style={{ color: c.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[11px] tracking-widest font-bold" style={{ color: c.color }}>{c.label}</p>
                    <p className="text-xs text-[#444] mt-0.5">
                      {r.generated_at ? new Date(r.generated_at).toLocaleDateString('en-IN',
                        { day:'numeric', month:'long', year:'numeric' }) : '—'}
                    </p>
                  </div>
                  <div className="flex gap-4 text-right flex-shrink-0">
                    <div>
                      <p className="font-mono text-[9px] text-[#444] uppercase">Risk</p>
                      <p className="font-black font-mono text-lg" style={{ color: c.color }}>
                        {r.risk?.score != null ? Math.round(r.risk.score) : '—'}%
                      </p>
                    </div>
                    {r.prediction?.onset_days != null && (
                      <div>
                        <p className="font-mono text-[9px] text-[#444] uppercase">Onset</p>
                        <p className="font-bold text-sm text-[#ddd]">{Math.round(r.prediction.onset_days)}d</p>
                      </div>
                    )}
                    {r.prediction?.recovery_days != null && (
                      <div>
                        <p className="font-mono text-[9px] text-[#444] uppercase">Recovery</p>
                        <p className="font-bold text-sm text-[#22c55e]">{Math.round(r.prediction.recovery_days)}d</p>
                      </div>
                    )}
                    <div>
                      <p className="font-mono text-[9px] text-[#444] uppercase">Model</p>
                      <p className="font-mono text-[10px] text-[#555]">{r.model?.version || 'v1.0'}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </motion.div>
      )}

      {/* ═══════════════════ HEALTH LOG TAB ════════════════════ */}
      {activeTab === 'log' && (
        <motion.div key="log" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}
          className="space-y-3">
          <div className="p-3 rounded-xl border border-[#FF4D00]/15 text-xs text-[#777]"
            style={{ background:'rgba(255,77,0,0.04)' }}>
            Enter only the hours you were active (playing/training/working out).
            This data improves prediction accuracy by providing real biometric signals.
          </div>
          {DAYS.map(day => (
            <DayLogCard key={day.date} day={day}
              log={logs[day.date] || { date:day.date, heart_rate_entries:[], steps_entries:[] }}
              onChange={newLog => updateLog(day.date, newLog)}
            />
          ))}
          <button onClick={handleRefresh} disabled={refreshing}
            className="w-full h-12 rounded-xl flex items-center justify-center gap-3 font-mono font-bold text-sm tracking-widest uppercase transition-all"
            style={{
              background: refreshing ? 'rgba(255,77,0,0.15)' : 'linear-gradient(135deg,#FF4D00,#ff7a45)',
              color: '#fff',
              boxShadow: refreshing ? 'none' : '0 0 20px rgba(255,77,0,0.3)',
            }}>
            <Zap size={14} />
            {refreshing ? 'Analysing…' : 'Save Logs & Run Prediction'}
          </button>
        </motion.div>
      )}
      </AnimatePresence>

    </div>
  );
};

export default InjuryRiskPage;
