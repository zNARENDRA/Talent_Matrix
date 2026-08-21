import React, { useState, useEffect } from 'react';
import {
  Sliders, Play, ArrowRight, TrendingUp, TrendingDown, Users,
  Award, RefreshCw, AlertCircle, CheckCircle2, XCircle, Sparkles,
  Building2, Search, RotateCcw, Filter, Briefcase
} from 'lucide-react';
import { api } from '../lib/api';

export const Simulation: React.FC = () => {
  const [drives, setDrives] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('all');

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
          tier: (d.offerTier || 'CORE').toUpperCase(),
        };
      }
      setOverrides(initial);
    } catch (err) {
      console.error('Failed to load drives:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetToBaseline = () => {
    const initial: Record<string, { minGpa: number; quota: number; tier: string }> = {};
    for (const d of drives) {
      initial[d.id] = {
        minGpa: d.minGpa,
        quota: d.openPositions,
        tier: (d.offerTier || 'CORE').toUpperCase(),
      };
    }
    setOverrides(initial);
    setSimulationResult(null);
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
    if (val === 0) return <span className="text-zinc-500 font-mono text-sm">0.0{isPercent ? '%' : ''}</span>;

    return (
      <span className={`inline-flex items-center gap-1 font-bold font-mono text-sm ${isGood ? 'text-emerald-400' : 'text-rose-400'}`}>
        {isPositive ? '+' : ''}{val}{isPercent ? '%' : ''}
        {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
      </span>
    );
  };

  const getTierBadgeStyle = (tier: string) => {
    const t = (tier || '').toUpperCase();
    if (t.includes('SUPER')) return 'bg-amber-500/15 text-amber-300 border-amber-500/40';
    if (t.includes('DREAM')) return 'bg-purple-500/15 text-purple-300 border-purple-500/40';
    if (t.includes('CORE')) return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40';
    return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';
  };

  const filteredDrives = drives.filter((d) => {
    const matchSearch =
      (d.company?.name || d.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.role || '').toLowerCase().includes(searchTerm.toLowerCase());
    const currentTier = (overrides[d.id]?.tier || d.offerTier || '').toUpperCase();
    const matchTier = selectedTierFilter === 'all' ? true : currentTier === selectedTierFilter;
    return matchSearch && matchTier;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Sliders className="w-7 h-7 text-purple-400" />
              What-If Placement Simulation Studio
            </h1>
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
              Isolated Memory Sandbox
            </span>
          </div>
          <p className="text-sm text-zinc-300 mt-1">
            Simulate parameter adjustments (GPA cutoffs, drive quotas, tier classifications) and observe exact comparative placement outcomes before finalizing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleResetToBaseline}
            className="btn-secondary text-xs font-semibold flex items-center gap-2 px-3.5 py-2.5"
            title="Reset all drive sliders to baseline values"
          >
            <RotateCcw className="w-4 h-4" /> Reset Baseline
          </button>
          <button
            onClick={runSimulation}
            disabled={simulating}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-primary-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-bold shadow-lg shadow-purple-500/30 transition-all disabled:opacity-50"
          >
            {simulating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
            {simulating ? 'Simulating...' : 'Run Simulation'}
          </button>
        </div>
      </div>

      {/* Side-by-Side Simulation Results KPI Cards */}
      {simulationResult && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Placement Rate Delta */}
            <div className="glass-card p-5 space-y-2 border-purple-500/30 shadow-lg">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-300 uppercase tracking-wider">
                <span>Placement Rate</span>
                {getDeltaBadge(simulationResult.deltas.placementRateDelta, true)}
              </div>
              <div className="text-3xl font-extrabold font-mono text-white tracking-tight">
                {simulationResult.simulated.metrics.placementRate}%
              </div>
              <p className="text-xs text-zinc-400 font-medium">
                Baseline: <span className="text-zinc-200 font-semibold">{simulationResult.baseline.metrics.placementRate}%</span>
              </p>
            </div>

            {/* Placed Students Delta */}
            <div className="glass-card p-5 space-y-2 border-indigo-500/30 shadow-lg">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-300 uppercase tracking-wider">
                <span>Placed Candidates</span>
                {getDeltaBadge(
                  simulationResult.simulated.metrics.allocatedCount - simulationResult.baseline.metrics.allocatedCount
                )}
              </div>
              <div className="text-3xl font-extrabold font-mono text-white tracking-tight">
                {simulationResult.simulated.metrics.allocatedCount} <span className="text-sm font-sans font-medium text-zinc-400">/ {simulationResult.simulated.metrics.eligibleStudents}</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="text-emerald-400">+{simulationResult.deltas.newlyPlacedCount} newly placed</span>
                <span className="text-rose-400">-{simulationResult.deltas.lostPlacementCount} lost</span>
              </div>
            </div>

            {/* Offer Tier Cascades */}
            <div className="glass-card p-5 space-y-2 border-purple-500/30 shadow-lg">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-300 uppercase tracking-wider">
                <span>Tier Cascades</span>
                {getDeltaBadge(simulationResult.deltas.cascadeCountDelta)}
              </div>
              <div className="text-3xl font-extrabold font-mono text-white tracking-tight">
                {simulationResult.simulated.metrics.cascadeCount}
              </div>
              <p className="text-xs text-zinc-400 font-medium">
                Upgraded offers: <strong className="text-indigo-400 font-bold">+{simulationResult.deltas.upgradedCount}</strong>
              </p>
            </div>

            {/* Quota Utilization */}
            <div className="glass-card p-5 space-y-2 border-amber-500/30 shadow-lg">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-300 uppercase tracking-wider">
                <span>Quota Utilization</span>
                {getDeltaBadge(simulationResult.deltas.quotaUtilizationDelta, true)}
              </div>
              <div className="text-3xl font-extrabold font-mono text-white tracking-tight">
                {simulationResult.simulated.metrics.quotaUtilizationRate}%
              </div>
              <p className="text-xs text-zinc-400 font-medium">
                Total Quota: <span className="text-zinc-200 font-semibold">{simulationResult.simulated.metrics.totalQuota} seats</span>
              </p>
            </div>
          </div>

          {/* Student Impact Delta Table */}
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                Simulated Candidate Allocation Changes ({simulationResult.deltas.totalChangedStudents} affected)
              </h3>
              <span className="text-xs font-semibold text-zinc-400">Real-time Gale-Shapley Delta Analysis</span>
            </div>

            {simulationResult.deltas.studentDeltas.length === 0 ? (
              <p className="text-sm text-zinc-400 py-6 text-center italic">
                No student allocation changes occurred under this simulation parameter setup.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>Baseline Match</th>
                      <th className="text-center">→</th>
                      <th>Simulated Match</th>
                      <th>Impact Type</th>
                      <th className="text-right">Package Δ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simulationResult.deltas.studentDeltas.map((delta: any) => (
                      <tr key={delta.studentId} className="hover:bg-zinc-800/40">
                        <td>
                          <div className="font-bold text-white">{delta.studentName}</div>
                          <div className="text-xs text-zinc-400 font-mono">{delta.studentId} • {delta.department}</div>
                        </td>
                        <td>
                          {delta.baselineMatch ? (
                            <div>
                              <span className="font-semibold text-zinc-200">{delta.baselineMatch.companyName}</span>
                              <div className="text-xs text-zinc-400">{delta.baselineMatch.tier} • {delta.baselineMatch.packageLpa} LPA</div>
                            </div>
                          ) : (
                            <span className="text-zinc-500 italic">Unallocated</span>
                          )}
                        </td>
                        <td className="text-center text-zinc-500">
                          <ArrowRight className="w-4 h-4 mx-auto text-purple-400" />
                        </td>
                        <td>
                          {delta.simulatedMatch ? (
                            <div>
                              <span className="text-white font-bold">{delta.simulatedMatch.companyName}</span>
                              <div className="text-xs text-purple-400 font-semibold">{delta.simulatedMatch.tier} • {delta.simulatedMatch.packageLpa} LPA</div>
                            </div>
                          ) : (
                            <span className="text-rose-400 italic">Unallocated</span>
                          )}
                        </td>
                        <td>
                          <span
                            className={`px-3 py-1 text-xs font-bold rounded-full border ${
                              delta.outcomeChange === 'UPGRADED' || delta.outcomeChange === 'NEWLY_PLACED'
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : delta.outcomeChange === 'DOWNGRADED' || delta.outcomeChange === 'LOST_PLACEMENT'
                                ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                            }`}
                          >
                            {delta.outcomeChange.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="text-right font-mono font-bold">
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
      <div className="glass-card p-6 space-y-5">
        {/* Controls Bar: Search & Tier Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-purple-400" />
              Configurable Drive Parameters & Cutoff Controls
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Adjust quotas and minimum GPA cutoffs below, then click "Run Simulation" to evaluate outcomes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search drive or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field text-xs pl-9 py-1.5 w-48"
              />
            </div>

            {/* Tier Filter Buttons */}
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
              {['all', 'DREAM', 'CORE', 'MASS'].map((tier) => (
                <button
                  key={tier}
                  onClick={() => setSelectedTierFilter(tier)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                    selectedTierFilter === tier
                      ? 'bg-purple-600 text-white shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Drives Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDrives.map((drive) => {
            const ov = overrides[drive.id] || { minGpa: drive.minGpa, quota: drive.openPositions, tier: drive.offerTier };

            return (
              <div
                key={drive.id}
                className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-purple-500/40 transition-all space-y-4 shadow-md group"
              >
                {/* Drive Title & Tier */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-white text-base group-hover:text-purple-300 transition-colors">
                      {drive.company?.name || drive.companyName}
                    </h4>
                    <p className="text-xs text-zinc-400 font-medium mt-0.5">
                      {drive.role} • <span className="text-purple-400 font-semibold">{drive.packageLpa} LPA</span>
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border ${getTierBadgeStyle(ov.tier)}`}>
                    {ov.tier}
                  </span>
                </div>

                {/* Quota Counter & Slider */}
                <div className="space-y-2 pt-1 border-t border-zinc-800/80">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-zinc-300 uppercase tracking-wider">Open Quota Seats</span>
                    <span className="font-mono font-bold text-sm text-white px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700">
                      {ov.quota} seats
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleUpdateOverride(drive.id, 'quota', Math.max(1, ov.quota - 1))}
                      className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-purple-600 hover:text-white text-zinc-300 font-extrabold text-sm flex items-center justify-center border border-zinc-700 transition-colors"
                      title="Decrease quota"
                    >
                      -
                    </button>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={ov.quota}
                      onChange={(e) => handleUpdateOverride(drive.id, 'quota', parseInt(e.target.value, 10))}
                      className="w-full accent-purple-500 h-2 bg-zinc-800 rounded-lg cursor-pointer"
                    />
                    <button
                      onClick={() => handleUpdateOverride(drive.id, 'quota', ov.quota + 1)}
                      className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-purple-600 hover:text-white text-zinc-300 font-extrabold text-sm flex items-center justify-center border border-zinc-700 transition-colors"
                      title="Increase quota"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Min GPA Cutoff Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-zinc-300 uppercase tracking-wider">Min GPA Cutoff</span>
                    <span className="font-mono font-bold text-sm text-purple-300 px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700">
                      {ov.minGpa.toFixed(1)} GPA
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5.0"
                    max="9.5"
                    step="0.1"
                    value={ov.minGpa}
                    onChange={(e) => handleUpdateOverride(drive.id, 'minGpa', parseFloat(e.target.value))}
                    className="w-full accent-purple-500 h-2 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Tier Selector Dropdown */}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-800/80">
                  <span className="font-bold text-zinc-400 uppercase tracking-wider">Offer Tier:</span>
                  <select
                    value={ov.tier}
                    onChange={(e) => handleUpdateOverride(drive.id, 'tier', e.target.value)}
                    className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="SUPER_DREAM">SUPER DREAM</option>
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
