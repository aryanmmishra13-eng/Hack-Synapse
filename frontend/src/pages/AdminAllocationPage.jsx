import React, { useState, useEffect } from 'react';
import { Sliders, CheckCircle2, ShieldCheck, Sparkles, Scale } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

export const AdminAllocationPage = () => {
  const [policyMode, setPolicyMode] = useState('Balanced');
  const [usageWeight, setUsageWeight] = useState(0.30);
  const [waitlistWeight, setWaitlistWeight] = useState(0.30);
  const [peakWeight, setPeakWeight] = useState(0.20);
  const [noshowWeight, setNoshowWeight] = useState(0.20);
  const [loading, setLoading] = useState(true);

  const { addToast } = useNotification();

  useEffect(() => {
    fetchPolicy();
  }, []);

  const fetchPolicy = async () => {
    try {
      const res = await api.get('/admin/allocation');
      setPolicyMode(res.data.policy_mode);
      setUsageWeight(res.data.usage_weight);
      setWaitlistWeight(res.data.waitlist_weight);
      setPeakWeight(res.data.peak_weight);
      setNoshowWeight(res.data.noshow_weight);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/allocation', {
        policy_mode: policyMode,
        usage_weight: parseFloat(usageWeight),
        waitlist_weight: parseFloat(waitlistWeight),
        peak_weight: parseFloat(peakWeight),
        noshow_weight: parseFloat(noshowWeight)
      });
      addToast('Fair Allocation policy updated successfully!', 'success');
    } catch (err) {
      addToast('Failed to update allocation policy', 'error');
    }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-16">
      
      {/* Header */}
      <div className="border-b border-white/10 pb-6">
        <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-widest mb-1.5">
          <Scale className="w-3.5 h-3.5" />
          <span>ALGORITHMIC FAIRNESS ALLOCATION ENGINE</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-display font-bold uppercase tracking-tight text-white">
          PRIORITY POLICY CONFIGURATION
        </h1>
        <p className="text-sm text-muted mt-1 font-sans">
          Calibrate multi-factor priority weights for automated waitlist promotions and court rationing during peak intervals.
        </p>
      </div>

      <form onSubmit={handleSave} className="card-panel p-6 sm:p-8 space-y-6">
        
        <div>
          <label className="block text-[10px] font-mono uppercase text-muted mb-2">ALLOCATION POLICY PROFILE</label>
          <div className="grid grid-cols-3 gap-3">
            {['Balanced', 'Usage-Prioritized', 'Anti-NoShow Strict'].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setPolicyMode(mode)}
                data-cursor="SELECT"
                className={`py-3 text-xs font-mono uppercase font-bold border transition-all ${
                  policyMode === mode
                    ? 'bg-primary text-black border-primary'
                    : 'bg-black/60 text-muted border-white/10 hover:text-white'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-5 pt-4 border-t border-white/10 font-mono">
          
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-white uppercase">PREVIOUS FACILITY USAGE WEIGHT</span>
              <span className="text-primary">{Math.round(usageWeight * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={usageWeight}
              onChange={(e) => setUsageWeight(e.target.value)}
              className="w-full accent-primary cursor-pointer"
            />
            <p className="text-[10px] text-muted">Prioritizes athletes with fewer historical reservations to democratize court access.</p>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-white uppercase">WAITLIST DURATION FACTOR</span>
              <span className="text-primary">{Math.round(waitlistWeight * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={waitlistWeight}
              onChange={(e) => setWaitlistWeight(e.target.value)}
              className="w-full accent-primary cursor-pointer"
            />
            <p className="text-[10px] text-muted">Grants progressive queue rank to students waiting in standby queues.</p>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-white uppercase">PEAK-HOUR CONCURRENCY PENALTY</span>
              <span className="text-primary">{Math.round(peakWeight * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={peakWeight}
              onChange={(e) => setPeakWeight(e.target.value)}
              className="w-full accent-primary cursor-pointer"
            />
            <p className="text-[10px] text-muted">Balances peak 6 PM — 9 PM allocation amongst all varsity athlete cohorts.</p>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-white uppercase">NO-SHOW DEFICIT WEIGHT</span>
              <span className="text-primary">{Math.round(noshowWeight * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={noshowWeight}
              onChange={(e) => setNoshowWeight(e.target.value)}
              className="w-full accent-primary cursor-pointer"
            />
            <p className="text-[10px] text-muted">Deducts priority from accounts possessing unexcused reservation non-attendances.</p>
          </div>

        </div>

        <button
          type="submit"
          data-cursor="SAVE"
          className="w-full py-3.5 bg-primary hover:bg-primary/90 text-black font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>COMMIT POLICY PARAMETERS</span>
        </button>

      </form>

    </div>
  );
};
