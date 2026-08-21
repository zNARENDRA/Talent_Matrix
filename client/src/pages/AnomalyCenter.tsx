import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import {
  ShieldAlert, ShieldCheck, AlertTriangle, Eye, CheckCircle2,
  XCircle, ArrowUpCircle, Clock, Code2, Clipboard, MonitorX, Keyboard,
  Sparkles, Bot, RefreshCw, ChevronRight, ExternalLink, Camera, CameraOff, Video, Users
} from 'lucide-react';

const riskColors: Record<string, string> = {
  normal: 'badge badge-success',
  low: 'badge badge-info',
  moderate: 'badge badge-warning',
  high: 'badge badge-danger',
  critical: 'badge bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const severityColors: Record<string, string> = {
  critical: 'border-l-4 border-red-500 bg-red-50/50 dark:bg-red-900/10',
  high: 'border-l-4 border-orange-500 bg-orange-50/50 dark:bg-orange-900/10',
  moderate: 'border-l-4 border-amber-500 bg-amber-50/50 dark:bg-amber-900/10',
};

const signalIcons: Record<string, React.ReactNode> = {
  paste_frequency: <Clipboard className="w-4 h-4" />,
  tab_blur_count: <MonitorX className="w-4 h-4" />,
  large_insertion: <Code2 className="w-4 h-4" />,
  typing_speed_anomaly: <Keyboard className="w-4 h-4" />,
  webcam_face_absence: <CameraOff className="w-4 h-4 text-amber-500" />,
  webcam_blocked: <CameraOff className="w-4 h-4 text-rose-500" />,
  webcam_multiple_faces: <Users className="w-4 h-4 text-purple-500" />,
};

