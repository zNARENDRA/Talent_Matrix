import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import {
  Code2, Clock, ShieldCheck, AlertTriangle, Eye, Activity,
  Clipboard, MonitorX, Keyboard, ChevronRight, Terminal, Search,
  Filter, CheckCircle2, XCircle, Users, Camera, CameraOff, RefreshCw,
  ExternalLink, Sparkles, UserCheck, ShieldAlert
} from 'lucide-react';

const riskColors: Record<string, string> = {
  normal: 'badge badge-success',
  low: 'badge badge-info',
  moderate: 'badge badge-warning',
  high: 'badge badge-danger',
  critical: 'badge bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 font-bold',
};

const eventIcons: Record<string, React.ReactNode> = {
  keystroke: <Keyboard className="w-3.5 h-3.5 text-zinc-400" />,
  paste: <Clipboard className="w-3.5 h-3.5 text-amber-400" />,
  tab_blur: <MonitorX className="w-3.5 h-3.5 text-rose-400" />,
  code_insert: <Code2 className="w-3.5 h-3.5 text-purple-400" />,
  tab_focus: <Eye className="w-3.5 h-3.5 text-cyan-400" />,
  submission: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />,
  webcam_face_absence: <CameraOff className="w-3.5 h-3.5 text-amber-400" />,
  webcam_multiple_faces: <Users className="w-3.5 h-3.5 text-rose-400" />,
  idle: <Clock className="w-3.5 h-3.5 text-zinc-500" />,
};

