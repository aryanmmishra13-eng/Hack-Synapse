import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Building2, Calendar, Clock, CheckCircle2, AlertTriangle, XCircle, 
  Wrench, Sparkles, ChevronRight, CheckCircle, ShieldAlert, ArrowLeft,
  CloudRain, Package, Zap, ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

export const FacilityDetailPage = () => {
  const { sportId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useNotification();

  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [slotsData, setSlotsData] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [loadingFacilities, setLoadingFacilities] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Booking Modal State
  const [activeSlot, setActiveSlot] = useState(null);
  const [bookingResponse, setBookingResponse] = useState(null);
  const [submittingBooking, setSubmittingBooking] = useState(false);

  useEffect(() => {
    fetchFacilities();
  }, [sportId]);

  useEffect(() => {
    if (selectedFacility) {
      fetchSlots(selectedFacility.id, selectedDate);
      fetchWeather(selectedFacility.id, selectedDate);
    }
  }, [selectedFacility, selectedDate]);

  const fetchWeather = async (facilityId, dateStr) => {
    try {
      const res = await api.get(`/weather/report?facility_id=${facilityId}&date=${dateStr}&hour=18`);
      setWeatherData(res.data);
    } catch {
      // Non-blocking
    }
  };

  const fetchFacilities = async () => {
    try {
      const res = await api.get(`/sports/${sportId}/facilities`);
      setFacilities(res.data);
      if (res.data.length > 0) {
        setSelectedFacility(res.data[0]);
      }
    } catch (err) {
      addToast('Failed to load facilities', 'error');
    } finally {
      setLoadingFacilities(false);
    }
  };

  const fetchSlots = async (facilityId, dateStr) => {
    setLoadingSlots(true);
    try {
      const res = await api.get(`/sports/facilities/${facilityId}/slots?date=${dateStr}`);
      setSlotsData(res.data);
    } catch (err) {
      addToast('Failed to load slot availability', 'error');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSlotClick = (slot) => {
    if (slot.status === 'MAINTENANCE') {
      addToast('Facility is currently under maintenance during this slot', 'info');
      return;
    }
    setActiveSlot(slot);
    setBookingResponse(null);
  };

  const confirmBooking = async (facilityIdToBook, timeToBook, endTimeToBook) => {
    setSubmittingBooking(true);
    try {
      const res = await api.post('/bookings', {
        facility_id: facilityIdToBook || selectedFacility.id,
        booking_date: selectedDate,
        start_time: timeToBook || activeSlot.time,
        end_time: endTimeToBook || activeSlot.end_time
      });
      
      setBookingResponse(res.data);
      if (res.data.success) {
        addToast('Booking successfully confirmed!', 'success');
        fetchSlots(selectedFacility.id, selectedDate);
      }
    } catch (err) {
      addToast(err.response?.data?.detail || 'Booking request failed', 'error');
    } finally {
      setSubmittingBooking(false);
    }
  };

  const joinWaitlist = async () => {
    try {
      const res = await api.post('/waitlist', {
        facility_id: selectedFacility.id,
        booking_date: selectedDate,
        start_time: activeSlot.time
      });
      addToast(`Joined waitlist at position #${res.data.position}!`, 'success');
      setActiveSlot(null);
    } catch (err) {
      addToast('Failed to join waitlist', 'error');
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <button
          onClick={() => navigate('/app/sports')}
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-primary" />
          <span>BACK TO SPORTS DIRECTORY</span>
        </button>

        <div className="text-xs font-mono text-white/40">
          DISCIPLINE CODE: <span className="text-primary font-bold">#{sportId}</span>
        </div>
      </div>

      <div>
        <h1 className="text-4xl sm:text-5xl font-display font-bold uppercase tracking-tight text-white">
          ARENA & COURT RESERVATION
        </h1>
        <p className="text-xs sm:text-sm text-muted mt-1 font-sans">
          Select your arena, configure session date, and lock your reserved hourly match slot.
        </p>
      </div>

      {/* Facility Selector Tabs & Date Filter */}
      <div className="card-panel p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Facility Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
          {facilities.map((fac) => {
            const isSelected = selectedFacility?.id === fac.id;
            return (
              <button
                key={fac.id}
                onClick={() => setSelectedFacility(fac)}
                className={`px-4 py-2 text-xs font-mono uppercase tracking-wider transition-all whitespace-nowrap border ${
                  isSelected
                    ? 'bg-primary text-black font-bold border-primary shadow-lg shadow-primary/20'
                    : 'bg-black/50 text-muted hover:text-white border-white/10 hover:border-white/30'
                }`}
              >
                {fac.name}
              </button>
            );
          })}
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-3 self-start lg:self-auto">
          <div className="flex items-center gap-2 px-3 py-2 bg-black/60 border border-white/10 text-xs font-mono">
            <Calendar className="w-4 h-4 text-primary shrink-0" />
            <span className="text-muted uppercase text-[10px]">DATE:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-white focus:outline-none cursor-pointer font-mono"
            />
          </div>
        </div>
      </div>

      {/* Facility Details Hero */}
      {selectedFacility && (
        <div className="card-panel p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="space-y-2 z-10">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 border border-primary/30 bg-primary/10 text-primary text-[10px] font-mono uppercase">
              <Zap className="w-3 h-3" />
              <span>{slotsData?.sport_name || 'ARENA VENUE'}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-bold uppercase tracking-tight text-white">
              {selectedFacility.name}
            </h2>
            <p className="text-xs font-mono text-muted">
              LOCATION: <span className="text-white">{selectedFacility.location}</span> • CAPACITY: <span className="text-white">{selectedFacility.capacity} ATHLETES</span>
            </p>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px] font-mono uppercase z-10 w-full md:w-auto">
            <div className="flex items-center gap-2 px-3 py-2 bg-black/50 border border-emerald-500/30 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span> AVAILABLE
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-black/50 border border-amber-500/30 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span> LIMITED
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-black/50 border border-rose-500/30 text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span> OCCUPIED
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-black/50 border border-white/10 text-white/40">
              <span className="w-2 h-2 rounded-full bg-white/20"></span> CLOSED
            </div>
          </div>
        </div>
      )}

      {/* Live Facility Weather Card */}
      {weatherData && (
        <div className={`card-panel p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border ${
          weatherData.risk_level === 'WARNING'
            ? 'border-rose-500/40 bg-rose-950/20'
            : 'border-white/10 bg-black/40'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 border ${
              weatherData.risk_level === 'WARNING'
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                : 'bg-primary/10 text-primary border-primary/20'
            }`}>
              <CloudRain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-3 font-mono text-xs text-white">
                <span className="font-bold uppercase">{weatherData.condition}</span>
                <span className="text-muted">• {weatherData.temp_c}°C</span>
                <span className={`px-2 py-0.5 text-[10px] font-mono uppercase border ${
                  weatherData.rain_probability > 50
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}>
                  {weatherData.rain_probability}% RAIN RISK
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5 font-sans">{weatherData.recommendation}</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/app/equipment')}
            data-cursor="RENT"
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-primary border border-primary/30 text-xs font-mono uppercase font-bold tracking-wider transition-all flex items-center gap-2 shrink-0 self-start sm:self-auto"
          >
            <Package className="w-3.5 h-3.5" />
            <span>RENT GEAR / EQUIPMENT</span>
          </button>
        </div>
      )}

      {/* Time Slots Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-mono text-xs text-muted uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>HOURLY COURT MATRIX ({selectedDate})</span>
          </div>
          <span className="text-[10px] font-mono text-white/40">CLICK TO SELECT</span>
        </div>

        {loadingSlots ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="h-28 card-panel animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {slotsData?.slots.map((slot) => {
              const isAvail = slot.status === 'AVAILABLE';
              const isLimit = slot.status === 'LIMITED';
              const isFull = slot.status === 'FULL';
              const isMaint = slot.status === 'MAINTENANCE';

              return (
                <button
                  key={slot.time}
                  onClick={() => handleSlotClick(slot)}
                  disabled={isMaint}
                  data-cursor={isMaint ? undefined : "BOOK"}
                  className={`p-3.5 border text-left transition-all relative flex flex-col justify-between h-28 group ${
                    isAvail
                      ? 'bg-black/50 border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-500/5 text-white'
                      : isLimit
                      ? 'bg-black/50 border-amber-500/30 hover:border-amber-400 hover:bg-amber-500/5 text-white'
                      : isFull
                      ? 'bg-black/30 border-rose-500/30 hover:border-rose-400 text-rose-300'
                      : 'bg-black/20 border-white/5 text-white/20 cursor-not-allowed'
                  }`}
                >
                  <div>
                    <div className="font-mono font-bold text-sm tracking-tight text-white group-hover:text-primary transition-colors">
                      {slot.time}
                    </div>
                    <div className="text-[10px] font-mono uppercase mt-0.5 text-muted">
                      {isMaint ? 'CLOSED' : `${slot.booked_count}/${slot.capacity} BOOKED`}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className={`text-[9px] font-mono uppercase px-1.5 py-0.5 border inline-block ${
                      isAvail ? 'text-emerald-400 border-emerald-500/30' :
                      isLimit ? 'text-amber-400 border-amber-500/30' :
                      isFull ? 'text-rose-400 border-rose-500/30' : 'text-white/20 border-white/10'
                    }`}>
                      {slot.badge.split(' ')[0]}
                    </div>
                    <div className="text-[8px] font-mono text-white/40">
                      AI DEMAND: <span className={slot.demand_level === 'HIGH' ? 'text-primary font-bold' : 'text-white/60'}>{slot.demand_level}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Booking Confirmation Modal */}
      <AnimatePresence>
        {activeSlot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg card-panel p-6 sm:p-8 space-y-6 border-white/20"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <div className="text-[10px] font-mono text-primary uppercase tracking-widest">
                    RESERVATION DISPATCH
                  </div>
                  <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white mt-0.5">
                    CONFIRM BOOKING
                  </h3>
                  <p className="text-xs font-mono text-muted">
                    {selectedFacility?.name} • {selectedDate}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActiveSlot(null);
                    setBookingResponse(null);
                  }}
                  className="p-2 text-muted hover:text-white border border-white/10 hover:border-white/30"
                >
                  ✕
                </button>
              </div>

              {/* Selected Slot Meta */}
              <div className="p-4 bg-black/60 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 border border-primary/30 bg-primary/10 text-primary">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-mono text-sm font-bold text-white">
                      {activeSlot.time} — {activeSlot.end_time}
                    </div>
                    <div className="text-[10px] font-mono text-muted uppercase">1-HOUR MATCH SESSION</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono uppercase px-2.5 py-1 border border-primary/30 text-primary bg-primary/10">
                  {activeSlot.badge}
                </span>
              </div>

              {/* Response Messages */}
              {bookingResponse ? (
                <div className="space-y-4">
                  {bookingResponse.success ? (
                    <div className="p-4 border border-emerald-500/40 bg-emerald-950/30 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs uppercase font-bold">
                        <CheckCircle className="w-4 h-4" />
                        <span>{bookingResponse.message}</span>
                      </div>
                      <p className="text-xs text-muted">
                        Pass generated. Visit Booking History to view high-resolution QR access credentials.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 border border-rose-500/40 bg-rose-950/30 space-y-1 text-xs">
                        <div className="flex items-center gap-2 text-rose-400 font-mono uppercase font-bold">
                          <ShieldAlert className="w-4 h-4" />
                          <span>SLOT FULLY OCCUPIED</span>
                        </div>
                        <p className="text-muted">{bookingResponse.message}</p>
                      </div>

                      {/* Alternatives */}
                      {bookingResponse.alternatives?.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-mono uppercase text-muted flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-primary" />
                            RECOMMENDED OPEN ALTERNATIVES:
                          </p>

                          <div className="space-y-2">
                            {bookingResponse.alternatives.map((alt, idx) => (
                              <div
                                key={idx}
                                className="p-3 bg-black/60 border border-white/10 flex items-center justify-between text-xs"
                              >
                                <div>
                                  <div className="font-mono font-bold text-white uppercase">{alt.facility_name}</div>
                                  <div className="text-[10px] font-mono text-muted">{alt.start_time} - {alt.end_time}</div>
                                </div>
                                <button
                                  onClick={() => confirmBooking(alt.facility_id, alt.start_time, alt.end_time)}
                                  className="px-3 py-1.5 bg-primary text-black font-mono font-bold text-xs uppercase"
                                >
                                  BOOK THIS
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <button
                        onClick={joinWaitlist}
                        className="w-full py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono text-xs uppercase font-bold"
                      >
                        JOIN WAITLIST (QUEUE #{bookingResponse.waitlist_position || 1})
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* AI Demand Insight */}
                  <div className="p-3.5 bg-white/5 border border-white/10 flex items-start gap-2.5 text-xs">
                    <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <span className="font-mono text-primary font-bold uppercase">AI DEMAND ADVISORY: </span>
                      <span className="text-muted">
                        {activeSlot.demand_level === 'HIGH'
                          ? 'High peak concurrency forecasted. Locking early ensures guaranteed court access.'
                          : 'Standard court availability predicted for this window.'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setActiveSlot(null)}
                      className="w-1/2 py-3 bg-white/5 hover:bg-white/10 text-muted hover:text-white border border-white/10 font-mono text-xs uppercase font-bold"
                    >
                      DISMISS
                    </button>
                    <button
                      onClick={() => confirmBooking(null, null, null)}
                      disabled={submittingBooking}
                      data-cursor="CONFIRM"
                      className="w-1/2 py-3 bg-primary hover:bg-primary/90 text-black font-mono text-xs uppercase font-bold tracking-wider"
                    >
                      {submittingBooking ? 'DISPATCHING...' : 'CONFIRM ACCESS'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
