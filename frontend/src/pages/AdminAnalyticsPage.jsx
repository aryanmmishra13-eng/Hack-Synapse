import React, { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend 
} from 'recharts';
import { BarChart3, TrendingUp, Sparkles, AlertCircle, Cpu } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';

export const AdminAnalyticsPage = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/admin/analytics');
      setAnalytics(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header */}
      <div className="border-b border-white/10 pb-6">
        <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-widest mb-1.5">
          <Cpu className="w-3.5 h-3.5" />
          <span>SCIKIT-LEARN ML REGRESSION ENGINE</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-display font-bold uppercase tracking-tight text-white">
          DEMAND ANALYTICS & FORECASTING
        </h1>
        <p className="text-sm text-muted mt-1 font-sans">
          Hourly session crowd forecasting, sport volume distribution, and live vs predicted machine learning model metrics.
        </p>
      </div>

      {loading ? (
        <div className="h-64 card-panel animate-pulse p-6"></div>
      ) : (
        <div className="space-y-8">
          
          {/* Model Accuracy Banner */}
          <div className="card-panel p-6 sm:p-8 bg-gradient-to-r from-primary/10 via-black to-black border-primary/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="text-[10px] font-mono font-bold text-primary uppercase tracking-widest">
                HISTGRADIENTBOOSTINGREGRESSOR VALIDATION
              </div>
              <h3 className="text-3xl font-display font-bold uppercase tracking-tight text-white">
                MODEL TELEMETRY & ERROR VECTOR
              </h3>
              <p className="text-xs font-mono text-muted">
                Trained against 6,000 synthetic campus sports session observations with cross-validation.
              </p>
            </div>
            <div className="flex items-center gap-4 text-center shrink-0">
              <div className="p-4 bg-black/80 border border-white/10 min-w-[110px]">
                <span className="text-[10px] text-muted font-mono uppercase tracking-wider block">MAE ERROR</span>
                <span className="text-3xl font-display font-bold text-emerald-400">3.65</span>
              </div>
              <div className="p-4 bg-black/80 border border-primary/40 min-w-[110px]">
                <span className="text-[10px] text-muted font-mono uppercase tracking-wider block">R² ACCURACY</span>
                <span className="text-3xl font-display font-bold text-primary">0.89</span>
              </div>
            </div>
          </div>

          {/* Line Chart: Demand by Hour (Predicted vs Actual) */}
          <div className="card-panel p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <div className="text-[10px] font-mono text-primary uppercase tracking-widest">HOURLY DISPATCH CURVE</div>
                <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white mt-0.5">
                  DEMAND BY HOUR (PREDICTED VS ACTUAL)
                </h3>
              </div>
            </div>

            <div className="h-80 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics?.hourly_demand}>
                  <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="hour" stroke="#888" fontSize={10} fontMono />
                  <YAxis stroke="#888" fontSize={10} fontMono />
                  <Tooltip contentStyle={{ backgroundColor: '#080808', borderColor: 'rgba(255,77,0,0.4)', borderRadius: 0, fontFamily: 'JetBrains Mono', color: '#fff' }} />
                  <Legend wrapperStyle={{ fontFamily: 'JetBrains Mono', fontSize: '11px', textTransform: 'uppercase' }} />
                  <Line type="monotone" dataKey="predicted" name="ML Predicted Demand" stroke="#FF4D00" strokeWidth={2.5} dot={{ r: 4, fill: '#FF4D00' }} />
                  <Line type="monotone" dataKey="actual" name="Actual Attendance" stroke="#F2F0EB" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3, fill: '#F2F0EB' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar Chart: Demand by Sport & Peak Breakdown */}
          <div className="grid lg:grid-cols-2 gap-6">
            
            <div className="card-panel p-6 sm:p-8 space-y-6">
              <div>
                <div className="text-[10px] font-mono text-primary uppercase tracking-widest">DISCIPLINE DEMAND</div>
                <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white mt-0.5">
                  TOTAL BOOKINGS BY SPORT
                </h3>
              </div>

              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.sport_demand}>
                    <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="sport" stroke="#888" fontSize={10} fontMono />
                    <YAxis stroke="#888" fontSize={10} fontMono />
                    <Tooltip contentStyle={{ backgroundColor: '#080808', borderColor: 'rgba(255,77,0,0.4)', borderRadius: 0, fontFamily: 'JetBrains Mono' }} />
                    <Bar dataKey="bookings" fill="#FF4D00" radius={[0, 0, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Peak Hours Breakdown */}
            <div className="card-panel p-6 sm:p-8 space-y-6">
              <div>
                <div className="text-[10px] font-mono text-primary uppercase tracking-widest">CONCURRENCY WINDOWS</div>
                <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white mt-0.5">
                  CAMPUS PEAK LOAD BREAKDOWN
                </h3>
              </div>
              
              <div className="space-y-3">
                {(analytics?.peak_hours || []).map((item, idx) => (
                  <div key={idx} className="p-4 bg-black/60 border border-white/10 flex items-center justify-between text-xs font-mono">
                    <div>
                      <div className="font-bold text-white uppercase text-sm font-sans">{item.time_slot}</div>
                      <div className="text-muted mt-0.5 text-[10px]">MEAN LOAD: {item.avg_utilization}</div>
                    </div>
                    <span className={`px-2.5 py-1 text-[10px] font-bold border uppercase ${
                      item.level === 'HIGH'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}>
                      {item.level} CONCURRENCY
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
