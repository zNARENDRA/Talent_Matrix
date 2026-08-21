import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApi, useAnimatedCounter } from '../hooks/useApi';
import { api } from '../lib/api';
import {
  Users, Building2, GraduationCap, Briefcase, TrendingUp, CalendarClock,
  Clock, ShieldAlert, CheckCircle2, ArrowUpRight, ArrowDownRight,
  Megaphone, Activity, AlertTriangle, ArrowRight, Sparkles, Shuffle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

// ─── shadcn Metric Card ─────────────────────────────────────────
const KPICard: React.FC<{
  title: string;
  value: number;
  suffix?: string;
  trend?: number;
  icon: React.ReactNode;
  iconBg?: string;
  onClick?: () => void;
  format?: (n: number) => string;
}> = ({ title, value, suffix, trend, icon, iconBg = 'bg-primary/10 text-primary', onClick, format }) => {
  const animatedValue = useAnimatedCounter(value);
  const displayValue = format ? format(animatedValue) : animatedValue.toLocaleString();

  return (
    <Card
      onClick={onClick}
      className={cn(
        'relative overflow-hidden group transition-all duration-200 border-border/80 bg-card hover:border-primary/40 hover:shadow-md select-none',
        onClick ? 'cursor-pointer' : ''
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </div>
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center font-bold', iconBg)}>
            {icon}
          </div>
        </div>

        <div className="mt-3 flex items-baseline justify-between">
          <div className="text-3xl font-extrabold font-mono tracking-tight text-foreground">
            {displayValue}{suffix}
          </div>

          {trend !== undefined && (
            <Badge
              variant={trend >= 0 ? 'success' : 'destructive'}
              className="text-[10px] px-1.5 py-0 font-mono font-bold flex items-center gap-0.5"
            >
              {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(trend)}%
            </Badge>
          )}
        </div>

        {onClick && (
          <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            Explore module <ArrowRight className="w-3 h-3" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─── shadcn Funnel Visualizer ──────────────────────────────────
const FunnelChart: React.FC<{ stages: any[] }> = ({ stages }) => {
  const maxCount = Math.max(...stages.map((s: any) => s.count)) || 1;

  return (
    <div className="space-y-3">
      {stages.map((stage: any, i: number) => {
        const percent = Math.round((stage.count / maxCount) * 100);

        return (
          <div key={stage.name} className="space-y-1.5 group">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                {stage.name}
              </span>
              <span className="font-mono font-bold text-muted-foreground">{stage.count.toLocaleString()} ({percent}%)</span>
            </div>

            <div className="h-2.5 w-full rounded-full bg-secondary overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ delay: i * 0.05 + 0.1, duration: 0.5, ease: 'easeOut' }}
                className="h-full rounded-full transition-all"
                style={{ backgroundColor: stage.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── shadcn Activity Feed ──────────────────────────────────────
const ActivityFeed: React.FC<{ activities: any[] }> = ({ activities }) => {
  const getIcon = (action: string) => {
    switch (action) {
      case 'create': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'allocation_run': return <Shuffle className="w-4 h-4 text-indigo-500" />;
      case 'override': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'review': return <ShieldAlert className="w-4 h-4 text-rose-500" />;
      case 'reschedule': return <CalendarClock className="w-4 h-4 text-sky-500" />;
      default: return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="divide-y divide-border -mx-6">
      {activities.map((log: any, i: number) => (
        <div
          key={log.id || i}
          className="flex items-start gap-3.5 px-6 py-3 hover:bg-muted/40 transition-colors"
        >
          <div className="mt-0.5 p-1 rounded-md bg-muted flex items-center justify-center">
            {getIcon(log.action)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-foreground line-clamp-2 leading-relaxed">
              {log.description}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
              {new Date(log.createdAt).toLocaleTimeString()} • {log.action.replace('_', ' ')}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Executive Dashboard ───────────────────────────────────────
export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data: dashboard, loading: dashLoading } = useApi(() => api.getDashboard());
  const { data: funnel } = useApi(() => api.getFunnel());
  const { data: placement } = useApi(() => api.getPlacement());
  const { data: activity } = useApi(() => api.getActivity());

  const d = dashboard || {};
  const CHART_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#06b6d4', '#10b981', '#f59e0b'];

  if (dashLoading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="p-5 animate-pulse bg-muted/40 h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 animate-pulse bg-muted/40 h-72" />
          <Card className="p-6 animate-pulse bg-muted/40 h-72" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Executive Placement Command Center
            </h1>
            <Badge variant="brand" className="font-semibold text-xs">
              Module A Enabled
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time multi-company allocation, dynamic scheduling, and integrity monitoring for the 2026 Season.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="brand"
            size="sm"
            onClick={() => navigate('/allocation')}
            className="flex items-center gap-2"
          >
            <Shuffle className="w-3.5 h-3.5" /> Execute Gale-Shapley
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/anomalies')}
            className="flex items-center gap-2"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" /> Proctor Anomaly Hub
          </Button>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4"
      >
        <KPICard
          title="Registered Students"
          value={d.totalStudents || 0}
          icon={<Users className="w-4 h-4 text-indigo-500" />}
          iconBg="bg-indigo-500/10"
          onClick={() => navigate('/students')}
        />
        <KPICard
          title="Active Companies"
          value={d.activeCompanies || 0}
          icon={<Building2 className="w-4 h-4 text-purple-500" />}
          iconBg="bg-purple-500/10"
          onClick={() => navigate('/companies')}
        />
        <KPICard
          title="Students Placed"
          value={d.placedStudents || 0}
          icon={<GraduationCap className="w-4 h-4 text-emerald-500" />}
          iconBg="bg-emerald-500/10"
          onClick={() => navigate('/analytics')}
        />
        <KPICard
          title="Placement Rate"
          value={d.placementRate || 0}
          suffix="%"
          icon={<TrendingUp className="w-4 h-4 text-cyan-500" />}
          iconBg="bg-cyan-500/10"
          format={(n) => n.toFixed(1)}
        />
        <KPICard
          title="High-Risk Anomalies"
          value={d.highRiskAlerts || 0}
          icon={<ShieldAlert className="w-4 h-4 text-rose-500" />}
          iconBg="bg-rose-500/10"
          onClick={() => navigate('/anomalies')}
        />
      </motion.div>

      {/* Secondary Operational Metrics */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <KPICard
          title="Live Interviews"
          value={d.activeInterviews || 0}
          icon={<CalendarClock className="w-4 h-4 text-sky-500" />}
          iconBg="bg-sky-500/10"
          onClick={() => navigate('/scheduler')}
        />
        <KPICard
          title="Offers Extended"
          value={d.pendingOffers || 0}
          icon={<Briefcase className="w-4 h-4 text-amber-500" />}
          iconBg="bg-amber-500/10"
        />
        <KPICard
          title="Active Drives"
          value={d.activeDrives || 0}
          icon={<Megaphone className="w-4 h-4 text-rose-500" />}
          iconBg="bg-rose-500/10"
          onClick={() => navigate('/drives')}
        />
        <KPICard
          title="Eligible Pool"
          value={d.eligibleStudents || 0}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          iconBg="bg-emerald-500/10"
        />
      </motion.div>

      {/* Visual Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recruitment Pipeline Funnel */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Recruitment Pipeline Funnel</CardTitle>
                <CardDescription>Conversion rate across application, assessment, interview, and offer</CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                Real-Time
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {funnel?.stages && <FunnelChart stages={funnel.stages} />}
          </CardContent>
        </Card>

        {/* Department-wise Allocation */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Department-Wise Placement Success</CardTitle>
                <CardDescription>Placed candidates vs total registered cohort by engineering branch</CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                {placement?.departmentWise?.length || 6} Branches
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {placement?.departmentWise && (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={placement.departmentWise} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="department" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: 'hsl(var(--card-foreground))',
                    }}
                    formatter={(value: any, name?: any) => [value, name === 'placed' ? 'Placed' : 'Registered Cohort']}
                  />
                  <Bar dataKey="total" fill="#a5b4fc" radius={[4, 4, 0, 0]} name="Total" />
                  <Bar dataKey="placed" fill="#6366f1" radius={[4, 4, 0, 0]} name="Placed" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Insights Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CTC Package Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">CTC Tier Distribution</CardTitle>
            <CardDescription>Salary breakdown (LPA brackets)</CardDescription>
          </CardHeader>
          <CardContent>
            {placement?.packageDistribution && (
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie
                    data={placement.packageDistribution.filter((p: any) => p.count > 0)}
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    innerRadius={48}
                    dataKey="count"
                    nameKey="range"
                    paddingAngle={3}
                  >
                    {placement.packageDistribution.filter((p: any) => p.count > 0).map((_: any, i: number) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {placement?.packageDistribution?.filter((p: any) => p.count > 0).map((p: any, i: number) => (
                <Badge key={p.range} variant="outline" className="text-[11px] gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                  {p.range}: <strong className="text-foreground">{p.count}</strong>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Corporate Recruiters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Hiring Partners</CardTitle>
            <CardDescription>Highest volume offer extensions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {placement?.companyWise?.slice(0, 7).map((c: any, i: number) => (
              <div
                key={c.company}
                className="flex items-center justify-between py-1.5 border-b border-border/60 last:border-0 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-md bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                    #{i + 1}
                  </span>
                  <span className="font-semibold text-foreground">{c.company}</span>
                </div>
                <Badge variant="secondary" className="font-mono font-bold text-xs">
                  {c.hires} Hires
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Real-time System Audit Stream */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Activity Audit
                </CardTitle>
                <CardDescription>Instant event & audit log stream</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-72 overflow-y-auto px-6">
              {activity?.auditLogs && <ActivityFeed activities={activity.auditLogs} />}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
export default Dashboard;
