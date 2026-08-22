import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import {
  Code2, Clock, ShieldCheck, AlertTriangle, Eye, Activity,
  Clipboard, MonitorX, Keyboard, ChevronRight, Terminal, ArrowUpRight
} from 'lucide-react';

const riskColors: Record<string, string> = {
  normal: 'badge badge-success', low: 'badge badge-info',
  moderate: 'badge badge-warning', high: 'badge badge-danger',
  critical: 'badge bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const eventIcons: Record<string, React.ReactNode> = {
  keystroke: <Keyboard className="w-3.5 h-3.5 text-surface-400" />,
  paste: <Clipboard className="w-3.5 h-3.5 text-warning-500" />,
  tab_blur: <MonitorX className="w-3.5 h-3.5 text-danger-500" />,
  code_insert: <Code2 className="w-3.5 h-3.5 text-purple-500" />,
  tab_focus: <Eye className="w-3.5 h-3.5 text-info-500" />,
  submission: <ShieldCheck className="w-3.5 h-3.5 text-success-500" />,
  idle: <Clock className="w-3.5 h-3.5 text-surface-300" />,
};

export const AssessmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: sessions, loading } = useApi(() => api.getAssessments());
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const { data: sessionDetail } = useApi(
    () => selectedSession ? api.getAssessment(selectedSession) : Promise.resolve(null),
    [selectedSession]
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="section-title flex items-center gap-3">
            <Code2 className="w-7 h-7 text-primary-500" />
            Coding Assessments &amp; Proctoring Hub
          </h1>
          <p className="text-surface-500 mt-1">
            Monitor real-time candidate assessment sessions, keystroke dynamics, and AI computer-vision integrity
          </p>
        </div>

        <button
          onClick={() => navigate('/candidate-sandbox')}
          className="btn-primary text-xs py-2 px-4 flex items-center gap-2 shadow-md shadow-indigo-500/20 cursor-pointer self-start sm:self-auto"
        >
          <Terminal className="w-4 h-4" />
          <span>Launch Candidate Sandbox (Interactive Preview)</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex gap-6">
        {/* Sessions List */}
        <div className="flex-1 glass-card overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-3">{[...Array(8)].map((_, i) => <div key={i} className="skeleton h-16 rounded-lg" />)}</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Assessment</th>
                  <th>Authenticity</th>
                  <th>Risk</th>
                  <th>Events</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sessions?.data?.map((session: any, i: number) => (
                  <motion.tr
                    key={session.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i * 0.02, 0.3) }}
                    onClick={() => setSelectedSession(session.id)}
                    className={`cursor-pointer ${selectedSession === session.id ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`}
                  >
                    <td>
                      <div className="font-medium">{session.student?.name}</div>
                      <div className="text-xs text-surface-400">{session.student?.studentId}</div>
                    </td>
                    <td className="text-sm">{session.assessmentName}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${session.authenticityScore >= 80 ? 'bg-success-500' : session.authenticityScore >= 50 ? 'bg-warning-500' : 'bg-danger-500'}`}
                            style={{ width: `${session.authenticityScore}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{Math.round(session.authenticityScore)}</span>
                      </div>
                    </td>
                    <td><span className={riskColors[session.riskLevel]}>{session.riskLevel}</span></td>
                    <td className="text-sm text-surface-500">{session._count?.events || 0}</td>
                    <td><span className={session.status === 'completed' ? 'badge badge-success' : session.status === 'under_review' ? 'badge badge-warning' : 'badge badge-neutral'}>{session.status.replace(/_/g, ' ')}</span></td>
                    <td><ChevronRight className="w-4 h-4 text-surface-300" /></td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Session Detail Panel */}
        {sessionDetail && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-[420px] glass-card p-5 h-fit sticky top-20 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="card-title">Session Detail</h3>
              <button onClick={() => setSelectedSession(null)} className="text-surface-400 hover:text-surface-600">×</button>
            </div>

            {/* Score */}
            <div className="text-center p-4 rounded-xl bg-surface-50 dark:bg-surface-800">
              <div className={`text-4xl font-bold ${sessionDetail.authenticityScore >= 80 ? 'text-success-600' : sessionDetail.authenticityScore >= 50 ? 'text-warning-600' : 'text-danger-500'}`}>
                {Math.round(sessionDetail.authenticityScore)}/100
              </div>
              <div className="text-sm text-surface-500 mt-1">Code Authenticity Score</div>
              <span className={`mt-2 ${riskColors[sessionDetail.riskLevel]}`}>{sessionDetail.riskLevel.toUpperCase()} RISK</span>
            </div>

            {/* Student */}
            <div className="p-3 rounded-lg bg-surface-50 dark:bg-surface-800">
              <div className="font-medium">{sessionDetail.student?.name}</div>
              <div className="text-xs text-surface-400">{sessionDetail.student?.studentId} • {sessionDetail.assessmentName}</div>
            </div>

            {/* Alerts */}
            {sessionDetail.alerts?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-surface-500 uppercase mb-2">Alerts ({sessionDetail.alerts.length})</h4>
                {sessionDetail.alerts.map((alert: any) => (
                  <div key={alert.id} className="p-2.5 rounded-lg border border-warning-200 dark:border-warning-800 bg-warning-50/50 dark:bg-warning-900/10 mb-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-warning-500" />
                      <span className={riskColors[alert.severity] + ' text-xs'}>{alert.severity}</span>
                    </div>
                    <p className="text-xs text-surface-600 dark:text-surface-400">{alert.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Event Timeline */}
            <div>
              <h4 className="text-xs font-semibold text-surface-500 uppercase mb-2">Activity Timeline ({sessionDetail.events?.length || 0} events)</h4>
              <div className="space-y-0 max-h-64 overflow-y-auto">
                {sessionDetail.events?.slice(0, 30).map((event: any, i: number) => {
                  const eventData = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                  return (
                    <div key={event.id} className="flex items-start gap-2 py-1.5 text-xs border-b border-surface-100 dark:border-surface-800 last:border-0">
                      <span className="text-surface-400 font-mono whitespace-nowrap w-16">
                        {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      {eventIcons[event.eventType] || <Activity className="w-3.5 h-3.5" />}
                      <div className="flex-1">
                        <span className="font-medium capitalize">{event.eventType.replace(/_/g, ' ')}</span>
                        {event.eventType === 'paste' && <span className="text-warning-500 ml-1">({eventData.size} chars)</span>}
                        {event.eventType === 'tab_blur' && <span className="text-danger-500 ml-1">({eventData.duration}s)</span>}
                        {event.eventType === 'code_insert' && <span className="text-purple-500 ml-1">({eventData.size} chars)</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
