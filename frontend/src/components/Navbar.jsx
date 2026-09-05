import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bell, LogOut, Shield, Award, Sparkles, Activity } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const getHomeRoute = () => {
    if (user?.role === 'ADMIN') return '/admin';
    if (user?.role === 'COACH') return '/coach';
    return '/app';
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#080808]/90 backdrop-blur-xl px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link to={getHomeRoute()} className="flex items-center gap-3 group" data-cursor="HOME">
          <div className="w-8 h-8 bg-[#FF4D00] flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
            <span className="text-[10px] font-mono font-black text-black leading-none tracking-tighter">CSH</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-black text-lg text-[#F2F0EB] tracking-wider uppercase">CAMPUS SPORTS HUB</span>
              <span className="hidden sm:inline-block text-[9px] px-1.5 py-0.2 rounded-none font-mono font-bold bg-[#FF4D00]/15 text-[#FF4D00] border border-[#FF4D00]/30 tracking-widest">
                OS
              </span>
            </div>
            <p className="text-[9px] font-mono text-[#888880] tracking-widest uppercase hidden sm:block">
              ATHLETIC PERFORMANCE & INFRASTRUCTURE
            </p>
          </div>
        </Link>

        {/* Right Action Icons & User Info */}
        <div className="flex items-center gap-3 sm:gap-4">
          
          {/* Role Badge */}
          {user && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-[#111111] border border-white/10 text-[10px] font-mono tracking-widest text-[#F2F0EB]">
              <span className="text-[#888880]">ROLE:</span>
              <span className={`font-bold flex items-center gap-1 ${
                user.role === 'ADMIN' ? 'text-amber-400' : user.role === 'COACH' ? 'text-indigo-400' : 'text-[#FF4D00]'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                {user.role}
              </span>
            </div>
          )}

          {/* Notifications Link */}
          {user && user.role === 'STUDENT' && (
            <Link 
              to="/app/notifications" 
              className="relative p-2 text-[#888880] hover:text-[#F2F0EB] hover:bg-white/5 transition-colors"
              data-cursor="ALERTS"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FF4D00]"></span>
            </Link>
          )}

          {/* User Profile / Logout */}
          {user ? (
            <div className="flex items-center gap-3 pl-3 border-l border-white/10">
              <div className="hidden md:block text-right">
                <p className="text-xs font-mono font-bold text-[#F2F0EB] uppercase tracking-wider">{user.name}</p>
                <p className="text-[10px] font-mono text-[#888880] tracking-tight">{user.email}</p>
              </div>
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="px-3 py-1.5 border border-white/10 text-[10px] font-mono tracking-widest text-[#888880] hover:text-[#FF4D00] hover:border-[#FF4D00]/50 transition-all uppercase"
                title="Logout"
                data-cursor="EXIT"
              >
                EXIT
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="px-4 py-2 bg-[#FF4D00] hover:bg-[#FF6422] text-black font-mono font-bold text-[11px] tracking-widest uppercase transition-colors"
              data-cursor="LOGIN"
            >
              SIGN IN
            </Link>
          )}

        </div>

      </div>
    </header>
  );
};

