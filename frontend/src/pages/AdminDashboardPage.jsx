import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, CalendarCheck, CheckCircle2, AlertTriangle, Users, 
  BarChart3, Sparkles, Sliders, Wrench, ChevronRight, ArrowUpRight, Shield, Activity, QrCode,
  Brain, Zap, ShieldAlert, TrendingUp, WifiOff, Wifi, RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import { DemandBar } from '../components/DemandBar';

export const AdminDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mlStatus, setMlStatus] = useState(null);
  const [mlLoading, setMlLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchMlStatus();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/dashboard');
      setStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMlStatus = async () => {
    setMlLoading(true);
    try {
      const res = await api.get('/predictions/ml-status');
      setMlStatus(res.data);
    } catch (err) {
      console.error('ML status fetch failed', err);
    } finally {
      setMlLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-widest mb-1.5">
            <Shield className="w-3.5 h-3.5" />
            <span>CAMPUS ATHLETICS OPERATIONAL COMMAND</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold uppercase tracking-tight text-white">
            ADMINISTRATOR CONSOLE
          </h1>
          <p className="text-sm text-muted mt-1 font-sans">
            Real-time arena occupancy monitoring, capacity forecasting, fairness allocation engines, and asset vaults.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-40 card-panel animate-pulse p-6"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card-panel p-6 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono uppercase text-muted">
              <span>CAMPUS UTILIZATION</span>
              <Building2 className="w-4 h-4 text-primary" />
            </div>
            <p className="text-4xl font-display font-bold text-white">{stats?.overall_utilization_pct || 0}%</p>
            <DemandBar percentage={stats?.overall_utilization_pct || 0} />
            <p className="text-[10px] font-mono text-primary uppercase">TODAY'S MEAN LOAD</p>
          </div>

          <div className="card-panel p-6 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono uppercase text-muted">
              <span>ACTIVE SESSIONS</span>
              <CalendarCheck className="w-4 h-4 text-white" />
            </div>
            <p className="text-4xl font-display font-bold text-white">{stats?.active_bookings_today || 0}</p>
            <div className="h-1 bg-white/10">
              <div className="h-full bg-white w-3/4" />
            </div>
            <p className="text-[10px] font-mono text-muted uppercase">CONFIRMED MATCH PASSES</p>
          </div>

          <div className="card-panel p-6 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono uppercase text-muted">
              <span>GATE CHECK-INS</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-4xl font-display font-bold text-emerald-400">{stats?.today_check_ins || 0}</p>
            <div className="h-1 bg-white/10">
              <div className="h-full bg-emerald-400 w-4/5" />
            </div>
            <p className="text-[10px] font-mono text-emerald-400 uppercase">AUTHENTICATED ENTRANCES</p>
          </div>

          <div className="card-panel p-6 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono uppercase text-muted">
              <span>NO-SHOW DEFICITS</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-4xl font-display font-bold text-rose-400">{stats?.today_no_shows || 0}</p>
            <div className="h-1 bg-white/10">
              <div className="h-full bg-rose-500 w-1/4" />
            </div>
            <p className="text-[10px] font-mono text-rose-400 uppercase">FAIRNESS PENALTY APPLIED</p>
          </div>
        </div>
      )}

      {/* Admin Action Modules */}
      <div className="space-y-4">
        <div className="font-mono text-xs text-muted uppercase tracking-wider">
          CORE OPERATIONAL MODULES
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            to="/admin/qr-scanner"
            data-cursor="SCANNER"
            className="card-panel p-6 flex flex-col justify-between hover:border-[#FF4D00] transition-all space-y-4 group bg-gradient-to-br from-[#161616] to-[#0d0d0d]"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 border border-[#FF4D00]/40 bg-black flex items-center justify-center text-[#FF4D00] group-hover:bg-[#FF4D00] group-hover:text-black transition-colors">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white group-hover:text-[#FF4D00] transition-colors">
                    QR GATE SCANNER
                  </h3>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 bg-[#FF4D00]/10 text-[#FF4D00] border border-[#FF4D00]/30 uppercase">
                    SECURITY
                  </span>
                </div>
                <p className="text-xs font-mono text-muted mt-1 leading-relaxed">
                  Real-time webcam barcode scanner &amp; pass validator to authenticate student entrance &amp; gear release.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs font-mono font-bold uppercase text-[#FF4D00]">
              <span>LAUNCH SCANNER</span>
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </Link>

          <Link
            to="/admin/occupancy"
            data-cursor="MONITOR"
            className="card-panel p-6 flex flex-col justify-between hover:border-primary/60 transition-all space-y-4 group"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 border border-primary/40 bg-black flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-colors">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white group-hover:text-primary transition-colors">
                  LIVE OCCUPANCY MONITOR
                </h3>
                <p className="text-xs font-mono text-muted mt-1 leading-relaxed">
                  Direct telemetry tracking across all 15 university arenas, synthetic grounds, and hourly player caps.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs font-mono font-bold uppercase text-primary">
              <span>OPEN MONITOR</span>
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </Link>

          <Link
            to="/admin/analytics"
            data-cursor="ANALYTICS"
            className="card-panel p-6 flex flex-col justify-between hover:border-primary/60 transition-all space-y-4 group"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 border border-primary/40 bg-black flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-colors">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white group-hover:text-primary transition-colors">
                  DEMAND ANALYTICS & ML
                </h3>
                <p className="text-xs font-mono text-muted mt-1 leading-relaxed">
                  scikit-learn machine learning regressions, hourly demand forecast curves, and discipline heatmaps.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs font-mono font-bold uppercase text-primary">
              <span>OPEN ANALYTICS</span>
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </Link>

          <Link
            to="/admin/simulator"
            data-cursor="SIMULATE"
            className="card-panel p-6 flex flex-col justify-between hover:border-primary/60 transition-all space-y-4 group"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 border border-primary/40 bg-black flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-colors">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white group-hover:text-primary transition-colors">
                  CAPACITY SIMULATOR
                </h3>
                <p className="text-xs font-mono text-muted mt-1 leading-relaxed">
                  Interactive what-if decision support for adding new grounds and evaluating unmet peak shortage reduction.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs font-mono font-bold uppercase text-primary">
              <span>RUN SIMULATOR</span>
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </Link>
        </div>
      </div>

      {/* ── ML Injury Prediction Monitoring (spec §27) ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <div className="flex items-center gap-2 text-primary font-mono text-[10px] uppercase tracking-widest mb-1">
              <Brain className="w-3.5 h-3.5" />
              <span>AI INJURY PREDICTION ENGINE</span>
            </div>
            <h2 className="font-display font-bold text-xl uppercase tracking-tight text-white">
              ML MONITORING DASHBOARD
            </h2>
          </div>
          <button
            onClick={fetchMlStatus}
            disabled={mlLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-white/10 font-mono text-[10px] text-[#888880] hover:text-white hover:border-white/30 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${mlLoading ? 'animate-spin' : ''}`} />
            REFRESH
          </button>
        </div>

        {mlLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[1,2,3,4,5].map(n => (
              <div key={n} className="h-28 card-panel animate-pulse" />
            ))}
          </div>
        ) : mlStatus ? (
          <>
            {/* Status Bar */}
            <div className={`flex items-center gap-3 p-3 border font-mono text-xs ${
              mlStatus.ml_api?.status === 'ONLINE'
                ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
                : 'border-rose-500/20 bg-rose-500/5 text-rose-400'
            }`}>
              {mlStatus.ml_api?.status === 'ONLINE'
                ? <Wifi className="w-3.5 h-3.5 flex-shrink-0" />
                : <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
              }
              <span className="font-bold tracking-widest uppercase">
                ML API {mlStatus.ml_api?.status || 'UNKNOWN'}
              </span>
              <span className="text-[10px] opacity-60">
                {mlStatus.ml_api?.status === 'ONLINE'
                  ? `Model ${mlStatus.model?.version || 'v1.0'} — ${mlStatus.model?.injury_features || 67} features — threshold ${((mlStatus.model?.optimal_threshold || 0.7) * 100).toFixed(0)}%`
                  : 'Fallback rule engine active — predictions still available'}
              </span>
              {!mlStatus.ml_api?.has_api_key && (
                <span className="ml-auto text-[9px] px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 uppercase tracking-widest">
                  NO API KEY
                </span>
              )}
            </div>

            {/* Metric cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="card-panel p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] text-muted uppercase tracking-widest">API STATUS</span>
                  {mlStatus.ml_api?.status === 'ONLINE'
                    ? <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                    : <WifiOff className="w-3.5 h-3.5 text-rose-400" />}
                </div>
                <p className={`font-display font-bold text-2xl ${
                  mlStatus.ml_api?.status === 'ONLINE' ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {mlStatus.ml_api?.status || '—'}
                </p>
                <p className="font-mono text-[9px] text-muted uppercase">RENDER SERVICE</p>
              </div>

              <div className="card-panel p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] text-muted uppercase tracking-widest">MODEL</span>
                  <Brain className="w-3.5 h-3.5 text-primary" />
                </div>
                <p className="font-display font-bold text-2xl text-white">
                  {mlStatus.model?.version || 'v1.0'}
                </p>
                <p className="font-mono text-[9px] text-muted uppercase">{mlStatus.model?.injury_features || 67} FEATURES</p>
              </div>

              <div className="card-panel p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] text-muted uppercase tracking-widest">TOTAL PREDICTIONS</span>
                  <Zap className="w-3.5 h-3.5 text-primary" />
                </div>
                <p className="font-display font-bold text-2xl text-white">
                  {mlStatus.stats?.total_predictions ?? '—'}
                </p>
                <p className="font-mono text-[9px] text-muted uppercase">ALL TIME</p>
              </div>

              <div className="card-panel p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] text-muted uppercase tracking-widest">AT RISK</span>
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <p className="font-display font-bold text-2xl text-rose-400">
                  {mlStatus.stats?.at_risk_predictions ?? '—'}
                </p>
                <p className="font-mono text-[9px] text-muted uppercase">HIGH THRESHOLD</p>
              </div>

              <div className="card-panel p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] text-muted uppercase tracking-widest">AVG RISK</span>
                  <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <p className="font-display font-bold text-2xl text-amber-400">
                  {mlStatus.stats?.average_risk_score != null
                    ? `${Math.round(mlStatus.stats.average_risk_score)}%`
                    : '—'}
                </p>
                <p className="font-mono text-[9px] text-muted uppercase">ACROSS ALL</p>
              </div>
            </div>

            {/* Model accuracy metrics */}
            {mlStatus.model?.metrics && Object.keys(mlStatus.model.metrics).length > 0 && (
              <div className="card-panel p-5">
                <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-3">CLASSIFIER PERFORMANCE METRICS</p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  {[
                    { k: 'accuracy',  l: 'Accuracy',  fmt: v => `${(v*100).toFixed(1)}%` },
                    { k: 'precision', l: 'Precision', fmt: v => `${(v*100).toFixed(1)}%` },
                    { k: 'recall',    l: 'Recall',    fmt: v => `${(v*100).toFixed(1)}%` },
                    { k: 'f1',        l: 'F1 Score',  fmt: v => `${(v*100).toFixed(1)}%` },
                    { k: 'roc_auc',   l: 'ROC-AUC',   fmt: v => v.toFixed(4) },
                  ].map(({ k, l, fmt }) => (
                    mlStatus.model.metrics[k] != null && (
                      <div key={k} className="text-center">
                        <p className="font-mono text-[9px] text-muted uppercase tracking-widest mb-1">{l}</p>
                        <p className="font-display font-bold text-lg text-white">
                          {fmt(mlStatus.model.metrics[k])}
                        </p>
                      </div>
                    )
                  ))}
                </div>
                <p className="font-mono text-[9px] text-[#444] mt-3">
                  Cache: {mlStatus.stats?.cache_minutes || 60} min · Last prediction: {mlStatus.stats?.last_prediction_at ? new Date(mlStatus.stats.last_prediction_at).toLocaleString('en-IN') : 'None'}
                </p>
              </div>
            )}

            {/* Disclaimer */}
            <p className="font-mono text-[9px] text-[#444] leading-relaxed">
              ML predictions are generated by the Athlete Injury Prediction model (Render). API key is stored server-side only and never exposed to the client.
              Recovery model R² = 0.24 — presented as estimates only.
            </p>
          </>
        ) : (
          <div className="card-panel p-8 text-center">
            <WifiOff className="w-6 h-6 text-[#444] mx-auto mb-2" />
            <p className="font-mono text-xs text-muted">ML status unavailable — check admin authentication</p>
          </div>
        )}
      </motion.div>

    </div>
  );
};
