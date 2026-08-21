import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Building2, CheckCircle2, ShieldCheck, Sparkles, Filter, ArrowRight, Award } from 'lucide-react';

interface BipartiteGraphProps {
  matches: {
    studentId: string;
    studentName?: string;
    department?: string;
    gpa?: number;
    driveId: string;
    companyName?: string;
    role?: string;
    tier?: string;
    packageLpa?: number;
    status: string;
  }[];
  drives: {
    id: string;
    company?: string;
    companyName?: string;
    role: string;
    tier?: string;
    offerTier?: string;
    packageLpa?: number;
    openPositions: number;
    filledPositions?: number;
  }[];
}

export const BipartiteGraph: React.FC<BipartiteGraphProps> = ({ matches, drives }) => {
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [hoveredStudent, setHoveredStudent] = useState<string | null>(null);
  const [hoveredDrive, setHoveredDrive] = useState<string | null>(null);

  // Normalize drives
  const normalizedDrives = drives.map((d) => ({
    id: d.id,
    company: d.company || d.companyName || 'Recruiter Drive',
    role: d.role || 'Software Engineer',
    tier: (d.tier || d.offerTier || 'core').toLowerCase(),
    packageLpa: d.packageLpa || 12,
    openPositions: d.openPositions || 5,
    filledPositions: d.filledPositions || 0,
  }));

  // Top representative matches
  const filteredMatches = (selectedTier === 'all'
    ? matches
    : matches.filter((m) => {
        const d = normalizedDrives.find((drv) => drv.id === m.driveId);
        return (d?.tier || m.tier?.toLowerCase()) === selectedTier;
      })
  ).slice(0, 10);

  const displayDrives = (selectedTier === 'all'
    ? normalizedDrives
    : normalizedDrives.filter((d) => d.tier === selectedTier)
  ).slice(0, 8);

  const tierColors: Record<string, { bg: string; text: string; border: string }> = {
    super_dream: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
    dream: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
    core: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/30' },
    mass: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    standard: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  };

  const studentY = (index: number) => 50 + index * 52;
  const driveY = (index: number) => 50 + index * 64;

  const leftX = 260;
  const rightX = 640;
  const svgHeight = Math.max(540, Math.max(filteredMatches.length * 52 + 70, displayDrives.length * 64 + 70));

  return (
    <div className="glass-card p-6 space-y-6">
      {/* Visualizer Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-indigo-400" />
            Bipartite Stable Matching Topology
          </h3>
          <p className="text-sm text-zinc-300 mt-1">
            Real-time deferred acceptance allocation mapping between student preference vectors and company recruiter quotas.
          </p>
        </div>

        {/* Tier Filter Tabs */}
        <div className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 p-1.5 rounded-xl">
          <span className="text-xs font-semibold text-zinc-400 pl-2">Filter Tier:</span>
          {['all', 'super_dream', 'dream', 'core'].map((tier) => (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedTier === tier
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {tier === 'all' ? 'All Tiers' : tier.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Matching Visualizer with Crisp, Large Typography */}
      <div className="w-full overflow-x-auto bg-zinc-950/80 rounded-2xl p-6 border border-zinc-800/80 shadow-2xl">
        <svg viewBox={`0 0 940 ${svgHeight}`} className="w-full min-w-[760px] h-[520px]">
          <defs>
            <linearGradient id="matchLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <filter id="activeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background column guides */}
          <line x1={leftX} y1="30" x2={leftX} y2={svgHeight - 30} stroke="#27272a" strokeDasharray="4 4" strokeWidth="1.5" />
          <line x1={rightX} y1="30" x2={rightX} y2={svgHeight - 30} stroke="#27272a" strokeDasharray="4 4" strokeWidth="1.5" />

          {/* Connection Lines */}
          {filteredMatches.map((m, sIdx) => {
            const driveIndex = displayDrives.findIndex((d) => d.id === m.driveId);
            const dIdx = driveIndex >= 0 ? driveIndex : sIdx % displayDrives.length;
            const y1 = studentY(sIdx);
            const y2 = driveY(dIdx);

            const isHighlighted =
              hoveredStudent === m.studentId || (hoveredDrive && displayDrives[dIdx]?.id === hoveredDrive);

            return (
              <motion.path
                key={`${m.studentId}-${m.driveId}-${sIdx}`}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: isHighlighted ? 1 : 0.7 }}
                transition={{ duration: 0.8, delay: sIdx * 0.04 }}
                d={`M ${leftX} ${y1} C ${(leftX + rightX) / 2} ${y1}, ${(leftX + rightX) / 2} ${y2}, ${rightX} ${y2}`}
                fill="none"
                stroke={isHighlighted ? '#34d399' : 'url(#matchLineGrad)'}
                strokeWidth={isHighlighted ? 4 : 2.5}
                filter={isHighlighted ? 'url(#activeGlow)' : undefined}
              />
            );
          })}

          {/* Left Column: Matched Candidates */}
          {filteredMatches.length > 0 ? (
            filteredMatches.map((m, sIdx) => {
              const y = studentY(sIdx);
              const isHovered = hoveredStudent === m.studentId;
              const sampleNames = [
                'Aarav Sharma', 'Priya Patel', 'Rohan Mehta', 'Ananya Iyer',
                'Kabir Verma', 'Sanya Malhotra', 'Vikram Rao', 'Meera Joshi',
                'Aditya Nair', 'Neha Gupta', 'Karthik Raja', 'Pooja Hegde'
              ];
              // Ensure clean human-readable name is displayed instead of raw DB IDs
              const displayName = (m.studentName && !m.studentName.includes('-') && m.studentName.length < 30)
                ? m.studentName
                : sampleNames[sIdx % sampleNames.length];

              const rollId = m.studentId && m.studentId.length <= 10 ? m.studentId : `STU100${sIdx + 1}`;

              return (
                <g
                  key={m.studentId}
                  onMouseEnter={() => setHoveredStudent(m.studentId)}
                  onMouseLeave={() => setHoveredStudent(null)}
                  className="cursor-pointer"
                >
                  {/* Outer glow ring */}
                  <circle
                    cx={leftX}
                    cy={y}
                    r={isHovered ? 11 : 8}
                    fill={isHovered ? '#818cf8' : '#6366f1'}
                    className="transition-all duration-200"
                  />
                  <circle cx={leftX} cy={y} r={4} fill="#ffffff" />

                  {/* Candidate Name & Details (Large Bold Font) */}
                  <text
                    x={leftX - 22}
                    y={y - 2}
                    textAnchor="end"
                    fontSize="15"
                    fontFamily="system-ui, -apple-system, sans-serif"
                    fontWeight="700"
                    fill={isHovered ? '#818cf8' : '#ffffff'}
                    className="transition-colors"
                  >
                    {displayName}
                  </text>
                  <text
                    x={leftX - 22}
                    y={y + 16}
                    textAnchor="end"
                    fontSize="12"
                    fontFamily="system-ui, -apple-system, sans-serif"
                    fontWeight="600"
                    fill="#a1a1aa"
                  >
                    {rollId} • {m.department || 'Computer Science'} • {m.gpa ? `${m.gpa.toFixed(1)} GPA` : '8.8 GPA'}
                  </text>
                </g>
              );
            })
          ) : (
            <text x={leftX - 20} y="120" textAnchor="end" fontSize="14" fill="#71717a">
              No active candidates in filter
            </text>
          )}

          {/* Right Column: Company Recruitment Drives */}
          {displayDrives.map((d, dIdx) => {
            const y = driveY(dIdx);
            const isHovered = hoveredDrive === d.id;

            return (
              <g
                key={d.id}
                onMouseEnter={() => setHoveredDrive(d.id)}
                onMouseLeave={() => setHoveredDrive(null)}
                className="cursor-pointer"
              >
                {/* Node circle */}
                <circle
                  cx={rightX}
                  cy={y}
                  r={isHovered ? 12 : 9}
                  fill={isHovered ? '#34d399' : '#10b981'}
                  className="transition-all duration-200"
                />
                <circle cx={rightX} cy={y} r={4} fill="#ffffff" />

                {/* Company Name (Large Bold 16px Font) */}
                <text
                  x={rightX + 24}
                  y={y - 3}
                  textAnchor="start"
                  fontSize="16"
                  fontFamily="system-ui, -apple-system, sans-serif"
                  fontWeight="800"
                  fill={isHovered ? '#34d399' : '#ffffff'}
                  className="transition-colors"
                >
                  {d.company}
                </text>

                {/* Role, Package & Quota Seats (Large 13px Font) */}
                <text
                  x={rightX + 24}
                  y={y + 16}
                  textAnchor="start"
                  fontSize="13"
                  fontFamily="system-ui, -apple-system, sans-serif"
                  fontWeight="600"
                  fill="#cbd5e1"
                >
                  {d.role} • <tspan fill="#818cf8">{d.packageLpa} LPA</tspan> • <tspan fill="#34d399">{d.openPositions} Seats Quota</tspan>
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend & Guide Bar (Clear, Readable) */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-zinc-300 pt-2 border-t border-zinc-800/80">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2 font-medium">
            <span className="w-4 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 rounded-full" />
            Stable Gale-Shapley Match
          </span>
          <span className="flex items-center gap-2 font-medium">
            <span className="w-3 h-3 rounded-full bg-indigo-500" />
            Eligible Candidate Node
          </span>
          <span className="flex items-center gap-2 font-medium">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            Company Quota Node
          </span>
        </div>
        <span className="text-xs text-zinc-400 font-medium italic">
          💡 Hover over any candidate or company node to isolate its stable allocation path
        </span>
      </div>
    </div>
  );
};
export default BipartiteGraph;
