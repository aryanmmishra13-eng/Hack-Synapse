import React from 'react';
import { Bell, CheckCircle2, Sparkles, Gamepad2, Layers, Info } from 'lucide-react';
import { motion } from 'framer-motion';

export const NotificationsPage = () => {
  const notifications = [
    {
      id: 1,
      type: 'CONFIRMATION',
      message: 'Booking confirmed for Badminton Court 1 on 2026-09-02 at 18:00.',
      time: '10 MINS AGO',
      read: false
    },
    {
      id: 2,
      type: 'WAITLIST_PROMOTION',
      message: 'Slot opened for Football Ground Alpha. Your reservation was automatically promoted and confirmed!',
      time: '1 HOUR AGO',
      read: false
    },
    {
      id: 3,
      type: 'PLAYER_INVITE',
      message: 'Rahul Verma dispatched a competitive sparring match challenge for Badminton.',
      time: '2 HOURS AGO',
      read: true
    },
    {
      id: 4,
      type: 'SYSTEM',
      message: 'Welcome to Campus Sports Hub! Explore live arena occupancy and reserve courts.',
      time: '1 DAY AGO',
      read: true
    }
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div className="border-b border-white/10 pb-6">
        <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-widest mb-1.5">
          <Bell className="w-3.5 h-3.5" />
          <span>REAL-TIME TELEMETRY FEED</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-display font-bold uppercase tracking-tight text-white">
          SYSTEM NOTIFICATIONS
        </h1>
        <p className="text-sm text-muted mt-1 font-sans">
          Automated gate confirmations, waitlist promotions, challenge invitations, and facility updates.
        </p>
      </div>

      <div className="space-y-4">
        {notifications.map((n, index) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`card-panel p-6 flex items-start gap-4 transition-all ${
              !n.read ? 'border-primary/40' : 'border-white/10 opacity-70'
            }`}
          >
            <div className="p-3 bg-black border border-white/10 shrink-0">
              {n.type === 'CONFIRMATION' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {n.type === 'WAITLIST_PROMOTION' && <Sparkles className="w-5 h-5 text-primary" />}
              {n.type === 'PLAYER_INVITE' && <Gamepad2 className="w-5 h-5 text-sky-400" />}
              {n.type === 'SYSTEM' && <Info className="w-5 h-5 text-white" />}
            </div>

            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 border border-white/10 text-primary bg-primary/10">
                  {n.type.replace('_', ' ')}
                </span>
                <span className="text-[10px] font-mono text-muted">{n.time}</span>
              </div>
              <p className="text-sm font-sans text-white leading-relaxed">{n.message}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
