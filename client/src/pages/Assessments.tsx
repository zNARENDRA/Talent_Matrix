import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import {
  Code2, Clock, ShieldCheck, AlertTriangle, Eye, Activity,
  Clipboard, MonitorX, Keyboard, ChevronRight, Terminal, ArrowUpRight,
  RefreshCw, CheckCircle2, XCircle, Sparkles, User, Copy, Check,
  FileCode, Play, Award, Zap, AlertCircle, ShieldAlert, BrainCircuit
} from 'lucide-react';

const riskColors: Record<string, string> = {
  normal: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  low: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  moderate: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  high: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
  critical: 'bg-red-500/20 text-red-300 border border-red-500/50 animate-pulse',
};

const eventIcons: Record<string, React.ReactNode> = {
  keystroke: <Keyboard className="w-3.5 h-3.5 text-zinc-400" />,
  paste: <Clipboard className="w-3.5 h-3.5 text-amber-400" />,
  tab_blur: <MonitorX className="w-3.5 h-3.5 text-rose-400" />,
  code_insert: <Code2 className="w-3.5 h-3.5 text-purple-400" />,
  tab_focus: <Eye className="w-3.5 h-3.5 text-blue-400" />,
  submission: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
  webcam_multiple_faces: <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />,
  webcam_face_absence: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
  idle: <Clock className="w-3.5 h-3.5 text-zinc-500" />,
};

