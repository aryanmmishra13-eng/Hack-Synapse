import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, Activity, CalendarCheck, Users, Gamepad2, Bell, User, 
  LayoutDashboard, Building2, BarChart3, Sliders, Wrench, Sparkles,
  Trophy, Package, TrendingUp, Medal, FileText, Flame, ClipboardList, Award
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar = () => {
  const { user } = useAuth();
  const role = user?.role || 'STUDENT';

  const studentLinks = [
    { to: '/app', label: 'HOME DASHBOARD', icon: Home, end: true },
    { to: '/app/sports', label: 'BOOK COURTS & SPORTS', icon: Activity },
    { to: '/app/equipment', label: 'EQUIPMENT & GEAR', icon: Package, badge: 'GEAR' },
    { to: '/app/tournaments', label: 'TOURNAMENTS & LEAGUES', icon: Trophy },
    { to: '/app/training', label: 'TRAINING SESSIONS', icon: Award },
    { to: '/app/my-stats', label: 'ACTIVITY & FITNESS', icon: Flame },
    { to: '/app/performance', label: 'SKILL PERFORMANCE', icon: TrendingUp },
    { to: '/app/awards', label: 'TROPHY CABINET', icon: Medal },
    { to: '/app/play-now', label: 'PLAY NOW (LIVE)', icon: Gamepad2, badge: 'LIVE' },
    { to: '/app/find-players', label: 'FIND PLAYERS', icon: Users },
    { to: '/app/my-bookings', label: 'MY BOOKINGS & PASS', icon: CalendarCheck },
    { to: '/app/profile', label: 'ATHLETE PROFILE', icon: User },
  ];

  const coachLinks = [
    { to: '/coach', label: 'COACH DASHBOARD', icon: LayoutDashboard, end: true },
    { to: '/coach/students', label: 'ATHLETES ROSTER', icon: Users },
    { to: '/coach/training', label: 'TRAINING SESSIONS', icon: CalendarCheck },
    { to: '/coach/assessments', label: 'SKILL ASSESSMENTS', icon: ClipboardList },
    { to: '/coach/tournaments', label: 'TOURNAMENTS & MATCHES', icon: Trophy },
    { to: '/coach/profile', label: 'COACH PROFILE', icon: User },
  ];

  const adminLinks = [
    { to: '/admin', label: 'OPERATIONS DASHBOARD', icon: LayoutDashboard, end: true },
    { to: '/admin/equipment', label: 'EQUIPMENT INVENTORY', icon: Package, badge: 'GEAR' },
    { to: '/admin/tournaments', label: 'TOURNAMENTS & BRACKETS', icon: Trophy },
    { to: '/admin/coaches', label: 'COACH MANAGEMENT', icon: Award },
    { to: '/admin/students', label: 'STUDENT REPORTS', icon: FileText },
    { to: '/admin/sports-overview', label: 'SPORTS & WEATHER', icon: Activity },
    { to: '/admin/occupancy', label: 'OCCUPANCY MONITOR', icon: Building2 },
    { to: '/admin/analytics', label: 'DEMAND ANALYTICS & AI', icon: BarChart3 },
    { to: '/admin/simulator', label: 'WHAT-IF SIMULATOR', icon: Sparkles, badge: 'AI' },
    { to: '/admin/allocation', label: 'FAIR ALLOCATION CONFIG', icon: Sliders },
    { to: '/admin/maintenance', label: 'MAINTENANCE SCHEDULER', icon: Wrench },
  ];

  const links = role === 'ADMIN' ? adminLinks : role === 'COACH' ? coachLinks : studentLinks;
  const roleCode = role === 'ADMIN' ? '// ADMIN CONSOLE' : role === 'COACH' ? '// COACH PORTAL' : '// STUDENT HUB';

  return (
    <aside className="w-64 bg-[#080808] border-r border-white/10 shrink-0 hidden md:flex flex-col justify-between p-4 min-h-[calc(100vh-65px)]">
      <div className="space-y-4">
        <div>
          <div className="px-3 flex items-center justify-between">
            <span className="font-mono text-[10px] tracking-[0.2em] text-[#888880] uppercase">
              {roleCode}
            </span>
          </div>
          <nav className="mt-3 space-y-0.5 max-h-[calc(100vh-210px)] overflow-y-auto pr-1 no-scrollbar">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  data-cursor="SELECT"
                  className={({ isActive }) =>
                    `group flex items-center justify-between px-3 py-2.5 rounded-none font-mono text-[11px] tracking-wider transition-all duration-150 ${
                      isActive
                        ? 'bg-[#161616] text-[#F2F0EB] border-l-2 border-[#FF4D00]'
                        : 'text-[#888880] hover:text-[#F2F0EB] hover:bg-white/[0.03]'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className="w-3.5 h-3.5 shrink-0 group-hover:text-[#FF4D00] transition-colors" />
                    <span className="truncate uppercase">{link.label}</span>
                  </div>
                  {link.badge && (
                    <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 bg-[#FF4D00]/10 text-[#FF4D00] border border-[#FF4D00]/20 shrink-0">
                      {link.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer Terminal Card */}
      <div className="p-3 bg-[#111111] border border-white/10 text-xs text-[#888880] mt-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5 text-[#FF4D00] font-mono text-[10px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D00] animate-pulse" />
            <span>ATHLETICS OS</span>
          </div>
          <span className="font-mono text-[9px] text-[#888880]">v2.4.0</span>
        </div>
        <p className="font-mono text-[9px] text-[#888880] leading-relaxed">
          REAL-TIME BOOKING & METRIC ENGINE
        </p>
      </div>
    </aside>
  );
};

