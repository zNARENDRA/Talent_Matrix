import React, { useState, useEffect } from 'react';
import {
  Sliders, Play, ArrowRight, TrendingUp, TrendingDown, Users,
  Award, RefreshCw, AlertCircle, CheckCircle2, XCircle, Sparkles, Building2
} from 'lucide-react';
import { api } from '../lib/api';

export const Simulation: React.FC = () => {
  const [drives, setDrives] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);

  // Overrides state: driveId -> { minGpa, quota, tier }
  const [overrides, setOverrides] = useState<Record<string, { minGpa: number; quota: number; tier: string }>>({});

  useEffect(() => {
    loadDrives();
  }, []);

  const loadDrives = async () => {
    try {
      setLoading(true);
      const res = await api.getDrives();
      const list = res.data || [];
      setDrives(list);

      // Initialize default overrides matching baseline
      const initial: Record<string, { minGpa: number; quota: number; tier: string }> = {};
      for (const d of list) {
        initial[d.id] = {
          minGpa: d.minGpa,
          quota: d.openPositions,
          tier: d.offerTier,
        };
      }
      setOverrides(initial);
    } catch (err) {
      console.error('Failed to load drives:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOverride = (driveId: string, field: string, value: any) => {
    setOverrides((prev) => ({
      ...prev,
      [driveId]: {
        ...prev[driveId],
        [field]: value,
      },
    }));
  };

  const runSimulation = async () => {
    try {
      setSimulating(true);
      const overrideList = Object.entries(overrides).map(([driveId, vals]) => ({
        driveId,
        minGpa: vals.minGpa,
        quota: vals.quota,
        tier: vals.tier,
      }));

      const res = await api.simulateAllocation({
        season: '2026',
        overrides: overrideList,
      });

      setSimulationResult(res);
    } catch (err: any) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setSimulating(false);
    }
  };

  const getDeltaBadge = (val: number, isPercent = false, invert = false) => {
    const isPositive = val > 0;
    const isGood = invert ? !isPositive : isPositive;
    if (val === 0) return <span className="text-zinc-500 font-mono">0.0{isPercent ? '%' : ''}</span>;

    return (
      <span className={`inline-flex items-center gap-0.5 font-bold font-mono ${isGood ? 'text-emerald-400' : 'text-rose-400'}`}>
        {isPositive ? '+' : ''}{val}{isPercent ? '%' : ''}
        {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">What-If Placement Simulation Studio</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30">
              Isolated Memory Sandbox
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Simulate parameter adjustments (GPA cutoffs, drive quotas, tier classifications) and observe exact comparative placement outcomes before finalizing.
          </p>
        </div>

        <button
          onClick={runSimulation}
          disabled={simulating}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50"
        >
          {simulating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
          {simulating ? 'Simulating...' : 'Run Simulation'}
        </button>
      </div>

      {/* Side-by-Side Simulation Results KPI Cards */}
      {simulationResult && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Placement Rate Delta */}
            <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-2xl p-4 space-y-2">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Placement Rate</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-white">
                  {simulationResult.simulated.metrics.placementRate}%
                </span>
                {getDeltaBadge(simulationResult.deltas.placementRateDelta, true)}
              </div>
              <p className="text-xs text-zinc-500">
                Baseline: {simulationResult.baseline.metrics.placementRate}%
              </p>
            </div>

            {/* Placed Students Delta */}
            <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-2xl p-4 space-y-2">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Placed Candidates</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-white">
                  {simulationResult.simulated.metrics.allocatedCount} / {simulationResult.simulated.metrics.eligibleStudents}
                </span>
                {getDeltaBadge(
                  simulationResult.simulated.metrics.allocatedCount - simulationResult.baseline.metrics.allocatedCount
                )}
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-emerald-400 font-semibold">+{simulationResult.deltas.newlyPlacedCount} newly placed</span>
                <span className="text-rose-400 font-semibold">-{simulationResult.deltas.lostPlacementCount} lost</span>
              </div>
            </div>

            {/* Offer Tier Cascades */}
            <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-2xl p-4 space-y-2">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Tier Cascades</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-white">
                  {simulationResult.simulated.metrics.cascadeCount}
                </span>
                {getDeltaBadge(simulationResult.deltas.cascadeCountDelta)}
              </div>
              <p className="text-xs text-zinc-500">
                Upgraded offers: <strong className="text-indigo-400">+{simulationResult.deltas.upgradedCount}</strong>
              </p>
            </div>

            {/* Quota Utilization */}
            <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-2xl p-4 space-y-2">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Quota Utilization</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-white">
                  {simulationResult.simulated.metrics.quotaUtilizationRate}%
                </span>
                {getDeltaBadge(simulationResult.deltas.quotaUtilizationDelta, true)}
              </div>
              <p className="text-xs text-zinc-500">
                Total Quota: {simulationResult.simulated.metrics.totalQuota} seats
              </p>
            </div>
          </div>

          {/* Student Impact Delta Table */}
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Simulated Candidate Allocation Changes ({simulationResult.deltas.totalChangedStudents} affected)
              </h3>
            </div>

            {simulationResult.deltas.studentDeltas.length === 0 ? (
              <p className="text-sm text-zinc-500 py-6 text-center">
                No student allocation changes occurred under this simulation parameter setup.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-zinc-300">
                  <thead className="bg-zinc-800/60 text-xs font-semibold uppercase text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="px-4 py-3">Candidate</th>
                      <th className="px-4 py-3">Baseline Match</th>
                      <th className="px-4 py-3 text-center">→</th>
                      <th className="px-4 py-3">Simulated Match</th>
                      <th className="px-4 py-3">Impact Type</th>
                      <th className="px-4 py-3 text-right">Package Δ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {simulationResult.deltas.studentDeltas.map((delta: any) => (
                      <tr key={delta.studentId} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-white">{delta.studentName}</div>
                          <div className="text-xs text-zinc-500">{delta.studentId} • {delta.department}</div>
                        </td>
                        <td className="px-4 py-3">
                          {delta.baselineMatch ? (
                            <div>
                              <span className="text-zinc-200">{delta.baselineMatch.companyName}</span>
                              <div className="text-xs text-zinc-500">{delta.baselineMatch.tier} • {delta.baselineMatch.packageLpa} LPA</div>
                            </div>
                          ) : (
                            <span className="text-zinc-500 italic">Unallocated</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-zinc-500">
                          <ArrowRight className="w-4 h-4 mx-auto text-purple-400" />
                        </td>
                        <td className="px-4 py-3">
                          {delta.simulatedMatch ? (
                            <div>
                              <span className="text-white font-semibold">{delta.simulatedMatch.companyName}</span>
                              <div className="text-xs text-purple-400">{delta.simulatedMatch.tier} • {delta.simulatedMatch.packageLpa} LPA</div>
                            </div>
                          ) : (
                            <span className="text-rose-400 italic">Unallocated</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                              delta.outcomeChange === 'UPGRADED' || delta.outcomeChange === 'NEWLY_PLACED'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : delta.outcomeChange === 'DOWNGRADED' || delta.outcomeChange === 'LOST_PLACEMENT'
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                            }`}
                          >
                            {delta.outcomeChange.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold">
                          {getDeltaBadge(delta.packageDifferenceLpa)} LPA
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Parameter Overrides Grid */}
      <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-purple-400" />
            Configurable Drive Parameters & Cutoff Controls
          </h3>
          <span className="text-xs text-zinc-400">{drives.length} drives available</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drives.map((drive) => {
            const ov = overrides[drive.id] || { minGpa: drive.minGpa, quota: drive.openPositions, tier: drive.offerTier };

            return (
              <div key={drive.id} className="bg-zinc-800/40 border border-zinc-700/60 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-white text-sm">{drive.company?.name || drive.companyName}</h4>
                    <p className="text-xs text-zinc-400">{drive.role} • {drive.packageLpa} LPA</p>
                  </div>
                  <span className="px-2 py-0.5 text-xs font-mono rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                    {drive.offerTier}
                  </span>
                </div>

                {/* Quota Counter */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Open Quota Seats:</span>
                    <span className="font-bold text-white">{ov.quota}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateOverride(drive.id, 'quota', Math.max(1, ov.quota - 1))}
                      className="w-7 h-7 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white font-bold text-xs"
                    >
                      -
                    </button>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={ov.quota}
                      onChange={(e) => handleUpdateOverride(drive.id, 'quota', parseInt(e.target.value, 10))}
                      className="w-full accent-purple-500"
                    />
                    <button
                      onClick={() => handleUpdateOverride(drive.id, 'quota', ov.quota + 1)}
                      className="w-7 h-7 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white font-bold text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* GPA Cutoff Slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Min GPA Cutoff:</span>
                    <span className="font-bold text-white">{ov.minGpa.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="5.0"
                    max="9.5"
                    step="0.1"
                    value={ov.minGpa}
                    onChange={(e) => handleUpdateOverride(drive.id, 'minGpa', parseFloat(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                </div>

                {/* Tier Selector */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-700/40">
                  <span className="text-zinc-400">Tier:</span>
                  <select
                    value={ov.tier}
                    onChange={(e) => handleUpdateOverride(drive.id, 'tier', e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white"
                  >
                    <option value="DREAM">DREAM</option>
                    <option value="CORE">CORE</option>
                    <option value="MASS">MASS</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
export default Simulation;
