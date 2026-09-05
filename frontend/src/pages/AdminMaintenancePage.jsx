import React, { useState, useEffect } from 'react';
import { Wrench, Sparkles, Calendar, Clock, CheckCircle2, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

export const AdminMaintenancePage = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  const { addToast } = useNotification();

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      const res = await api.get('/admin/maintenance/recommendations');
      setRecommendations(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      
      {/* Header */}
      <div className="border-b border-white/10 pb-6">
        <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-widest mb-1.5">
          <Wrench className="w-3.5 h-3.5" />
          <span>ARENA REPAIR & OPTIMIZATION</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-display font-bold uppercase tracking-tight text-white">
          FACILITY MAINTENANCE PLANNING
        </h1>
        <p className="text-sm text-muted mt-1 font-sans">
          Schedule arena repairs and synthetic resurfacing during AI-predicted minimal concurrency windows to avoid disruption.
        </p>
      </div>

      {/* Recommended Low-Demand Windows */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-primary" />
          <h2 className="text-xl font-display font-bold uppercase tracking-tight text-white">
            AI-RECOMMENDED LOW-DEMAND WINDOWS
          </h2>
        </div>

        <div className="space-y-4">
          {recommendations.map((rec, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="card-panel p-6 space-y-4 flex flex-col justify-between hover:border-white/30 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-display font-bold text-2xl uppercase text-white">{rec.day}</span>
                  <span className="text-[10px] font-mono font-bold px-2.5 py-1 border border-primary/30 text-primary bg-primary/10 uppercase">
                    SLOT: {rec.recommended_window}
                  </span>
                </div>

                <span className="text-[10px] font-mono uppercase px-2 py-0.5 border border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                  {rec.predicted_demand_level} DEMAND
                </span>
              </div>

              <p className="text-xs font-mono text-muted leading-relaxed">{rec.reason}</p>

              <button
                onClick={() => addToast(`Scheduled maintenance for ${rec.day} ${rec.recommended_window}!`, 'success')}
                data-cursor="SCHEDULE"
                className="w-full py-3 bg-white/5 hover:bg-primary text-white hover:text-black border border-white/10 hover:border-primary font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
              >
                <Wrench className="w-4 h-4" />
                <span>CONFIRM MAINTENANCE WINDOW</span>
              </button>
            </motion.div>
          ))}
        </div>
      </div>

    </div>
  );
};
