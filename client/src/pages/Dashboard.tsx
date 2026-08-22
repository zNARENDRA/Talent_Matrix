import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApi, useAnimatedCounter } from '../hooks/useApi';
import { api } from '../lib/api';
import {
  Users, Building2, GraduationCap, Briefcase, TrendingUp, CalendarClock,
  Clock, ShieldAlert, CheckCircle2, ArrowUpRight, ArrowDownRight,
  Megaphone, Activity, AlertTriangle, ArrowRight, Sparkles, Filter, ChevronRight
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } } };

// ─── Minimal Metric Item (Continuous Ribbon, No Disjointed Tiles) ───
const MetricItem: React.FC<{
  title: string; value: number; suffix?: string; trend?: number;
  onClick?: () => void; format?: (n: number) => string;
}> = ({ title, value, suffix, trend, onClick, format }) => {
  const animatedValue = useAnimatedCounter(value);
  const displayValue = format ? format(animatedValue) : animatedValue.toLocaleString();

  return (
    <div
      onClick={onClick}
      className={`p-5 transition-colors cursor-pointer group flex flex-col justify-between hover:bg-zinc-900/40`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
          {title}
        </span>
        {trend !== undefined && (
          <span className={`inline-flex items-center text-xs font-mono font-bold ${
            trend >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-3xl font-extrabold font-mono text-white tracking-tight group-hover:text-primary-400 transition-colors">
          {displayValue}{suffix}
        </span>
        <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all" />
      </div>
    </div>
  );
};

// ─── Minimal High-Contrast Funnel ──────────────────────────────────
const MinimalFunnel: React.FC<{ stages: any[] }> = ({ stages }) => {
  const maxCount = Math.max(...stages.map((s: any) => s.count)) || 1;

  return (
    <div className="space-y-3.5">
      {stages.map((stage: any, i: number) => {
        const percentage = Math.round((stage.count / maxCount) * 100);
        return (
          <div key={stage.name} className="space-y-1 group cursor-pointer">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-zinc-300 group-hover:text-white transition-colors">
                {stage.name}
              </span>
              <span className="font-mono font-bold text-white text-xs">
                {stage.count.toLocaleString()}
              </span>
            </div>
            <div className="h-2 bg-zinc-800/80 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(percentage, 2)}%` }}
                transition={{ delay: i * 0.05, duration: 0.5, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ backgroundColor: stage.color || '#6366f1' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const { data: dashboardData, loading: dashLoading } = useApi(api.getDashboard);
  const { data: funnelData } = useApi(api.getFunnel);
  const { data: placementData } = useApi(api.getPlacement);
  const { data: activityData } = useApi(api.getActivity);

  const stats = dashboardData || {
    totalStudents: 2450,
    placedStudents: 1820,
    totalCompanies: 85,
    activeDrives: 14,
    placementRate: 74.3,
    avgPackage: 14.8,
    highestPackage: 54.0,
    activeAnomalies: 3,
    upcomingInterviews: 42,
  };

  const funnelStages = funnelData?.stages || [
    { name: 'Eligible Pool', count: 2450, color: '#6366f1' },
    { name: 'Applied', count: 2085, color: '#818cf8' },
    { name: 'Shortlisted', count: 1240, color: '#a78bfa' },
    { name: 'Assessments Cleared', count: 890, color: '#c084fc' },
    { name: 'Interviews Completed', count: 520, color: '#38bdf8' },
    { name: 'Offers Extended', count: 340, color: '#34d399' },
  ];

  const deptData = placementData?.byDepartment || [
    { department: 'CSE', total: 600, placed: 520, rate: 86.7 },
    { department: 'IT', total: 450, placed: 380, rate: 84.4 },
    { department: 'ECE', total: 500, placed: 390, rate: 78.0 },
    { department: 'ME', total: 400, placed: 260, rate: 65.0 },
    { department: 'AIDS', total: 300, placed: 270, rate: 90.0 },
  ];

  const activities = activityData || [
    { id: '1', type: 'offer', description: 'Google extended 12 offers for SDE-1 role (₹32 LPA)', time: '10m ago' },
    { id: '2', type: 'drive', description: 'Microsoft Technical Round 2 scheduled for 45 candidates', time: '25m ago' },
    { id: '3', type: 'anomaly', description: 'AI Proctor flagged multiple-faces in Coding Sandbox', time: '1h ago' },
    { id: '4', type: 'allocation', description: 'Bipartite Stable Matching Cycle 2 executed successfully', time: '3h ago' },
    { id: '5', type: 'policy', description: 'Tier upgrade policy approved for 18 core branch students', time: '5h ago' },
  ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col"
    >
      {/* ─── 1. TOP HEADER BANNER (Flat & Clean) ─── */}
      <div className="border-b border-zinc-800/80 bg-zinc-900/40 px-6 py-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-extrabold text-white tracking-tight">
              Placement Command Center
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              ● 2026 Season Active
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time institutional recruitment intelligence, interview pipelines, and allocation telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/allocation')}
            className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold border border-zinc-700 transition-colors cursor-pointer"
          >
            Run Matching Engine
          </button>
          <button
            onClick={() => navigate('/candidate-sandbox')}
            className="px-3.5 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm"
          >
            Candidate Sandbox
          </button>
        </div>
      </div>

      {/* ─── 2. CONTINUOUS METRIC RIBBON (No Isolated Tiles) ─── */}
      <div className="border-b border-zinc-800/80 grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 divide-x divide-zinc-800/80 bg-zinc-900/20">
        <MetricItem
          title="Total Eligible Pool"
          value={stats.totalStudents}
          trend={8.4}
          onClick={() => navigate('/students')}
        />
        <MetricItem
          title="Offers Extended"
          value={stats.placedStudents}
          trend={12.6}
          onClick={() => navigate('/students')}
        />
        <MetricItem
          title="Average Package"
          value={stats.avgPackage}
          suffix=" LPA"
          trend={15.2}
          format={(n) => `₹${n.toFixed(1)}`}
          onClick={() => navigate('/yearly-reports')}
        />
        <MetricItem
          title="Active Recruitment Drives"
          value={stats.activeDrives}
          trend={-2.1}
          onClick={() => navigate('/drives')}
        />
      </div>

      {/* ─── 3. MAIN WORKSPACE: CONTINUOUS 2-COLUMN SPLIT (No Tiles) ─── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800/80">
        {/* ─── LEFT COLUMN: Recruitment Funnel & Department Performance (7 cols) ─── */}
        <div className="lg:col-span-7 flex flex-col divide-y divide-zinc-800/80">
          {/* Section: Funnel */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight">
                  Recruitment Pipeline Funnel
                </h2>
                <p className="text-xs text-zinc-400">
                  Candidate progression from eligibility through interview to offer release.
                </p>
              </div>
              <span className="text-xs font-mono text-zinc-400 font-bold">
                {stats.placementRate}% Conversion
              </span>
            </div>

            <MinimalFunnel stages={funnelStages} />
          </div>

          {/* Section: Department Placement Rates */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight">
                  Department Placement Breakdown
                </h2>
                <p className="text-xs text-zinc-400">
                  Total vs. Placed students across engineering disciplines.
                </p>
              </div>
              <span className="text-xs text-zinc-500 font-mono">Academic Year 2025-26</span>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="department" stroke="#71717a" fontSize={11} tickLine={false} />
                  <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Bar dataKey="total" name="Eligible Pool" fill="#3f3f46" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="placed" name="Placed Students" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ─── RIGHT COLUMN: Top Companies & Live Activity Feed (5 cols) ─── */}
        <div className="lg:col-span-5 flex flex-col divide-y divide-zinc-800/80 bg-zinc-900/10">
          {/* Top Participating Companies */}
          <div className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white tracking-tight">
                Top Hiring Partners
              </h2>
              <button
                onClick={() => navigate('/companies')}
                className="text-xs text-primary-400 hover:text-primary-300 font-semibold cursor-pointer"
              >
                View all ({stats.totalCompanies})
              </button>
            </div>

            <div className="space-y-2 pt-1 font-mono text-xs">
              {[
                { name: 'Google India', role: 'Software Engineer', ctc: '₹32.0 LPA', offers: 18, tier: 'Super Dream' },
                { name: 'Microsoft IDC', role: 'Software Engineer', ctc: '₹28.5 LPA', offers: 24, tier: 'Super Dream' },
                { name: 'Amazon AWS', role: 'SDE-1', ctc: '₹26.0 LPA', offers: 32, tier: 'Dream' },
                { name: 'Oracle OCI', role: 'Member Technical Staff', ctc: '₹22.0 LPA', offers: 28, tier: 'Dream' },
                { name: 'Flipkart', role: 'UI/UX & Frontend Eng', ctc: '₹18.0 LPA', offers: 16, tier: 'Core' },
              ].map((c, i) => (
                <div
                  key={c.name}
                  onClick={() => navigate('/companies')}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/70 border border-zinc-800/60 hover:border-zinc-700 hover:bg-zinc-900 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="w-5 h-5 rounded bg-zinc-800 text-zinc-400 text-[10px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div className="truncate">
                      <div className="text-white font-bold font-sans text-xs truncate">{c.name}</div>
                      <div className="text-[10px] text-zinc-400 truncate">{c.role}</div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-emerald-400 font-bold text-xs">{c.ctc}</div>
                    <div className="text-[10px] text-zinc-400">{c.offers} Offers</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Activity & Audit Stream */}
          <div className="p-6 space-y-3 flex-1 flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white tracking-tight">
                Live Activity &amp; Audit Stream
              </h2>
              <button
                onClick={() => navigate('/audit-logs')}
                className="text-xs text-zinc-400 hover:text-white font-semibold cursor-pointer"
              >
                Full Log
              </button>
            </div>

            <div className="space-y-2 flex-1 font-mono text-xs">
              {activities.map((act: any) => (
                <div
                  key={act.id}
                  className="p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-800/60 flex items-start justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <p className="text-zinc-300 font-sans text-xs leading-snug">
                      {act.description}
                    </p>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                      {act.type}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500 flex-shrink-0 font-sans">
                    {act.time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
export default Dashboard;
