import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { User, Mail, Lock, ShieldCheck, RefreshCw, ArrowLeft, CheckCircle, Sparkles, Trophy } from 'lucide-react';

// ─── OTP Input Component ───────────────────────────────────────────────────
function OTPInput({ value, onChange, disabled }) {
  const inputs = useRef([]);
  const digits = value.split('');

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace') {
      if (digits[idx]) {
        const next = [...digits];
        next[idx] = '';
        onChange(next.join(''));
      } else if (idx > 0) {
        inputs.current[idx - 1]?.focus();
        const next = [...digits];
        next[idx - 1] = '';
        onChange(next.join(''));
      }
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      inputs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowRight' && idx < 5) {
      inputs.current[idx + 1]?.focus();
    }
  };

  const handleChange = (idx, e) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) return;
    const char = val[val.length - 1];
    const next = [...digits];
    next[idx] = char;
    if (val.length > 1) {
      const pasted = val.slice(0, 6);
      const filled = pasted.split('');
      for (let i = 0; i < filled.length && idx + i < 6; i++) {
        next[idx + i] = filled[i];
      }
      onChange(next.join(''));
      const focusIdx = Math.min(idx + val.length, 5);
      inputs.current[focusIdx]?.focus();
      return;
    }
    onChange(next.join(''));
    if (idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = Array(6).fill('');
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    onChange(next.join(''));
    const focusIdx = Math.min(pasted.length, 5);
    inputs.current[focusIdx]?.focus();
  };

  return (
    <div className="flex gap-2 sm:gap-3 justify-center">
      {Array(6).fill(0).map((_, idx) => (
        <input
          key={idx}
          ref={el => inputs.current[idx] = el}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[idx] || ''}
          disabled={disabled}
          onChange={e => handleChange(idx, e)}
          onKeyDown={e => handleKeyDown(idx, e)}
          onPaste={handlePaste}
          onFocus={e => e.target.select()}
          className={`w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl font-mono font-black border transition-all outline-none rounded-none ${
            digits[idx]
              ? 'bg-[#FF4D00]/10 border-[#FF4D00] text-[#FF4D00] shadow-lg shadow-[#FF4D00]/10'
              : 'bg-[#080808] border-white/15 text-[#F2F0EB] focus:border-[#FF4D00]'
          }`}
        />
      ))}
    </div>
  );
}

