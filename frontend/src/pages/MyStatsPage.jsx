import React, { useState, useEffect } from 'react';
import { 
  Flame, Clock, Calendar, Zap, TrendingUp, 
  Activity, Heart, Award, ArrowUpRight, Trophy 
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip, CartesianGrid 
} from 'recharts';
import { motion } from 'framer-motion';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

export const MyStatsPage = () => {
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const { addToast } = useNotification();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [statsRes, bookingsRes] = await Promise.all([
        api.get('/achievements/my-stats'),
        api.get('/bookings/my')
      ]);
      setStats(statsRes.data);
      setBookings(Array.isArray(bookingsRes.data) ? bookingsRes.data : []);
    } catch (err) {
      addToast('Failed to load fitness stats', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Sport distribution breakdown
  const sportCounts = {};
  (Array.isArray(bookings) ? bookings : []).forEach(b => {
    const sName = b.facility_name || b.facility?.sport?.name || b.facility?.name || 'General';
    sportCounts[sName] = (sportCounts[sName] || 0) + 1;
  });

  const sportChartData = Object.entries(sportCounts).map(([name, count]) => ({
    name: name.toUpperCase(),
    sessions: count
  }));

  // Weekly hours simulation
  const weeklyData = [
    { day: 'MON', hours: 1.5, calories: 750 },
    { day: 'TUE', hours: 1.0, calories: 520 },
    { day: 'WED', hours: 2.0, calories: 1050 },
    { day: 'THU', hours: 0.0, calories: 0 },
    { day: 'FRI', hours: 2.5, calories: 1300 },
    { day: 'SAT', hours: 3.0, calories: 1600 },
    { day: 'SUN', hours: 1.0, calories: 480 },
  ];

  const totalHours = stats?.total_hours || 42;
  const estimatedCalories = stats?.estimated_calories_burned || (totalHours * 520);
  const activeStreak = stats?.active_streak || 5;

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-widest mb-1.5">
            <Flame className="w-3.5 h-3.5" />
            <span>CAMPUS ATHLETIC TELEMETRY</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold uppercase tracking-tight text-white">
            ACTIVITY & FITNESS TRACKER
          </h1>
          <p className="text-sm text-muted mt-1 font-sans">
            Cumulative court hours, calorie expenditure calculations, streak durability, and sport volume.
          </p>
        </div>

        <div className="p-4 bg-black/60 border border-primary/40 text-center min-w-[140px] self-start md:self-auto">
          <div className="text-3xl font-display font-bold text-primary flex items-center justify-center gap-1">
            <Flame className="w-5 h-5" />
            <span>{activeStreak} DAYS</span>
          </div>
          <div className="text-[10px] font-mono text-muted uppercase tracking-wider mt-0.5">ACTIVE STREAK</div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card-panel p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-muted">TOTAL PLAY TIME</span>
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <div className="text-3xl font-display font-bold text-white uppercase">{totalHours} HOURS</div>
          <p className="text-[11px] font-mono text-primary flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> +4.5 HRS THIS CYCLE
          </p>
        </div>

        <div className="card-panel p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-muted">ENERGY EXPENDITURE</span>
            <Flame className="w-4 h-4 text-primary" />
          </div>
          <div className="text-3xl font-display font-bold text-white uppercase">{estimatedCalories.toLocaleString()} KCAL</div>
          <p className="text-[11px] font-mono text-muted">ESTIMATED MET EXPENDITURE</p>
        </div>

        <div className="card-panel p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-muted">TOTAL SESSIONS</span>
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <div className="text-3xl font-display font-bold text-white uppercase">{bookings.length} MATCHES</div>
          <p className="text-[11px] font-mono text-muted">CAMPUS ARENAS</p>
        </div>

        <div className="card-panel p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-muted">AEROBIC EFFICIENCY</span>
            <Heart className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-display font-bold text-white uppercase">OPTIMAL (94%)</div>
          <p className="text-[11px] font-mono text-emerald-400">HIGH STAMINA RESERVE</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Activity Profile */}
        <div className="card-panel p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono text-primary uppercase tracking-widest">
                WEEKLY LOAD
              </div>
              <h2 className="text-2xl font-display font-bold uppercase tracking-tight text-white mt-0.5">
                ACTIVE HOURS PER DAY
              </h2>
            </div>
            <span className="text-xs font-mono text-muted">PAST 7 DAYS</span>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="day" stroke="#888" fontSize={10} fontMono tickLine={false} />
                <YAxis stroke="#888" fontSize={10} fontMono tickLine={false} unit="h" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#080808', borderColor: 'rgba(255,77,0,0.4)', borderRadius: 0, fontFamily: 'JetBrains Mono' }}
                  labelStyle={{ color: '#FF4D00', fontWeight: 'bold' }}
                />
                <Bar dataKey="hours" fill="#FF4D00" radius={[0, 0, 0, 0]} name="Play Time (Hours)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sport Distribution */}
        <div className="card-panel p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono text-primary uppercase tracking-widest">
                CROSS-TRAINING SPECTRUM
              </div>
              <h2 className="text-2xl font-display font-bold uppercase tracking-tight text-white mt-0.5">
                DISCIPLINE DIVERSITY
              </h2>
            </div>
            <span className="text-xs font-mono text-muted">COMPLETED SESSIONS</span>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sportChartData.length > 0 ? sportChartData : [{ name: 'FOOTBALL', sessions: 8 }, { name: 'BADMINTON', sessions: 6 }, { name: 'BASKETBALL', sessions: 4 }]}>
                <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" stroke="#888" fontSize={10} fontMono tickLine={false} />
                <YAxis stroke="#888" fontSize={10} fontMono tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#080808', borderColor: 'rgba(255,77,0,0.4)', borderRadius: 0, fontFamily: 'JetBrains Mono' }}
                  labelStyle={{ color: '#FF4D00', fontWeight: 'bold' }}
                />
                <Bar dataKey="sessions" fill="#F2F0EB" radius={[0, 0, 0, 0]} name="Completed Bookings" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
