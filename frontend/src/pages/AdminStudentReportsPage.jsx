import React, { useState, useEffect } from 'react';
import { 
  FileText, Search, Download, Users, Trophy, 
  Calendar, CheckCircle2, ShieldCheck, Mail, ArrowUpRight 
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

export const AdminStudentReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const { addToast } = useNotification();

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/students/reports');
      setReports(res.data);
    } catch (err) {
      addToast('Failed to load student reports', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (reports.length === 0) return;
    const headers = ['ID', 'Name', 'Email', 'Sport', 'Tier', 'Bookings', 'Attendance%', 'Medals', 'ActiveRentals', 'AssignedCoach'];
    const rows = filteredReports.map(r => [
      r.id,
      `"${r.name}"`,
      `"${r.email}"`,
      `"${r.preferred_sport || ''}"`,
      `"${r.skill_level || ''}"`,
      r.total_bookings,
      r.attendance_rate,
      r.medals_count,
      r.active_rentals,
      `"${r.assigned_coach || 'None'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `campus_athletics_student_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Exported student report CSV!', 'success');
  };

  const filteredReports = reports.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.preferred_sport && r.preferred_sport.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-widest mb-1.5">
            <FileText className="w-3.5 h-3.5" />
            <span>INSTITUTIONAL ATHLETIC INTELLIGENCE</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold uppercase tracking-tight text-white">
            STUDENT ATHLETE REPORTS
          </h1>
          <p className="text-sm text-muted mt-1 font-sans">
            Comprehensive participation records, court usage, medals, and gear compliance metrics.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          data-cursor="EXPORT"
          className="px-6 py-3 bg-white/5 hover:bg-primary text-white hover:text-black border border-white/10 hover:border-primary font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 self-start md:self-auto"
        >
          <Download className="w-4 h-4 text-primary" />
          <span>EXPORT CSV REPORT</span>
        </button>
      </div>

      {/* Reports Table Card */}
      <div className="card-panel p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="text-xs font-mono text-muted uppercase">
            REGISTERED STUDENT ATHLETES ({filteredReports.length})
          </div>

          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="SEARCH ATHLETES..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-black/60 border border-white/10 text-xs font-mono text-white placeholder-white/30 focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(n => (
              <div key={n} className="h-14 bg-white/5 animate-pulse"></div>
            ))}
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-12 text-center text-muted font-mono text-xs space-y-2">
            <FileText className="w-8 h-8 mx-auto text-white/20" />
            <p>NO STUDENT RECORDS MATCH QUERY</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono text-white">
              <thead className="bg-black/60 text-muted uppercase text-[10px] tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">ATHLETE PROFILE</th>
                  <th className="py-3 px-4">DISCIPLINE</th>
                  <th className="py-3 px-4 text-center">BOOKINGS</th>
                  <th className="py-3 px-4 text-center">ATTENDANCE</th>
                  <th className="py-3 px-4 text-center">MEDALS</th>
                  <th className="py-3 px-4 text-center">ACTIVE LOANS</th>
                  <th className="py-3 px-4 text-right">ASSIGNED COACH</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredReports.map(student => (
                  <tr key={student.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-bold text-white uppercase text-sm font-sans">{student.name}</div>
                      <div className="text-[10px] text-muted flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3 text-primary" />
                        <span>{student.email}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="font-bold uppercase text-white">{student.preferred_sport || 'General'}</div>
                      <span className="text-[9px] uppercase px-1.5 py-0.5 border border-white/10 text-muted mt-0.5 inline-block">
                        {student.skill_level || 'STUDENT'}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-center font-bold text-white">
                      {student.total_bookings}
                    </td>

                    <td className="py-4 px-4 text-center">
                      <span className="font-bold text-emerald-400">
                        {student.attendance_rate}%
                      </span>
                    </td>

                    <td className="py-4 px-4 text-center">
                      {student.medals_count > 0 ? (
                        <span className="font-bold px-2 py-0.5 border border-amber-500/30 text-amber-400 bg-amber-500/10">
                          🏅 {student.medals_count}
                        </span>
                      ) : (
                        <span className="text-white/20">-</span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-center">
                      {student.active_rentals > 0 ? (
                        <span className="font-bold text-primary">
                          {student.active_rentals} CHECKED OUT
                        </span>
                      ) : (
                        <span className="text-white/20">NONE</span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-right font-medium text-muted uppercase">
                      {student.assigned_coach || <span className="text-white/30">UNASSIGNED</span>}
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
