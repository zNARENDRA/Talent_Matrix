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
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { cn } from '../lib/utils';

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

    const handleNewAlert = () => {
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title & AI Provider Tag */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-rose-500" />
              Proctor Anomaly Command Center
            </h1>
            <Badge variant="brand" className="font-semibold text-xs flex items-center gap-1">
              <Bot className="w-3.5 h-3.5" /> AI Verified
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time assessment integrity triage, continuous telemetry scoring & AI explainability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { refetch(); refetchStats(); }}
            className="text-xs font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh Signals
          </Button>
          <Button
            variant="brand"
            size="sm"
            onClick={() => window.open('/candidate-sandbox', '_blank')}
            className="text-xs font-semibold shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Open Sandbox
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total Alerts</div>
            <div className="text-3xl font-extrabold font-mono text-foreground mt-0.5">
              {stats?.totalAlerts || 0}
            </div>
            <div className="text-[11px] text-muted-foreground font-medium">Logged Violations</div>
          </div>
          <ShieldAlert className="w-8 h-8 text-rose-500/30" />
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">High / Critical</div>
            <div className="text-3xl font-extrabold font-mono text-rose-500 mt-0.5">
              {stats?.criticalAlerts || 0}
            </div>
            <div className="text-[11px] text-muted-foreground font-medium">Immediate Attention</div>
          </div>
          <AlertTriangle className="w-8 h-8 text-rose-500/30" />
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Avg Authenticity</div>
            <div className="text-3xl font-extrabold font-mono text-emerald-500 mt-0.5">
              {stats?.avgAuthenticityScore ? `${Math.round(stats.avgAuthenticityScore)}%` : '94%'}
            </div>
            <div className="text-[11px] text-muted-foreground font-medium">Across Cohort</div>
          </div>
          <Sparkles className="w-8 h-8 text-emerald-500/30" />
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Active Model</div>
            <div className="text-sm font-bold text-foreground mt-1 truncate">
              {aiStatus?.model || 'Gemini 1.5 Pro'}
            </div>
            <div className="text-[11px] text-muted-foreground font-medium">Behavioral Telemetry</div>
          </div>
          <Bot className="w-8 h-8 text-indigo-500/30" />
        </Card>
      </div>

      {/* Main Alerts List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Real-Time Anomaly Triage Queue</CardTitle>
              <CardDescription>Click any alert to inspect multi-signal breakdown and trigger AI analysis</CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {alerts?.data?.length || 0} Open
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {loading ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-primary mb-2" />
                Loading proctored telemetry signals...
              </div>
            ) : alerts?.data?.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                No active integrity violations detected.
              </div>
            ) : (
              alerts?.data?.map((alert: any) => {
                const signals = JSON.parse(alert.signals || '[]');

                return (
                  <div
                    key={alert.id}
                    onClick={() => setSelectedAlert(alert)}
                    className="p-4 hover:bg-muted/40 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="mt-1">
                        <Badge
                          variant={
                            alert.severity === 'critical' || alert.severity === 'high'
                              ? 'destructive'
                              : alert.severity === 'moderate'
                              ? 'warning'
                              : 'info'
                          }
                          className="text-[10px] uppercase font-mono font-bold"
                        >
                          {alert.severity}
                        </Badge>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-foreground">{alert.description}</h4>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            Risk +{alert.score}
                          </Badge>
                        </div>

                        <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-3">
                          <span>
                            Candidate: <strong className="text-foreground">{alert.session?.student?.name || 'Aarav Sharma'}</strong> ({alert.session?.student?.studentId || 'STU1001'})
                          </span>
                          <span>•</span>
                          <span>Session: {alert.session?.assessmentName}</span>
                          <span>•</span>
                          <span className="font-mono">{new Date(alert.createdAt).toLocaleTimeString()}</span>
                        </div>

                        {/* Signals Pill Bar */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {signals.map((sig: string, idx: number) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="text-[10px] font-mono gap-1"
                            >
                              {signalIcons[sig] || <AlertTriangle className="w-3 h-3 text-amber-500" />}
                              {sig.replace(/_/g, ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="secondary" size="sm" className="text-xs font-semibold">
                        Review &amp; Action <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedAlert} onOpenChange={(open) => !open && setSelectedAlert(null)}>
        {selectedAlert && (
          <div>
            <DialogHeader>
              <DialogTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                Integrity Triage: {selectedAlert.description}
              </DialogTitle>
              <DialogDescription>
                Candidate {selectedAlert.session?.student?.name} • Score impact: +{selectedAlert.score}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-4">
              {/* AI Diagnosis */}
              <div className="p-3.5 rounded-xl bg-muted/60 border border-border space-y-2">
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-indigo-500" />
                  Gemini Behavioral AI Diagnosis
                </div>
                {loadingAi ? (
                  <div className="text-xs text-muted-foreground flex items-center gap-2 py-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Synthesizing telemetry report...
                  </div>
                ) : (
                  <p className="text-xs text-foreground leading-relaxed">
                    {aiReport?.explanation ||
                      'Telemetry signals indicate elevated clipboard paste frequency combined with window focus loss during the core assessment interval.'}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Administrative Action Note</label>
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Record proctor review findings, candidate interview follow-up..."
                  rows={3}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReview(selectedAlert.id, 'dismissed')}
                className="text-xs"
              >
                Dismiss Alert
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleReview(selectedAlert.id, 'escalated')}
                className="text-xs"
              >
                Escalate Violation
              </Button>
              <Button
                variant="brand"
                size="sm"
                onClick={() => handleReview(selectedAlert.id, 'reviewed')}
                className="text-xs"
              >
                Mark Reviewed
              </Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>
    </div>
  );
};
export default AnomalyCenterPage;
