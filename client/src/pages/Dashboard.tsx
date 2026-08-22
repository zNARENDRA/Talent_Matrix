import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApi, useAnimatedCounter } from '../hooks/useApi';
import { api } from '../lib/api';
import {
  Users, Building2, GraduationCap, Briefcase, TrendingUp, CalendarClock,
  Clock, ShieldAlert, CheckCircle2, ArrowUpRight, ArrowDownRight,
  Megaphone, Activity, AlertTriangle, ArrowRight, Sparkles, Filter
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } } };

// ─── High-Contrast KPI Card ────────────────────────────────────
const KPICard: React.FC<{
  title: string; value: number; suffix?: string; trend?: number; icon: React.ReactNode;
  color: string; onClick?: () => void; format?: (n: number) => string;
}> = ({ title, value, suffix, trend, icon, color, onClick, format }) => {
  const animatedValue = useAnimatedCounter(value);
  const displayValue = format ? format(animatedValue) : animatedValue.toLocaleString();

  return (
    <motion.div
      variants={item}
      className="p-5 rounded-2xl bg-zinc-900/85 border border-zinc-800 hover:border-primary-500/50 backdrop-blur-md shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col justify-between group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color} shadow-sm group-hover:scale-105 transition-transform`}>
          {icon}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-0.5 text-xs font-bold font-mono px-2 py-0.5 rounded-md ${
            trend >= 0 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
          }`}>
            {trend >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      <div className="mt-4 space-y-1">
        <div className="text-3xl font-extrabold font-mono text-white tracking-tight group-hover:text-primary-300 transition-colors">
          {displayValue}{suffix}
        </div>
        <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
          {title}
        </div>
      </div>

      {onClick && (
        <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-xs text-primary-400 font-semibold opacity-80 group-hover:opacity-100 transition-opacity">
          <span>View details</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </div>
      )}
    </motion.div>
  );
};

// ─── High-Contrast Funnel Chart ────────────────────────────────
const FunnelChart: React.FC<{ stages: any[] }> = ({ stages }) => {
  const maxCount = Math.max(...stages.map((s: any) => s.count)) || 1;

  return (
    <div className="space-y-3">
      {stages.map((stage: any, i: number) => {
        const percentage = Math.round((stage.count / maxCount) * 100);
        return (
          <motion.div
            key={stage.name}
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06, duration: 0.35 }}
            className="group cursor-pointer space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors">
                {stage.name}
              </span>
              <span className="text-sm font-mono font-extrabold text-white">
                {stage.count.toLocaleString()}
              </span>
            </div>
            <div className="h-8 bg-zinc-800/80 rounded-xl overflow-hidden p-0.5 border border-zinc-700/60 flex items-center">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(percentage, 3)}%` }}
                transition={{ delay: i * 0.06 + 0.15, duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                className="h-full rounded-lg transition-all duration-200 group-hover:brightness-110 shadow-sm"
                style={{ backgroundColor: stage.color || '#6366f1' }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

// ─── High-Contrast Activity Feed ───────────────────────────────
const ActivityFeed: React.FC<{ activities: any[] }> = ({ activities }) => {
  const getIcon = (action: string) => {
    switch (action) {
      case 'create': return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'allocation_run': return <Activity className="w-4 h-4 text-primary-400" />;
      case 'override': return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'review': return <ShieldAlert className="w-4 h-4 text-rose-400" />;
      case 'reschedule': return <CalendarClock className="w-4 h-4 text-cyan-400" />;
      default: return <Activity className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <div className="space-y-1.5">
      {activities.map((log: any, i: number) => (
        <motion.div
          key={log.id}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04, duration: 0.3 }}
          className="flex items-start gap-3 p-3 bg-zinc-900/50 hover:bg-zinc-800/60 border border-zinc-800/70 hover:border-zinc-700 transition-all rounded-xl shadow-sm"
        >
          <div className="mt-0.5 p-1 rounded-lg bg-zinc-800 shrink-0">
            {getIcon(log.action)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-zinc-200 leading-snug line-clamp-2">
              {log.description}
            </div>
            <div className="text-[10px] font-mono text-zinc-400 mt-1">
              {new Date(log.createdAt).toLocaleString()}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// ─── Main Dashboard ────────────────────────────────────────────
export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data: dashboard, loading: dashLoading } = useApi(() => api.getDashboard());
  const { data: funnel } = useApi(() => api.getFunnel());
  const { data: placement } = useApi(() => api.getPlacement());
  const { data: activity } = useApi(() => api.getActivity());

  const d = dashboard || {};
  const CHART_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#06b6d4', '#22c55e', '#f59e0b'];

  if (dashLoading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="glass-card p-5 space-y-3">
              <div className="skeleton h-10 w-10 rounded-xl" />
              <div className="skeleton h-8 w-24" />
              <div className="skeleton h-4 w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            Command Center
            <span className="px-2.5 py-0.5 text-xs font-mono font-bold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Live Season 2026
            </span>
          </h1>
          <p className="text-sm text-zinc-300 font-medium mt-1">
            Real-time overview of candidate applications, corporate recruitment drives, and algorithm allocations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/allocation')}
            className="btn-primary text-xs font-bold px-4 py-2.5 flex items-center gap-2 shadow-lg shadow-primary-500/25"
          >
            <Sparkles className="w-4 h-4" /> Run Allocation Engine
          </button>
        </div>
      </div>

      {/* Row 1 KPI Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4"
      >
        <KPICard
          title="Total Students"
          value={d.totalStudents || 0}
          icon={<Users className="w-5 h-5 text-indigo-400" />}
          color="bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
          onClick={() => navigate('/students')}
        />
        <KPICard
          title="Active Companies"
          value={d.activeCompanies || 0}
          icon={<Building2 className="w-5 h-5 text-purple-400" />}
          color="bg-purple-500/15 text-purple-400 border border-purple-500/30"
          onClick={() => navigate('/companies')}
        />
        <KPICard
          title="Students Placed"
          value={d.placedStudents || 0}
          icon={<GraduationCap className="w-5 h-5 text-emerald-400" />}
          color="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
          onClick={() => navigate('/allocation')}
        />
        <KPICard
          title="Placement Rate"
          value={d.placementRate || 0}
          suffix="%"
          icon={<TrendingUp className="w-5 h-5 text-cyan-400" />}
          color="bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
          format={(n) => n.toFixed(1)}
        />
        <KPICard
          title="High-Risk Alerts"
          value={d.highRiskAlerts || 0}
          icon={<ShieldAlert className="w-5 h-5 text-rose-400" />}
          color="bg-rose-500/15 text-rose-400 border border-rose-500/30"
          onClick={() => navigate('/anomalies')}
        />
      </motion.div>

      {/* Row 2 Secondary KPIs */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <KPICard
          title="Active Interviews"
          value={d.activeInterviews || 0}
          icon={<CalendarClock className="w-5 h-5 text-blue-400" />}
          color="bg-blue-500/15 text-blue-400 border border-blue-500/30"
          onClick={() => navigate('/scheduler')}
        />
        <KPICard
          title="Pending Offers"
          value={d.pendingOffers || 0}
          icon={<Briefcase className="w-5 h-5 text-amber-400" />}
          color="bg-amber-500/15 text-amber-400 border border-amber-500/30"
          onClick={() => navigate('/selection-studio')}
        />
        <KPICard
          title="Active Drives"
          value={d.activeDrives || 0}
          icon={<Megaphone className="w-5 h-5 text-purple-400" />}
          color="bg-purple-500/15 text-purple-400 border border-purple-500/30"
          onClick={() => navigate('/drives')}
        />
        <KPICard
          title="Eligible Students"
          value={d.eligibleStudents || 0}
          icon={<CheckCircle2 className="w-5 h-5 text-teal-400" />}
          color="bg-teal-500/15 text-teal-400 border border-teal-500/30"
          onClick={() => navigate('/students')}
        />
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hiring Funnel */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary-400" />
              Recruitment Hiring Funnel
            </h2>
            <span className="text-xs font-semibold text-zinc-400">Total Applicants: 2,085</span>
          </div>
          {funnel?.stages && <FunnelChart stages={funnel.stages} />}
        </motion.div>

        {/* Department Placement */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-emerald-400" />
              Department-wise Placement
            </h2>
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="flex items-center gap-1 text-indigo-300">
                <span className="w-3 h-3 rounded bg-[#6366f1]" /> Placed
              </span>
              <span className="flex items-center gap-1 text-zinc-400">
                <span className="w-3 h-3 rounded bg-[#334155]" /> Total
              </span>
            </div>
          </div>

          {placement?.departmentWise && (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={placement.departmentWise} barCategoryGap="22%">
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="department" tick={{ fontSize: 13, fontWeight: 700, fill: '#cbd5e1' }} stroke="#3f3f46" />
                <YAxis tick={{ fontSize: 12, fontWeight: 600, fill: '#94a3b8' }} stroke="#3f3f46" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                  formatter={(value: any, name?: any) => [value, name === 'placed' ? 'Placed Students' : 'Total Students']}
                />
                <Bar dataKey="total" fill="#334155" radius={[6, 6, 0, 0]} name="total" />
                <Bar dataKey="placed" fill="#6366f1" radius={[6, 6, 0, 0]} name="placed" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* Bottom Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Package Distribution */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              Package Distribution (LPA)
            </h2>
          </div>

          {placement?.packageDistribution && (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={placement.packageDistribution.filter((p: any) => p.count > 0)}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={50}
                  dataKey="count"
                  nameKey="range"
                  paddingAngle={4}
                  animationBegin={300}
                  animationDuration={800}
                >
                  {placement.packageDistribution.filter((p: any) => p.count > 0).map((_: any, i: number) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', fontSize: '12px', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          )}

          <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-800/80">
            {placement?.packageDistribution?.filter((p: any) => p.count > 0).map((p: any, i: number) => (
              <span key={p.range} className="px-2.5 py-1 rounded-lg bg-zinc-800/90 text-xs font-bold text-zinc-200 border border-zinc-700 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                {p.range}: <strong className="text-white font-mono">{p.count}</strong>
              </span>
            ))}
          </div>
        </motion.div>

        {/* Top Hiring Companies */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-400" />
              Top Hiring Companies
            </h2>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {placement?.companyWise?.slice(0, 8).map((c: any, i: number) => (
              <div
                key={c.company}
                className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-primary-400">
                    #{i + 1}
                  </div>
                  <span className="text-sm font-bold text-white">{c.company}</span>
                </div>
                <span className="text-xs font-mono font-extrabold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                  {c.hires} Offers
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Live Activity Feed */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="glass-card p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Activity Audit
            </h2>
            <span className="text-xs font-semibold text-zinc-400">Real-time Stream</span>
          </div>

          <div className="max-h-72 overflow-y-auto pr-1">
            {activity?.auditLogs && <ActivityFeed activities={activity.auditLogs} />}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
export default Dashboard;