export const AssessmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: sessionsData, loading, refetch } = useApi(() => api.getAssessments());
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: sessionDetail, loading: detailLoading } = useApi(
    () => (selectedSessionId ? api.getAssessment(selectedSessionId) : Promise.resolve(null)),
    [selectedSessionId]
  );

  const sessions = sessionsData?.data || [];

  // Filtered sessions
  const filteredSessions = sessions.filter((s: any) => {
    const matchesSearch =
      !searchQuery ||
      s.student?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student?.studentId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.assessmentName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRisk = riskFilter === 'all' || s.riskLevel === riskFilter;
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;

    return matchesSearch && matchesRisk && matchesStatus;
  });

  // Calculate high-level KPIs
  const totalSessions = sessions.length;
  const avgScore = totalSessions > 0
    ? Math.round(sessions.reduce((acc: number, s: any) => acc + (s.authenticityScore || 0), 0) / totalSessions)
    : 0;
  const highRiskCount = sessions.filter((s: any) => s.riskLevel === 'high' || s.riskLevel === 'critical').length;
  const completedCount = sessions.filter((s: any) => s.status === 'completed').length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* ─── 1. TPO PROCTORING HUB HEADER ──────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold">
              <Code2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Coding Assessments &amp; Proctoring Hub
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Centralized TPO monitor for candidate test sessions, real-time code authenticity, and computer-vision proctoring signals.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 cursor-pointer"
            title="Refresh session data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => navigate('/anomalies')}
            className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-md shadow-indigo-500/20 cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Open Anomaly Room</span>
          </button>
        </div>
      </div>

      {/* ─── 2. TPO STATS KPI CARDS ───────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>Total Monitored Tests</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-white">{totalSessions}</div>
          <div className="text-[11px] text-zinc-500">Active &amp; past candidate attempts</div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>Average Authenticity</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-emerald-400">{avgScore}%</div>
          <div className="text-[11px] text-zinc-500">Telemetry &amp; typing consistency</div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>High Risk Violations</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className={`text-2xl font-extrabold font-mono ${highRiskCount > 0 ? 'text-rose-400' : 'text-zinc-300'}`}>
            {highRiskCount}
          </div>
          <div className="text-[11px] text-zinc-500">Flagged for human proctor review</div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>Completed Submissions</span>
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-cyan-400">{completedCount}</div>
          <div className="text-[11px] text-zinc-500">Evaluated &amp; persisted in database</div>
        </div>
      </div>

      {/* ─── 3. SEARCH & FILTERS BAR ──────────────────────────── */}
      <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate name, student ID, or problem title..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Risk Filter */}
          <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-zinc-500" />
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value="all">All Risks</option>
              <option value="normal">Normal Risk</option>
              <option value="low">Low Risk</option>
              <option value="moderate">Moderate Risk</option>
              <option value="high">High Risk</option>
              <option value="critical">Critical Risk</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Sessions</option>
              <option value="completed">Completed</option>
              <option value="under_review">Under Review</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── 4. MAIN SPLIT: SESSIONS TABLE + DETAIL INSPECTOR ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Main: Sessions Table */}
        <div className={`${selectedSessionId ? 'lg:col-span-7' : 'lg:col-span-12'} glass-card overflow-hidden transition-all duration-300`}>
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton h-14 rounded-xl" />
              ))}
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-xs italic">
              No assessment sessions matching the active search or risk filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table text-xs">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Assessment &amp; Problem</th>
                    <th>Authenticity</th>
                    <th>Risk Level</th>
                    <th>Signals</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.map((session: any, i: number) => {
                    const isSelected = selectedSessionId === session.id;
                    const score = Math.round(session.authenticityScore || 0);

                    return (
                      <motion.tr
                        key={session.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: Math.min(i * 0.02, 0.25) }}
                        onClick={() => setSelectedSessionId(session.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-indigo-500/15 border-indigo-500/40' : 'hover:bg-zinc-800/50'
                        }`}
                      >
                        <td>
                          <div className="font-semibold text-white">{session.student?.name}</div>
                          <div className="text-[11px] text-zinc-400 font-mono">
                            {session.student?.studentId} • {session.student?.department || 'Engineering'}
                          </div>
                        </td>
                        <td>
                          <div className="font-medium text-zinc-200">{session.assessmentName}</div>
                          <div className="text-[10px] text-zinc-500">
                            {new Date(session.startedAt || Date.now()).toLocaleDateString()}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-14 h-2 bg-zinc-800 rounded-full overflow-hidden flex-shrink-0">
                              <div
                                className={`h-full rounded-full ${
                                  score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${score}%` }}
                              />
                            </div>
                            <span className="font-mono font-bold text-white">{score}%</span>
                          </div>
                        </td>
                        <td>
                          <span className={riskColors[session.riskLevel] || 'badge badge-neutral'}>
                            {session.riskLevel.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <span className="font-mono text-zinc-400 text-xs">
                            {session._count?.events || 0} ev
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge text-[10px] uppercase font-mono ${
                              session.status === 'completed'
                                ? 'badge-success'
                                : session.status === 'under_review'
                                ? 'badge-warning'
                                : 'badge-neutral'
                            }`}
                          >
                            {session.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td>
                          <ChevronRight
                            className={`w-4 h-4 transition-transform ${
                              isSelected ? 'text-indigo-400 translate-x-1' : 'text-zinc-600'
                            }`}
                          />
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Detailed Session Inspector */}
        {selectedSessionId && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-5 glass-card p-5 space-y-4 sticky top-6 max-h-[85vh] overflow-y-auto"
          >
            {detailLoading ? (
              <div className="p-4 space-y-3">
                <div className="skeleton h-20 rounded-xl" />
                <div className="skeleton h-32 rounded-xl" />
              </div>
            ) : sessionDetail ? (
              <>
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div>
                    <h3 className="card-title text-sm">Session Telemetry Inspector</h3>
                    <p className="text-[11px] text-zinc-400 font-mono">
                      ID: {sessionDetail.id?.slice(0, 16)}...
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedSessionId(null)}
                    className="text-zinc-400 hover:text-white text-xs cursor-pointer p-1 font-bold"
                  >
                    ✕
                  </button>
                </div>

                {/* Score & Risk Banner */}
                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-center space-y-1.5">
                  <div
                    className={`text-4xl font-extrabold font-mono ${
                      sessionDetail.authenticityScore >= 80
                        ? 'text-emerald-400'
                        : sessionDetail.authenticityScore >= 50
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {Math.round(sessionDetail.authenticityScore)}/100
                  </div>
                  <div className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    Code Authenticity Score
                  </div>
                  <span className={`mt-1 inline-block ${riskColors[sessionDetail.riskLevel]}`}>
                    {sessionDetail.riskLevel.toUpperCase()} RISK
                  </span>
                </div>

                {/* Candidate Info */}
                <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-1 text-xs">
                  <div className="font-bold text-white text-sm">{sessionDetail.student?.name}</div>
                  <div className="text-zinc-400 font-mono flex items-center justify-between pt-1 border-t border-zinc-800/80">
                    <span>{sessionDetail.student?.studentId}</span>
                    <span>{sessionDetail.student?.department}</span>
                    <span>GPA: {sessionDetail.student?.gpa}</span>
                  </div>
                </div>

                {/* Alerts List */}
                {sessionDetail.alerts?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                      Proctoring Violation Flags ({sessionDetail.alerts.length})
                    </h4>
                    <div className="space-y-1.5">
                      {sessionDetail.alerts.map((alert: any) => (
                        <div
                          key={alert.id}
                          className="p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between font-bold text-rose-300">
                            <span className="flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                              {alert.signalType.replace(/_/g, ' ').toUpperCase()}
                            </span>
                            <span className="text-[10px] uppercase font-mono">{alert.severity}</span>
                          </div>
                          <p className="text-[11px] text-zinc-300">{alert.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Telemetry Activity Timeline */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Telemetry Stream ({sessionDetail.events?.length || 0} events)
                  </h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto pr-1 text-xs">
                    {sessionDetail.events?.slice(0, 30).map((event: any) => {
                      const eventData = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                      return (
                        <div
                          key={event.id}
                          className="p-2 rounded-lg bg-zinc-950 border border-zinc-850 flex items-start gap-2"
                        >
                          <span className="text-zinc-500 font-mono text-[10px] whitespace-nowrap w-16 pt-0.5">
                            {new Date(event.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                          <div className="mt-0.5">{eventIcons[event.eventType] || <Activity className="w-3.5 h-3.5" />}</div>
                          <div className="flex-1 min-w-0 text-[11px]">
                            <span className="font-semibold text-zinc-200 capitalize">
                              {event.eventType.replace(/_/g, ' ')}
                            </span>
                            {event.eventType === 'paste' && (
                              <span className="text-amber-400 ml-1">({eventData.size} chars)</span>
                            )}
                            {event.eventType === 'tab_blur' && (
                              <span className="text-rose-400 ml-1">({eventData.duration}s defocused)</span>
                            )}
                            {event.eventType === 'code_insert' && (
                              <span className="text-purple-400 ml-1">({eventData.size} chars inserted)</span>
                            )}
                            {event.eventType === 'webcam_multiple_faces' && (
                              <span className="text-rose-400 ml-1 font-bold">({eventData.faceCount} faces)</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* TPO Action Controls */}
                <div className="pt-3 border-t border-zinc-800 flex items-center gap-2">
                  <button
                    onClick={() => navigate('/anomalies')}
                    className="btn-primary text-xs py-2 w-full flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Triage in Anomaly Command Room</span>
                  </button>
                </div>
              </>
            ) : null}
          </motion.div>
        )}
      </div>
    </div>
  );
};
export default AssessmentsPage;
