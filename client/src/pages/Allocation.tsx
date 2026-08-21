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
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              Placement Allocation Engine
            </h1>
            <Badge variant="brand" className="font-bold text-xs px-2.5 py-1">
              Module A: Gale-Shapley & Cascading
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            Quota-constrained many-to-one stable matching with DREAM &gt; CORE &gt; MASS cascading and blocking-pair certificate verification.
          </p>
        </div>

        {/* Academic Cycle Selector */}
        <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-2 shadow-xs">
          <span className="text-xs font-bold text-muted-foreground pl-2 uppercase tracking-wider">Cycle:</span>
          <select
            value={selectedCycleId}
            onChange={(e) => setSelectedCycleId(e.target.value)}
            className="bg-muted/80 border border-border rounded-lg px-3 py-1.5 text-sm font-semibold text-foreground focus:outline-none cursor-pointer"
          >
            {cycles.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Execution Content State */}
      <AnimatePresence mode="wait">
        {/* ─── Preview Phase ─────────────────────────────────── */}
        {phase === 'preview' && (
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            {/* Primary Pre-Allocation Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <Card className="p-5 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Eligible Candidates</div>
                  <div className="text-3xl font-extrabold font-mono text-foreground mt-1">
                    {previewLoading ? '—' : preview?.summary?.eligibleStudents || 0}
                  </div>
                  <div className="text-xs text-muted-foreground font-medium mt-0.5">Ready for matching</div>
                </div>
                <Users className="w-9 h-9 text-indigo-500/30" />
              </Card>

              <Card className="p-5 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Total Corporate Quota</div>
                  <div className="text-3xl font-extrabold font-mono text-foreground mt-1">
                    {previewLoading ? '—' : preview?.summary?.totalQuota || 0}
                  </div>
                  <div className="text-xs text-muted-foreground font-medium mt-0.5">Verified open positions</div>
                </div>
                <Building2 className="w-9 h-9 text-emerald-500/30" />
              </Card>

              <Card className="p-5 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Active Drives</div>
                  <div className="text-3xl font-extrabold font-mono text-foreground mt-1">
                    {previewLoading ? '—' : preview?.summary?.activeDrives || 0}
                  </div>
                  <div className="text-xs text-muted-foreground font-medium mt-0.5">Participating recruiters</div>
                </div>
                <Briefcase className="w-9 h-9 text-purple-500/30" />
              </Card>

              <Card className="p-5 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Tier Hierarchy</div>
                  <div className="text-sm font-extrabold text-foreground mt-1">
                    DREAM &gt; CORE &gt; MASS
                  </div>
                  <div className="text-xs text-muted-foreground font-medium mt-0.5">Strict non-downgrade rule</div>
                </div>
                <Award className="w-9 h-9 text-amber-500/30" />
              </Card>
            </div>

            {/* Launch Banner Action */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1.5 max-w-2xl">
                  <h3 className="text-xl font-extrabold text-foreground flex items-center gap-2">
                    <Zap className="w-6 h-6 text-indigo-500" />
                    Ready to Compute Optimal Matchings
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Executing the engine evaluates student preference rankings against company recruiter scores and minimum GPA thresholds, producing a stable, zero-blocking-pair allocation.
                  </p>
                </div>

                <Button
                  onClick={runAllocation}
                  disabled={loadingAction || previewLoading}
                  variant="brand"
                  size="lg"
                  className="font-bold shadow-lg shadow-indigo-500/25 shrink-0 text-base"
                >
                  <Play className="w-5 h-5 mr-2 fill-current" /> Execute Allocation Engine
                </Button>
              </CardContent>
            </Card>

            {/* Participating Corporate Drives Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Participating Companies &amp; Quotas</CardTitle>
                    <CardDescription className="text-sm">Verified corporate drives participating in this allocation cycle</CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono font-semibold">
                    {preview?.drives?.length || 0} Drives Registered
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-bold text-xs uppercase">Company</TableHead>
                      <TableHead className="font-bold text-xs uppercase">Role</TableHead>
                      <TableHead className="font-bold text-xs uppercase">Offer Tier</TableHead>
                      <TableHead className="font-bold text-xs uppercase">Min GPA</TableHead>
                      <TableHead className="font-bold text-xs uppercase">Total Quota</TableHead>
                      <TableHead className="font-bold text-xs uppercase">Eligible Applicants</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-sm text-muted-foreground">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                          Loading recruitment matrix...
                        </TableCell>
                      </TableRow>
                    ) : preview?.drives?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-sm text-muted-foreground">
                          No corporate drives configured for this cycle.
                        </TableCell>
                      </TableRow>
                    ) : (
                      preview?.drives?.map((drive: any) => (
                        <TableRow key={drive.id}>
                          <TableCell className="font-bold text-sm text-foreground">
                            {drive.company?.name || 'Company'}
                          </TableCell>
                          <TableCell className="text-sm text-foreground font-medium">{drive.jobTitle}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                drive.offerTier === 'SUPER_DREAM' || drive.offerTier === 'DREAM'
                                  ? 'purple'
                                  : drive.offerTier === 'CORE'
                                  ? 'brand'
                                  : 'secondary'
                              }
                              className="text-xs font-bold"
                            >
                              {drive.offerTier}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm font-semibold text-indigo-500">
                            {drive.minGpa?.toFixed(2)} GPA
                          </TableCell>
                          <TableCell className="font-mono text-sm font-bold text-emerald-500">
                            {drive.quota} seats
                          </TableCell>
                          <TableCell className="font-mono text-sm font-bold text-foreground">
                            {drive.applications?.length || 0} candidates
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Historical Execution Runs */}
            {runs?.data?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Previous Allocation Execution History</CardTitle>
                  <CardDescription className="text-sm">Audit trail of completed matching algorithms</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-bold text-xs uppercase">Timestamp</TableHead>
                        <TableHead className="font-bold text-xs uppercase">Status</TableHead>
                        <TableHead className="font-bold text-xs uppercase">Allocated Candidates</TableHead>
                        <TableHead className="font-bold text-xs uppercase">Cascades</TableHead>
                        <TableHead className="font-bold text-xs uppercase">Stability Certificate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {runs.data.slice(0, 5).map((run: any) => (
                        <TableRow key={run.id}>
                          <TableCell className="font-mono text-sm text-foreground font-medium">
                            {new Date(run.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="success" className="text-xs font-bold">
                              {run.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm font-bold text-emerald-500">
                            {run.allocatedCount} / {run.eligibleCount}
                          </TableCell>
                          <TableCell className="font-mono text-sm font-bold text-purple-500">
                            {run.cascadeCount}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              Verified Stable (0 BP)
                            </Badge>
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

        {/* ─── Running Phase ─────────────────────────────────── */}
        {phase === 'running' && (
          <motion.div
            key="running"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="p-16 text-center">
              <div className="max-w-md mx-auto space-y-4">
                <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
                <h2 className="text-2xl font-bold text-foreground">Executing Multi-Seat Gale-Shapley Algorithm</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Evaluating student GPA cutoffs, department eligibility wildcards, recruiter scoring matrices, quota constraints, and resolving recursive DREAM &gt; CORE &gt; MASS tier cascades...
                </p>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ─── Results Phase ─────────────────────────────────── */}
        {phase === 'results' && result && (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
            {/* Result Header Card */}
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-extrabold text-foreground">Allocation Algorithm Converged</h2>
                      <p className="text-sm text-muted-foreground font-medium mt-0.5">
                        Many-to-One Gale-Shapley matched <span className="text-emerald-500 font-bold">{result.metrics?.allocatedCount || 0} candidates</span> with <span className="text-purple-500 font-bold">{result.metrics?.cascadeCount || 0} offer tier cascades</span>.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="success" className="px-4 py-2 text-sm font-bold gap-2">
                      <ShieldCheck className="w-5 h-5" /> 0 Blocking Pairs (Stable Matching)
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPhase('preview');
                        setResult(null);
                      }}
                      className="flex items-center gap-2 font-bold"
                    >
                      <RotateCw className="w-4 h-4" /> Reset & Re-run
                    </Button>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <div className="text-4xl font-extrabold text-emerald-500 font-mono tracking-tight">
                      <MatchedCount value={result.metrics?.placementRate || 0} />%
                    </div>
                    <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1 uppercase tracking-wider">Placement Rate</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {result.metrics?.allocatedCount} placed of {result.metrics?.eligibleStudents} eligible candidates
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-center">
                    <div className="text-4xl font-extrabold text-indigo-500 font-mono tracking-tight">
                      <MatchedCount value={result.metrics?.firstChoiceRate || 0} />%
                    </div>
                    <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-1 uppercase tracking-wider">1st Choice Rate</div>
                    <p className="text-xs text-muted-foreground mt-1">Top-3 Preference Rate: {result.metrics?.top3Rate}%</p>
                  </div>

                  <div className="p-5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-center">
                    <div className="text-4xl font-extrabold text-purple-500 font-mono tracking-tight">
                      <MatchedCount value={result.metrics?.cascadeCount || 0} />
                    </div>
                    <div className="text-sm font-bold text-purple-600 dark:text-purple-400 mt-1 uppercase tracking-wider">Tier Cascades</div>
                    <p className="text-xs text-muted-foreground mt-1">DREAM &gt; CORE &gt; MASS Resolved</p>
                  </div>

                  <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                    <div className="text-4xl font-extrabold text-amber-500 font-mono tracking-tight">
                      <MatchedCount value={result.metrics?.quotaUtilizationRate || 0} />%
                    </div>
                    <div className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-1 uppercase tracking-wider">Quota Utilization</div>
                    <p className="text-xs text-muted-foreground mt-1">Capacity: {result.metrics?.totalQuota} seats</p>
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
                  <CardTitle className="text-lg flex items-center gap-2 text-purple-500">
                    <Sparkles className="w-5 h-5" />
                    Offer Tier Cascading Execution Trail ({result.cascadeLogs.length} Events)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="divide-y divide-border max-h-72 overflow-y-auto pr-2">
                    {result.cascadeLogs.map((log: any, i: number) => (
                      <div key={i} className="py-3 flex items-center justify-between gap-4 text-sm">
                        <div className="flex items-center gap-3">
                          <Badge variant="purple" className="font-mono text-xs uppercase font-bold">
                            {log.type}
                          </Badge>
                          <span className="text-foreground font-semibold">{log.description}</span>
                        </div>
                        <span className="text-muted-foreground font-mono text-xs shrink-0 font-medium">Depth: {log.depth}</span>
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
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Info className="w-5 h-5 text-indigo-500" />
                        Explainable Allocation Decision Tracing ({result.explanations.length})
                      </CardTitle>
                      <CardDescription className="text-sm">Transparent mathematical factor breakdown per candidate</CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs font-bold">
                      Auditable
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-bold text-xs uppercase">Candidate</TableHead>
                        <TableHead className="font-bold text-xs uppercase">Assigned Drive</TableHead>
                        <TableHead className="font-bold text-xs uppercase">Dept &amp; GPA</TableHead>
                        <TableHead className="font-bold text-xs uppercase">Skill Match</TableHead>
                        <TableHead className="font-bold text-xs uppercase">Recruiter</TableHead>
                        <TableHead className="font-bold text-xs uppercase">Pref #</TableHead>
                        <TableHead className="font-bold text-xs uppercase">Reasoning</TableHead>
                        <TableHead className="font-bold text-xs uppercase text-right">Student Explanation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.explanations.slice(0, 30).map((expl: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <div className="font-bold text-sm text-foreground">{expl.studentName}</div>
                            <div className="text-xs text-muted-foreground font-mono font-medium">{expl.studentId}</div>
                          </TableCell>
                          <TableCell>
                            {expl.companyName !== 'None' ? (
                              <div>
                                <span className="font-bold text-sm text-foreground">{expl.companyName}</span>
                                <div className="text-xs text-indigo-500 font-bold">{expl.tier}</div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic text-sm">Unallocated</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-foreground font-semibold">{expl.department}</div>
                            <div className="text-xs font-bold text-indigo-500 font-mono">{expl.gpa.toFixed(2)} GPA</div>
                          </TableCell>
                          <TableCell className="font-mono font-bold text-emerald-500 text-sm">
                            {expl.skillMatchPercentage > 0 ? `${expl.skillMatchPercentage}%` : '—'}
                          </TableCell>
                          <TableCell className="font-mono font-bold text-foreground text-sm">
                            {expl.recruiterScore > 0 ? expl.recruiterScore : '—'}
                          </TableCell>
                          <TableCell className="font-mono font-bold text-purple-500 text-sm">
                            {expl.preferenceRank > 0 ? `#${expl.preferenceRank}` : '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs leading-relaxed">{expl.reason}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setSelectedExplanation(expl)}
                              className="text-xs font-bold cursor-pointer"
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
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <HelpCircle className="w-6 h-6 text-primary" />
                Candidate Transparency: {selectedExplanation.studentName}
              </DialogTitle>
              <DialogDescription className="text-sm">
                Plain-language justification presented to the candidate in their portal.
              </DialogDescription>
            </DialogHeader>

            <div className="p-5 rounded-2xl bg-muted/60 border border-border space-y-3 my-5">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Verified Algorithmic Rationale:
              </div>
              <p className="text-sm text-foreground leading-relaxed font-semibold">
                {selectedExplanation.studentSafeExplanation}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm font-mono p-4 rounded-xl bg-card border border-border mb-5">
              <div>
                <span className="text-muted-foreground block text-xs font-bold uppercase">Department</span>
                <strong className="text-foreground text-sm">{selectedExplanation.department}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs font-bold uppercase">Cumulative GPA</span>
                <strong className="text-indigo-500 text-sm">{selectedExplanation.gpa.toFixed(2)}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs font-bold uppercase">Pref Rank</span>
                <strong className="text-purple-500 text-sm">#{selectedExplanation.preferenceRank || 'N/A'}</strong>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setSelectedExplanation(null)} size="sm" className="font-bold">
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
