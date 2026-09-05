import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Sparkles, Award, User, Calendar, 
  Target, Zap, Activity, CheckCircle, ArrowUpRight, Crosshair
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, 
  Tooltip, CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts';
import { motion } from 'framer-motion';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

export const PerformancePage = () => {
  const [progression, setProgression] = useState([]);
  const [history, setHistory] = useState([]);
  const [aiInsights, setAiInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  const { addToast } = useNotification();

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  const fetchPerformanceData = async () => {
    setLoading(true);
    try {
      const [progRes, histRes, aiRes] = await Promise.all([
        api.get('/performance/my-progress'),
        api.get('/performance/history'),
        api.get('/performance/ai-insights')
      ]);
      setProgression(progRes.data);
      setHistory(histRes.data);
      setAiInsights(aiRes.data);
    } catch (err) {
      addToast('Failed to load performance metrics', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Format progression data for Recharts
  const chartData = progression.map(item => ({
    date: item.date,
    overall: item.overall_rating,
    ...item.metrics
  }));

  // Latest radar metrics
  const latestAssessment = history.length > 0 ? history[0] : null;
  const radarData = latestAssessment?.metrics
    ? Object.entries(latestAssessment.metrics).map(([key, val]) => ({
        subject: key.toUpperCase(),
        score: val,
        fullMark: 10
      }))
    : [
        { subject: 'STAMINA', score: 8, fullMark: 10 },
        { subject: 'SPEED', score: 8.5, fullMark: 10 },
        { subject: 'TECHNIQUE', score: 7.5, fullMark: 10 },
        { subject: 'TACTICAL', score: 8.2, fullMark: 10 },
        { subject: 'MENTAL', score: 9.0, fullMark: 10 }
      ];

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-widest mb-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>ATHLETIC BIOMETRICS & ANALYTICS</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold uppercase tracking-tight text-white">
            PERFORMANCE & PROGRESSION
          </h1>
          <p className="text-sm text-muted mt-1 font-sans">
            Formal coach assessments, 6-week progression curves, and AI biometric potential analysis.
          </p>
        </div>

        {latestAssessment && (
          <div className="p-4 bg-black/60 border border-primary/40 text-center min-w-[150px] self-start md:self-auto">
            <div className="text-3xl font-display font-bold text-primary">
              {latestAssessment.overall_rating.toFixed(1)} <span className="text-sm text-muted font-mono">/ 10</span>
            </div>
            <div className="text-[10px] font-mono text-muted uppercase tracking-wider mt-0.5">CURRENT RATING</div>
          </div>
        )}
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Progression Curve */}
        <div className="lg:col-span-2 card-panel p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono text-primary uppercase tracking-widest">
                TEMPORAL TRAJECTORY
              </div>
              <h2 className="text-2xl font-display font-bold uppercase tracking-tight text-white mt-0.5">
                SKILL PROGRESSION OVER TIME
              </h2>
            </div>
            <span className="text-[10px] font-mono uppercase px-2.5 py-1 border border-primary/30 text-primary bg-primary/10 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> ASCENDING VECTOR
            </span>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" stroke="#888" fontSize={10} fontMono tickLine={false} />
                <YAxis domain={[5, 10]} stroke="#888" fontSize={10} fontMono tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#080808', borderColor: 'rgba(255,77,0,0.4)', borderRadius: 0, fontFamily: 'JetBrains Mono' }}
                  labelStyle={{ color: '#FF4D00', fontWeight: 'bold' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="overall" 
                  stroke="#FF4D00" 
                  strokeWidth={2.5} 
                  dot={{ r: 4, fill: '#FF4D00' }} 
                  activeDot={{ r: 6, stroke: '#FFFFFF', strokeWidth: 2 }} 
                  name="Skill Score"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Skill Radar Chart */}
        <div className="card-panel p-6 sm:p-8 space-y-6 flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-mono text-primary uppercase tracking-widest">
              MULTILATERAL BALANCE
            </div>
            <h2 className="text-2xl font-display font-bold uppercase tracking-tight text-white mt-0.5">
              SKILL RADAR
            </h2>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="subject" stroke="#888" fontSize={9} />
                <PolarRadiusAxis domain={[0, 10]} stroke="rgba(255,255,255,0.15)" fontSize={8} />
                <Radar name="Athlete" dataKey="score" stroke="#FF4D00" fill="#FF4D00" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="text-[10px] font-mono text-muted text-center p-2.5 bg-black/60 border border-white/10">
            BALANCED COMPETITIVE ATTRIBUTES
          </div>
        </div>

      </div>

      {/* AI Performance Insights Card */}
      {aiInsights && (
        <div className="card-panel p-6 sm:p-8 space-y-6 border-primary/40 bg-gradient-to-r from-primary/5 via-black to-black">
          <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase font-bold tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>AI ATHLETIC BIOMETRIC SYNTHESIS</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <div className="p-4 bg-black/80 border border-white/10 space-y-2">
              <span className="text-[10px] font-mono uppercase text-emerald-400 tracking-wider">
                COMPETITIVE ADVANTAGE
              </span>
              <p className="text-white font-mono text-xs leading-relaxed">
                {aiInsights.strengths || 'Superior lateral agility, burst transition velocity, and consistent high-altitude stamina.'}
              </p>
            </div>

            <div className="p-4 bg-black/80 border border-white/10 space-y-2">
              <span className="text-[10px] font-mono uppercase text-amber-400 tracking-wider">
                TARGET CALIBRATION
              </span>
              <p className="text-white font-mono text-xs leading-relaxed">
                {aiInsights.improvement_areas || 'Late-game defensive balance under sustained fast-break transitions.'}
              </p>
            </div>

            <div className="p-4 bg-black/80 border border-white/10 space-y-2">
              <span className="text-[10px] font-mono uppercase text-primary tracking-wider">
                DIRECTIVE DRILLS
              </span>
              <p className="text-white font-mono text-xs leading-relaxed">
                {aiInsights.recommended_drills || 'Cone shuttle sprints, defensive isolation sequences, and isometric core stabilization.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Coach Evaluations History */}
      <div className="card-panel p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <div className="text-[10px] font-mono text-primary uppercase tracking-widest">
              OFFICIAL EVALUATION LOGS
            </div>
            <h2 className="text-2xl font-display font-bold uppercase tracking-tight text-white mt-0.5">
              VERIFIED COACH ASSESSMENTS
            </h2>
          </div>
          <span className="text-xs font-mono text-muted">{history.length} EVALUATIONS</span>
        </div>

        {history.length === 0 ? (
          <div className="text-center text-muted font-mono text-xs py-8">
            No formal evaluations recorded yet. Attend coaching sessions to receive verified ratings.
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {history.map(item => (
              <div key={item.id} className="py-5 space-y-3 first:pt-0 last:pb-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 border border-white/10 bg-white/5 text-muted">
                      {item.sport_name}
                    </span>
                    <span className="text-lg font-display uppercase font-bold text-white">
                      EVALUATED BY {item.coach_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted">{item.assessment_date}</span>
                    <span className="text-xs font-mono font-bold px-2.5 py-1 border border-primary/40 bg-primary/10 text-primary">
                      {item.overall_rating.toFixed(1)} / 10 SCORE
                    </span>
                  </div>
                </div>

                {item.notes && (
                  <p className="text-xs font-mono text-muted bg-black/60 p-3.5 border border-white/10 italic">
                    "{item.notes}"
                  </p>
                )}

                {item.metrics && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {Object.entries(item.metrics).map(([metricName, val]) => (
                      <span key={metricName} className="text-[10px] font-mono uppercase px-2.5 py-1 bg-white/5 border border-white/10 text-muted">
                        {metricName}: <strong className="text-white">{val}/10</strong>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
