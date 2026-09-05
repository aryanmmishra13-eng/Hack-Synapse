import React, { useState, useEffect } from 'react';
import { Sparkles, Plus, ArrowRight, ShieldCheck, CheckCircle2, Sliders, Cpu } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

export const AdminSimulatorPage = () => {
  const [sports, setSports] = useState([]);
  const [selectedSportId, setSelectedSportId] = useState('');
  const [additionalCourts, setAdditionalCourts] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const { addToast } = useNotification();

  useEffect(() => {
    fetchSports();
  }, []);

  const fetchSports = async () => {
    try {
      const res = await api.get('/sports');
      setSports(res.data);
      if (res.data.length > 0) {
        setSelectedSportId(res.data[0].id);
        runSimulation(res.data[0].id, 1);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const runSimulation = async (sportId, courts) => {
    setLoading(true);
    try {
      const res = await api.post('/admin/what-if', {
        sport_id: parseInt(sportId),
        additional_courts: parseInt(courts)
      });
      setResult(res.data);
    } catch (err) {
      addToast('Failed to run simulation', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSportChange = (e) => {
    const sId = e.target.value;
    setSelectedSportId(sId);
    runSimulation(sId, additionalCourts);
  };

  const handleCourtsChange = (val) => {
    setAdditionalCourts(val);
    if (selectedSportId) {
      runSimulation(selectedSportId, val);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      
      {/* Header */}
      <div className="border-b border-white/10 pb-6">
        <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-widest mb-1.5">
          <Cpu className="w-3.5 h-3.5" />
          <span>DECISION-SUPPORT SIMULATION MATRIX</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-display font-bold uppercase tracking-tight text-white">
          CAPACITY EXPANSION SIMULATOR
        </h1>
        <p className="text-sm text-muted mt-1 font-sans">
          Simulate the predictive impact of provisioning additional courts (+1, +2, +3, +4) on peak concurrency student shortages.
        </p>
      </div>

      {/* Simulator Inputs Box */}
      <div className="card-panel p-6 sm:p-8 space-y-6">
        <div className="grid sm:grid-cols-2 gap-6">
          
          <div>
            <label className="block text-[10px] font-mono uppercase text-muted mb-2">TARGET DISCIPLINE</label>
            <select
              value={selectedSportId}
              onChange={handleSportChange}
              className="w-full px-4 py-3 bg-black/60 border border-white/10 text-xs font-mono text-white focus:border-primary focus:outline-none uppercase font-bold"
            >
              {sports.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase text-muted mb-2">
              EXPANSION INCREMENT: <span className="text-primary font-bold">+{additionalCourts} COURTS</span>
            </label>
            
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleCourtsChange(num)}
                  data-cursor={`+${num}`}
                  className={`flex-1 py-3 text-xs font-mono uppercase font-bold border transition-all ${
                    additionalCourts === num
                      ? 'bg-primary text-black border-primary'
                      : 'bg-black/60 text-muted border-white/10 hover:text-white'
                  }`}
                >
                  +{num}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Simulation Output Card */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-panel p-6 sm:p-8 border-primary/40 space-y-6 bg-gradient-to-br from-primary/5 via-black to-black"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 border border-primary/30 text-primary bg-primary/10">
                PROJECTION MODEL: {result.sport_name}
              </span>
              <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white mt-1.5">
                CAPACITY & SHORTAGE DELTA
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center font-mono">
            <div className="p-4 bg-black/80 border border-white/10 space-y-1">
              <span className="text-[10px] text-muted uppercase block">CURRENT CAPACITY</span>
              <span className="text-3xl font-display font-bold text-white">{result.current_capacity}</span>
              <span className="text-[9px] text-muted block">PLAYERS / HOUR</span>
            </div>

            <div className="p-4 bg-black/80 border border-white/10 space-y-1">
              <span className="text-[10px] text-muted uppercase block">PEAK DEMAND</span>
              <span className="text-3xl font-display font-bold text-rose-400">{result.predicted_peak_demand}</span>
              <span className="text-[9px] text-rose-400/80 block">ML FORECAST</span>
            </div>

            <div className="p-4 bg-black/80 border border-white/10 space-y-1">
              <span className="text-[10px] text-muted uppercase block">BASE SHORTAGE</span>
              <span className="text-3xl font-display font-bold text-amber-400">+{result.current_shortage}</span>
              <span className="text-[9px] text-muted block">UNMET LOAD</span>
            </div>

            <div className="p-4 bg-black/80 border border-primary/40 space-y-1">
              <span className="text-[10px] text-muted uppercase block">PROJECTED DEFICIT</span>
              <span className="text-3xl font-display font-bold text-emerald-400">{result.projected_shortage}</span>
              <span className="text-[9px] text-emerald-400 block">AFTER +{additionalCourts} ARENAS</span>
            </div>
          </div>

          {/* AI Recommendation Banner */}
          <div className="p-5 bg-black/90 border border-primary/40 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <span className="font-mono text-primary font-bold text-xs uppercase block mb-1">
                EXECUTIVE EXPANSION RECOMMENDATION:
              </span>
              <p className="text-white font-mono text-xs leading-relaxed">{result.recommendation}</p>
            </div>
          </div>
        </motion.div>
      )}

    </div>
  );
};
