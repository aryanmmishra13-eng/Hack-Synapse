import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ChevronRight, Building2, Flame, ArrowUpRight, Zap, Trophy, Compass } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import { DemandBar } from '../components/DemandBar';

export const SportsPage = () => {
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchSports();
  }, []);

  const fetchSports = async () => {
    try {
      const res = await api.get('/sports');
      setSports(res.data);
    } catch (err) {
      console.error('Failed to fetch sports', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSports = sports.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-widest mb-1.5">
            <Compass className="w-3.5 h-3.5" />
            <span>Athletic Facilities & Arenas</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold uppercase tracking-tight text-white">
            CAMPUS SPORTS DIRECTORY
          </h1>
          <p className="text-sm text-muted mt-1 max-w-xl font-sans">
            Select a discipline to explore arena occupancy, book live courts, and review AI forecast demand.
          </p>
        </div>

        {/* Quick Search */}
        <div className="w-full md:w-72">
          <input
            type="text"
            placeholder="FILTER SPORTS..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 bg-black/60 border border-white/10 rounded-none text-xs font-mono text-white placeholder-white/30 focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-64 card-panel animate-pulse p-6"></div>
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSports.map((sport, index) => {
            const isHigh = sport.predicted_demand_level === 'HIGH';
            const isMed = sport.predicted_demand_level === 'MEDIUM';

            return (
              <motion.div
                key={sport.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                data-cursor="SELECT"
                className="card-panel p-6 flex flex-col justify-between group hover:border-primary/60 transition-all relative overflow-hidden"
              >
                {/* Top Corner Index */}
                <div className="flex items-start justify-between mb-4">
                  <div className="font-mono text-xs text-white/30 tracking-widest">
                    #{String(index + 1).padStart(2, '0')}
                  </div>
                  <span className={`text-[10px] font-mono uppercase px-2 py-0.5 border ${
                    isHigh
                      ? 'bg-primary/10 text-primary border-primary/30'
                      : isMed
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  }`}>
                    {sport.predicted_demand_level || 'LOW'} DEMAND
                  </span>
                </div>

                {/* Main Body */}
                <div className="space-y-3">
                  <h3 className="text-2xl sm:text-3xl font-display font-bold uppercase tracking-tight text-white group-hover:text-primary transition-colors">
                    {sport.name}
                  </h3>
                  <p className="text-xs text-muted leading-relaxed line-clamp-2">
                    {sport.description || 'Professional athletic facilities with synthetic surfaces, lighting, and gear checkout.'}
                  </p>
                </div>

                {/* Stats & Occupancy */}
                <div className="pt-6 mt-6 border-t border-white/10 space-y-4">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-muted flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-primary" />
                      {sport.facility_count || 1} ARENAS
                    </span>
                    <span className="text-white font-semibold">
                      {sport.current_occupancy_pct || 0}% LOAD
                    </span>
                  </div>

                  <DemandBar percentage={sport.current_occupancy_pct || 0} />

                  <Link
                    to={`/app/sports/${sport.id}`}
                    className="w-full py-3 bg-white/5 hover:bg-primary text-white hover:text-black border border-white/10 hover:border-primary transition-all flex items-center justify-between px-4 text-xs font-mono uppercase font-bold tracking-wider"
                  >
                    <span>RESERVE COURT</span>
                    <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
