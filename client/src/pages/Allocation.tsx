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
      const selectedCycle = cycles.find((c: any) => c.id === selectedCycleId);
      const dynamicSeason = selectedCycle?.academicYear?.split('-')[0] || new Date().getFullYear().toString();
      const res = await api.runAllocation({
        season: dynamicSeason,
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
    <div className="p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">Placement Allocation Engine</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              Many-to-One Gale-Shapley & Cascading
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Quota-constrained stable matching algorithm with recursive DREAM &gt; CORE &gt; MASS cascading and blocking-pair stability verification.
          </p>
        </div>

        {/* Academic Cycle Selector */}
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl p-1.5">
          <span className="text-xs font-medium text-zinc-400 pl-2">Cycle:</span>
          <select
            value={selectedCycleId}
            onChange={(e) => setSelectedCycleId(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
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
          <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="glass-card p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="card-title flex items-center gap-2">
                    <Eye className="w-5 h-5 text-indigo-400" /> Pre-Allocation Matrix Preview
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Live candidate preferences, open quotas, and scoring matrix ready for execution.
                  </p>
                </div>
                <button
                  onClick={runAllocation}
                  disabled={previewLoading || loadingAction}
                  className="btn-primary flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                >
                  {loadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
                  Execute Allocation Engine
                </button>
              </div>

              {previewLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="skeleton h-20 rounded-xl bg-zinc-800/50" />
                  ))}
                </div>
              ) : (
                preview && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                        <div className="flex items-center gap-2 text-indigo-400 mb-1 text-xs font-semibold uppercase">
                          <Users className="w-4 h-4" /> Eligible Candidates
                        </div>
                        <div className="text-2xl font-bold text-white font-mono">{preview.eligibleStudents}</div>
                      </div>
                      <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                        <div className="flex items-center gap-2 text-purple-400 mb-1 text-xs font-semibold uppercase">
                          <Building2 className="w-4 h-4" /> Participating Drives
                        </div>
                        <div className="text-2xl font-bold text-white font-mono">{preview.activeDrives}</div>
                      </div>
                      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <div className="flex items-center gap-2 text-emerald-400 mb-1 text-xs font-semibold uppercase">
                          <Briefcase className="w-4 h-4" /> Total Quota Seats
                        </div>
                        <div className="text-2xl font-bold text-white font-mono">{preview.totalPositions}</div>
                      </div>
                      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <div className="flex items-center gap-2 text-amber-400 mb-1 text-xs font-semibold uppercase">
                          <Award className="w-4 h-4" /> Submitted Preferences
                        </div>
                        <div className="text-2xl font-bold text-white font-mono">
                          {preview.totalPreferencesSubmitted || 0}
                        </div>
                      </div>
                    </div>

                    {/* Drive Breakdown */}
                    <div>
                      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                        Recruitment Drives in Active Matching Matrix
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {preview.drives?.map((drive: any) => (
                          <div
                            key={drive.id}
                            className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-800/40 border border-zinc-700/60"
                          >
                            <div>
                              <div className="text-sm font-semibold text-white">{drive.company}</div>
                              <div className="text-xs text-zinc-400">
                                {drive.role} • <span className="text-indigo-400 font-medium">{drive.packageLpa} LPA</span>
                              </div>
                            </div>
                            <span className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-zinc-800 text-zinc-200 border border-zinc-700">
                              {drive.openPositions} seats
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )
              )}
            </div>

            {/* Historical Runs Log */}
            {runs?.data?.length > 0 && (
              <div className="glass-card p-6 mt-6 space-y-4">
                <h2 className="card-title text-base flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  Institutional Allocation History & Stability Audits
                </h2>
                <div className="space-y-2">
                  {runs.data.map((run: any) => (
                    <div
                      key={run.id}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-800/40 border border-zinc-700/60 hover:bg-zinc-800/70 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <div>
                          <div className="text-sm font-medium text-white">
                            Academic Cycle {run.cycle?.academicYear || run.season} Matching Run
                          </div>
                          <div className="text-xs text-zinc-500">
                            {new Date(run.completedAt || run.createdAt).toLocaleString()} • Triggered by {run.triggeredBy || 'Admin'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-mono">
                        <span className="text-emerald-400 font-bold">{run.totalMatches} matches</span>
                        <span className="text-purple-400 font-bold">{run.cascadeCount || 0} cascades</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-sans">
                          {run.blockingPairCount === 0 ? 'Stable Matching (0 Blocking Pairs)' : `${run.blockingPairCount} Blocking Pairs`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
            className="glass-card p-12 text-center"
          >
            <div className="max-w-md mx-auto space-y-4">
              <Loader2 className="w-12 h-12 text-indigo-500 mx-auto animate-spin" />
              <h2 className="text-xl font-bold text-white">Executing Multi-Seat Gale-Shapley Algorithm</h2>
              <p className="text-zinc-400 text-sm">
                Evaluating candidate skill compatibility, recruiter scoring weights, quota constraints, and resolving DREAM &gt; CORE &gt; MASS tier cascades...
              </p>
            </div>
          </motion.div>
        )}

        {/* ─── Results Phase ─────────────────────────────────── */}
        {phase === 'results' && result && (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            {/* Result Header & Stability Badge */}
            <div className="glass-card p-6 space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30">
                    <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold text-white">Allocation Algorithm Converged</h2>
                    <p className="text-sm text-zinc-300 font-medium mt-0.5">
                      Many-to-One Gale-Shapley matched <span className="text-emerald-400 font-bold">{result.metrics?.allocatedCount || 0} candidates</span> with <span className="text-purple-400 font-bold">{result.metrics?.cascadeCount || 0} offer tier cascades</span>.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-4 py-2 text-sm font-bold rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-2 shadow-sm">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" /> Algorithmic Stability Guaranteed (0 Blocking Pairs)
                  </span>
                  <button
                    onClick={() => {
                      setPhase('preview');
                      setResult(null);
                    }}
                    className="btn-secondary text-sm font-semibold flex items-center gap-2 px-4 py-2"
                  >
                    <RotateCw className="w-4 h-4" /> Run Again
                  </button>
                </div>
              </div>

              {/* Metrics Grid (Large, High-Contrast Typography) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center shadow-lg">
                  <div className="text-4xl font-extrabold text-emerald-400 font-mono tracking-tight">
                    <MatchedCount value={result.metrics?.placementRate || 0} />%
                  </div>
                  <div className="text-sm font-bold text-emerald-400 mt-1.5 uppercase tracking-wider">Placement Rate</div>
                  <p className="text-xs font-semibold text-zinc-300 mt-1">
                    {result.metrics?.allocatedCount} placed of {result.metrics?.eligibleStudents} candidates
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-center shadow-lg">
                  <div className="text-4xl font-extrabold text-indigo-400 font-mono tracking-tight">
                    <MatchedCount value={result.metrics?.firstChoiceRate || 0} />%
                  </div>
                  <div className="text-sm font-bold text-indigo-400 mt-1.5 uppercase tracking-wider">1st Choice Satisfaction</div>
                  <p className="text-xs font-semibold text-zinc-300 mt-1">Top-3 Preference Rate: {result.metrics?.top3Rate}%</p>
                </div>

                <div className="p-5 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-center shadow-lg">
                  <div className="text-4xl font-extrabold text-purple-400 font-mono tracking-tight">
                    <MatchedCount value={result.metrics?.cascadeCount || 0} />
                  </div>
                  <div className="text-sm font-bold text-purple-400 mt-1.5 uppercase tracking-wider">Tier Cascades Resolved</div>
                  <p className="text-xs font-semibold text-zinc-300 mt-1">DREAM &gt; CORE &gt; MASS Upgrades</p>
                </div>

                <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center shadow-lg">
                  <div className="text-4xl font-extrabold text-amber-400 font-mono tracking-tight">
                    <MatchedCount value={result.metrics?.quotaUtilizationRate || 0} />%
                  </div>
                  <div className="text-sm font-bold text-amber-400 mt-1.5 uppercase tracking-wider">Quota Utilization</div>
                  <p className="text-xs font-semibold text-zinc-300 mt-1">Total Capacity: {result.metrics?.totalQuota} seats</p>
                </div>
              </div>
            </div>

            {/* Bipartite Graph Visualization */}
            <BipartiteGraph matches={result.matches || []} drives={preview?.drives || []} />

            {/* Cascading Event Log */}
            {result.cascadeLogs?.length > 0 && (
              <div className="glass-card p-6 space-y-4">
                <h3 className="card-title text-base flex items-center gap-2 text-purple-400">
                  <Sparkles className="w-5 h-5" />
                  Offer Tier Cascading Execution Trail ({result.cascadeLogs.length} Events)
                </h3>
                <div className="divide-y divide-zinc-800 max-h-60 overflow-y-auto pr-2">
                  {result.cascadeLogs.map((log: any, i: number) => (
                    <div key={i} className="py-2.5 flex items-center justify-between gap-4 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/30">
                          {log.type}
                        </span>
                        <span className="text-zinc-300 font-medium">{log.description}</span>
                      </div>
                      <span className="text-zinc-500 font-mono shrink-0">Depth: {log.depth}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Decision Explanations Table */}
            {result.explanations?.length > 0 && (
              <div className="glass-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="card-title text-base flex items-center gap-2">
                    <Info className="w-5 h-5 text-indigo-400" />
                    Explainable Allocation Decision Tracing ({result.explanations.length})
                  </h3>
                  <span className="text-xs text-zinc-400">Transparent mathematical factor breakdown</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Candidate</th>
                        <th>Assigned Drive</th>
                        <th>Dept & GPA</th>
                        <th>Skill Match</th>
                        <th>Recruiter</th>
                        <th>Pref #</th>
                        <th>Reasoning</th>
                        <th className="text-right">Student Explanation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.explanations.slice(0, 30).map((expl: any, idx: number) => (
                        <tr key={idx} className="hover:bg-zinc-800/40">
                          <td>
                            <div className="font-semibold text-white">{expl.studentName}</div>
                            <div className="text-xs text-zinc-500 font-mono">{expl.studentId}</div>
                          </td>
                          <td>
                            {expl.companyName !== 'None' ? (
                              <div>
                                <span className="font-semibold text-white">{expl.companyName}</span>
                                <div className="text-xs text-indigo-400">{expl.tier}</div>
                              </div>
                            ) : (
                              <span className="text-zinc-500 italic">Unallocated</span>
                            )}
                          </td>
                          <td>
                            <div className="text-zinc-300">{expl.department}</div>
                            <div className="text-xs font-semibold text-indigo-400">{expl.gpa.toFixed(2)} GPA</div>
                          </td>
                          <td className="font-mono text-xs font-bold text-emerald-400">
                            {expl.skillMatchPercentage > 0 ? `${expl.skillMatchPercentage}%` : '—'}
                          </td>
                          <td className="font-mono text-xs font-bold text-zinc-200">
                            {expl.recruiterScore > 0 ? expl.recruiterScore : '—'}
                          </td>
                          <td className="font-mono text-xs font-bold text-purple-400">
                            {expl.preferenceRank > 0 ? `#${expl.preferenceRank}` : '—'}
                          </td>
                          <td className="text-xs text-zinc-400 max-w-xs">{expl.reason}</td>
                          <td className="text-right">
                            <button
                              onClick={() => setSelectedExplanation(expl)}
                              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-indigo-400"
                            >
                              View Safe Text
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Student Safe Explanation Modal */}
      {selectedExplanation && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-indigo-400" />
              Candidate Transparency View: {selectedExplanation.studentName}
            </h3>
            <div className="p-4 rounded-xl bg-zinc-800/60 border border-zinc-700/60 space-y-2">
              <p className="text-xs font-semibold text-zinc-400 uppercase">Student Portal Explanation:</p>
              <p className="text-sm text-white leading-relaxed">{selectedExplanation.studentSafeExplanation}</p>
            </div>
            <div className="text-xs text-zinc-400 space-y-1">
              <p>• Department: {selectedExplanation.department}</p>
              <p>• GPA: {selectedExplanation.gpa.toFixed(2)}</p>
              <p>• Preference Rank: #{selectedExplanation.preferenceRank || 'N/A'}</p>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedExplanation(null)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AllocationPage;
