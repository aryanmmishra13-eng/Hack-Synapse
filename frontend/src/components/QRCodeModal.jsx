import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, QrCode, Copy, Check, Info, ShieldCheck, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNotification } from '../context/NotificationContext';

export const QRCodeModal = ({ booking, onClose }) => {
  const [copied, setCopied] = useState(false);
  const { addToast } = useNotification();

  if (!booking) return null;

  const passCode = booking.qr_code || `CSH-BOOKING-${booking.id}`;
  const isCheckedIn = booking.status === 'CHECKED_IN';
  const isCancelled = booking.status === 'CANCELLED';

  const copyCode = () => {
    navigator.clipboard.writeText(passCode);
    setCopied(true);
    addToast('Pass Code copied to clipboard!', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-sm card-panel p-6 sm:p-8 space-y-5 text-center border-white/20"
      >
        {/* Top Status Border Indicator */}
        <div className={`h-1 w-full absolute top-0 left-0 ${isCheckedIn ? 'bg-sky-400' : isCancelled ? 'bg-rose-500' : 'bg-primary'}`} />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-muted hover:text-white border border-white/10 hover:border-white/30"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="text-[10px] font-mono text-primary uppercase tracking-widest">
            AUTHENTICATION TICKET
          </div>
          <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white">
            {isCheckedIn ? 'ENTRY APPROVED ✓' : isCancelled ? 'BOOKING VOID' : 'ARENA ACCESS PASS'}
          </h3>
          <p className="text-xs text-muted font-mono">
            {isCheckedIn
              ? 'Authorized by admin check-in gate'
              : isCancelled
              ? 'This session has been cancelled'
              : 'Present this QR barcode to gate admin'}
          </p>
        </div>

        {/* High contrast QR Frame */}
        {!isCancelled && (
          <div className="p-4 bg-white inline-block border-4 border-black shadow-2xl">
            <QRCodeSVG value={passCode} size={180} fgColor="#000000" bgColor="#FFFFFF" />
          </div>
        )}

        {/* Pass Code Token */}
        <div className="flex items-center justify-between p-2.5 bg-black/80 border border-white/10 text-xs font-mono text-white">
          <span className="truncate mr-2 text-primary font-bold">{passCode}</span>
          <button
            onClick={copyCode}
            className="flex items-center gap-1 text-[10px] px-2 py-1 bg-white/10 hover:bg-white/20 text-white uppercase font-bold tracking-wider"
          >
            {copied ? (
              <><Check className="w-3 h-3 text-primary" /><span className="text-primary">COPIED</span></>
            ) : (
              <><Copy className="w-3 h-3" /><span>COPY</span></>
            )}
          </button>
        </div>

        {/* Booking Details Matrix */}
        <div className="p-3.5 bg-white/5 border border-white/10 text-left text-xs font-mono space-y-1.5">
          <div className="flex justify-between text-muted">
            <span className="text-[10px] uppercase">ARENA:</span>
            <span className="font-bold text-white uppercase">{booking.facility_name}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span className="text-[10px] uppercase">DISCIPLINE:</span>
            <span className="font-bold text-white uppercase">{booking.sport_name}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span className="text-[10px] uppercase">SLOT:</span>
            <span className="font-bold text-primary">{booking.booking_date} // {booking.start_time}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span className="text-[10px] uppercase">STATUS:</span>
            <span className={`font-bold uppercase ${isCheckedIn ? 'text-sky-400' : isCancelled ? 'text-rose-400' : 'text-primary'}`}>
              {booking.status}
            </span>
          </div>
        </div>

        {/* Instruction Footer */}
        {!isCheckedIn && !isCancelled && (
          <div className="flex items-start gap-2.5 p-3 bg-primary/10 border border-primary/20 text-left">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="text-[11px] text-muted font-sans leading-tight">
              <span className="text-primary font-bold font-mono">GATE INSTRUCTION:</span> Scan or present booking ID code at the ground terminal upon arrival.
            </div>
          </div>
        )}

        {isCheckedIn && (
          <div className="flex items-center gap-2 p-3 bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-mono justify-center">
            <Clock className="w-4 h-4" />
            <span>{booking.checked_in_at ? `CHECKED IN AT ${new Date(booking.checked_in_at).toLocaleTimeString()}` : 'CONFIRMED BY VENUE ADMIN'}</span>
          </div>
        )}
      </motion.div>
    </div>
  );
};
