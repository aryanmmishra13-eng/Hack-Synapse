import React, { useState, useEffect } from 'react';
import { Building2, Activity, RefreshCw, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import { DemandBar } from '../components/DemandBar';

export const AdminOccupancyPage = () => {
  const [occupancy, setOccupancy] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOccupancy();
    const interval = setInterval(fetchOccupancy, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchOccupancy = async () => {
    try {
      const res = await api.get('/admin/occupancy');
      setOccupancy(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-widest mb-1.5">
            <Building2 className="w-3.5 h-3.5" />
            <span>REAL-TIME ARENA TELEMETRY</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold uppercase tracking-tight text-white">
            LIVE OCCUPANCY MONITOR
          </h1>
          <p className="text-sm text-muted mt-1 font-sans">
            Real-time athlete presence tracking across all 15 campus sports facilities with automated load-state bars.
          </p>
        </div>

        <button
          onClick={fetchOccupancy}
          data-cursor="REFRESH"
          className="p-3 bg-white/5 hover:bg-white/10 text-muted hover:text-white border border-white/10 transition-colors self-start sm:self-auto"
          title="Refresh Occupancy"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-44 card-panel animate-pulse p-6"></div>
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {occupancy.map((fac, index) => {
            const pct = Math.min(100, Math.round((fac.current_occupancy / fac.capacity) * 100));
            const isFull = fac.status === 'FULL';
            const isMaint = fac.status === 'MAINTENANCE';

            return (
              <motion.div
                key={fac.facility_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="card-panel p-6 space-y-4 flex flex-col justify-between hover:border-white/30 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 border border-primary/30 text-primary bg-primary/10">
                        {fac.sport_name}
                      </span>
                      <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white mt-2">
                        {fac.facility_name}
                      </h3>
                      <p className="text-xs font-mono text-muted">{fac.location}</p>
                    </div>

                    <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 border ${
                      isFull
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        : isMaint
                        ? 'bg-white/5 text-muted border-white/10'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}>
                      {fac.status}
                    </span>
                  </div>

                  <div className="pt-2 space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-muted uppercase">LOAD CONCURRENCY:</span>
                      <span className="font-bold text-white">{fac.current_occupancy} / {fac.capacity} ATHLETES</span>
                    </div>

                    <DemandBar percentage={pct} />
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-muted">
                  <span>CAPACITY: {fac.capacity} MAX</span>
                  <span className="text-primary font-bold">{pct}% BUSY</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

    </div>
  );
};
