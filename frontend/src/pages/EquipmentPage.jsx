import React, { useState, useEffect } from 'react';
import { 
  Package, Calendar, Clock, AlertCircle, CheckCircle2, 
  RotateCcw, ShieldCheck, DollarSign, Filter, Sparkles, ChevronRight, ArrowUpRight, Box
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

export const EquipmentPage = () => {
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'my-rentals'
  const [equipmentList, setEquipmentList] = useState([]);
  const [myRentals, setMyRentals] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [selectedSport, setSelectedSport] = useState('ALL');
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Rent modal
  const [selectedItem, setSelectedItem] = useState(null);
  const [rentQty, setRentQty] = useState(1);
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [expectedReturnTime, setExpectedReturnTime] = useState('');
  const [submittingRent, setSubmittingRent] = useState(false);

  // Return modal
  const [returnItem, setReturnItem] = useState(null);
  const [returnCondition, setReturnCondition] = useState('GOOD');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  const { addToast } = useNotification();

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eqRes, sportsRes, rentalsRes, bookingsRes] = await Promise.all([
        api.get('/equipment'),
        api.get('/sports'),
        api.get('/equipment/my-rentals'),
        api.get('/bookings/my')
      ]);
      setEquipmentList(eqRes.data);
      setSports(sportsRes.data);
      setMyRentals(rentalsRes.data);
      // Filter only confirmed upcoming/current bookings
      const validBookings = (Array.isArray(bookingsRes.data) ? bookingsRes.data : []).filter(b => b.status === 'CONFIRMED');
      setMyBookings(validBookings);
      if (validBookings.length > 0 && !selectedBookingId) {
        setSelectedBookingId(validBookings[0].id);
      }
    } catch (err) {
      addToast('Failed to load equipment data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    setSubmittingRent(true);
    try {
      await api.post('/equipment/rent', {
        equipment_id: selectedItem.id,
        quantity: rentQty,
        booking_id: selectedBookingId ? parseInt(selectedBookingId) : null,
        expected_return_time: expectedReturnTime || null
      });
      addToast(`Successfully checked out ${rentQty}x ${selectedItem.name}!`, 'success');
      setSelectedItem(null);
      fetchData();
      setActiveTab('my-rentals');
    } catch (err) {
      addToast(err.response?.data?.detail || 'Equipment checkout failed', 'error');
    } finally {
      setSubmittingRent(false);
    }
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!returnItem) return;
    setSubmittingReturn(true);
    try {
      const res = await api.post(`/equipment/return/${returnItem.id}`, {
        condition: returnCondition
      });
      addToast(res.data.message || 'Equipment returned successfully!', 'success');
      setReturnItem(null);
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to process return', 'error');
    } finally {
      setSubmittingReturn(false);
    }
  };

  const filteredEquipment = equipmentList.filter(item => {
    if (selectedSport === 'ALL') return true;
    return item.sport_name?.toLowerCase() === selectedSport.toLowerCase();
  });

  const activeRentalsCount = myRentals.filter(r => r.status === 'CHECKED_OUT').length;

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-widest mb-1.5">
            <Box className="w-3.5 h-3.5" />
            <span>ATHLETIC INVENTORY DISPATCH</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold uppercase tracking-tight text-white">
            EQUIPMENT & GEAR VAULT
          </h1>
          <p className="text-sm text-muted mt-1 font-sans">
            High-grade competition equipment, racquets, match balls, and safety gear available for checked-out checkout.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-2 p-1 bg-black/60 border border-white/10 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('catalog')}
            data-cursor="CATALOG"
            className={`px-4 py-2 text-xs font-mono uppercase tracking-wider transition-all ${
              activeTab === 'catalog'
                ? 'bg-primary text-black font-bold'
                : 'text-muted hover:text-white'
            }`}
          >
            VAULT CATALOG ({equipmentList.length})
          </button>
          <button
            onClick={() => setActiveTab('my-rentals')}
            data-cursor="RENTALS"
            className={`px-4 py-2 text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'my-rentals'
                ? 'bg-primary text-black font-bold'
                : 'text-muted hover:text-white'
            }`}
          >
            <span>ACTIVE LOANS</span>
            {activeRentalsCount > 0 && (
              <span className={`px-1.5 py-0.2 text-[10px] font-bold ${activeTab === 'my-rentals' ? 'bg-black text-primary' : 'bg-primary text-black'}`}>
                {activeRentalsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {/* Discipline Filter Row */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedSport('ALL')}
              className={`px-4 py-2 text-xs font-mono uppercase tracking-wider whitespace-nowrap border transition-all ${
                selectedSport === 'ALL'
                  ? 'bg-primary text-black font-bold border-primary'
                  : 'bg-black/50 text-muted hover:text-white border-white/10'
              }`}
            >
              ALL DISCIPLINES
            </button>
            {sports.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedSport(s.name)}
                className={`px-4 py-2 text-xs font-mono uppercase tracking-wider whitespace-nowrap border transition-all ${
                  selectedSport === s.name
                    ? 'bg-primary text-black font-bold border-primary'
                    : 'bg-black/50 text-muted hover:text-white border-white/10'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          {/* Catalog Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                <div key={n} className="h-56 card-panel animate-pulse p-6"></div>
              ))}
            </div>
          ) : filteredEquipment.length === 0 ? (
            <div className="card-panel p-12 text-center text-muted space-y-3">
              <Package className="w-10 h-10 text-white/20 mx-auto" />
              <h3 className="font-display text-xl uppercase font-bold text-white">NO GEAR IN THIS CATEGORY</h3>
              <p className="text-xs font-mono text-muted">Select another discipline or check back after maintenance restocking.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredEquipment.map((item, index) => {
                const isAvailable = item.available_qty > 0;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="card-panel p-6 flex flex-col justify-between hover:border-primary/50 transition-all space-y-5 group"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 border border-white/10 bg-white/5 text-muted">
                          {item.sport_name}
                        </span>
                        <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 border ${
                          isAvailable
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}>
                          {isAvailable ? `${item.available_qty} IN STOCK` : 'DEPLETED'}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-xl font-display font-bold uppercase tracking-tight text-white group-hover:text-primary transition-colors">
                          {item.name}
                        </h3>
                        <p className="text-xs font-mono text-muted mt-1">
                          STATUS: <span className="text-white uppercase">{item.condition}</span>
                        </p>
                      </div>

                      <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                        <span className="text-muted">USAGE CHARGE</span>
                        <span className="font-bold text-primary">
                          {item.deposit_fee > 0 ? `₹${item.deposit_fee}` : 'COMPLIMENTARY'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedItem(item);
                        setRentQty(1);
                        setExpectedReturnTime('');
                      }}
                      disabled={!isAvailable}
                      data-cursor={isAvailable ? "CHECKOUT" : undefined}
                      className={`w-full py-3 font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                        isAvailable
                          ? 'bg-primary hover:bg-primary/90 text-black'
                          : 'bg-white/5 text-muted border border-white/10 cursor-not-allowed'
                      }`}
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>{isAvailable ? 'CHECKOUT GEAR' : 'UNAVAILABLE'}</span>
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* My Rentals Tab */}
      {activeTab === 'my-rentals' && (
        <div className="space-y-4">
          {myRentals.length === 0 ? (
            <div className="card-panel p-12 text-center text-muted space-y-3">
              <RotateCcw className="w-10 h-10 text-white/20 mx-auto" />
              <h3 className="font-display text-xl uppercase font-bold text-white">NO ACTIVE EQUIPMENT LOANS</h3>
              <p className="text-xs font-mono text-muted max-w-sm mx-auto">
                You haven't checked out any gear. Browse the equipment catalog to equip yourself for your next match.
              </p>
              <button
                onClick={() => setActiveTab('catalog')}
                className="mt-2 px-6 py-2.5 bg-primary text-black font-mono font-bold text-xs uppercase tracking-wider"
              >
                OPEN CATALOG
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myRentals.map((rental, index) => {
                const isCheckedOut = rental.status === 'CHECKED_OUT';
                return (
                  <motion.div
                    key={rental.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="card-panel p-6 flex flex-col justify-between hover:border-white/20 transition-all space-y-5"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 border ${
                          isCheckedOut 
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}>
                          {rental.status.replace('_', ' ')}
                        </span>
                        <span className="text-xs font-mono text-muted">LOAN #{rental.id}</span>
                      </div>

                      <div>
                        <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white">
                          {rental.equipment_name}
                        </h3>
                        <p className="text-xs font-mono text-muted mt-0.5">
                          QUANTITY: <span className="text-white font-bold">{rental.quantity} UNIT(S)</span>
                        </p>
                      </div>

                      <div className="space-y-1.5 p-3.5 bg-black/60 border border-white/10 text-xs font-mono">
                        <div className="flex justify-between text-muted">
                          <span>DISPATCH TIME:</span>
                          <span className="text-white">{rental.rented_at?.split('T')[0]} {rental.rented_at?.split('T')[1]?.slice(0, 5)}</span>
                        </div>
                        {rental.expected_return_time && (
                          <div className="flex justify-between text-amber-400">
                            <span>RETURN DUE:</span>
                            <span className="font-bold">{rental.expected_return_time}</span>
                          </div>
                        )}
                        {rental.booking_id && (
                          <div className="flex justify-between text-muted">
                            <span>LINKED ARENA:</span>
                            <span className="text-primary font-bold">#{rental.booking_id}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {isCheckedOut ? (
                      <button
                        onClick={() => {
                          setReturnItem(rental);
                          setReturnCondition('GOOD');
                        }}
                        data-cursor="RETURN"
                        className="w-full py-3 bg-white/5 hover:bg-primary text-white hover:text-black border border-white/10 hover:border-primary font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>RETURN TO ATHLETIC DESK</span>
                      </button>
                    ) : (
                      <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 text-xs font-mono text-emerald-400 text-center font-bold uppercase">
                        RETURN CONFIRMED // {rental.returned_at?.split('T')[0]} ({rental.condition})
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Rent Checkout Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md card-panel p-6 sm:p-8 space-y-6 border-white/20"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <div className="text-[10px] font-mono text-primary uppercase tracking-widest">
                    LOAN DISPATCH
                  </div>
                  <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white mt-0.5">
                    BORROW GEAR
                  </h3>
                  <p className="text-xs font-mono text-muted">
                    {selectedItem.sport_name} • {selectedItem.name}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-2 text-muted hover:text-white border border-white/10"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleRentSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-muted mb-1.5">
                    QUANTITY (MAX AVAILABLE: {selectedItem.available_qty})
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedItem.available_qty}
                    value={rentQty}
                    onChange={(e) => setRentQty(parseInt(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 text-xs font-mono text-white focus:border-primary focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-muted mb-1.5">
                    LINK TO ARENA BOOKING
                  </label>
                  {myBookings.length > 0 ? (
                    <select
                      value={selectedBookingId}
                      onChange={(e) => setSelectedBookingId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 text-xs font-mono text-white focus:border-primary focus:outline-none"
                    >
                      <option value="">WALK-IN PRACTICE (NO LINKED COURT)</option>
                      {myBookings.map(b => (
                        <option key={b.id} value={b.id}>
                          #{b.id} - {b.facility_name || b.facility?.name || 'Court'} ({b.booking_date} @ {b.start_time})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-3 bg-black/60 border border-white/10 text-xs font-mono text-muted">
                      No active court bookings found. Direct walk-in loan enabled.
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-muted mb-1.5">
                    ESTIMATED RETURN TIME
                  </label>
                  <input
                    type="time"
                    value={expectedReturnTime}
                    onChange={(e) => setExpectedReturnTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 text-xs font-mono text-white focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="p-3.5 bg-white/5 border border-white/10 text-muted space-y-1">
                  <div className="flex items-center gap-1.5 font-mono text-xs text-primary uppercase font-bold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>UNIVERSITY ATHLETICS PROTOCOL</span>
                  </div>
                  <p className="text-[11px] font-sans">
                    Please return all equipment to the front equipment desk promptly at the conclusion of your play session.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedItem(null)}
                    className="w-1/2 py-3 bg-white/5 hover:bg-white/10 text-muted hover:text-white border border-white/10 font-mono text-xs uppercase font-bold"
                  >
                    DISMISS
                  </button>
                  <button
                    type="submit"
                    disabled={submittingRent}
                    data-cursor="CONFIRM"
                    className="w-1/2 py-3 bg-primary hover:bg-primary/90 text-black font-mono text-xs uppercase font-bold tracking-wider"
                  >
                    {submittingRent ? 'DISPATCHING...' : 'CONFIRM LOAN'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Return Equipment Modal */}
      <AnimatePresence>
        {returnItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md card-panel p-6 sm:p-8 space-y-6 border-white/20"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <div className="text-[10px] font-mono text-primary uppercase tracking-widest">
                    RETURN PROTOCOL
                  </div>
                  <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white mt-0.5">
                    RETURN GEAR
                  </h3>
                  <p className="text-xs font-mono text-muted">
                    {returnItem.equipment_name} (LOAN #{returnItem.id})
                  </p>
                </div>
                <button
                  onClick={() => setReturnItem(null)}
                  className="p-2 text-muted hover:text-white border border-white/10"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleReturnSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-muted mb-1.5">
                    CONDITION ASSESSMENT
                  </label>
                  <select
                    value={returnCondition}
                    onChange={(e) => setReturnCondition(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 text-xs font-mono text-white focus:border-primary focus:outline-none"
                  >
                    <option value="GOOD">PRISTINE / EXCELLENT CONDITION</option>
                    <option value="MINOR_WEAR">STANDARD WEAR & PLAY FRICTION</option>
                    <option value="DAMAGED">DAMAGED / NEEDS STRINGING / SERVICING</option>
                  </select>
                </div>

                <div className="p-3.5 bg-black/60 border border-white/10 text-muted space-y-1">
                  <p className="font-mono text-xs font-bold text-white uppercase">DESK HANDOVER</p>
                  <p className="text-[11px] font-sans">
                    Hand over the gear to the attendant desk. Your checked-out balance will clear immediately.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setReturnItem(null)}
                    className="w-1/2 py-3 bg-white/5 hover:bg-white/10 text-muted hover:text-white border border-white/10 font-mono text-xs uppercase font-bold"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReturn}
                    data-cursor="CONFIRM"
                    className="w-1/2 py-3 bg-primary hover:bg-primary/90 text-black font-mono text-xs uppercase font-bold tracking-wider"
                  >
                    {submittingReturn ? 'PROCESSING...' : 'COMPLETE RETURN'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
