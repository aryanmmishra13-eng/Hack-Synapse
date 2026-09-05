import React from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Award, ShieldCheck, Activity, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export const ProfilePage = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-16">
      {/* Header */}
      <div className="border-b border-white/10 pb-6">
        <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-widest mb-1.5">
          <User className="w-3.5 h-3.5" />
          <span>VARSITY ATHLETE CREDENTIALS</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-display font-bold uppercase tracking-tight text-white">
          ATHLETE DOSSIER
        </h1>
        <p className="text-sm text-muted mt-1 font-sans">
          Identity records, varsity discipline affinities, and algorithmic fairness priority rating.
        </p>
      </div>

      <div className="card-panel p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 border-b border-white/10 pb-6">
          <div className="w-20 h-20 border-2 border-primary bg-black flex items-center justify-center font-display font-bold text-4xl text-primary shrink-0">
            {user?.name?.charAt(0) || 'A'}
          </div>
          <div className="space-y-1.5">
            <h2 className="text-3xl font-display font-bold uppercase tracking-tight text-white">{user?.name}</h2>
            <p className="text-xs font-mono text-muted">{user?.email}</p>
            <div className="inline-block mt-2 text-[10px] font-mono font-bold px-2.5 py-0.5 border border-primary/30 text-primary bg-primary/10 uppercase tracking-widest">
              CREDENTIAL ROLE: {user?.role}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-black/60 border border-white/10 space-y-1">
            <span className="text-[10px] font-mono uppercase text-muted">PRIMARY DISCIPLINE</span>
            <p className="text-xl font-display uppercase font-bold text-white">{user?.preferred_sport || 'Badminton'}</p>
          </div>

          <div className="p-4 bg-black/60 border border-white/10 space-y-1">
            <span className="text-[10px] font-mono uppercase text-muted">TIER CLASSIFICATION</span>
            <p className="text-xl font-display uppercase font-bold text-primary">{user?.skill_level || 'Intermediate'}</p>
          </div>
        </div>

        {/* Priority Allocation Score */}
        <div className="p-6 bg-gradient-to-r from-primary/10 via-black to-black border border-primary/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-primary uppercase flex items-center gap-2">
              <Award className="w-4 h-4" />
              FAIRNESS PRIORITY ALLOCATION INDEX
            </span>
            <span className="text-3xl font-display font-bold text-primary">92.4 <span className="text-xs font-mono text-muted">/ 100</span></span>
          </div>
          <p className="text-xs font-mono text-muted leading-relaxed">
            Tier-1 priority ranking active. Your pristine check-in reliability and balanced off-peak court utilization grant elevated priority for automated waitlist promotions.
          </p>
        </div>
      </div>
    </div>
  );
};
