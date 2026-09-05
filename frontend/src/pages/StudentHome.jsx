import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { 
  Activity, Gamepad2, Users, CalendarCheck, Sparkles, Flame, 
  ArrowRight, ArrowUpRight, Zap, Trophy, TrendingUp, Clock, ShieldCheck, ShieldAlert
} from 'lucide-react';

import api from '../services/api';
import { DemandBar } from '../components/DemandBar';

export const StudentHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSports();
    const interval = setInterval(fetchSports, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchSports = async () => {
    try {
      const res = await api.get('/sports');
      setSports(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch sports', err);
    } finally {
      setLoading(false);
    }
  };

  const getGreetingTime = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'GOOD MORNING';
    if (hour < 17) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  };

  const quickActions = [
    { label: "BOOK A COURT", sub: "Reserve facility slots", icon: Activity, path: "/app/sports", cursor: "BOOK", accent: false },
    { label: "PLAY NOW", sub: "Live pickup game lobbies", icon: Gamepad2, path: "/app/play-now", cursor: "JOIN", accent: true },
    { label: "FIND PLAYERS", sub: "Match by sport & skill", icon: Users, path: "/app/find-players", cursor: "FIND", accent: false },
    { label: "TOURNAMENTS", sub: "Brackets & podiums", icon: Trophy, path: "/app/tournaments", cursor: "COMPETE", accent: false },
    { label: "INJURY RISK", sub: "AI injury prevention", icon: ShieldAlert, path: "/app/injury-risk", cursor: "ANALYSE", accent: false },
  ];


  return (
    <div className="space-y-10 pb-16">
      
      {/* Header Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <p className="font-mono text-[10px] tracking-[0.2em] text-[#888880] uppercase">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}
          </p>
          <div className="h-px w-6 bg-white/20" />
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D00] animate-pulse" />
            <span className="font-mono text-[10px] tracking-widest text-[#FF4D00] font-bold">CAMPUS OS ACTIVE</span>
          </div>
        </div>

        <h1
          className="font-display font-black uppercase leading-[0.9]"
          style={{ fontSize: "clamp(36px, 6vw, 76px)", letterSpacing: "-0.025em" }}
        >
          {getGreetingTime()},<br />
          <span className="text-[#FF4D00]">{user?.name?.toUpperCase() || 'ARYAN MISHRA'}.</span>
        </h1>
      </motion.div>

      {/* Feature Grid: Next Activity + Rating + Quick Achievement */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

        {/* Next Activity Spotlight */}
        <motion.div
          className="md:col-span-5 bg-[#111111] border border-white/10 p-6 flex flex-col justify-between relative overflow-hidden"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-[#FF4D00]/40 via-transparent to-transparent" />
          
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[10px] tracking-[0.2em] text-[#888880]">NEXT SCHEDULED ACTIVITY</span>
              <div className="flex items-center gap-1 px-2 py-0.5 bg-[#FF4D00]/10 border border-[#FF4D00]/20 text-[#FF4D00] font-mono text-[9px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D00] animate-pulse" />
                <span>TODAY</span>
              </div>
            </div>

            <h3
              className="font-display font-black uppercase leading-none mb-1 text-[#F2F0EB]"
              style={{ fontSize: "clamp(26px, 3.5vw, 40px)", letterSpacing: "-0.02em" }}
            >
              BADMINTON<br />TRAINING CLINIC
            </h3>
            <p className="font-mono text-xs text-[#888880] mt-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#FF4D00]" />
              <span>18:00 – 19:30 // COURT 02</span>
            </p>
          </div>

          <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#161616] border border-white/15 flex items-center justify-center font-mono font-black text-xs text-[#FF4D00]">
                RS
              </div>
              <div>
                <div className="font-mono text-[10px] font-bold tracking-wider text-[#F2F0EB]">RAHUL SHARMA</div>
                <div className="font-mono text-[9px] text-[#888880]">HEAD ATHLETIC COACH</div>
              </div>
            </div>
            <Link
              to="/app/training"
              data-cursor="VIEW"
              className="flex items-center gap-1 font-mono text-[10px] tracking-widest text-[#FF4D00] hover:text-white font-bold uppercase transition-colors"
            >
              <span>SESSION DETAILS</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </motion.div>

        {/* Rating Metric Card */}
        <motion.div
          className="md:col-span-3 bg-[#111111] border border-white/10 p-6 flex flex-col justify-between"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
        >
          <div>
            <span className="font-mono text-[10px] tracking-[0.2em] text-[#888880] block mb-2">SPORTS RATING</span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-black text-7xl text-[#FF4D00] leading-none">
                78
              </span>
              <span className="font-mono text-sm text-[#888880]">/100</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono text-[10px] text-emerald-400 font-bold">+12%</span>
              <span className="font-mono text-[9px] text-[#888880]">PAST 6 WEEKS</span>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10">
            <div className="flex items-end gap-1 h-8 mb-2">
              {[45, 52, 58, 64, 72, 78].map((val, i) => (
                <div key={i} className="flex-1 bg-white/5 hover:bg-[#FF4D00] transition-colors relative h-full flex items-end">
                  <div className="w-full bg-[#FF4D00]/40" style={{ height: `${(val / 100) * 100}%` }} />
                </div>
              ))}
            </div>
            <Link
              to="/app/performance"
              data-cursor="VIEW"
              className="flex items-center justify-between font-mono text-[10px] tracking-widest text-[#888880] hover:text-[#F2F0EB] transition-colors"
            >
              <span>VIEW METRICS</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </motion.div>

        {/* Recent Trophy Card */}
        <motion.div
          className="md:col-span-4 bg-[#FF4D00] p-6 flex flex-col justify-between relative overflow-hidden"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
        >
          <div className="relative z-10">
            <span className="font-mono text-[10px] tracking-[0.2em] text-black/60 font-bold block mb-1">
              RECENT PODIUM FINISH
            </span>
            <div
              className="font-display font-black uppercase leading-none text-black mt-2"
              style={{ fontSize: "clamp(44px, 5.5vw, 68px)", letterSpacing: "-0.03em" }}
            >
              GOLD
            </div>
            <p className="font-mono text-[10px] tracking-widest text-black/80 font-bold mt-1 uppercase leading-relaxed">
              INTER-COLLEGE BADMINTON<br />CHAMPIONSHIP 2026
            </p>
          </div>

          <Link
            to="/app/awards"
            data-cursor="AWARDS"
            className="relative z-10 mt-6 pt-4 border-t border-black/15 flex items-center justify-between font-mono text-[10px] font-black tracking-widest text-black hover:gap-2 transition-all uppercase"
          >
            <span>TROPHY CABINET</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

      </div>

      {/* Quick Actions Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              to={action.path}
              data-cursor={action.cursor}
              className={`p-5 border transition-all duration-200 group flex flex-col justify-between ${
                action.accent
                  ? 'bg-[#111111] border-[#FF4D00]/40 hover:border-[#FF4D00]'
                  : 'bg-[#111111] border-white/10 hover:border-white/30'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-8 h-8 flex items-center justify-center ${
                  action.accent ? 'bg-[#FF4D00] text-black' : 'bg-[#161616] text-[#F2F0EB] group-hover:text-[#FF4D00]'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#888880] group-hover:text-[#FF4D00] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
              <div>
                <h4 className="font-display font-black text-lg uppercase tracking-wider text-[#F2F0EB]">
                  {action.label}
                </h4>
                <p className="font-mono text-[10px] text-[#888880] mt-0.5">{action.sub}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Today's Live Court Availability Section */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-white/10 pb-3">
          <div>
            <span className="font-mono text-[10px] tracking-[0.2em] text-[#888880]">CAMPUS REAL-TIME FEED</span>
            <h2 className="font-display font-black text-2xl uppercase tracking-wider text-[#F2F0EB]">
              LIVE COURT AVAILABILITY & DEMAND
            </h2>
          </div>
          <Link
            to="/app/sports"
            data-cursor="ALL"
            className="font-mono text-[11px] tracking-widest text-[#FF4D00] hover:underline flex items-center gap-1 font-bold uppercase"
          >
            <span>VIEW ALL SPORTS</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-44 bg-[#111111] border border-white/5 animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sports.map((sport) => {
              const demandLevel = sport.predicted_demand_level === 'HIGH' ? 0.85 : sport.predicted_demand_level === 'MEDIUM' ? 0.55 : 0.25;
              return (
                <div
                  key={sport.id}
                  className="p-6 bg-[#111111] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display font-black text-xl uppercase tracking-wider text-[#F2F0EB]">
                        {sport.name}
                      </h3>
                      <span className="font-mono text-[9px] px-2 py-0.5 bg-white/5 border border-white/10 text-[#888880] uppercase">
                        {sport.category || 'INDOOR'}
                      </span>
                    </div>
                    <p className="font-sans text-xs text-[#888880] line-clamp-2 leading-relaxed">
                      {sport.description}
                    </p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-white/5">
                    <DemandBar level={demandLevel} demand={sport.predicted_demand_level || 'MEDIUM'} />

                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#888880]">AVAILABLE: <strong className="text-[#F2F0EB]">{sport.available_facilities || 2}/{sport.facility_count || 4} COURTS</strong></span>
                      <span className="text-[#FF4D00] font-bold">{sport.current_occupancy_pct || 60}% OCCUPIED</span>
                    </div>

                    <Link
                      to={`/app/sports/${sport.id}`}
                      data-cursor="BOOK"
                      className="w-full py-2.5 bg-[#161616] hover:bg-[#FF4D00] text-[#F2F0EB] hover:text-black font-mono font-bold text-[10px] tracking-widest uppercase border border-white/10 hover:border-[#FF4D00] transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>RESERVE COURT SLOT</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

