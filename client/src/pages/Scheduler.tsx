import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import {
  CalendarClock, Clock, Users, AlertTriangle, CheckCircle2,
  Play, ArrowRight, MapPin, Video, RefreshCw, Check, Sparkles, TrendingUp, ShieldAlert,
} from 'lucide-react';

const statusColors: Record<string, string> = {
  scheduled: 'badge badge-info',
  in_progress: 'badge badge-warning',
  completed: 'badge badge-success',
  cancelled: 'badge badge-danger',
  rescheduled: 'badge badge-primary',
  delayed: 'badge badge-danger',
};

export const SchedulerPage: React.FC = () => {
  const [view, setView] = useState<'calendar' | 'conflicts' | 'utilization' | 'predictive'>('calendar');
  const [reschedulePanel, setReschedulePanel] = useState<string | null>(null);
  const [rescheduleDelay, setRescheduleDelay] = useState(15);
  const [rescheduleResult, setRescheduleResult] = useState<any>(null);
  const [applyingReschedule, setApplyingReschedule] = useState(false);
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  const { data: interviews, loading, refetch: refetchInterviews } = useApi(() => api.getInterviews());
  const { data: panels, refetch: refetchPanels } = useApi(() => api.getPanels());
  const { data: utilization, refetch: refetchUtilization } = useApi(() => api.getUtilization());
  const { data: conflicts, refetch: refetchConflicts } = useApi(() => api.getConflicts());
  const { data: predictiveData, refetch: refetchPredictive } = useApi(() => api.getPredictiveDelays());

  const handleCalculateReschedule = async () => {
    if (!reschedulePanel) return;
    try {
      const res = await api.reschedule({ panelId: reschedulePanel, delayMinutes: rescheduleDelay });
      setRescheduleResult(res);
      setAppliedSuccess(false);
    } catch (err: any) {
      alert('Error calculating reschedule: ' + err.message);
    }
  };

  const handleApplyReschedule = async () => {
    if (!rescheduleResult?.rescheduled?.length) return;
    setApplyingReschedule(true);
    try {
      await api.applyReschedule({
        changes: rescheduleResult.rescheduled.map((r: any) => ({
          interviewId: r.interviewId,
          newTime: r.newTime,
          newPanelId: r.newPanelId,
          newSlotId: r.newSlotId,
        })),
      });
      setAppliedSuccess(true);
      refetchInterviews();
      refetchPanels();
      refetchUtilization();
      refetchConflicts();
      refetchPredictive();
    } catch (err: any) {
      alert('Failed to apply reschedule changes: ' + err.message);
    } finally {
      setApplyingReschedule(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="section-title">Interview Scheduling & Predictive Panel Control</h1>
          <p className="text-surface-500 mt-1">
            {interviews?.total || 0} scheduled candidate sessions with dynamic conflict resolution & predictive overrun forecasting
          </p>
        </div>
        <div className="flex items-center gap-2">
          {[
            { id: 'calendar', label: 'Calendar', icon: CalendarClock },
            { id: 'conflicts', label: 'Conflicts', icon: AlertTriangle },
            { id: 'utilization', label: 'Reschedule', icon: Clock },
            { id: 'predictive', label: 'Predictive Delays', icon: Sparkles },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id as any)}
              className={`btn text-xs ${view === v.id ? 'btn-primary' : 'btn-secondary'}`}
            >
              <v.icon className="w-4 h-4" />
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Utilization KPIs */}
      {utilization && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[
            { label: 'Total Slots', value: utilization.totalSlots, color: 'text-primary-600' },
            { label: 'Booked Slots', value: utilization.bookedSlots, color: 'text-success-600' },
            { label: 'Available Slots', value: utilization.availableSlots, color: 'text-info-500' },
            { label: 'Slot Utilization', value: `${utilization.utilization}%`, color: 'text-purple-600' },
            { label: 'Avg Duration', value: `${utilization.averageDuration}m`, color: 'text-amber-600' },
            { label: 'Delayed Panels', value: utilization.delayedInterviews, color: 'text-danger-500' },
          ].map((kpi) => (
            <div key={kpi.label} className="glass-card p-4 text-center">
              <div className={`text-2xl font-bold font-mono ${kpi.color}`}>{kpi.value}</div>
              <div className="text-xs text-surface-500 mt-1 font-semibold uppercase">{kpi.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* 1. Calendar View */}
      {view === 'calendar' && (
        <div className="glass-card overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-3">{[...Array(8)].map((_, i) => <div key={i} className="skeleton h-16 rounded-lg" />)}</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Company / Round</th>
                  <th>Assigned Panel</th>
                  <th>Scheduled Time</th>
                  <th>Duration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {interviews?.data?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-surface-400">
                      No interviews currently scheduled in database.
                    </td>
                  </tr>
                ) : (
                  interviews?.data?.slice(0, 30).map((iv: any, i: number) => (
                    <motion.tr key={iv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.02, 0.4) }}>
                      <td>
                        <div className="font-medium text-surface-900 dark:text-white">{iv.student?.name}</div>
                        <div className="text-xs text-surface-400 font-mono">{iv.student?.studentId}</div>
                      </td>
                      <td>
                        <div className="text-sm font-medium">{iv.round?.drive?.company?.name}</div>
                        <div className="text-xs text-surface-400">Round {iv.round?.roundNumber} • {iv.round?.roundType}</div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 text-sm">
                          {iv.panel?.location === 'Online' ? <Video className="w-3.5 h-3.5 text-info-500" /> : <MapPin className="w-3.5 h-3.5 text-surface-400" />}
                          {iv.panel?.name}
                        </div>
                      </td>
                      <td className="text-sm whitespace-nowrap font-mono">
                        {new Date(iv.scheduledAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="text-sm">{iv.duration}m</td>
                      <td><span className={statusColors[iv.status] || 'badge'}>{iv.status}</span></td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 2. Conflicts View */}
      {view === 'conflicts' && (
        <div className="space-y-4">
          {conflicts?.data?.length > 0 ? conflicts.data.map((conflict: any, i: number) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-warning-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge badge-danger text-xs">{conflict.type.replace(/_/g, ' ')}</span>
                    <span className="font-medium text-sm text-surface-900 dark:text-white">{conflict.studentName}</span>
                  </div>
                  <div className="space-y-1">
                    {conflict.interviews?.map((iv: any, j: number) => (
                      <div key={j} className="text-xs text-surface-600 dark:text-surface-400 flex items-center gap-2">
                        <span>{iv.company}</span>
                        <ArrowRight className="w-3 h-3" />
                        <span className="font-mono">{new Date(iv.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="text-surface-400">({iv.panel})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )) : (
            <div className="glass-card p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-success-500 mx-auto mb-3" />
              <h3 className="font-semibold text-lg">No Active Scheduling Conflicts</h3>
              <p className="text-surface-500 mt-1 text-sm">All candidate sessions adhere to minimum transition buffers without overlaps.</p>
            </div>
          )}
        </div>
      )}

      {/* 3. Dynamic Rescheduling Tool */}
      {view === 'utilization' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card p-6 space-y-4">
            <div>
              <h2 className="card-title flex items-center gap-2 text-base">
                <RefreshCw className="w-5 h-5 text-primary-600" /> Operational Panel Delay & Rescheduling
              </h2>
              <p className="text-xs text-surface-500 mt-1">
                Register a delayed panel to identify impacted interviews, search available conflict-free slots in the database, and execute an atomic reschedule.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-surface-500 uppercase block mb-1">Select Active Panel</label>
                <select
                  value={reschedulePanel || ''}
                  onChange={(e) => setReschedulePanel(e.target.value)}
                  className="input-field text-sm"
                >
                  <option value="">Choose a panel to update...</option>
                  {panels?.data?.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.location})</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-surface-500 uppercase block mb-1">Recorded Delay (Minutes)</label>
                <input
                  type="number"
                  value={rescheduleDelay}
                  onChange={(e) => setRescheduleDelay(Number(e.target.value))}
                  min={5}
                  max={120}
                  className="input-field text-sm"
                />
              </div>

              <button
                onClick={handleCalculateReschedule}
                disabled={!reschedulePanel}
                className="btn-primary w-full text-xs py-2.5"
              >
                <Play className="w-4 h-4" /> Recalculate Conflict-Free Replacement Slots
              </button>
            </div>

            {rescheduleResult && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-surface-900 dark:text-white">
                    <AlertTriangle className="w-4 h-4 text-warning-500" />
                    <span>{rescheduleResult.totalAffected} interview(s) impacted</span>
                  </div>
                  <span className="badge badge-warning text-[10px] font-mono">
                    Delay: +{rescheduleResult.delayMinutes} mins
                  </span>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {rescheduleResult.rescheduled?.map((r: any, i: number) => (
                    <div key={i} className="text-xs flex items-center justify-between p-2 rounded-lg bg-white dark:bg-surface-900 border border-surface-100 dark:border-surface-800">
                      <div>
                        <span className="font-medium text-surface-900 dark:text-white block">{r.studentName}</span>
                        <span className="text-[11px] text-surface-400">{r.company}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <span className="text-danger-500 line-through">
                          {new Date(r.originalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <ArrowRight className="w-3 h-3 text-surface-400" />
                        <span className="text-success-600 font-semibold">
                          {new Date(r.newTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {appliedSuccess ? (
                  <div className="p-3 rounded-lg bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-300 text-xs flex items-center gap-2 font-medium">
                    <Check className="w-4 h-4" /> Schedule changes committed to database and notifications dispatched.
                  </div>
                ) : (
                  <button
                    onClick={handleApplyReschedule}
                    disabled={applyingReschedule}
                    className="btn-primary w-full text-xs py-2 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {applyingReschedule ? 'Committing Changes...' : 'Accept & Commit Schedule Changes to Database'}
                  </button>
                )}
              </motion.div>
            )}
          </div>

          {/* Panel Roster Overview */}
          <div className="glass-card p-6 space-y-4">
            <h2 className="card-title text-base">Panel Capacity & Infrastructure Roster</h2>
            <div className="space-y-2.5">
              {panels?.data?.map((panel: any) => (
                <div key={panel.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-100 dark:border-surface-800">
                  <div className="flex items-center gap-3">
                    {panel.location === 'Online' ? <Video className="w-4 h-4 text-info-500" /> : <MapPin className="w-4 h-4 text-surface-400" />}
                    <div>
                      <div className="text-sm font-semibold text-surface-900 dark:text-white">{panel.name}</div>
                      <div className="text-xs text-surface-400">{panel.location}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge badge-neutral text-xs font-mono">{panel._count?.interviews || 0} sessions</span>
                    <span className={`w-2 h-2 rounded-full ${panel.isActive ? 'bg-success-500' : 'bg-surface-300'}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. Predictive Overrun & Proactive Delay Forecasting (Innovation Feature) */}
      {view === 'predictive' && (
        <div className="space-y-6">
          <div className="glass-card p-6 bg-gradient-to-r from-primary-500/10 via-purple-500/10 to-transparent border border-primary-200 dark:border-primary-800">
            <div className="flex items-start justify-between">
              <div>
                <span className="badge badge-primary text-[10px] font-mono uppercase mb-2">
                  Predictive Scheduling Intelligence
                </span>
                <h2 className="text-lg font-bold text-surface-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary-600" />
                  Proactive Panel Overrun & Cascade Forecasting
                </h2>
                <p className="text-xs text-surface-500 mt-1 max-w-2xl leading-relaxed">
                  Evaluates historical round duration variance and pacing deviations across physical and virtual panels to calculate overrun probability before cascade delays disrupt student schedules.
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold font-mono text-primary-600 dark:text-primary-400">
                  {predictiveData?.highRiskPanelsCount || 0}
                </div>
                <div className="text-[11px] uppercase font-semibold text-surface-400">High Overrun Risk Panels</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {predictiveData?.predictions?.map((pred: any) => (
              <motion.div
                key={pred.panelId}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className={`glass-card p-5 space-y-3 border-l-4 ${
                  pred.overrunRiskLevel === 'high'
                    ? 'border-l-danger-500'
                    : pred.overrunRiskLevel === 'moderate'
                    ? 'border-l-warning-500'
                    : 'border-l-success-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-sm text-surface-900 dark:text-white">{pred.panelName}</h3>
                    <span className="text-xs text-surface-400">{pred.location} • {pred.totalAssigned} sessions</span>
                  </div>
                  <span
                    className={`badge text-[10px] uppercase font-mono ${
                      pred.overrunRiskLevel === 'high'
                        ? 'badge-danger'
                        : pred.overrunRiskLevel === 'moderate'
                        ? 'badge-warning'
                        : 'badge-success'
                    }`}
                  >
                    {pred.overrunRiskLevel} Risk
                  </span>
                </div>

                {/* Probability Bar */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-surface-500 font-medium">Overrun Probability</span>
                    <span className="font-bold font-mono text-surface-900 dark:text-white">
                      {pred.overrunProbabilityPercentage}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pred.overrunRiskLevel === 'high'
                          ? 'bg-red-500'
                          : pred.overrunRiskLevel === 'moderate'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${pred.overrunProbabilityPercentage}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-surface-50 dark:bg-surface-800/60 text-xs text-surface-600 dark:text-surface-300 space-y-1">
                  <div className="font-semibold text-surface-900 dark:text-white flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-primary-500" /> Projected Delay: +{pred.projectedDelayMinutes}m
                  </div>
                  <p className="text-[11px] leading-relaxed">{pred.proactiveRecommendation}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