// ─── Countdown Timer ────────────────────────────────────────────────────────
function CountdownTimer({ seconds, onExpire }) {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    setRemaining(seconds);
    const interval = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onExpire?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [seconds]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const pct = (remaining / seconds) * 100;
  const isWarning = remaining < 120;

  return (
    <div className="text-center mb-2">
      <div className={`inline-flex items-center gap-2 px-4 py-1.5 border font-mono text-xs font-bold uppercase tracking-widest ${
        isWarning
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          : 'bg-[#FF4D00]/10 border-[#FF4D00]/30 text-[#FF4D00]'
      }`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
        <span>
          {remaining === 0
            ? 'OTP EXPIRED'
            : `${mins}:${String(secs).padStart(2, '0')} REMAINING`}
        </span>
      </div>
      {/* progress bar */}
      <div className="mt-2 h-1 bg-white/10 overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ${
            isWarning ? 'bg-amber-500' : 'bg-[#FF4D00]'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Main SignupPage Component ───────────────────────────────────────────────
export const SignupPage = () => {
  const [step, setStep] = useState('form'); // 'form' | 'otp' | 'success'

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [skillLevel, setSkillLevel] = useState('Intermediate');
  const [preferredSport, setPreferredSport] = useState('Badminton');

  const [otp, setOtp] = useState('');
  const [otpExpiresIn, setOtpExpiresIn] = useState(600);
  const [otpExpired, setOtpExpired] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [loading, setLoading] = useState(false);

  const { sendOtp, register } = useAuth();
  const { addToast } = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await sendOtp(name, email, password, skillLevel, preferredSport);
      setOtpExpiresIn(res.expires_in_seconds || 600);
      setOtpExpired(false);
      setOtp('');
      setStep('otp');
      addToast(`Verification code sent to ${email}`, 'success');
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to send verification code', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    try {
      const res = await sendOtp(name, email, password, skillLevel, preferredSport);
      setOtpExpiresIn(res.expires_in_seconds || 600);
      setOtpExpired(false);
      setOtp('');
      setResendCooldown(60);
      addToast('New verification code sent to your email!', 'success');
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to resend code', 'error');
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      addToast('Please enter the full 6-digit code', 'error');
      return;
    }
    setLoading(true);
    try {
      const u = await register(email, otp);
      setStep('success');
      addToast(`Welcome to Campus Sports Hub, ${u.name}! 🎉`, 'success');
      setTimeout(() => navigate('/app'), 1500);
    } catch (err) {
      addToast(err.response?.data?.detail || 'Verification failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const Header = () => (
    <div className="text-center mb-6">
      <Link to="/" className="inline-flex items-center gap-3 mb-2" data-cursor="HOME">
        <div className="w-10 h-10 bg-[#FF4D00] flex items-center justify-center shadow-xl shadow-[#FF4D00]/20">
          <span className="font-mono text-xs font-black text-black">CSH</span>
        </div>
      </Link>
      <h1 className="font-display font-black text-3xl uppercase tracking-wider text-[#F2F0EB]">
        {step === 'form' && 'REGISTER ATHLETE ACCOUNT'}
        {step === 'otp' && 'VERIFY COLLEGE EMAIL'}
        {step === 'success' && 'ACCOUNT ACTIVATED 🎉'}
      </h1>
      <p className="font-mono text-[10px] tracking-widest text-[#888880] uppercase mt-1">
        {step === 'form' && 'JOIN CAMPUS SPORTS HUB FOR LIVE COURT RESERVATIONS'}
        {step === 'otp' && `ENTER 6-DIGIT CODE SENT TO ${email.toUpperCase()}`}
        {step === 'success' && 'REDIRECTING TO ATHLETE DASHBOARD...'}
      </p>
    </div>
  );

  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[
        { n: 1, label: 'DETAILS' },
        { n: 2, label: 'VERIFY' },
      ].map(({ n, label }, i) => {
        const isActive = (step === 'form' && n === 1) || (step === 'otp' && n === 2) || step === 'success';
        const isDone = (step === 'otp' && n === 1) || step === 'success';
        return (
          <React.Fragment key={n}>
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 flex items-center justify-center font-mono text-[10px] font-bold border ${
                isDone
                  ? 'bg-[#FF4D00] border-[#FF4D00] text-black'
                  : isActive
                  ? 'border-[#FF4D00] text-[#FF4D00] bg-[#FF4D00]/10'
                  : 'border-white/20 text-[#888880]'
              }`}>
                {isDone ? '✓' : n}
              </div>
              <span className={`font-mono text-[10px] tracking-widest font-bold ${
                isDone || isActive ? 'text-[#F2F0EB]' : 'text-[#888880]'
              }`}>
                {label}
              </span>
            </div>
            {i < 1 && <div className="w-8 h-px bg-white/10" />}
          </React.Fragment>
        );
      })}
    </div>
  );

  // ── Form Step ──
  if (step === 'form') {
    return (
      <div className="min-h-screen bg-[#080808] text-[#F2F0EB] flex items-center justify-center p-4 selection:bg-[#FF4D00] selection:text-black">
        <div className="w-full max-w-md">
          <Header />
          <div className="p-6 sm:p-8 bg-[#111111] border border-white/10 shadow-2xl">
            <StepIndicator />
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block font-mono text-[10px] font-bold tracking-widest text-[#888880] uppercase mb-1.5">FULL NAME</label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#888880] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Aryan Mishra"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#080808] border border-white/10 text-sm font-mono text-[#F2F0EB] focus:outline-none focus:border-[#FF4D00] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-[10px] font-bold tracking-widest text-[#888880] uppercase mb-1.5">COLLEGE EMAIL</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#888880] absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="aryan@campus.edu"
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
                    minLength={6}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#080808] border border-white/10 text-sm font-mono text-[#F2F0EB] focus:outline-none focus:border-[#FF4D00] transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[10px] font-bold tracking-widest text-[#888880] uppercase mb-1.5">SKILL LEVEL</label>
                  <select
                    value={skillLevel}
                    onChange={e => setSkillLevel(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#080808] border border-white/10 text-xs font-mono text-[#F2F0EB] focus:outline-none focus:border-[#FF4D00]"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="block font-mono text-[10px] font-bold tracking-widest text-[#888880] uppercase mb-1.5">PRIMARY SPORT</label>
                  <select
                    value={preferredSport}
                    onChange={e => setPreferredSport(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#080808] border border-white/10 text-xs font-mono text-[#F2F0EB] focus:outline-none focus:border-[#FF4D00]"
                  >
                    <option>Badminton</option>
                    <option>Football</option>
                    <option>Basketball</option>
                    <option>Tennis</option>
                    <option>Volleyball</option>
                    <option>Cricket</option>
                    <option>Gym</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                data-cursor="VERIFY"
                className="w-full py-3 bg-[#FF4D00] hover:bg-[#FF6422] text-black font-mono font-bold text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2 mt-3"
              >
                {loading ? (
                  <span>SENDING VERIFICATION CODE...</span>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>SEND VERIFICATION OTP</span>
                  </>
                )}
              </button>
            </form>

            <p className="text-center font-mono text-xs text-[#888880] mt-6">
              ALREADY REGISTERED?{' '}
              <Link to="/login" className="text-[#FF4D00] font-bold hover:underline">
                SIGN IN
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── OTP Step ──
  if (step === 'otp') {
    return (
      <div className="min-h-screen bg-[#080808] text-[#F2F0EB] flex items-center justify-center p-4 selection:bg-[#FF4D00] selection:text-black">
        <div className="w-full max-w-md">
          <Header />
          <div className="p-6 sm:p-8 bg-[#111111] border border-white/10 shadow-2xl">
            <StepIndicator />

            {/* Email strip */}
            <div className="flex items-center gap-3 p-3 bg-[#080808] border border-white/10 mb-5">
              <Mail className="w-4 h-4 text-[#FF4D00] shrink-0" />
              <div className="truncate">
                <span className="font-mono text-[9px] text-[#888880] uppercase tracking-wider block">CODE SENT TO</span>
                <span className="font-mono text-xs font-bold text-[#F2F0EB] truncate">{email}</span>
              </div>
            </div>

            <CountdownTimer seconds={otpExpiresIn} onExpire={() => setOtpExpired(true)} />

            <form onSubmit={handleVerify} className="mt-6 space-y-6">
              <div>
                <label className="block text-center font-mono text-[10px] font-bold tracking-widest text-[#888880] uppercase mb-3">
                  ENTER 6-DIGIT VERIFICATION CODE
                </label>
                <OTPInput value={otp} onChange={setOtp} disabled={loading || otpExpired} />
              </div>

              {otpExpired && (
                <p className="text-center text-xs font-mono font-bold text-rose-400">
                  CODE EXPIRED. PLEASE REQUEST A NEW ONE.
                </p>
              )}

              <button
                type="submit"
                disabled={loading || otpExpired || otp.length !== 6}
                data-cursor="CONFIRM"
                className="w-full py-3 bg-[#FF4D00] hover:bg-[#FF6422] disabled:opacity-40 disabled:hover:bg-[#FF4D00] text-black font-mono font-bold text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span>VERIFYING CODE...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>VERIFY &amp; ACTIVATE ACCOUNT</span>
                  </>
                )}
              </button>
            </form>

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10 text-xs font-mono">
              <button
                onClick={() => setStep('form')}
                className="text-[#888880] hover:text-[#F2F0EB] flex items-center gap-1.5 uppercase"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>EDIT DETAILS</span>
              </button>

              <button
                onClick={handleResend}
                disabled={resendCooldown > 0 || resending}
                className="text-[#FF4D00] hover:underline disabled:opacity-40 flex items-center gap-1.5 uppercase font-bold"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{resending ? 'SENDING...' : resendCooldown > 0 ? `RESEND IN ${resendCooldown}S` : 'RESEND OTP'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Success Step ──
  return (
    <div className="min-h-screen bg-[#080808] text-[#F2F0EB] flex items-center justify-center p-4 selection:bg-[#FF4D00] selection:text-black">
      <div className="w-full max-w-md">
        <div className="p-8 bg-[#111111] border border-white/10 text-center space-y-4">
          <div className="w-16 h-16 bg-[#FF4D00]/10 border-2 border-[#FF4D00] flex items-center justify-center mx-auto text-[#FF4D00]">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h2 className="font-display font-black text-2xl uppercase tracking-wider text-[#F2F0EB]">
            ACCOUNT ACTIVATED
          </h2>
          <p className="font-mono text-xs text-[#888880] uppercase tracking-wider">
            REDIRECTING TO YOUR ATHLETE DASHBOARD...
          </p>
        </div>
      </div>
    </div>
  );
};

