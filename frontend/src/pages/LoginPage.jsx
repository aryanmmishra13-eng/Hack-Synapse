import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Mail, Lock, LogIn, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { addToast } = useNotification();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(email, password);
      addToast(`Welcome back, ${u.name}!`, 'success');
      if (u.role === 'ADMIN') {
        navigate('/admin');
      } else if (u.role === 'COACH') {
        navigate('/coach');
      } else {
        navigate('/app');
      }
    } catch (err) {
      addToast(err.response?.data?.detail || 'Invalid email or password', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoStudent = () => {
    setEmail('student@campus.com');
    setPassword('password123');
  };

  const fillDemoCoach = () => {
    setEmail('coach.rahul@campus.com');
    setPassword('coach123');
  };

  const fillDemoAdmin = () => {
    setEmail('admin@campus.com');
    setPassword('admin123');
  };

  return (
    <div className="min-h-screen bg-[#080808] text-[#F2F0EB] flex items-center justify-center p-4 selection:bg-[#FF4D00] selection:text-black">
      <div className="w-full max-w-md space-y-6">
        
        {/* Header Logo */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-3" data-cursor="HOME">
            <div className="w-10 h-10 bg-[#FF4D00] flex items-center justify-center shadow-xl shadow-[#FF4D00]/20">
              <span className="font-mono text-xs font-black text-black">CSH</span>
            </div>
          </Link>
          <h1 className="font-display font-black text-3xl uppercase tracking-wider text-[#F2F0EB]">
            SIGN IN TO CAMPUS SPORTS HUB
          </h1>
          <p className="font-mono text-[10px] tracking-widest text-[#888880] uppercase">
            ATHLETIC BOOKINGS & PERFORMANCE PLATFORM
          </p>
        </div>

        {/* Demo Credentials Quick Fill Banner */}
        <div className="p-4 bg-[#111111] border border-white/10 space-y-2.5">
          <p className="font-mono text-[10px] font-bold tracking-widest text-[#F2F0EB] flex items-center gap-1.5 uppercase">
            <Sparkles className="w-3.5 h-3.5 text-[#FF4D00]" />
            ONE-CLICK DEMO ACCESS
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={fillDemoStudent}
              data-cursor="FILL"
              className="p-2.5 bg-[#161616] border border-white/10 hover:border-[#FF4D00] text-left transition-colors"
            >
              <div className="font-mono text-[10px] font-bold text-[#FF4D00] uppercase">STUDENT</div>
              <div className="font-mono text-[9px] text-[#888880] truncate">student@campus.com</div>
            </button>
            <button
              type="button"
              onClick={fillDemoCoach}
              data-cursor="FILL"
              className="p-2.5 bg-[#161616] border border-white/10 hover:border-indigo-400 text-left transition-colors"
            >
              <div className="font-mono text-[10px] font-bold text-indigo-400 uppercase">COACH</div>
              <div className="font-mono text-[9px] text-[#888880] truncate">coach.rahul@campus.com</div>
            </button>
            <button
              type="button"
              onClick={fillDemoAdmin}
              data-cursor="FILL"
              className="p-2.5 bg-[#161616] border border-white/10 hover:border-amber-400 text-left transition-colors"
            >
              <div className="font-mono text-[10px] font-bold text-amber-400 uppercase">ADMIN</div>
              <div className="font-mono text-[9px] text-[#888880] truncate">admin@campus.com</div>
            </button>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="p-6 bg-[#111111] border border-white/10 shadow-2xl space-y-4">
          <div>
            <label className="block font-mono text-[10px] font-bold tracking-widest text-[#888880] uppercase mb-1.5">CAMPUS EMAIL</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#888880] absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@campus.com"
                className="w-full pl-10 pr-4 py-2.5 bg-[#080808] border border-white/10 text-sm font-mono text-[#F2F0EB] focus:outline-none focus:border-[#FF4D00] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block font-mono text-[10px] font-bold tracking-widest text-[#888880] uppercase mb-1.5">PASSWORD</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#888880] absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-[#080808] border border-white/10 text-sm font-mono text-[#F2F0EB] focus:outline-none focus:border-[#FF4D00] transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            data-cursor="SIGN IN"
            className="w-full py-3 font-mono font-bold text-xs tracking-widest uppercase bg-[#FF4D00] hover:bg-[#FF6422] text-black transition-all flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <span>AUTHENTICATING...</span>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>SIGN IN</span>
              </>
            )}
          </button>
        </form>

        <p className="text-center font-mono text-xs text-[#888880]">
          DON'T HAVE A STUDENT ACCOUNT?{' '}
          <Link to="/signup" className="text-[#FF4D00] font-bold hover:underline">
            REGISTER NOW
          </Link>
        </p>

      </div>
    </div>
  );
};

