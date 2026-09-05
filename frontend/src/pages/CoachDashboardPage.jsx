import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Calendar, TrendingUp, Award, Clock, ArrowUpRight, 
  AlertCircle, CheckCircle2, ChevronRight, PlusCircle, Sparkles, Shield, Target
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

export const CoachDashboardPage = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [todaySessions, setTodaySessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const { addToast } = useNotification();

  useEffect(() => {
    fetchCoachDashboard();
  }, []);

  const fetchCoachDashboard = async () => {
    setLoading(true);
    try {
      const [dashRes, trainRes, studRes] = await Promise.all([
        api.get('/coaches/dashboard'),
        api.get('/coaches/training'),
        api.get('/coaches/students')
      ]);
      setDashboardData(dashRes.data);
      setTodaySessions(trainRes.data.slice(0, 3));
      setStudents(studRes.data);
    } catch (err) {
      addToast('Failed to load coach dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  const metrics = dashboardData?.metrics || {
    total_assigned_students: 18,
    active_sessions_count: 5,
    average_attendance_rate: 88.5,
    average_skill_rating: 7.9
  };

  const improvingStudents = students.filter(s => (s.attendance_rate || 80) >= 80).slice(0, 4);
  const attentionStudents = students.filter(s => (s.attendance_rate || 80) < 80).slice(0, 4);

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-widest mb-1.5">
            <Target className="w-3.5 h-3.5" />
            <span>VARSITY COACHING COMMAND</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold uppercase tracking-tight text-white">
            COACH CONTROL DESK
          </h1>
          <p className="text-sm text-muted mt-1 font-sans">
            Oversee athlete development vectors, conduct formal performance evaluations, and dispatch conditioning clinics.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start lg:self-auto">
          <button
            onClick={() => navigate('/coach/training')}
            data-cursor="CLINIC"
            className="px-5 py-3 bg-primary hover:bg-primary/90 text-black font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>SCHEDULE CLINIC</span>
          </button>
          <button
            onClick={() => navigate('/coach/assessments')}
            data-cursor="EVALUATE"
            className="px-5 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-mono font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-2"
          >
            <TrendingUp className="w-4 h-4 text-primary" />
            <span>EVALUATE ATHLETE</span>
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card-panel p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-muted">ASSIGNED ATHLETES</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="text-3xl font-display font-bold text-white uppercase">{metrics.total_assigned_students} ROSTERED</div>
          <p className="text-[11px] font-mono text-muted">DIRECT COACHING SUPERVISION</p>
        </div>

        <div className="card-panel p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-muted">TRAINING SESSIONS</span>
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <div className="text-3xl font-display font-bold text-white uppercase">{metrics.active_sessions_count} ACTIVE</div>
          <p className="text-[11px] font-mono text-emerald-400">CAMPUS ARENA CLINICS</p>
        </div>

        <div className="card-panel p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-muted">ROSTER ATTENDANCE</span>
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <div className="text-3xl font-display font-bold text-white uppercase">{metrics.average_attendance_rate}%</div>
          <p className="text-[11px] font-mono text-primary flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> PRACTICE TURNOUT
          </p>
        </div>

        <div className="card-panel p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-muted">SQUAD MEAN RATING</span>
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div className="text-3xl font-display font-bold text-white uppercase">{metrics.average_skill_rating} / 10</div>
          <p className="text-[11px] font-mono text-muted">VERIFIED DRILL SCORES</p>
        </div>
      </div>

      {/* CORE COACH QUESTION: How are my athletes progressing? */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <div className="text-[10px] font-mono text-primary uppercase tracking-widest">
              DEVELOPMENT CLASSIFICATION
            </div>
            <h2 className="text-2xl font-display font-bold uppercase tracking-tight text-white mt-0.5">
              HOW ARE MY ATHLETES PROGRESSING?
            </h2>
          </div>
          <button
            onClick={() => navigate('/coach/students')}
            className="text-xs font-mono font-bold text-primary hover:text-white uppercase tracking-wider flex items-center gap-1"
          >
            <span>FULL ROSTER</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Rapidly Improving */}
          <div className="card-panel p-6 sm:p-8 border-emerald-500/30 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs uppercase font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>RAPID ACCELERATION</span>
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 border border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                HIGH CONCURRENCY
              </span>
            </div>

            <div className="space-y-3">
              {improvingStudents.length === 0 ? (
                <p className="text-xs font-mono text-muted">No athletes categorized yet.</p>
              ) : (
                improvingStudents.map(s => (
                  <div
                    key={s.id}
                    className="p-4 bg-black/60 border border-white/10 flex items-center justify-between text-xs font-mono"
                  >
                    <div>
                      <div className="font-bold uppercase text-white">{s.name}</div>
                      <div className="text-[10px] text-muted">{s.preferred_sport || 'Football'} • TIER: {s.skill_level}</div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-400">{s.attendance_rate || 90}% ATTENDANCE</span>
                      <div className="text-[10px] text-muted">RATING: {s.latest_rating || 8.5}/10</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Athletes Needing Attention */}
          <div className="card-panel p-6 sm:p-8 border-amber-500/30 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-mono text-xs uppercase font-bold">
                <AlertCircle className="w-4 h-4" />
                <span>DRILL REINFORCEMENT REQUIRED</span>
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 border border-amber-500/30 text-amber-400 bg-amber-500/10">
                ATTENTION FOCUS
              </span>
            </div>

            <div className="space-y-3">
              {attentionStudents.length === 0 ? (
                <div className="p-4 bg-black/60 border border-white/10 text-xs font-mono text-muted text-center">
                  All assigned athletes are sustaining peak attendance and assessment scores.
                </div>
              ) : (
                attentionStudents.map(s => (
                  <div
                    key={s.id}
                    className="p-4 bg-black/60 border border-white/10 flex items-center justify-between text-xs font-mono"
                  >
                    <div>
                      <div className="font-bold uppercase text-white">{s.name}</div>
                      <div className="text-[10px] text-muted">{s.preferred_sport || 'Football'} • FOCUS: STAMINA</div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-amber-400">{s.attendance_rate || 65}% ATTENDANCE</span>
                      <div className="text-[10px] text-muted">DRILL GAP</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Upcoming Sessions Quick Access */}
      <div className="card-panel p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <div className="text-[10px] font-mono text-primary uppercase tracking-widest">SCHEDULE MATRIX</div>
            <h2 className="text-2xl font-display font-bold uppercase tracking-tight text-white mt-0.5">
              UPCOMING CLINIC SESSIONS
            </h2>
          </div>
          <button
            onClick={() => navigate('/coach/training')}
            className="text-xs font-mono font-bold text-primary hover:text-white uppercase tracking-wider flex items-center gap-1"
          >
            <span>ALL CLINICS</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {todaySessions.map(s => (
            <div key={s.id} className="p-5 bg-black/60 border border-white/10 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 border border-primary/30 text-primary bg-primary/10">
                    {s.sport_name}
                  </span>
                  <span className="text-xs font-mono text-muted">{s.session_date}</span>
                </div>
                <div>
                  <h4 className="text-xl font-display font-bold uppercase tracking-tight text-white">{s.title}</h4>
                  <p className="text-xs font-mono text-muted mt-1">{s.start_time} - {s.end_time} • {s.venue || 'Campus Arena'}</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/coach/training')}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white font-mono font-bold text-xs uppercase tracking-wider border border-white/10 transition-colors"
              >
                OPEN SESSION ROSTER
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