export const AnomalyCenterPage: React.FC = () => {
  const { data: alerts, loading, refetch } = useApi(() => api.getAnomalies());
  const { data: stats, refetch: refetchStats } = useApi(() => api.getAnomalyStats());
  const { data: aiStatus } = useApi(() => api.getAIStatus());

  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [aiReport, setAiReport] = useState<any>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Live WebSocket Integration
  useEffect(() => {
    const socket = getSocket();

    const handleNewAlert = (newAlert: any) => {
      refetch();
      refetchStats();
    };

    socket.on('anomaly:alert', handleNewAlert);
    socket.on('score:update:global', () => {
      refetchStats();
    });

    return () => {
      socket.off('anomaly:alert', handleNewAlert);
      socket.off('score:update:global');
    };
  }, [refetch, refetchStats]);

  // Load AI Analysis when alert selected
  useEffect(() => {
    if (selectedAlert?.sessionId) {
      setLoadingAi(true);
      setAiReport(null);
      api.getAssessmentAIAnalysis(selectedAlert.sessionId)
        .then((res) => {
          setAiReport(res.aiReport);
        })
        .catch(console.error)
        .finally(() => setLoadingAi(false));
    }
  }, [selectedAlert?.id, selectedAlert?.sessionId]);

  const handleReview = async (alertId: string, status: string) => {
    await api.reviewAnomaly(alertId, { status, reviewNote });
    setSelectedAlert(null);
    setReviewNote('');
    refetch();
    refetchStats();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Title & AI Provider Tag */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="section-title flex items-center gap-3">
            <ShieldAlert className="w-7 h-7 text-danger-500" />
            Anomaly Center
          </h1>
          <p className="text-surface-500 mt-1">
            Real-time assessment integrity triage, continuous telemetry scoring & AI explainability
          </p>
        </div>

        {/* AI Provider Status Pill */}
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-xs">
          <Bot className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          <span className="text-surface-500">AI Intelligence:</span>
          <span className="font-semibold text-surface-900 dark:text-white">
            {aiStatus?.activeProvider || 'Deterministic Telemetry Model'}
          </span>
          <span className="badge badge-primary text-[10px] uppercase font-mono">
            {aiStatus?.model || 'v2.0'}
          </span>
        </div>
      </div>

      {/* Fairness & Legal Notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800">
        <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-blue-700 dark:text-blue-300">
          <span className="font-semibold block mb-0.5">Fairness & Privacy by Design</span>
          Anomaly scores and telemetry signals serve exclusively as decision-support indicators. Automatic disciplinary disqualification based purely on scores is prohibited. All flagged cases mandate human review with explainable signal inspection.
        </div>
      </div>

      {/* Real Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold text-danger-500">{stats.criticalAlerts}</div>
            <div className="text-xs text-surface-500 mt-1">Critical Alerts</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold text-warning-600">{stats.highAlerts}</div>
            <div className="text-xs text-surface-500 mt-1">High Risk</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold text-amber-500">{stats.moderateAlerts}</div>
            <div className="text-xs text-surface-500 mt-1">Moderate</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold text-info-500">{stats.newAlerts}</div>
            <div className="text-xs text-surface-500 mt-1">Pending Review</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold text-primary-600">{stats.averageAuthenticityScore}</div>
            <div className="text-xs text-surface-500 mt-1">Avg Score</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold text-surface-600">{stats.totalSessions}</div>
            <div className="text-xs text-surface-500 mt-1">Total Sessions</div>
          </div>
        </div>
      )}

      {/* Alerts & Review Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Alerts Feed */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="card-title text-base flex items-center gap-2">
              Active Anomaly Queue
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </h2>
            <button onClick={() => { refetch(); refetchStats(); }} className="btn-ghost text-xs py-1">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
            </div>
          ) : alerts?.data?.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <ShieldCheck className="w-12 h-12 text-success-500 mx-auto mb-3" />
              <h3 className="font-semibold text-lg">Integrity Queue Clear</h3>
              <p className="text-surface-500 mt-1 text-sm">
                No active assessment integrity anomalies require immediate review.
              </p>
            </div>
          ) : (
            alerts?.data?.map((alert: any, i: number) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.4) }}
                onClick={() => setSelectedAlert(alert)}
                className={`glass-card p-4 cursor-pointer hover:shadow-md transition-all ${
                  severityColors[alert.severity] || ''
                } ${selectedAlert?.id === alert.id ? 'ring-2 ring-primary-500' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {alert.severity === 'critical' ? (
                      <ShieldAlert className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={riskColors[alert.severity]}>{alert.severity.toUpperCase()}</span>
                        <span className="font-medium text-sm text-surface-900 dark:text-white">
                          {alert.session?.student?.name}
                        </span>
                        <span className="text-xs text-surface-400 font-mono">
                          {alert.session?.student?.studentId}
                        </span>
                      </div>
                      <p className="text-sm text-surface-600 dark:text-surface-300 line-clamp-2">
                        {alert.description}
                      </p>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="text-xs text-surface-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(alert.createdAt).toLocaleString()}
                        </span>
                        <span
                          className={`badge text-[11px] ${
                            alert.status === 'new'
                              ? 'badge-warning'
                              : alert.status === 'reviewed'
                              ? 'badge-success'
                              : 'badge-primary'
                          }`}
                        >
                          Status: {alert.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 pl-3">
                    <div className="text-lg font-bold text-danger-500 font-mono">
                      {Math.max(0, Math.round(100 - alert.score))}/100
                    </div>
                    <div className="text-[10px] uppercase text-surface-400 font-semibold">Auth Score</div>
                  </div>
                </div>

                {/* Contributing Signals Chips */}
                <div className="flex flex-wrap gap-1.5 mt-3 ml-8">
                  {JSON.parse(alert.signals || '[]').map((signal: string) => (
                    <span key={signal} className="badge badge-neutral text-xs flex items-center gap-1">
                      {signalIcons[signal] || <Code2 className="w-3.5 h-3.5" />}
                      {signal.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* AI Explainability & Human Review Side-Drawer */}
        {selectedAlert && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full lg:w-[440px] glass-card p-5 h-fit sticky top-20 space-y-4 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-surface-200 dark:border-surface-700 pb-3">
              <h3 className="card-title text-base">Anomaly Investigation</h3>
              <button onClick={() => setSelectedAlert(null)} className="text-surface-400 hover:text-surface-600 text-lg">
                ×
              </button>
            </div>

            {/* Candidate Info */}
            <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800">
              <div className="font-semibold text-sm text-surface-900 dark:text-white">
                {selectedAlert.session?.student?.name}
              </div>
              <div className="text-xs text-surface-500 mt-0.5">
                {selectedAlert.session?.student?.studentId} • {selectedAlert.session?.assessmentName}
              </div>
            </div>

            {/* 1. Behavioral Risk Breakdown */}
            <div className="p-3.5 rounded-xl bg-surface-50 dark:bg-surface-800/70 border border-surface-200 dark:border-surface-700 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-surface-900 dark:text-white">
                <div className="flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-primary-500" />
                  BEHAVIORAL TELEMETRY HEURISTICS
                </div>
                <span className="text-[10px] text-surface-400 font-mono">telemetry-engine-v2.0</span>
              </div>
              <p className="text-xs text-surface-600 dark:text-surface-300 leading-relaxed">
                {aiReport?.behavioralRiskBreakdown?.technicalHeuristics || 'Telemetry signals compiled from candidate editor events.'}
              </p>
              {aiReport?.behavioralRiskBreakdown?.contributingFactors?.length > 0 && (
                <div className="pt-1.5 border-t border-surface-200 dark:border-surface-700 space-y-1">
                  <div className="text-[11px] font-semibold text-surface-500 uppercase">Contributing Signal Penalties:</div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-surface-600 dark:text-surface-400">
                    {aiReport.behavioralRiskBreakdown.contributingFactors.map((factor: string, idx: number) => (
                      <li key={idx}>{factor}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* 2. Generative AI Section */}
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-primary-50/50 to-indigo-50/30 dark:from-primary-950/20 dark:to-indigo-950/20 border border-primary-100 dark:border-primary-900/40 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-primary-700 dark:text-primary-300">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary-500" />
                  GENERATIVE AI ANALYSIS
                </div>
                <span className="text-[10px] text-surface-400 font-mono">
                  {aiReport?.aiProvider ? `${aiReport.aiProvider} (${aiReport.aiModel})` : 'Unconfigured'}
                </span>
              </div>

              {loadingAi ? (
                <div className="space-y-1.5 py-1">
                  <div className="skeleton h-3.5 w-full" />
                  <div className="skeleton h-3.5 w-3/4" />
                </div>
              ) : (
                <p className="text-xs text-surface-700 dark:text-surface-300 leading-relaxed whitespace-pre-wrap">
                  {aiReport?.generativeExplanation || 'Generative AI analysis unavailable: Configure GEMINI_API_KEY or OPENAI_API_KEY in server environment.'}
                </p>
              )}
            </div>

            {/* Human Review Form */}
            <div>
              <label className="text-xs font-semibold text-surface-500 uppercase mb-1.5 block">
                Administrator Review Decision Note
              </label>
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Document your review findings and decision rationale..."
                className="input-field h-20 resize-none text-xs"
              />
            </div>

            {/* Review Action Buttons */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                onClick={() => handleReview(selectedAlert.id, 'reviewed')}
                className="btn bg-success-50 text-success-700 hover:bg-success-100 dark:bg-success-900/20 dark:text-success-400 text-xs py-2"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Reviewed
              </button>
              <button
                onClick={() => handleReview(selectedAlert.id, 'escalated')}
                className="btn bg-warning-50 text-warning-700 hover:bg-warning-100 dark:bg-warning-900/20 dark:text-warning-400 text-xs py-2"
              >
                <ArrowUpCircle className="w-3.5 h-3.5" /> Escalate
              </button>
              <button
                onClick={() => handleReview(selectedAlert.id, 'dismissed')}
                className="btn bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-400 text-xs py-2"
              >
                <XCircle className="w-3.5 h-3.5" /> Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
