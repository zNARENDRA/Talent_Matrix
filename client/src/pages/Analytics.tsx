import React from 'react';
import { motion } from 'framer-motion';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area
} from 'recharts';
import { BarChart3, TrendingUp, Building2, GraduationCap, Award, Calendar, Sparkles } from 'lucide-react';

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#ec4899'];

export const AnalyticsPage: React.FC = () => {
  const { data: placement, loading } = useApi(() => api.getPlacement());
  const { data: funnel } = useApi(() => api.getFunnel());
  const { data: yoy } = useApi(() => api.getYoYAnalytics());
  const { data: outcomes } = useApi(() => api.getPlacementOutcomes());

  if (loading) return (
    <div className="p-6 space-y-6">
      <div className="skeleton h-10 w-48" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-72 rounded-xl" />)}
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-indigo-400" />
            Recruitment & Institutional Analytics
          </h1>
          <p className="text-zinc-400 mt-1">
            Real-time algorithmic metrics, Year-over-Year trend progression, and placement outcomes.
          </p>
        </div>
        <span className="px-3 py-1 text-xs font-semibold rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-mono">
          Module A Engine Analytics
        </span>
      </div>

      {/* YoY Progression Line Chart */}
      {yoy?.data && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="card-title text-base flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-400" />
              Year-over-Year (YoY) Institutional Performance Trends
            </h2>
            <span className="text-xs text-zinc-400">Multi-Cycle Historical Comparison</span>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={yoy.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="academicYear" stroke="#a1a1aa" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" stroke="#a1a1aa" tick={{ fontSize: 12 }} unit="%" />
              <YAxis yAxisId="right" orientation="right" stroke="#a1a1aa" tick={{ fontSize: 12 }} unit=" LPA" />
              <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px' }} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="placementRate" stroke="#22c55e" strokeWidth={3} name="Placement Rate (%)" />
              <Line yAxisId="left" type="monotone" dataKey="firstChoiceSatisfactionRate" stroke="#6366f1" strokeWidth={2} name="1st Choice Rate (%)" />
              <Line yAxisId="right" type="monotone" dataKey="avgPackageLpa" stroke="#f59e0b" strokeWidth={2} name="Avg Package (LPA)" />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Placement */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <h2 className="card-title mb-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-400" /> Department-wise Placement Rate
          </h2>
          {placement?.departmentWise && (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={placement.departmentWise}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="department" stroke="#a1a1aa" tick={{ fontSize: 12 }} />
                <YAxis stroke="#a1a1aa" tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px' }} />
                <Legend />
                <Bar dataKey="total" fill="#3f3f46" radius={[4, 4, 0, 0]} name="Total Registered" />
                <Bar dataKey="placed" fill="#6366f1" radius={[4, 4, 0, 0]} name="Placed Candidates" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Placement Outcomes Breakdown */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
          <h2 className="card-title mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-400" /> Candidate Placement Outcomes Distribution
          </h2>
          {outcomes?.breakdown && (
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={outcomes.breakdown}
                    dataKey="value"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={55}
                    paddingAngle={4}
                    label={({ label, value }: any) => `${label}: ${value}`}
                  >
                    {outcomes.breakdown.map((item: any, i: number) => (
                      <Cell key={i} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        {/* Package Distribution */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
          <h2 className="card-title mb-4 text-base">Annual Salary Package Distribution</h2>
          {placement?.packageDistribution && (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={placement.packageDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="range" stroke="#a1a1aa" tick={{ fontSize: 11 }} />
                <YAxis stroke="#a1a1aa" tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Students" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Company Hiring Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
          <h2 className="card-title mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-cyan-400" /> Corporate Hiring Volume
          </h2>
          {placement?.companyWise && (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={placement.companyWise.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis type="number" stroke="#a1a1aa" tick={{ fontSize: 12 }} />
                <YAxis dataKey="company" type="category" stroke="#a1a1aa" tick={{ fontSize: 11 }} width={100} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="hires" fill="#06b6d4" radius={[0, 6, 6, 0]} name="Hires" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* Hiring Funnel */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-6">
        <h2 className="card-title mb-4">Recruitment & Selection Funnel Stages</h2>
        {funnel?.stages && (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={funnel.stages}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="name" stroke="#a1a1aa" tick={{ fontSize: 12 }} />
              <YAxis stroke="#a1a1aa" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Candidates">
                {funnel.stages.map((s: any, i: number) => <Cell key={i} fill={s.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </motion.div>
    </div>
  );
};
export default AnalyticsPage;
