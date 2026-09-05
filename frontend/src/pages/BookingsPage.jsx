import React, { useState, useEffect } from 'react';
import { 
  CalendarCheck, QrCode, Trash2, Clock, Layers, RefreshCw, ArrowUpRight, ShieldCheck, Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { QRCodeModal } from '../components/QRCodeModal';

export const BookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQRBooking, setSelectedQRBooking] = useState(null);

  const { addToast } = useNotification();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bRes, wRes] = await Promise.all([
        api.get('/bookings/my'),
        api.get('/waitlist/my')
      ]);
      setBookings(bRes.data);
      setWaitlist(wRes.data);
    } catch (err) {
      addToast('Failed to load booking history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking? If there are waitlisted students, one will be automatically promoted.')) {
      return;
    }
    try {
      const res = await api.delete(`/bookings/${bookingId}`);
      addToast(res.data.message, 'success');
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Cancellation failed', 'error');
    }
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-widest mb-1.5">
            <QrCode className="w-3.5 h-3.5" />
            <span>ATHLETIC PASS PROTOCOL</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold uppercase tracking-tight text-white">
            MY SESSIONS & QR PASSES
          </h1>
          <p className="text-sm text-muted mt-1 font-sans">
            Manage your arena authorizations, launch high-contrast gate credentials, and monitor waitlist queues.
          </p>
        </div>

        <button
          onClick={fetchData}
          data-cursor="REFRESH"
          className="p-3 bg-white/5 hover:bg-white/10 text-muted hover:text-white border border-white/10 transition-colors self-start sm:self-auto"
          title="Refresh Credentials"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Active Bookings Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="font-mono text-xs text-muted uppercase tracking-wider">
            ACTIVE & RECENT RESERVATIONS ({bookings.length})
          </div>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[1, 2].map((n) => (
              <div key={n} className="h-44 card-panel animate-pulse p-6"></div>
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="card-panel p-12 text-center text-muted space-y-3">
            <CalendarCheck className="w-10 h-10 text-white/20 mx-auto" />
            <h3 className="font-display text-xl uppercase font-bold text-white">NO ACTIVE SESSIONS FOUND</h3>
            <p className="text-xs font-mono text-muted max-w-sm mx-auto">
              Reserve an arena or court slot to generate your cryptographic QR gate access pass.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {bookings.map((booking, index) => {
              const isConfirmed = booking.status === 'CONFIRMED';
              const isCheckedIn = booking.status === 'CHECKED_IN';
              const isCancelled = booking.status === 'CANCELLED';

              return (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="card-panel p-6 space-y-4 flex flex-col justify-between hover:border-white/20 transition-all relative"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 border border-primary/30 text-primary bg-primary/10">
                        {booking.sport_name}
                      </span>

                      <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 border ${
                        isConfirmed
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : isCheckedIn
                          ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                          : 'bg-white/5 text-muted border-white/10'
                      }`}>
                        {booking.status}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white">
                        {booking.facility_name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-xs font-mono text-muted">
                        <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{booking.booking_date} // {booking.start_time} - {booking.end_time}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                    <button
                      onClick={() => setSelectedQRBooking(booking)}
                      data-cursor="QR PASS"
                      className="flex-1 py-3 bg-primary hover:bg-primary/90 text-black font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>LAUNCH QR PASS</span>
                    </button>

                    {isConfirmed && (
                      <button
                        onClick={() => handleCancelBooking(booking.id)}
                        data-cursor="CANCEL"
                        className="p-3 bg-white/5 hover:bg-rose-500/20 text-muted hover:text-rose-400 border border-white/10 hover:border-rose-500/40 transition-colors"
                        title="Cancel Booking"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Waitlist Entries Section */}
      {waitlist.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-white/10">
          <div className="font-mono text-xs text-muted uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>ACTIVE WAITLIST QUEUES ({waitlist.length})</span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {waitlist.map((item) => (
              <div key={item.id} className="card-panel p-4 flex items-center justify-between text-xs font-mono border-amber-500/20">
                <div>
                  <div className="font-bold text-white uppercase">{item.facility_name}</div>
                  <div className="text-muted mt-0.5 text-[10px]">{item.booking_date} // {item.start_time}</div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-amber-400">POSITION #{item.position}</div>
                  <div className="text-[10px] text-muted mt-0.5">{item.users_ahead} ATHLETES AHEAD</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QR Access Pass Modal */}
      {selectedQRBooking && (
        <QRCodeModal
          booking={selectedQRBooking}
          onClose={() => setSelectedQRBooking(null)}
        />
      )}

    </div>
  );
};