export const AssessmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: sessionsData, loading, refetch } = useApi(() => api.getAssessments());
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);

  const { data: sessionDetail, loading: detailLoading, refetch: refetchDetail } = useApi(
    () => (selectedSessionId ? api.getAssessment(selectedSessionId) : Promise.resolve(null)),
    [selectedSessionId]
  );

  // Live WebSocket auto-refresh for proctors
  useEffect(() => {
    const socket = getSocket();

    const handleUpdate = () => {
      refetch();
      if (selectedSessionId) refetchDetail();
    };

    socket.on('telemetry:event', handleUpdate);
    socket.on('score:update', handleUpdate);
    socket.on('anomaly:new', handleUpdate);

    return () => {
      socket.off('telemetry:event', handleUpdate);
      socket.off('score:update', handleUpdate);
      socket.off('anomaly:new', handleUpdate);
    };
  }, [selectedSessionId]);

  const sessions = sessionsData?.data || [];

  // Summary Metrics
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter((s: any) => s.status === 'completed').length;
  const highRiskSessions = sessions.filter((s: any) => s.riskLevel === 'high' || s.riskLevel === 'critical').length;
  const avgAuthenticity = totalSessions > 0
    ? Math.round(sessions.reduce((a: number, b: any) => a + (b.authenticityScore || 100), 0) / totalSessions)
    : 100;

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleGenerateAIReport = async () => {
    if (!selectedSessionId) return;
    setIsGeneratingAI(true);
    try {
      const res = await api.getAssessmentAIAnalysis(selectedSessionId);
      setAiAnalysisResult(res.aiReport);
    } catch (err: any) {
      alert('Failed to generate AI report: ' + err.message);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* ─── 1. TOP HEADER & SANDBOX LAUNCHER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Code2 className="w-7 h-7 text-indigo-500" /> Coding Assessments &amp; Proctoring Hub
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Proctoring Active
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Real-time candidate assessment monitoring, test execution verdicts, keystroke dynamics, and AI computer-vision telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors cursor-pointer"
            title="Refresh assessment sessions"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => navigate('/candidate-sandbox')}
            className="btn-primary text-xs py-2 px-4 flex items-center gap-2 shadow-md shadow-indigo-500/20 cursor-pointer"
          >
            <Terminal className="w-4 h-4" />
            <span>Launch Candidate Sandbox (Test Preview)</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ─── 2. KPI SUMMARY METRICS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-1">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total Test Sessions</span>
          <div className="text-2xl font-extrabold font-mono text-white">{totalSessions}</div>
          <p className="text-[11px] text-zinc-500">Initiated on platform</p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-1">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Completed Submissions</span>
          <div className="text-2xl font-extrabold font-mono text-emerald-400">{completedSessions}</div>
          <p className="text-[11px] text-zinc-500">Graded with code verdicts</p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-1">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Average Authenticity</span>
          <div className="text-2xl font-extrabold font-mono text-indigo-400">{avgAuthenticity}%</div>
          <p className="text-[11px] text-zinc-500">Keystroke & biometric match</p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-1">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Flagged High-Risk</span>
          <div className={`text-2xl font-extrabold font-mono ${highRiskSessions > 0 ? 'text-rose-400' : 'text-zinc-400'}`}>
            {highRiskSessions}
          </div>
          <p className="text-[11px] text-zinc-500">Anomaly alerts escalated</p>
        </div>
      </div>

      {/* ─── 3. MAIN SESSIONS TABLE & INSPECTOR DRAWER ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Center: Sessions Table */}
        <div className={`${selectedSessionId ? 'lg:col-span-7' : 'lg:col-span-12'} glass-card overflow-hidden transition-all`}>
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" /> Candidate Evaluation Sessions
            </h3>
            <span className="text-xs font-mono text-zinc-400">{sessions.length} records</span>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-6 space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-12 bg-zinc-800/40 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-xs italic">
                No assessment sessions recorded yet. Launch the Candidate Sandbox above to test.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Assessment &amp; Problem</th>
                    <th>Evaluation Verdict</th>
                    <th>Authenticity</th>
                    <th>Integrity Risk</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session: any) => {
                    const isSelected = selectedSessionId === session.id;
                    const sub = session.submission;

                    return (
                      <tr
                        key={session.id}
                        onClick={() => {
                          setSelectedSessionId(session.id);
                          setAiAnalysisResult(null);
                        }}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-indigo-500/10 border-indigo-500/40' : 'hover:bg-zinc-800/40'
                        }`}
                      >
                        <td>
                          <div className="font-semibold text-white text-xs">{session.student?.name || 'Candidate'}</div>
                          <div className="text-[11px] text-zinc-400 font-mono">{session.student?.studentId} • {session.student?.department}</div>
                        </td>

                        <td>
                          <div className="text-xs font-semibold text-zinc-200 truncate max-w-[200px]">
                            {sub?.problemTitle || session.assessmentName}
                          </div>
                          <div className="text-[10px] text-zinc-500 font-mono">
                            {new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        <td>
                          {sub ? (
                            <span
                              className={`px-2 py-0.5 rounded-md text-[11px] font-bold font-mono border inline-flex items-center gap-1 ${
                                sub.allPassed
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                              }`}
                            >
                              {sub.allPassed ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {sub.passedCount} / {sub.totalCount} Passed ({sub.runtimeMs}ms)
                            </span>
                          ) : (
                            <span className="text-[11px] text-zinc-500 italic">In Progress...</span>
                          )}
                        </td>

                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  session.authenticityScore >= 80
                                    ? 'bg-emerald-500'
                                    : session.authenticityScore >= 50
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`}
                                style={{ width: `${session.authenticityScore}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold font-mono text-white">
                              {Math.round(session.authenticityScore)}%
                            </span>
                          </div>
                        </td>

                        <td>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase ${riskColors[session.riskLevel] || 'bg-zinc-800 text-zinc-400'}`}>
                            {session.riskLevel}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase font-mono ${
                              session.status === 'completed'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                            }`}
                          >
                            {session.status}
                          </span>
                        </td>

                        <td>
                          <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'text-indigo-400 translate-x-1' : 'text-zinc-500'}`} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Pane: Session Detail & Submitted Code Inspector */}
        {selectedSessionId && sessionDetail && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-5 glass-card p-5 space-y-4 max-h-[85vh] overflow-y-auto sticky top-4 border-indigo-500/30 shadow-2xl"
          >
            {/* Inspector Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">{sessionDetail.student?.name}</h3>
                  <p className="text-[11px] text-zinc-400 font-mono">
                    {sessionDetail.student?.studentId} • {sessionDetail.student?.department} • GPA {sessionDetail.student?.gpa}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSessionId(null)}
                className="text-zinc-400 hover:text-white p-1 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            {/* Score & Verdict Card */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-center space-y-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block font-sans">
                  Authenticity Score
                </span>
                <div
                  className={`text-2xl font-extrabold font-mono ${
                    sessionDetail.authenticityScore >= 80
                      ? 'text-emerald-400'
                      : sessionDetail.authenticityScore >= 50
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {Math.round(sessionDetail.authenticityScore)}/100
                </div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${riskColors[sessionDetail.riskLevel]}`}>
                  {sessionDetail.riskLevel} Risk
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-center space-y-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block font-sans">
                  Submission Verdict
                </span>
                {sessionDetail.submission ? (
                  <>
                    <div className="text-xl font-extrabold font-mono text-emerald-400">
                      {sessionDetail.submission.passedCount} / {sessionDetail.submission.totalCount} Passed
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono block">
                      Runtime: {sessionDetail.submission.runtimeMs}ms
                    </span>
                  </>
                ) : (
                  <div className="text-sm font-semibold text-indigo-400 py-2">Test In Progress</div>
                )}
              </div>
            </div>

            {/* Candidate Submitted Code Block */}
            {sessionDetail.submission ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-indigo-400" /> Submitted Solution Code
                  </span>
                  {sessionDetail.events?.find((e: any) => e.eventType === 'submission') && (
                    <button
                      onClick={() => {
                        const subEvent = sessionDetail.events.find((e: any) => e.eventType === 'submission');
                        const data = typeof subEvent?.data === 'string' ? JSON.parse(subEvent.data) : subEvent?.data;
                        if (data?.code) handleCopyCode(data.code);
                      }}
                      className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer font-bold"
                    >
                      {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                    </button>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 max-h-56 overflow-auto font-mono text-xs text-zinc-200">
                  {(() => {
                    const subEvent = sessionDetail.events?.find((e: any) => e.eventType === 'submission');
                    const data = typeof subEvent?.data === 'string' ? JSON.parse(subEvent.data) : subEvent?.data;
                    return (
                      <pre className="whitespace-pre-wrap leading-relaxed select-text">
                        {data?.code || '// Code captured during execution'}
                      </pre>
                    );
                  })()}
                </div>
              </div>
            ) : null}

            {/* AI Code Authenticity Report (Gemini Powered) */}
            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <BrainCircuit className="w-3.5 h-3.5 text-purple-400" /> AI Proctor Integrity Analysis
                </span>
                <button
                  onClick={handleGenerateAIReport}
                  disabled={isGeneratingAI}
                  className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{isGeneratingAI ? 'Analyzing...' : 'Generate AI Report'}</span>
                </button>
              </div>

              {aiAnalysisResult ? (
                <div className="p-3 rounded-lg bg-zinc-950 border border-purple-500/30 text-xs space-y-2">
                  <div className="font-bold text-purple-300 flex items-center justify-between">
                    <span>Authenticity Rating: {aiAnalysisResult.authenticityRating || 'Authentic'}</span>
                    <span className="font-mono text-white">{aiAnalysisResult.confidenceScore || 95}% Confidence</span>
                  </div>
                  <p className="text-zinc-300 text-[11px] leading-relaxed">
                    {aiAnalysisResult.summary || aiAnalysisResult.analysis || 'Analysis verified authentic student coding patterns.'}
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-zinc-400">
                  Google Gemini neural telemetry analysis evaluates flight time intervals, keystroke rhythm, and tab visibility anomalies.
                </p>
              )}
            </div>

            {/* Alerts if any */}
            {sessionDetail.alerts?.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Proctoring Alerts ({sessionDetail.alerts.length})
                </span>
                <div className="space-y-1.5">
                  {sessionDetail.alerts.map((alert: any) => (
                    <div
                      key={alert.id}
                      className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-bold text-amber-300">
                        <span className="capitalize">{alert.severity} Risk Warning</span>
                        <span className="text-[10px] font-mono">{new Date(alert.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-zinc-300 text-[11px]">{alert.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Real-Time Activity & Telemetry Timeline */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-400" /> Telemetry Stream ({sessionDetail.events?.length || 0} events)
              </span>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {sessionDetail.events?.slice(0, 40).map((event: any) => {
                  const eventData = typeof event.data === 'string' ? JSON.parse(event.data || '{}') : event.data;
                  return (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {eventIcons[event.eventType] || <Activity className="w-3.5 h-3.5 text-zinc-400" />}
                        <span className="font-semibold text-zinc-200 capitalize">
                          {event.eventType.replace(/_/g, ' ')}
                        </span>
                        {event.eventType === 'paste' && (
                          <span className="text-amber-400 font-mono text-[10px]">({eventData.size} chars)</span>
                        )}
                        {event.eventType === 'tab_blur' && (
                          <span className="text-rose-400 font-mono text-[10px]">({eventData.duration}s defocus)</span>
                        )}
                        {event.eventType === 'webcam_multiple_faces' && (
                          <span className="text-rose-400 font-mono text-[10px]">({eventData.faceCount} faces detected)</span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
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
export default AssessmentsPage;
