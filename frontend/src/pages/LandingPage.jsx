import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, ArrowUpRight, ShieldCheck, Trophy, Sparkles, Activity, Users, Flame, Zap, Award } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Marquee } from '../components/Marquee';

const HERO_IMAGE = "https://images.unsplash.com/photo-1784881650480-f6e4ee94364b?w=1400&h=1800&fit=crop&auto=format";
const STADIUM_IMAGE = "https://images.unsplash.com/photo-1569531955323-33c6b2dca44b?w=1400&h=900&fit=crop&auto=format";

const sportsCatalog = [
  { id: "badminton", name: "BADMINTON", number: "01", facilities: 5, demand: "HIGH", available: 3, coach: "Rahul Sharma", image: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=700&fit=crop&auto=format" },
  { id: "football", name: "FOOTBALL", number: "02", facilities: 3, demand: "MEDIUM", available: 2, coach: "Vikram Singh", image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=700&fit=crop&auto=format" },
  { id: "basketball", name: "BASKETBALL", number: "03", facilities: 4, demand: "HIGH", available: 1, coach: "Priya Nair", image: "https://images.unsplash.com/photo-1546519638405-a2c34a3b88dd?w=700&fit=crop&auto=format" },
  { id: "tennis", name: "TENNIS", number: "04", facilities: 6, demand: "LOW", available: 5, coach: "Ananya Kapoor", image: "https://images.unsplash.com/photo-1599586120429-48281b6f0ece?w=700&fit=crop&auto=format" },
  { id: "cricket", name: "CRICKET", number: "05", facilities: 2, demand: "MEDIUM", available: 1, coach: "Suresh Patel", image: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=700&fit=crop&auto=format" },
  { id: "volleyball", name: "VOLLEYBALL", number: "06", facilities: 3, demand: "LOW", available: 3, coach: "Meera Joshi", image: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=700&fit=crop&auto=format" },
  { id: "tabletennis", name: "TABLE TENNIS", number: "07", facilities: 8, demand: "MEDIUM", available: 6, coach: "Arun Kumar", image: "https://images.unsplash.com/photo-1534158914592-062992fbe900?w=700&fit=crop&auto=format" },
];

export const LandingPage = () => {
  const { login } = useAuth();
  const { addToast } = useNotification();
  const navigate = useNavigate();

  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  const [hoveredSport, setHoveredSport] = useState(null);

  const handleDemoStudent = async () => {
    try {
      await login('student@campus.com', 'password123');
      addToast('Signed in as Student Aryan Mishra.', 'success');
      navigate('/app');
    } catch (err) {
      addToast('Failed to sign in demo student', 'error');
    }
  };

  const handleDemoCoach = async () => {
    try {
      await login('coach.rahul@campus.com', 'coach123');
      addToast('Signed in as Coach Rahul Sharma.', 'success');
      navigate('/coach');
    } catch (err) {
      addToast('Failed to sign in demo coach', 'error');
    }
  };

  const handleDemoAdmin = async () => {
    try {
      await login('admin@campus.com', 'admin123');
      addToast('Signed in as Campus Sports Administrator.', 'success');
      navigate('/admin');
    } catch (err) {
      addToast('Failed to sign in demo admin', 'error');
    }
  };

  return (
    <div className="bg-[#080808] text-[#F2F0EB] overflow-x-hidden selection:bg-[#FF4D00] selection:text-black">

      {/* Top Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-14 h-16 border-b border-white/10 bg-[#080808]/90 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#FF4D00] flex items-center justify-center">
            <span className="font-mono text-[10px] font-black text-black">CSH</span>
          </div>
          <span className="font-display font-black text-lg tracking-wider uppercase text-[#F2F0EB]">
            CAMPUS SPORTS HUB
          </span>
        </div>

        {/* Demo Quick Access */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleDemoStudent}
            data-cursor="STUDENT"
            className="px-3 py-1.5 border border-white/15 hover:border-[#FF4D00] hover:text-[#FF4D00] font-mono text-[10px] tracking-widest uppercase transition-all"
          >
            STUDENT
          </button>
          <button
            onClick={handleDemoCoach}
            data-cursor="COACH"
            className="px-3 py-1.5 border border-white/15 hover:border-indigo-400 hover:text-indigo-400 font-mono text-[10px] tracking-widest uppercase transition-all hidden sm:block"
          >
            COACH
          </button>
          <button
            onClick={handleDemoAdmin}
            data-cursor="ADMIN"
            className="px-3 py-1.5 border border-white/15 hover:border-amber-400 hover:text-amber-400 font-mono text-[10px] tracking-widest uppercase transition-all hidden sm:block"
          >
            ADMIN
          </button>
          <button
            onClick={() => navigate('/login')}
            data-cursor="SIGN IN"
            className="px-5 py-1.5 bg-[#FF4D00] hover:bg-[#FF6422] text-black font-mono font-bold text-[10px] tracking-widest uppercase transition-colors"
          >
            LOGIN
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section ref={heroRef} className="relative h-screen min-h-[700px] flex items-end overflow-hidden pt-16">
        
        {/* Background Parallax */}
        <motion.div className="absolute inset-0 z-0" style={{ y: imgY }}>
          <img
            src={HERO_IMAGE}
            alt="University Athlete in action"
            className="w-full h-full object-cover object-top opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#080808] via-[#080808]/70 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#080808] to-transparent" />
        </motion.div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 z-0 pointer-events-none grid-bg opacity-40" />

        {/* Hero Content */}
        <motion.div
          className="relative z-10 w-full px-6 md:px-14 pb-14 max-w-7xl mx-auto"
          style={{ y: textY, opacity: heroOpacity }}
        >
          {/* Status strip */}
          <div className="flex items-center gap-4 mb-6">
            <span className="font-mono text-[10px] tracking-[0.2em] text-[#888880]">
              SPORTS COMPLEX // 06:00–22:00
            </span>
            <div className="h-px w-8 bg-white/20" />
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-[10px] tracking-[0.2em] text-emerald-400 font-bold">143 ACTIVE BOOKINGS TODAY</span>
            </div>
          </div>

          {/* Stacked giant typography */}
          <div className="overflow-hidden">
            <motion.h1
              className="font-display font-black uppercase leading-[0.85]"
              style={{ fontSize: "clamp(64px, 15vw, 200px)", letterSpacing: "-0.03em" }}
              initial={{ y: 140 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            >
              CAMPUS
            </motion.h1>
          </div>
          <div className="overflow-hidden">
            <motion.h1
              className="font-display font-black uppercase leading-[0.85] text-[#FF4D00]"
              style={{ fontSize: "clamp(64px, 15vw, 200px)", letterSpacing: "-0.03em" }}
              initial={{ y: 140 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.9, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              SPORTS
            </motion.h1>
          </div>
          <div className="overflow-hidden mb-8">
            <motion.h1
              className="font-display font-black uppercase leading-[0.85]"
              style={{ fontSize: "clamp(64px, 15vw, 200px)", letterSpacing: "-0.03em" }}
              initial={{ y: 140 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.9, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              HUB
            </motion.h1>
          </div>

          {/* Bottom Action Row */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pt-4 border-t border-white/10">
            <div>
              <p className="font-sans text-[#888880] text-sm md:text-base max-w-md leading-relaxed">
                One unified platform for every campus athlete, court reservation, tournament bracket, and athletic performance metric.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  onClick={handleDemoStudent}
                  data-cursor="ENTER"
                  className="group flex items-center gap-3 bg-[#FF4D00] hover:bg-[#FF6422] px-7 py-3.5 text-xs font-mono font-bold tracking-[0.15em] text-black transition-all"
                >
                  <span>LAUNCH HUB</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => navigate('/login')}
                  data-cursor="EXPLORE"
                  className="px-7 py-3.5 border border-white/20 hover:border-white/50 text-xs font-mono tracking-[0.15em] transition-colors"
                >
                  STUDENT LOGIN
                </button>
              </div>
            </div>

            {/* Key stats numbers */}
            <div className="flex items-center gap-8 md:gap-12">
              <div>
                <div className="font-display font-black text-5xl md:text-6xl leading-none text-[#F2F0EB]">07</div>
                <div className="font-mono text-[9px] tracking-[0.2em] text-[#888880] mt-1 uppercase">SPORTS</div>
              </div>
              <div>
                <div className="font-display font-black text-5xl md:text-6xl leading-none text-[#FF4D00]">24</div>
                <div className="font-mono text-[9px] tracking-[0.2em] text-[#888880] mt-1 uppercase">FACILITIES</div>
              </div>
              <div>
                <div className="font-display font-black text-5xl md:text-6xl leading-none text-[#F2F0EB]">98%</div>
                <div className="font-mono text-[9px] tracking-[0.2em] text-[#888880] mt-1 uppercase">ML ACCURACY</div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* MARQUEE TICKER */}
      <div className="border-y border-white/10 py-3.5 bg-[#111111]">
        <Marquee
          items={["CAMPUS ATHLETICS", "REAL-TIME BOOKING", "DEMAND PREDICTION", "TOURNAMENT BRACKETS", "ATHLETE METRICS", "PICKUP MATCHMAKING", "EQUIPMENT LOCKER"]}
          speed={30}
          className="font-display font-black uppercase text-2xl tracking-widest text-[#FF4D00]/70"
          separator="•"
        />
      </div>

      {/* MANIFESTO / PILLARS SECTION */}
      <section className="px-6 md:px-14 py-24 md:py-32 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-end mb-20">
          <div>
            <span className="font-mono text-[10px] tracking-[0.2em] text-[#888880]">01 // THE SYSTEM</span>
            <h2
              className="font-display font-black uppercase leading-none mt-3"
              style={{ fontSize: "clamp(48px, 8vw, 110px)", letterSpacing: "-0.025em" }}
            >
              ONE<br />CAMPUS.<br />EVERY<br />ATHLETE.
            </h2>
          </div>
          <div className="space-y-6">
            <p className="font-sans text-[#888880] text-base leading-relaxed">
              Eliminate double-booking conflicts, court congestion, and manual tournament paperwork. Campus Sports Hub connects live court concurrency, scikit-learn forecasting, and coaching biometrics into one synchronized operating system.
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[["07", "SPORTS"], ["24", "FACILITIES"], ["1,240", "STUDENTS"]].map(([n, l]) => (
                <div key={l} className="border border-white/10 p-4 bg-[#111111]">
                  <div className="font-display font-black text-3xl leading-none text-[#F2F0EB]">{n}</div>
                  <div className="font-mono text-[9px] tracking-widest text-[#888880] mt-1">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* PILLARS LIST */}
        <div className="border-t border-white/10">
          {[
            { num: "02", word: "PLAY", sub: "Instant court reservations. Live pickup matchmaking lobbies. Concurrency protection.", accent: false },
            { num: "03", word: "TRAIN", sub: "Supervised coaching drills. Weekly clinic calendars. Attendance biometrics.", accent: true },
            { num: "04", word: "COMPETE", sub: "Single elimination & knockout brackets. Live scoring. Official campus leaderboards.", accent: false },
            { num: "05", word: "IMPROVE", sub: "ML-driven skill progression. Footwork, agility, and reaction time assessments.", accent: false },
            { num: "06", word: "WIN", sub: "Trophy cabinet. Verified medals, tournament podiums, and unlockable achievements.", accent: true },
            { num: "07", word: "REPRESENT", sub: "Official varsity profile. Represent your university squad with pride.", accent: false },
          ].map((s) => (
            <div
              key={s.word}
              className="border-b border-white/10 px-4 md:px-8 py-10 md:py-12 group hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-6 md:gap-10">
                  <span className="font-mono text-[10px] tracking-[0.2em] text-[#888880] w-6 shrink-0">{s.num}</span>
                  <h3
                    className="font-display font-black uppercase leading-none"
                    style={{
                      fontSize: "clamp(48px, 9vw, 120px)",
                      letterSpacing: "-0.02em",
                      color: s.accent ? "#FF4D00" : "inherit"
                    }}
                  >
                    {s.word}
                  </h3>
                </div>
                <p className="font-sans text-[#888880] text-sm md:text-base max-w-sm md:text-right">
                  {s.sub}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SPORTS LIST WITH HOVER IMAGE REVEAL */}
      <section className="px-6 md:px-14 py-20 border-t border-white/10 bg-[#080808]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
            <div>
              <span className="font-mono text-[10px] tracking-[0.2em] text-[#888880]">CAMPUS CATALOG</span>
              <h2
                className="font-display font-black uppercase leading-none mt-2"
                style={{ fontSize: "clamp(40px, 7vw, 90px)", letterSpacing: "-0.025em" }}
              >
                AVAILABLE SPORTS
              </h2>
            </div>
            <button
              onClick={handleDemoStudent}
              data-cursor="BOOK"
              className="flex items-center gap-2 font-mono text-[11px] tracking-widest text-[#FF4D00] hover:text-white transition-colors self-start sm:self-auto uppercase font-bold"
            >
              <span>BROWSE ALL FACILITIES</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          <div className="border-t border-white/10">
            {sportsCatalog.map((sp) => (
              <div
                key={sp.id}
                onMouseEnter={() => setHoveredSport(sp.id)}
                onMouseLeave={() => setHoveredSport(null)}
                onClick={handleDemoStudent}
                data-cursor="BOOK"
                className="border-b border-white/10 py-6 md:py-8 relative group cursor-pointer transition-colors hover:bg-white/[0.02]"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-6 md:gap-10">
                    <span className="font-mono text-[11px] tracking-[0.2em] text-[#888880] w-6 shrink-0">{sp.number}</span>
                    <h3
                      className={`font-display font-black uppercase leading-none transition-colors duration-200 ${
                        hoveredSport === sp.id ? 'text-[#FF4D00]' : 'text-[#F2F0EB]'
                      }`}
                      style={{ fontSize: "clamp(28px, 5vw, 64px)", letterSpacing: "-0.01em" }}
                    >
                      {sp.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-6 text-right">
                    <div className="hidden sm:block">
                      <div className="font-mono text-[11px] text-[#F2F0EB] uppercase">{sp.facilities} Facilities</div>
                      <div className="font-mono text-[9px] text-[#888880]">{sp.available} Available Now</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 border ${
                        sp.demand === 'HIGH'
                          ? 'bg-[#FF4D00]/10 text-[#FF4D00] border-[#FF4D00]/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {sp.demand} DEMAND
                      </span>
                      <ArrowRight className="w-4 h-4 text-[#888880] group-hover:text-[#FF4D00] group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </div>

                {/* Hover Reveal Image Dropdown Thumbnail */}
                {hoveredSport === sp.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-[#888880] font-mono"
                  >
                    <span>COACH: {sp.coach.toUpperCase()}</span>
                    <span>ONLINE BOOKING ENABLED</span>
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REVERSE MARQUEE FOOTER BANNER */}
      <div className="border-t border-white/10 py-3.5 overflow-hidden bg-[#111111]">
        <Marquee
          items={["TRAIN", "COMPETE", "IMPROVE", "REPRESENT", "WIN", "CAMPUS SPORTS HUB", "ATHLETICS OS"]}
          speed={24}
          reverse
          className="font-mono text-[11px] tracking-[0.2em] text-[#888880] uppercase"
          separator="/"
        />
      </div>

      {/* FOOTER */}
      <footer className="py-12 px-6 md:px-14 border-t border-white/10 text-center max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-[#888880]">
        <div>CAMPUS SPORTS HUB // UNIVERSITY ATHLETICS OS &copy; 2026</div>
        <div className="flex items-center gap-4">
          <button onClick={handleDemoStudent} className="hover:text-[#FF4D00]">STUDENT PORTAL</button>
          <span>/</span>
          <button onClick={handleDemoCoach} className="hover:text-[#FF4D00]">COACH PORTAL</button>
          <span>/</span>
          <button onClick={handleDemoAdmin} className="hover:text-[#FF4D00]">ADMIN CONSOLE</button>
        </div>
      </footer>

    </div>
  );
};

