import React, { useState, useEffect } from 'react';
import { 
  Package, PlusCircle, Wrench, AlertTriangle, ShieldCheck, 
  RotateCcw, CheckCircle2, Search, Filter, Edit3, Box
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

export const AdminEquipmentPage = () => {
  const [inventory, setInventory] = useState([]);
  const [sports, setSports] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Add Equipment Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [sportId, setSportId] = useState('');
  const [totalQty, setTotalQty] = useState(10);
  const [condition, setCondition] = useState('NEW');
  const [depositFee, setDepositFee] = useState(0);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Manage Equipment Modal
  const [managingItem, setManagingItem] = useState(null);
  const [editAvailableQty, setEditAvailableQty] = useState(0);
  const [editCondition, setEditCondition] = useState('GOOD');
  const [actionType, setActionType] = useState('UPDATE'); // 'UPDATE' | 'MAINTENANCE' | 'DAMAGED' | 'LOST'
  const [actionQty, setActionQty] = useState(1);
  const [submittingManage, setSubmittingManage] = useState(false);

  const { addToast } = useNotification();

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const [invRes, sportsRes] = await Promise.all([
        api.get('/equipment/admin/inventory'),
        api.get('/sports')
      ]);
      setInventory(invRes.data);
      setSports(sportsRes.data);
      if (sportsRes.data.length > 0 && !sportId) {
        setSportId(sportsRes.data[0].id);
      }
    } catch (err) {
      addToast('Failed to load equipment inventory', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEquipment = async (e) => {
    e.preventDefault();
    setSubmittingAdd(true);
    try {
      await api.post('/equipment/admin/create', {
        name,
        sport_id: parseInt(sportId),
        total_qty: parseInt(totalQty),
        condition,
        deposit_fee: parseFloat(depositFee) || 0.0
      });
      addToast(`Added ${name} to inventory!`, 'success');
      setShowAddModal(false);
      setName('');
      fetchInventory();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to add equipment', 'error');
    } finally {
      setSubmittingAdd(false);
    }
  };

  const openManageModal = (item) => {
    setManagingItem(item);
    setEditAvailableQty(item.available_qty);
    setEditCondition(item.condition);
    setActionType('UPDATE');
    setActionQty(1);
  };

  const handleManageSubmit = async (e) => {
    e.preventDefault();
    if (!managingItem) return;
    setSubmittingManage(true);
    try {
      await api.post(`/equipment/admin/manage/${managingItem.id}`, {
        action: actionType,
        quantity: parseInt(actionQty) || 1,
        condition: editCondition,
        available_qty: parseInt(editAvailableQty)
      });
      addToast(`Inventory updated for ${managingItem.name}!`, 'success');
      setManagingItem(null);
      fetchInventory();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to manage equipment', 'error');
    } finally {
      setSubmittingManage(false);
    }
  };

  const totalStock = inventory.reduce((acc, i) => acc + i.total_qty, 0);
  const totalAvailable = inventory.reduce((acc, i) => acc + i.available_qty, 0);
  const totalRented = totalStock - totalAvailable;
  const totalDamaged = inventory.reduce((acc, i) => acc + (i.damaged_qty || 0), 0);

  const filteredInventory = inventory.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.sport_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-widest mb-1.5">
            <Box className="w-3.5 h-3.5" />
            <span>LOGISTICS & ASSET CONTROL</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold uppercase tracking-tight text-white">
            EQUIPMENT INVENTORY VAULT
          </h1>
          <p className="text-sm text-muted mt-1 font-sans">
            Campus athletic gear stock, condition grading, loan tracking, and maintenance repair logs.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          data-cursor="ADD"
          className="px-6 py-3 bg-primary hover:bg-primary/90 text-black font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 self-start md:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>PROVISION GEAR</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card-panel p-6 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-muted">
            <span>TOTAL GEAR STOCK</span>
            <Package className="w-4 h-4 text-primary" />
          </div>
          <div className="text-3xl font-display font-bold text-white uppercase">{totalStock} UNITS</div>
          <p className="text-[11px] font-mono text-muted">{inventory.length} CATALOG ITEMS</p>
        </div>

        <div className="card-panel p-6 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-muted">
            <span>READY IN VAULT</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-display font-bold text-emerald-400 uppercase">{totalAvailable} UNITS</div>
          <p className="text-[11px] font-mono text-emerald-400">INSTANT BORROW READY</p>
        </div>

        <div className="card-panel p-6 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-muted">
            <span>ON LOAN / COURTS</span>
            <RotateCcw className="w-4 h-4 text-white" />
          </div>
          <div className="text-3xl font-display font-bold text-white uppercase">{Math.max(0, totalRented)} UNITS</div>
          <p className="text-[11px] font-mono text-muted">ACTIVE ON-COURT SESSIONS</p>
        </div>

        <div className="card-panel p-6 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-muted">
            <span>DAMAGED / SERVICING</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-display font-bold text-rose-400 uppercase">{totalDamaged} UNITS</div>
          <p className="text-[11px] font-mono text-rose-400">REQUIRES RESTRING / REPAIR</p>
        </div>
      </div>

      {/* Inventory Table Card */}
      <div className="card-panel p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="text-xs font-mono text-muted uppercase">
            FULL EQUIPMENT CATALOG ({filteredInventory.length})
          </div>
          
          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="FILTER INVENTORY..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-black/60 border border-white/10 text-xs font-mono text-white placeholder-white/30 focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="h-14 bg-white/5 animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono text-white">
              <thead className="bg-black/60 text-muted uppercase text-[10px] tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">ITEM DESIGNATION</th>
                  <th className="py-3 px-4">DISCIPLINE</th>
                  <th className="py-3 px-4 text-center">TOTAL</th>
                  <th className="py-3 px-4 text-center">AVAILABLE</th>
                  <th className="py-3 px-4 text-center">CONDITION</th>
                  <th className="py-3 px-4 text-center">FEE</th>
                  <th className="py-3 px-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredInventory.map(item => (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4 font-bold text-white uppercase font-sans text-sm">
                      {item.name}
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-[10px] uppercase px-2 py-0.5 border border-white/10 bg-white/5 text-muted">
                        {item.sport_name}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center font-bold">{item.total_qty}</td>
                    <td className="py-4 px-4 text-center">
                      <span className={`font-bold ${item.available_qty > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {item.available_qty}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 border border-white/10 text-muted">
                        {item.condition}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {item.deposit_fee > 0 ? `₹${item.deposit_fee}` : 'FREE'}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => openManageModal(item)}
                        data-cursor="MANAGE"
                        className="px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-black font-bold uppercase text-xs tracking-wider transition-all inline-flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>MANAGE</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Equipment Modal */}
      <AnimatePresence>
        {showAddModal && (
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
                    INVENTORY DISPATCH
                  </div>
                  <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white mt-0.5">
                    PROVISION GEAR
                  </h3>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 text-muted hover:text-white border border-white/10"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddEquipment} className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-[10px] uppercase text-muted mb-1.5">EQUIPMENT MODEL</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Yonex Nanoray 10F Badminton Racquet"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 text-xs font-mono text-white focus:border-primary focus:outline-none font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase text-muted mb-1.5">DISCIPLINE</label>
                    <select
                      value={sportId}
                      onChange={(e) => setSportId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 text-xs font-mono text-white focus:border-primary focus:outline-none font-bold"
                    >
                      {sports.map(sp => (
                        <option key={sp.id} value={sp.id}>{sp.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase text-muted mb-1.5">TOTAL UNITS</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={totalQty}
                      onChange={(e) => setTotalQty(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 text-xs font-mono text-white focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase text-muted mb-1.5">CONDITION</label>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 text-xs font-mono text-white focus:border-primary focus:outline-none"
                    >
                      <option value="NEW">Brand New</option>
                      <option value="GOOD">Good / Tested</option>
                      <option value="FAIR">Fair</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase text-muted mb-1.5">USAGE CHARGE (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={depositFee}
                      onChange={(e) => setDepositFee(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 text-xs font-mono text-white focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="w-1/2 py-3 bg-white/5 hover:bg-white/10 text-muted hover:text-white border border-white/10 font-bold uppercase"
                  >
                    DISMISS
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAdd}
                    data-cursor="PROVISION"
                    className="w-1/2 py-3 bg-primary hover:bg-primary/90 text-black font-bold uppercase tracking-wider"
                  >
                    {submittingAdd ? 'PROVISIONING...' : 'COMMIT GEAR'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manage Equipment Modal */}
      <AnimatePresence>
        {managingItem && (
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
                    ASSET CALIBRATION
                  </div>
                  <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white mt-0.5">
                    MANAGE STOCK
                  </h3>
                  <p className="text-xs font-mono text-muted">{managingItem.name} ({managingItem.sport_name})</p>
                </div>
                <button
                  onClick={() => setManagingItem(null)}
                  className="p-2 text-muted hover:text-white border border-white/10"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleManageSubmit} className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-[10px] uppercase text-muted mb-1.5">MANAGEMENT ACTION</label>
                  <select
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 text-xs font-mono text-white focus:border-primary focus:outline-none font-bold"
                  >
                    <option value="UPDATE">Update Available Quantity & Condition</option>
                    <option value="MAINTENANCE">Mark Item(s) for Maintenance / Restringing</option>
                    <option value="DAMAGED">Record Damaged / Broken Item(s)</option>
                    <option value="LOST">Record Lost / Missing Item(s)</option>
                  </select>
                </div>

                {actionType === 'UPDATE' ? (
                  <>
                    <div>
                      <label className="block text-[10px] uppercase text-muted mb-1.5">AVAILABLE QUANTITY</label>
                      <input
                        type="number"
                        min="0"
                        max={managingItem.total_qty}
                        value={editAvailableQty}
                        onChange={(e) => setEditAvailableQty(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 text-xs font-mono text-white focus:border-primary focus:outline-none font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase text-muted mb-1.5">CONDITION STATUS</label>
                      <select
                        value={editCondition}
                        onChange={(e) => setEditCondition(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 text-xs font-mono text-white focus:border-primary focus:outline-none"
                      >
                        <option value="EXCELLENT">Excellent</option>
                        <option value="GOOD">Good</option>
                        <option value="FAIR">Fair</option>
                        <option value="POOR">Poor</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-[10px] uppercase text-muted mb-1.5">AFFECTED UNITS</label>
                    <input
                      type="number"
                      min="1"
                      max={managingItem.available_qty || 1}
                      value={actionQty}
                      onChange={(e) => setActionQty(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 text-xs font-mono text-white focus:border-primary focus:outline-none font-bold"
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setManagingItem(null)}
                    className="w-1/2 py-3 bg-white/5 hover:bg-white/10 text-muted hover:text-white border border-white/10 font-bold uppercase"
                  >
                    DISMISS
                  </button>
                  <button
                    type="submit"
                    disabled={submittingManage}
                    data-cursor="UPDATE"
                    className="w-1/2 py-3 bg-primary hover:bg-primary/90 text-black font-bold uppercase tracking-wider"
                  >
                    {submittingManage ? 'UPDATING...' : 'SAVE CHANGES'}
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
