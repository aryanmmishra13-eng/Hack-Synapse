import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, CalendarCheck, CheckCircle2, AlertTriangle, Users, 
  BarChart3, Sparkles, Sliders, Wrench, ChevronRight, ArrowUpRight, Shield, Activity, QrCode
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import { DemandBar } from '../components/DemandBar';

export const AdminDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
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

    </div>
  );
};
