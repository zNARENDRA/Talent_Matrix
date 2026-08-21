import React, { useState, useEffect } from 'react';
import {
  Users, CheckCircle2, XCircle, Award, Search,
  Filter, History, RefreshCw, Star, ArrowRight, ShieldAlert, Sparkles
} from 'lucide-react';
import { api } from '../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell
} from '../components/ui/table';
import { cn } from '../lib/utils';

export const SelectionStudio: React.FC = () => {
  const [drives, setDrives] = useState<any[]>([]);
  const [selectedDriveId, setSelectedDriveId] = useState<string>('');
  const [driveData, setDriveData] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'candidates' | 'logs'>('candidates');
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Scoring modal
  const [scoringCandidate, setScoringCandidate] = useState<any>(null);
  const [evalScore, setEvalScore] = useState<number>(85);
  const [evalNotes, setEvalNotes] = useState<string>('');
  const [submittingScore, setSubmittingScore] = useState<boolean>(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    loadDrives();
    loadLogs();
  }, []);

  useEffect(() => {
    if (selectedDriveId) {
      loadDriveCandidates(selectedDriveId);
    }
  }, [selectedDriveId]);

  const loadDrives = async () => {
    try {
      setLoading(true);
      const res = await api.getDrives();
      const list = res.data || [];
      setDrives(list);
      if (list.length > 0) {
        setSelectedDriveId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load drives:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDriveCandidates = async (driveId: string) => {
    try {
      setLoading(true);
      const res = await api.getSelectionCandidates(driveId);
      setDriveData(res.drive);
      setCandidates(res.evaluatedCandidates || []);
    } catch (err) {
      console.error('Failed to load candidates:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      const res = await api.getSelectionLogs({ limit: '50' });
      setLogs(res.data || []);
    } catch (err) {
      console.error('Failed to load selection logs:', err);
    }
  };

  const handleDecision = async (student: any, decision: string, reason?: string) => {
    const studentIdToPass = student.studentDbId || student.id || student.studentId;
    const defaultReason = decision === 'DESELECTED' ? 'TPO_MANUAL_DESELECTION' : 'SELECTION_APPROVED';
    const finalReason = reason || defaultReason;

    // Optimistic instant local state update
    setUpdatingId(studentIdToPass);
    setCandidates((prev) =>
      prev.map((c) => {
        if (
          (c.studentDbId && c.studentDbId === studentIdToPass) ||
          (c.studentId && c.studentId === studentIdToPass) ||
          (c.id && c.id === studentIdToPass)
        ) {
          return {
            ...c,
            decision: decision as any,
            deselectionReason: decision === 'DESELECTED' ? finalReason : undefined,
          };
        }
        return c;
      })
    );

    try {
      await api.recordSelectionDecision(selectedDriveId, {
        studentId: studentIdToPass,
        decision,
        reason: finalReason,
      });
      loadLogs();
    } catch (err: any) {
      alert(`Error updating decision: ${err.message}`);
      loadDriveCandidates(selectedDriveId);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleScoreSubmit = async () => {
    if (!scoringCandidate) return;
    try {
      setSubmittingScore(true);
      await api.submitRecruiterScores(selectedDriveId, {
        studentId: scoringCandidate.studentDbId || scoringCandidate.studentId,
        score: evalScore,
        notes: evalNotes,
      });
      setScoringCandidate(null);
      loadDriveCandidates(selectedDriveId);
      loadLogs();
    } catch (err: any) {
      alert(`Error submitting score: ${err.message}`);
    } finally {
      setSubmittingScore(false);
    }
  };

  const filteredCandidates = candidates.filter((c) => {
    const matchSearch =
      c.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.studentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.department?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' ? true : c.decision === statusFilter;
    return matchSearch && matchStatus;
  });

  const getDecisionBadge = (decision: string, reason?: string) => {
    switch (decision) {
      case 'SELECTED':
        return <Badge variant="success">Selected (Ranked)</Badge>;
      case 'SHORTLISTED':
        return <Badge variant="info">Shortlisted</Badge>;
      case 'DESELECTED':
        return (
          <div className="flex flex-col items-start gap-0.5">
            <Badge variant="destructive">Deselected</Badge>
            {reason && <span className="text-[10px] text-muted-foreground">{reason.replace(/_/g, ' ')}</span>}
          </div>
        );
      case 'INELIGIBLE':
        return (
          <div className="flex flex-col items-start gap-0.5">
            <Badge variant="warning">Ineligible</Badge>
            {reason && <span className="text-[10px] text-amber-500">{reason}</span>}
          </div>
        );
      default:
        return <Badge variant="outline">{decision}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Selection & Deselection Studio
            </h1>
            <Badge variant="brand" className="font-semibold text-xs">
              Deterministic Roster
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Transparent composite scoring, recruiter score adjustments, shortlisting cutoffs, and audit-backed deselection tracking.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
          <Button
            variant={activeTab === 'candidates' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('candidates')}
            className="text-xs font-semibold"
          >
            <Users className="w-3.5 h-3.5 mr-1.5" /> Candidate Roster
          </Button>
          <Button
            variant={activeTab === 'logs' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('logs')}
            className="text-xs font-semibold"
          >
            <History className="w-3.5 h-3.5 mr-1.5" /> Audit Log ({logs.length})
          </Button>
        </div>
      </div>

      {activeTab === 'candidates' ? (
        <>
          {/* Target Recruitment Drive Selector Card */}
          <Card>
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Recruitment Drive:
                </label>
                <select
                  value={selectedDriveId}
                  onChange={(e) => setSelectedDriveId(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {drives.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.company?.name || d.companyName} — {d.role} (₹{d.packageLpa} LPA, {d.offerTier})
                    </option>
                  ))}
                </select>
              </div>

              {driveData && (
                <div className="flex items-center gap-3 text-xs">
                  <Badge variant="outline" className="gap-1.5 font-mono">
                    <Award className="w-3.5 h-3.5 text-indigo-500" />
                    Quota: <strong className="text-foreground">{driveData.quota}</strong> seats
                  </Badge>
                  <Badge variant="outline" className="font-mono">
                    Min GPA: <strong className="text-foreground">{driveData.minGpa}</strong>
                  </Badge>
                  <Badge variant="brand" className="uppercase font-mono">
                    {driveData.tier} Tier
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
              <Input
                type="text"
                placeholder="Search candidate name, ID, dept..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">All Decision Statuses</option>
                <option value="SELECTED">Selected</option>
                <option value="SHORTLISTED">Shortlisted</option>
                <option value="DESELECTED">Deselected</option>
                <option value="INELIGIBLE">Ineligible</option>
              </select>
              <Button
                variant="outline"
                size="iconSm"
                onClick={() => loadDriveCandidates(selectedDriveId)}
                title="Refresh Candidates"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Candidate Evaluation Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center w-16">Rank</TableHead>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Dept & GPA</TableHead>
                    <TableHead>Skill Match</TableHead>
                    <TableHead>Recruiter Score</TableHead>
                    <TableHead>Composite</TableHead>
                    <TableHead>Decision</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        <div className="inline-flex items-center gap-2 text-xs">
                          <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                          Evaluating applicants with deterministic formula...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredCandidates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground text-xs">
                        No candidate applications found matching current criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCandidates.map((c) => (
                      <TableRow key={c.studentId}>
                        <TableCell className="text-center font-bold font-mono text-muted-foreground text-xs">
                          {c.rank <= 999 ? `#${c.rank}` : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-foreground">{c.studentName}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{c.studentId}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-foreground font-medium">{c.department}</div>
                          <div className="text-[11px] font-bold text-indigo-500 font-mono">{c.gpa.toFixed(2)} GPA</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-secondary rounded-full h-1.5 overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full',
                                  c.skillScore >= 80 ? 'bg-emerald-500' : c.skillScore >= 60 ? 'bg-indigo-500' : 'bg-amber-500'
                                )}
                                style={{ width: `${c.skillScore}%` }}
                              />
                            </div>
                            <span className="font-mono font-bold text-xs text-foreground">{c.skillScore}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold font-mono text-foreground text-xs">{c.recruiterScore || '—'}</span>
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() => {
                                setScoringCandidate(c);
                                setEvalScore(c.recruiterScore || 80);
                              }}
                              className="h-auto p-0 text-[11px] font-semibold text-primary ml-1"
                            >
                              Edit
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono font-extrabold text-emerald-500 text-xs">
                          {c.compositeScore?.toFixed(1) || '—'}
                        </TableCell>
                        <TableCell>
                          {getDecisionBadge(c.decision, c.deselectionReason)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant={c.decision === 'SELECTED' ? 'success' : 'outline'}
                              size="iconSm"
                              onClick={() => handleDecision(c, 'SELECTED')}
                              disabled={updatingId === (c.studentDbId || c.studentId)}
                              title="Select Candidate"
                              className={cn(
                                c.decision === 'SELECTED' ? 'bg-emerald-600 text-white' : 'hover:border-emerald-500 hover:text-emerald-500'
                              )}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant={c.decision === 'DESELECTED' ? 'destructive' : 'outline'}
                              size="iconSm"
                              onClick={() => handleDecision(c, 'DESELECTED', 'TPO_MANUAL_OVERRIDE')}
                              disabled={updatingId === (c.studentDbId || c.studentId)}
                              title="Deselect Candidate"
                              className={cn(
                                c.decision === 'DESELECTED' ? 'bg-rose-600 text-white' : 'hover:border-rose-500 hover:text-rose-500'
                              )}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        /* Deselection Audit Log View */
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-500" />
                  Candidate Decision & Deselection Audit Trail
                </CardTitle>
                <CardDescription>Full record of algorithmic scoring and manual administrative overrides</CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                {logs.length} logged events
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border px-6">
              {logs.length === 0 ? (
                <p className="text-xs text-muted-foreground py-8 text-center">No selection logs recorded yet.</p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-2 h-2 rounded-full',
                          log.decision === 'SELECTED'
                            ? 'bg-emerald-500'
                            : log.decision === 'DESELECTED'
                            ? 'bg-rose-500'
                            : 'bg-indigo-500'
                        )}
                      />
                      <div>
                        <span className="font-bold text-foreground">{log.student?.name || log.studentId}</span>
                        <span className="text-[11px] text-muted-foreground ml-2 font-mono">({log.student?.studentId || log.studentId})</span>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {log.drive?.company?.name} — {log.drive?.role} | Decision: <strong className="text-foreground font-semibold">{log.decision}</strong> ({log.reason || 'None'})
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {log.source || 'SYSTEM'}
                      </Badge>
                      <p className="text-[10px] text-muted-foreground mt-1 font-mono">{new Date(log.createdAt).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recruiter Scoring Modal */}
      <Dialog open={!!scoringCandidate} onOpenChange={(open) => !open && setScoringCandidate(null)}>
        {scoringCandidate && (
          <div>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Star className="w-5 h-5 text-amber-500" />
                Recruiter Evaluation: {scoringCandidate.studentName}
              </DialogTitle>
              <DialogDescription>
                Adjust evaluator score for {driveData?.companyName} ({driveData?.role}).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-4">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span className="text-foreground">Recruiter Score (0 - 100)</span>
                  <span className="text-primary font-mono text-sm font-bold">{evalScore}/100</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={evalScore}
                  onChange={(e) => setEvalScore(Number(e.target.value))}
                  className="w-full accent-primary h-2 bg-secondary rounded-lg"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Evaluation & Feedback Notes</label>
                <textarea
                  value={evalNotes}
                  onChange={(e) => setEvalNotes(e.target.value)}
                  placeholder="Exceptional data structure foundations, strong communication..."
                  rows={3}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setScoringCandidate(null)} size="sm">
                Cancel
              </Button>
              <Button onClick={handleScoreSubmit} disabled={submittingScore} size="sm" variant="brand">
                {submittingScore ? 'Saving...' : 'Save Evaluation'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>
    </div>
  );
};
export default SelectionStudio;
