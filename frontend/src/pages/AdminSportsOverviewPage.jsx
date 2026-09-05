import React, { useState, useEffect } from 'react';
import { 
  Activity, CloudRain, AlertTriangle, CheckCircle2, 
  Building2, Trophy, Package, ArrowRight, ShieldCheck, RefreshCw, Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { DemandBar } from '../components/DemandBar';

export const AdminSportsOverviewPage = () => {
  const [sportsOverview, setSportsOverview] = useState([]);
  const [weatherRisks, setWeatherRisks] = useState([]);
  const [indoorFacilities, setIndoorFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reschedulingId, setReschedulingId] = useState(null);

  const { addToast } = useNotification();

  useEffect(() => {
    fetchOverviewData();
  }, []);

  const fetchOverviewData = async () => {
    setLoading(true);
    try {
      const [ovRes, riskRes, sportsRes] = await Promise.all([
        api.get('/admin/sports/overview'),
        api.get('/weather/admin/risks'),
        api.get('/sports')
      ]);
      setSportsOverview(ovRes.data);
      setWeatherRisks(riskRes.data);
      
      // Get all indoor facilities for reschedule options
      const allIndoor = [];
      for (const sp of sportsRes.data) {
        if (!sp.is_outdoor) {
          const facRes = await api.get(`/sports/${sp.id}/facilities`);
          allIndoor.push(...facRes.data);
        }
      }
      setIndoorFacilities(allIndoor);
    } catch (err) {
      addToast('Failed to load sports overview & weather risks', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleWeatherReschedule = async (facilityId) => {
    if (indoorFacilities.length === 0) {
      addToast('No indoor facility available for rescheduling', 'error');
      return;
    }
    const targetIndoor = indoorFacilities[0];
    setReschedulingId(facilityId);
    try {
      const res = await api.post(`/weather/admin/reschedule?facility_id=${facilityId}&new_facility_id=${targetIndoor.id}&new_time=10:00`);
      addToast(res.data.message || 'Bookings successfully moved to indoor court!', 'success');
      fetchOverviewData();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to reschedule bookings', 'error');
    } finally {
      setReschedulingId(null);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-widest mb-1.5">
            <Zap className="w-3.5 h-3.5" />
            <span>OPERATIONS & WEATHER HAZARD COMMAND</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold uppercase tracking-tight text-white">
            SPORTS & ARENA OVERVIEW
          </h1>
          <p className="text-sm text-muted mt-1 font-sans">
            University facility capacity, utilization metrics, and live outdoor weather protection protocols.
          </p>
        </div>

        <button
          onClick={fetchOverviewData}
          data-cursor="REFRESH"
          className="p-3 bg-white/5 hover:bg-white/10 text-muted hover:text-white border border-white/10 transition-colors self-start sm:self-auto"
          title="Refresh Live Status"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Severe Weather Risk Detection Banner */}
      {weatherRisks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-panel p-6 sm:p-8 bg-gradient-to-r from-rose-950/40 via-black to-black border-rose-500/40 space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-rose-400 font-mono text-xs uppercase font-bold">
              <CloudRain className="w-5 h-5 text-rose-400" />
              <span>SEVERE WEATHER ALERT: OUTDOOR PRECIPITATION DETECTED</span>
            </div>
            <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-1 border border-rose-500/40 text-rose-300 bg-rose-500/20 self-start sm:self-auto">
              82% RAIN LIKELIHOOD
            </span>
          </div>

          <p className="text-xs font-mono text-muted leading-relaxed">
            Thunderstorm predictions threaten outdoor sessions today. You can protect athlete safety by automatically moving affected students to indoor courts.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {weatherRisks.map(risk => (
              <div
                key={risk.facility_id}
                className="p-4 bg-black/80 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono"
              >
                <div>
                  <div className="font-bold text-white uppercase text-sm font-sans">{risk.facility_name}</div>
                  <div className="text-[10px] text-muted">{risk.sport_name} • {risk.affected_bookings_count} CONFIRMED PASSES</div>
                  <div className="text-[10px] text-amber-400 mt-1">RECOMMENDED: {risk.recommended_reschedule_time}</div>
                </div>

                <button
                  onClick={() => handleWeatherReschedule(risk.facility_id)}
                  disabled={reschedulingId === risk.facility_id}
                  data-cursor="RESCHEDULE"
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-1.5 shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${reschedulingId === risk.facility_id ? 'animate-spin' : ''}`} />
                  <span>RELOCATE INDOORS</span>
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Sports Health Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sportsOverview.map((sport, index) => (
          <motion.div
            key={sport.sport_id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className="card-panel p-6 flex flex-col justify-between hover:border-primary/50 transition-all space-y-5"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 border border-white/10 bg-white/5 text-muted">
                  {sport.is_outdoor ? 'OUTDOOR ARENA' : 'INDOOR CLIMATE'}
                </span>
                <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 border border-primary/30 text-primary bg-primary/10">
                  {sport.active_tournaments_count} LEAGUES
                </span>
              </div>

              <div>
                <h3 className="text-3xl font-display font-bold uppercase tracking-tight text-white">{sport.sport_name}</h3>
                <p className="text-xs font-mono text-muted mt-1">{sport.facilities_count} CAMPUS COURT(S) CONFIGURED</p>
              </div>

              <div className="space-y-2 text-xs font-mono p-4 bg-black/60 border border-white/10">
                <div className="flex justify-between">
                  <span className="text-muted">UTILIZATION:</span>
                  <span className="font-bold text-primary">{sport.utilization_rate}%</span>
                </div>
                <DemandBar percentage={sport.utilization_rate || 0} />
                <div className="flex justify-between pt-1">
                  <span className="text-muted">TOTAL SESSIONS:</span>
                  <span className="font-bold text-white">{sport.total_bookings}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">VAULT GEAR:</span>
                  <span className="font-bold text-white">{sport.equipment_count} ITEMS</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-muted">
              <span>FAIR ALLOCATION ENGINE</span>
              <span className="text-emerald-400 font-bold">100% OPERATIONAL</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
