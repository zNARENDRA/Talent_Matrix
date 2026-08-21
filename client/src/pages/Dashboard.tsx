import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApi, useAnimatedCounter } from '../hooks/useApi';
import { api } from '../lib/api';
import {
  Users, Building2, GraduationCap, Briefcase, TrendingUp, CalendarClock,
  Clock, ShieldAlert, CheckCircle2, ArrowUpRight, ArrowDownRight,
  Megaphone, Activity, AlertTriangle, ArrowRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart,
} from 'recharts';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } } };

// ─── KPI Card ──────────────────────────────────────────────────
const KPICard: React.FC<{
  title: string; value: number; suffix?: string; trend?: number; icon: React.ReactNode;
  color: string; onClick?: () => void; format?: (n: number) => string;
}> = ({ title, value, suffix, trend, icon, color, onClick, format }) => {
  const animatedValue = useAnimatedCounter(value);
  const displayValue = format ? format(animatedValue) : animatedValue.toLocaleString();

  return (
    <motion.div variants={item} className="kpi-card group" onClick={onClick}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
        {trend !== undefined && (
          <div className={`flex items-center gap-0.5 text-xs font-medium ${trend >= 0 ? 'text-success-600' : 'text-danger-500'}`}>
            {trend >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-surface-900 dark:text-white">
        {displayValue}{suffix}
      </div>
      <div className="text-sm text-surface-500 mt-1">{title}</div>
      {onClick && (
        <div className="mt-2 flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity">
          View details <ArrowRight className="w-3 h-3" />
        </div>
      )}
    </motion.div>
  );
};

// ─── Funnel Chart ──────────────────────────────────────────────
const FunnelChart: React.FC<{ stages: any[] }> = ({ stages }) => {
  const maxCount = Math.max(...stages.map((s: any) => s.count));
  return (
    <div className="space-y-2">
      {stages.map((stage: any, i: number) => (
        <motion.div
          key={stage.name}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08, duration: 0.4 }}
          className="group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-surface-700 dark:text-surface-300">{stage.name}</span>
            <span className="text-sm font-semibold text-surface-900 dark:text-surface-100">{stage.count.toLocaleString()}</span>
          </div>
          <div className="h-7 bg-surface-100 dark:bg-surface-800 rounded-lg overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(stage.count / maxCount) * 100}%` }}
              transition={{ delay: i * 0.08 + 0.2, duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              className="h-full rounded-lg transition-all duration-200 group-hover:brightness-110"
              style={{ backgroundColor: stage.color }}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// ─── Activity Feed ─────────────────────────────────────────────
const ActivityFeed: React.FC<{ activities: any[] }> = ({ activities }) => {
  const getIcon = (action: string) => {
    switch (action) {
      case 'create': return <CheckCircle2 className="w-4 h-4 text-success-500" />;
      case 'allocation_run': return <Activity className="w-4 h-4 text-primary-500" />;
      case 'override': return <AlertTriangle className="w-4 h-4 text-warning-500" />;
      case 'review': return <ShieldAlert className="w-4 h-4 text-danger-500" />;
      case 'reschedule': return <CalendarClock className="w-4 h-4 text-info-500" />;
      default: return <Activity className="w-4 h-4 text-surface-400" />;
    }
  };

  return (
    <div className="space-y-0">
      {activities.map((log: any, i: number) => (
        <motion.div
          key={log.id}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
          className="flex items-start gap-3 px-4 py-3 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors rounded-lg"
        >
          <div className="mt-0.5">{getIcon(log.action)}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-surface-700 dark:text-surface-300 line-clamp-2">{log.description}</div>
            <div className="text-xs text-surface-400 mt-1">{new Date(log.createdAt).toLocaleString()}</div>
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
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="glass-card p-5 space-y-3">
              <div className="skeleton h-10 w-10 rounded-xl" />
              <div className="skeleton h-8 w-24" />
              <div className="skeleton h-4 w-32" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card p-6"><div className="skeleton h-64 w-full rounded-lg" /></div>
          <div className="glass-card p-6"><div className="skeleton h-64 w-full rounded-lg" /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="section-title">Command Center</h1>
        <p className="text-surface-500 mt-1">Real-time overview of the 2026 placement season</p>
      </div>

      {/* KPI Grid */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <KPICard title="Total Students" value={d.totalStudents || 0} icon={<Users className="w-5 h-5 text-primary-600" />} color="bg-primary-50 dark:bg-primary-900/20" onClick={() => navigate('/students')} />
        <KPICard title="Active Companies" value={d.activeCompanies || 0} icon={<Building2 className="w-5 h-5 text-purple-600" />} color="bg-purple-50 dark:bg-purple-900/20" onClick={() => navigate('/companies')} />
        <KPICard title="Students Placed" value={d.placedStudents || 0} icon={<GraduationCap className="w-5 h-5 text-success-600" />} color="bg-success-50 dark:bg-success-900/20" onClick={() => navigate('/analytics')} />
        <KPICard title="Placement Rate" value={d.placementRate || 0} suffix="%" icon={<TrendingUp className="w-5 h-5 text-cyan-600" />} color="bg-cyan-50 dark:bg-cyan-900/20" format={(n) => n.toFixed(1)} />
        <KPICard title="High-Risk Alerts" value={d.highRiskAlerts || 0} icon={<ShieldAlert className="w-5 h-5 text-danger-500" />} color="bg-danger-50 dark:bg-danger-900/20" onClick={() => navigate('/anomalies')} />
      </motion.div>

      {/* Second Row KPIs */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Active Interviews" value={d.activeInterviews || 0} icon={<CalendarClock className="w-5 h-5 text-blue-600" />} color="bg-blue-50 dark:bg-blue-900/20" onClick={() => navigate('/scheduler')} />
        <KPICard title="Pending Offers" value={d.pendingOffers || 0} icon={<Briefcase className="w-5 h-5 text-amber-600" />} color="bg-amber-50 dark:bg-amber-900/20" />
        <KPICard title="Active Drives" value={d.activeDrives || 0} icon={<Megaphone className="w-5 h-5 text-rose-600" />} color="bg-rose-50 dark:bg-rose-900/20" onClick={() => navigate('/drives')} />
        <KPICard title="Eligible Students" value={d.eligibleStudents || 0} icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />} color="bg-emerald-50 dark:bg-emerald-900/20" />
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hiring Funnel */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
          <h2 className="card-title mb-4">Hiring Funnel</h2>
          {funnel?.stages && <FunnelChart stages={funnel.stages} />}
        </motion.div>

        {/* Department Placement */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-6">
          <h2 className="card-title mb-4">Department-wise Placement</h2>
          {placement?.departmentWise && (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={placement.departmentWise} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-200)" />
                <XAxis dataKey="department" tick={{ fontSize: 12 }} stroke="var(--color-surface-400)" />
                <YAxis tick={{ fontSize: 12 }} stroke="var(--color-surface-400)" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--color-surface-50)', border: '1px solid var(--color-surface-200)', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: any, name?: any) => [value, name === 'placed' ? 'Placed' : 'Total']}
                />
                <Bar dataKey="total" fill="#c7d2fe" radius={[4, 4, 0, 0]} name="Total" />
                <Bar dataKey="placed" fill="#6366f1" radius={[4, 4, 0, 0]} name="Placed" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Package Distribution */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card p-6">
          <h2 className="card-title mb-4">Package Distribution</h2>
          {placement?.packageDistribution && (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={placement.packageDistribution.filter((p: any) => p.count > 0)}
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  innerRadius={55}
                  dataKey="count"
                  nameKey="range"
                  paddingAngle={3}
                  animationBegin={500}
                  animationDuration={1000}
                >
                  {placement.packageDistribution.filter((p: any) => p.count > 0).map((_: any, i: number) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any, name?: any) => [v, name || '']} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            {placement?.packageDistribution?.filter((p: any) => p.count > 0).map((p: any, i: number) => (
              <span key={p.range} className="badge badge-neutral text-xs">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                {p.range}: {p.count}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Company Hiring */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="glass-card p-6">
          <h2 className="card-title mb-4">Top Hiring Companies</h2>
          {placement?.companyWise?.slice(0, 8).map((c: any, i: number) => (
            <motion.div
              key={c.company}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.05 }}
              className="flex items-center justify-between py-2 border-b border-surface-100 dark:border-surface-800 last:border-0"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center text-xs font-bold text-primary-700 dark:text-primary-400">
                  {i + 1}
                </div>
                <span className="text-sm font-medium text-surface-700 dark:text-surface-300">{c.company}</span>
              </div>
              <span className="text-sm font-semibold text-surface-900 dark:text-surface-100">{c.hires}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Live Activity Feed */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="glass-card p-6">
          <h2 className="card-title mb-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
            Live Activity
          </h2>
          <div className="max-h-72 overflow-y-auto -mx-4">
            {activity?.auditLogs && <ActivityFeed activities={activity.auditLogs} />}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
