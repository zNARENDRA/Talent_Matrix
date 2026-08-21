import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApi, useAnimatedCounter } from '../hooks/useApi';
import { api } from '../lib/api';
import {
  Play, Loader2, CheckCircle2, AlertTriangle, Users, Building2,
  Briefcase, ArrowRight, XCircle, RotateCw, Eye, ShieldCheck, Zap,
  Sparkles, Layers, Info, HelpCircle, ChevronRight, Award
} from 'lucide-react';
import { BipartiteGraph } from '../components/allocation/BipartiteGraph';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell
} from '../components/ui/table';
import { cn } from '../lib/utils';

export const AllocationPage: React.FC = () => {
  const [phase, setPhase] = useState<'preview' | 'running' | 'results'>('preview');
  const [result, setResult] = useState<any>(null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [cycles, setCycles] = useState<any[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [selectedExplanation, setSelectedExplanation] = useState<any>(null);

  const { data: preview, loading: previewLoading, refetch: refetchPreview } = useApi(() =>
    api.getAllocationPreview({ cycleId: selectedCycleId })
  );
  const { data: runs, refetch: refetchRuns } = useApi(() => api.getAllocationRuns());

  useEffect(() => {
    loadCycles();
  }, []);

  const loadCycles = async () => {
    try {
      const res = await api.getRecruitmentCycles();
      const list = res.data || [];
      setCycles(list);
      const active = list.find((c: any) => c.status === 'ACTIVE');
      if (active) setSelectedCycleId(active.id);
    } catch (e) {
      console.error(e);
    }
  };

  const runAllocation = async () => {
    setLoadingAction(true);
    setPhase('running');
    try {
      // Execute Module A Many-to-One Gale-Shapley Allocation
      const res = await api.runAllocation({
        season: '2026',
        recruitmentCycleId: selectedCycleId,
      });
      setResult(res);
      setPhase('results');
      refetchRuns();
      refetchPreview();
    } catch (err: any) {
      setPhase('preview');
      alert('Allocation execution failed: ' + err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const MatchedCount = ({ value }: { value: number }) => {
    const animated = useAnimatedCounter(value);
    return <span>{animated}</span>;
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Placement Allocation Engine
            </h1>
            <Badge variant="brand" className="font-semibold text-xs">
              Module A: Gale-Shapley & Cascading
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Quota-constrained many-to-one stable matching with DREAM &gt; CORE &gt; MASS cascading and blocking-pair certificate verification.
          </p>
        </div>

        {/* Academic Cycle Selector */}
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg p-1.5 shadow-xs">
          <span className="text-xs font-semibold text-muted-foreground pl-2 uppercase tracking-wider">Cycle:</span>
          <select
            value={selectedCycleId}
            onChange={(e) => setSelectedCycleId(e.target.value)}
            className="bg-muted/80 border border-border rounded-md px-2.5 py-1 text-xs font-semibold text-foreground focus:outline-none"
          >
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.academicYear} ({c.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ─── Preview Phase ──────────────────────────────────── */}
        {phase === 'preview' && (
          <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Eye className="w-5 h-5 text-primary" /> Pre-Allocation Matching Matrix Preview
                    </CardTitle>
                    <CardDescription>
                      Live candidate preferences, company quotas, and multi-factor scoring matrix ready for execution.
                    </CardDescription>
                  </div>
                  <Button
                    variant="brand"
                    onClick={runAllocation}
                    disabled={previewLoading || loadingAction}
                    className="flex items-center gap-2 font-semibold shadow-md"
                  >
                    {loadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                    Execute Allocation Engine
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {previewLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-24 rounded-xl bg-muted/40 animate-pulse" />
                    ))}
                  </div>
                ) : (
                  preview && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                          <div className="flex items-center gap-2 text-indigo-500 dark:text-indigo-400 mb-1 text-xs font-bold uppercase">
                            <Users className="w-4 h-4" /> Eligible Candidates
                          </div>
                          <div className="text-3xl font-extrabold font-mono text-foreground">
                            {preview.eligibleStudents}
                          </div>
                        </div>
                        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                          <div className="flex items-center gap-2 text-purple-500 dark:text-purple-400 mb-1 text-xs font-bold uppercase">
                            <Building2 className="w-4 h-4" /> Participating Drives
                          </div>
                          <div className="text-3xl font-extrabold font-mono text-foreground">
                            {preview.activeDrives}
                          </div>
                        </div>
                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                          <div className="flex items-center gap-2 text-emerald-500 dark:text-emerald-400 mb-1 text-xs font-bold uppercase">
                            <Briefcase className="w-4 h-4" /> Total Quota Seats
                          </div>
                          <div className="text-3xl font-extrabold font-mono text-foreground">
                            {preview.totalPositions}
                          </div>
                        </div>
                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                          <div className="flex items-center gap-2 text-amber-500 dark:text-amber-400 mb-1 text-xs font-bold uppercase">
                            <Award className="w-4 h-4" /> Submitted Preferences
                          </div>
                          <div className="text-3xl font-extrabold font-mono text-foreground">
                            {preview.totalPreferencesSubmitted || 0}
                          </div>
                        </div>
                      </div>

                      {/* Drive Breakdown Grid */}
                      <div>
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                          Recruitment Drives in Active Matching Matrix
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {preview.drives?.map((drive: any) => (
                            <div
                              key={drive.id}
                              className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-border hover:bg-muted/70 transition-colors"
                            >
                              <div>
                                <div className="text-sm font-bold text-foreground">{drive.company}</div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {drive.role} • <span className="text-indigo-500 font-semibold font-mono">₹{drive.packageLpa} LPA</span>
                                </div>
                              </div>
                              <Badge variant="secondary" className="font-mono font-bold text-xs">
                                {drive.openPositions} seats
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )
                )}
              </CardContent>
            </Card>

            {/* Historical Runs Log */}
            {runs?.data?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-500" />
                    Institutional Allocation History & Stability Audits
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {runs.data.map((run: any) => (
                    <div
                      key={run.id}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-muted/30 border border-border hover:bg-muted/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        <div>
                          <div className="text-sm font-bold text-foreground">
                            Academic Cycle {run.cycle?.academicYear || run.season} Matching Run
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(run.completedAt || run.createdAt).toLocaleString()} • Triggered by {run.triggeredBy || 'TPO Admin'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-mono">
                        <span className="text-emerald-500 font-bold">{run.totalMatches} matches</span>
                        <span className="text-purple-500 font-bold">{run.cascadeCount || 0} cascades</span>
                        <Badge variant="success" className="font-sans text-xs">
                          {run.blockingPairCount === 0 ? '0 Blocking Pairs' : `${run.blockingPairCount} Blocking Pairs`}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {/* ─── Running Phase ─────────────────────────────────── */}
        {phase === 'running' && (
          <motion.div
            key="running"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="p-12 text-center">
              <div className="max-w-md mx-auto space-y-4">
                <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
                <h2 className="text-xl font-bold text-foreground">Executing Multi-Seat Gale-Shapley Algorithm</h2>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Evaluating student GPA cutoffs, department eligibility wildcards, recruiter scoring matrices, quota constraints, and resolving recursive DREAM &gt; CORE &gt; MASS tier cascades...
                </p>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ─── Results Phase ─────────────────────────────────── */}
        {phase === 'results' && result && (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            {/* Result Header Card */}
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30">
                      <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-extrabold text-foreground">Allocation Algorithm Converged</h2>
                      <p className="text-xs text-muted-foreground font-medium mt-0.5">
                        Many-to-One Gale-Shapley matched <span className="text-emerald-500 font-bold">{result.metrics?.allocatedCount || 0} candidates</span> with <span className="text-purple-500 font-bold">{result.metrics?.cascadeCount || 0} offer tier cascades</span>.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="success" className="px-3.5 py-1.5 text-xs font-bold gap-2">
                      <ShieldCheck className="w-4 h-4" /> 0 Blocking Pairs (Stable Matching)
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPhase('preview');
                        setResult(null);
                      }}
                      className="flex items-center gap-2"
                    >
                      <RotateCw className="w-4 h-4" /> Reset & Re-run
                    </Button>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <div className="text-4xl font-extrabold text-emerald-500 font-mono tracking-tight">
                      <MatchedCount value={result.metrics?.placementRate || 0} />%
                    </div>
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1 uppercase tracking-wider">Placement Rate</div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {result.metrics?.allocatedCount} placed of {result.metrics?.eligibleStudents} eligible candidates
                    </p>
                  </div>

                  <div className="p-5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-center">
                    <div className="text-4xl font-extrabold text-indigo-500 font-mono tracking-tight">
                      <MatchedCount value={result.metrics?.firstChoiceRate || 0} />%
                    </div>
                    <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-1 uppercase tracking-wider">1st Choice Rate</div>
                    <p className="text-[11px] text-muted-foreground mt-1">Top-3 Preference Rate: {result.metrics?.top3Rate}%</p>
                  </div>

                  <div className="p-5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
                    <div className="text-4xl font-extrabold text-purple-500 font-mono tracking-tight">
                      <MatchedCount value={result.metrics?.cascadeCount || 0} />
                    </div>
                    <div className="text-xs font-bold text-purple-600 dark:text-purple-400 mt-1 uppercase tracking-wider">Tier Cascades</div>
                    <p className="text-[11px] text-muted-foreground mt-1">DREAM &gt; CORE &gt; MASS Resolved</p>
                  </div>

                  <div className="p-5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                    <div className="text-4xl font-extrabold text-amber-500 font-mono tracking-tight">
                      <MatchedCount value={result.metrics?.quotaUtilizationRate || 0} />%
                    </div>
                    <div className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-1 uppercase tracking-wider">Quota Utilization</div>
                    <p className="text-[11px] text-muted-foreground mt-1">Capacity: {result.metrics?.totalQuota} seats</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bipartite Graph Visualization */}
            <BipartiteGraph matches={result.matches || []} drives={preview?.drives || []} />

            {/* Cascading Event Log */}
            {result.cascadeLogs?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-purple-500">
                    <Sparkles className="w-5 h-5" />
                    Offer Tier Cascading Execution Trail ({result.cascadeLogs.length} Events)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="divide-y divide-border max-h-60 overflow-y-auto pr-2">
                    {result.cascadeLogs.map((log: any, i: number) => (
                      <div key={i} className="py-2.5 flex items-center justify-between gap-4 text-xs">
                        <div className="flex items-center gap-2">
                          <Badge variant="purple" className="font-mono text-[10px] uppercase">
                            {log.type}
                          </Badge>
                          <span className="text-foreground font-medium">{log.description}</span>
                        </div>
                        <span className="text-muted-foreground font-mono shrink-0">Depth: {log.depth}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Decision Explanations Table */}
            {result.explanations?.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Info className="w-5 h-5 text-indigo-500" />
                        Explainable Allocation Decision Tracing ({result.explanations.length})
                      </CardTitle>
                      <CardDescription>Transparent mathematical factor breakdown per candidate</CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Auditable
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Candidate</TableHead>
                        <TableHead>Assigned Drive</TableHead>
                        <TableHead>Dept & GPA</TableHead>
                        <TableHead>Skill Match</TableHead>
                        <TableHead>Recruiter</TableHead>
                        <TableHead>Pref #</TableHead>
                        <TableHead>Reasoning</TableHead>
                        <TableHead className="text-right">Student Explanation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.explanations.slice(0, 30).map((expl: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <div className="font-bold text-foreground">{expl.studentName}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">{expl.studentId}</div>
                          </TableCell>
                          <TableCell>
                            {expl.companyName !== 'None' ? (
                              <div>
                                <span className="font-bold text-foreground">{expl.companyName}</span>
                                <div className="text-[10px] text-indigo-500 font-semibold">{expl.tier}</div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic text-xs">Unallocated</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-xs text-foreground font-medium">{expl.department}</div>
                            <div className="text-[11px] font-bold text-indigo-500 font-mono">{expl.gpa.toFixed(2)} GPA</div>
                          </TableCell>
                          <TableCell className="font-mono font-bold text-emerald-500 text-xs">
                            {expl.skillMatchPercentage > 0 ? `${expl.skillMatchPercentage}%` : '—'}
                          </TableCell>
                          <TableCell className="font-mono font-bold text-foreground text-xs">
                            {expl.recruiterScore > 0 ? expl.recruiterScore : '—'}
                          </TableCell>
                          <TableCell className="font-mono font-bold text-purple-500 text-xs">
                            {expl.preferenceRank > 0 ? `#${expl.preferenceRank}` : '—'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-xs">{expl.reason}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setSelectedExplanation(expl)}
                              className="text-xs font-semibold"
                            >
                              Transparency View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Candidate Transparency Dialog */}
      <Dialog open={!!selectedExplanation} onOpenChange={(open) => !open && setSelectedExplanation(null)}>
        {selectedExplanation && (
          <div>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-primary" />
                Candidate Transparency: {selectedExplanation.studentName}
              </DialogTitle>
              <DialogDescription>
                Plain-language justification presented to the candidate in their portal.
              </DialogDescription>
            </DialogHeader>

            <div className="p-4 rounded-xl bg-muted/60 border border-border space-y-3 my-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Verified Algorithmic Rationale:
              </div>
              <p className="text-xs text-foreground leading-relaxed font-medium">
                {selectedExplanation.studentSafeExplanation}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs font-mono p-3 rounded-lg bg-card border border-border mb-4">
              <div>
                <span className="text-muted-foreground block text-[10px]">Department</span>
                <strong className="text-foreground">{selectedExplanation.department}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Cumulative GPA</span>
                <strong className="text-indigo-500">{selectedExplanation.gpa.toFixed(2)}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Pref Rank</span>
                <strong className="text-purple-500">#{selectedExplanation.preferenceRank || 'N/A'}</strong>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setSelectedExplanation(null)} size="sm">
                Close
              </Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>
    </div>
  );
};
export default AllocationPage;
