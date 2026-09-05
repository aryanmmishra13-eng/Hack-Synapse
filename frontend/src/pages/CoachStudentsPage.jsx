import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Search, Award, TrendingUp, CheckCircle, 
  Calendar, ArrowRight, ShieldCheck, Mail, Sparkles 
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

export const CoachStudentsPage = () => {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const { addToast } = useNotification();

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/coaches/students');
      setStudents(res.data);
    } catch (err) {
      addToast('Failed to load athlete roster', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.preferred_sport && s.preferred_sport.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-widest mb-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>ATHLETE MANAGEMENT PROTOCOL</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold uppercase tracking-tight text-white">
            ASSIGNED ATHLETE ROSTER
          </h1>
          <p className="text-sm text-muted mt-1 font-sans">
            Directly supervise athlete attendance consistency, biometric evaluation history, and skill trajectory.
          </p>
        </div>

        {/* Search */}
        <div className="w-full md:w-72">
          <input
            type="text"
            placeholder="FILTER ATHLETES..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2.5 bg-black/60 border border-white/10 text-xs font-mono text-white placeholder-white/30 focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Athletes Table Card */}
      <div className="card-panel p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <span className="text-xs font-mono text-muted uppercase">
            ACTIVE STUDENT ATHLETES ({filteredStudents.length})
          </span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(n => (
              <div key={n} className="h-16 bg-white/5 animate-pulse"></div>
            ))}
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-muted font-mono text-xs space-y-2">
            <Users className="w-8 h-8 mx-auto text-white/20" />
            <p>NO ATHLETE FOUND MATCHING CRITERIA</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono text-white">
              <thead className="bg-black/60 text-muted uppercase text-[10px] tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">ATHLETE</th>
                  <th className="py-3 px-4">DISCIPLINE</th>
                  <th className="py-3 px-4 text-center">ATTENDANCE</th>
                  <th className="py-3 px-4 text-center">LATEST RATING</th>
                  <th className="py-3 px-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredStudents.map(student => (
                  <tr key={student.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-bold text-white uppercase text-sm font-sans">{student.name}</div>
                      <div className="text-[10px] text-muted flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3 text-primary" />
                        <span>{student.email}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="font-bold uppercase text-white">{student.preferred_sport || 'Football'}</div>
                      <span className="text-[9px] uppercase px-1.5 py-0.5 border border-white/10 text-muted mt-0.5 inline-block">
                        {student.skill_level || 'VARSITY'}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <span className="font-bold text-emerald-400">
                        {student.attendance_rate || 90}%
                      </span>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <span className="font-bold px-2.5 py-1 border border-primary/30 text-primary bg-primary/10">
                        {student.latest_rating ? `${student.latest_rating.toFixed(1)} / 10` : '8.5 / 10'}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => navigate('/coach/assessments', { state: { targetStudent: student } })}
                        data-cursor="EVALUATE"
                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-black font-bold uppercase text-xs tracking-wider transition-all inline-flex items-center gap-1.5"
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>EVALUATE</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
