import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import {
  Megaphone, Building2, Users, Briefcase, Clock, Calendar,
  CheckCircle2, Kanban, LayoutGrid, ArrowRight, ShieldCheck,
  ChevronRight, Award, Sparkles, Filter,
} from 'lucide-react';

const tierColors: Record<string, string> = {
  super_dream: 'bg-gradient-to-r from-purple-500 to-indigo-500',
  dream: 'bg-gradient-to-r from-blue-500 to-cyan-500',
  core: 'bg-gradient-to-r from-amber-500 to-orange-500',
  standard: 'bg-gradient-to-r from-gray-400 to-gray-500',
};

const statusMap: Record<string, string> = {
  draft: 'badge badge-neutral',
  open: 'badge badge-success',
  in_progress: 'badge badge-warning',
  completed: 'badge badge-info',
  cancelled: 'badge badge-danger',
};

export const DrivesPage: React.FC = () => {
  const [view, setView] = useState<'catalog' | 'kanban'>('catalog');
  const [selectedDriveId, setSelectedDriveId] = useState<string>('');
  const [advancingId, setAdvancingId] = useState<string | null>(null);

  const { data: drivesData, loading: drivesLoading } = useApi(() => api.getDrives());
  const {
    data: kanbanData,
    loading: kanbanLoading,
    refetch: refetchKanban,
  } = useApi(() => api.getPipelineKanban(selectedDriveId || undefined), [selectedDriveId]);

  const handleAdvance = async (applicationId: string, nextStatus: string, nextRound: number) => {
    setAdvancingId(applicationId);
    try {
      await api.advanceCandidateRound({
        applicationId,
        nextStatus,
        nextRound,
      });
      refetchKanban();
    } catch (err: any) {
      alert('Failed to advance candidate: ' + err.message);
    } finally {
      setAdvancingId(null);
    }
  };

  const getNextStageInfo = (columnId: string) => {
    switch (columnId) {
      case 'applied':
        return { nextStatus: 'assessment', nextRound: 1, label: 'Promote to Coding' };
      case 'assessment':
        return { nextStatus: 'technical_round', nextRound: 2, label: 'Promote to Tech' };
      case 'technical_round':
        return { nextStatus: 'system_design', nextRound: 3, label: 'Promote to System Design' };
      case 'system_design':
        return { nextStatus: 'hr_round', nextRound: 4, label: 'Promote to HR' };
      case 'hr_round':
        return { nextStatus: 'offered', nextRound: 5, label: 'Extend Offer' };
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header with View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="section-title">Recruitment Drives & Multi-Round Pipeline</h1>
          <p className="text-surface-500 mt-1">
            {drivesData?.total || 0} active corporate recruitment drives with stage-by-stage candidate progression
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-surface-100 dark:bg-surface-800 p-1 rounded-xl">
            <button
              onClick={() => setView('catalog')}
              className={`btn text-xs ${view === 'catalog' ? 'btn-primary' : 'btn-secondary border-0 shadow-none'}`}
            >
              <LayoutGrid className="w-4 h-4" /> Drives Catalog
            </button>
            <button
              onClick={() => setView('kanban')}
              className={`btn text-xs ${view === 'kanban' ? 'btn-primary' : 'btn-secondary border-0 shadow-none'}`}
            >
              <Kanban className="w-4 h-4" /> Multi-Round Kanban
            </button>
          </div>
          <button className="btn-primary text-xs">
            <Megaphone className="w-4 h-4" /> Create Drive
          </button>
        </div>
      </div>

      {/* ─── 1. Drives Catalog View ──────────────────────────── */}
      {view === 'catalog' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {drivesLoading ? (
            [...Array(6)].map((_, i) => <div key={i} className="skeleton h-56 rounded-xl" />)
          ) : (
            drivesData?.data?.map((drive: any, i: number) => (
              <motion.div
                key={drive.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ y: -3 }}
                className="glass-card overflow-hidden cursor-pointer group"
                onClick={() => {
                  setSelectedDriveId(drive.id);
                  setView('kanban');
                }}
              >
                <div className={`h-2 ${tierColors[drive.offerTier] || 'bg-gray-300'}`} />
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-surface-400" />
                        <span className="text-sm text-surface-500 font-medium">{drive.company?.name}</span>
                      </div>
                      <h3 className="font-semibold text-lg mt-0.5 text-surface-900 dark:text-white">{drive.role}</h3>
                    </div>
                    <span className={statusMap[drive.status]}>{drive.status.replace('_', ' ')}</span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-surface-500">
                    <span className="font-bold text-surface-900 dark:text-white text-lg font-mono">
                      ₹{drive.packageLpa} LPA
                    </span>
                    <span
                      className={`badge text-xs uppercase font-mono ${
                        drive.offerTier === 'super_dream'
                          ? 'badge-primary'
                          : drive.offerTier === 'dream'
                          ? 'badge-info'
                          : drive.offerTier === 'core'
                          ? 'badge-warning'
                          : 'badge-neutral'
                      }`}
                    >
                      {drive.offerTier.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-surface-500">
                      <Users className="w-3.5 h-3.5" /> {drive._count?.applications || 0} applied
                    </div>
                    <div className="flex items-center gap-1.5 text-surface-500">
                      <Briefcase className="w-3.5 h-3.5" /> {drive.openPositions} positions
                    </div>
                    <div className="flex items-center gap-1.5 text-surface-500">
                      <CheckCircle2 className="w-3.5 h-3.5 text-success-500" /> {drive._count?.offers || 0} offers
                    </div>
                    <div className="flex items-center gap-1.5 text-surface-500">
                      <Clock className="w-3.5 h-3.5 text-info-500" /> {drive.interviewRounds?.length || 4} rounds
                    </div>
                  </div>

                  <div className="pt-2 border-t border-surface-100 dark:border-surface-800 flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {JSON.parse(drive.eligibleDepts || '[]').slice(0, 3).map((dept: string) => (
                        <span key={dept} className="badge badge-neutral text-[10px]">
                          {dept}
                        </span>
                      ))}
                    </div>
                    <span className="text-xs text-primary-600 dark:text-primary-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      View Pipeline <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* ─── 2. Multi-Round Pipeline Kanban Board ─────────────── */}
      {view === 'kanban' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Filter className="w-4 h-4 text-surface-400" />
              <span className="text-xs font-semibold text-surface-500 uppercase">Filter Recruitment Drive:</span>
              <select
                value={selectedDriveId}
                onChange={(e) => setSelectedDriveId(e.target.value)}
                className="input-field text-xs py-1.5 w-64"
              >
                <option value="">All Recruitment Drives ({drivesData?.total || 0})</option>
                {drivesData?.data?.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.company?.name} — {d.role} (₹{d.packageLpa} LPA)
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs text-surface-500">
              Showing <span className="font-semibold text-surface-900 dark:text-white">{kanbanData?.totalCandidates || 0}</span> candidates across recruitment stages
            </div>
          </div>

          {/* Kanban Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 overflow-x-auto pb-4">
            {kanbanData?.columns?.map((col: any) => {
              const nextStage = getNextStageInfo(col.id);

              return (
                <div
                  key={col.id}
                  className="bg-surface-50/70 dark:bg-surface-900/50 rounded-xl p-3 border border-surface-200 dark:border-surface-800 flex flex-col min-w-[220px]"
                >
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-surface-200 dark:border-surface-800">
                    <h3 className="text-xs font-bold text-surface-900 dark:text-white uppercase tracking-tight">
                      {col.title}
                    </h3>
                    <span className="badge badge-neutral text-[10px] font-mono font-bold">
                      {col.candidates?.length || 0}
                    </span>
                  </div>

                  {/* Candidate Cards Column */}
                  <div className="space-y-2.5 flex-1 max-h-[620px] overflow-y-auto pr-1">
                    {col.candidates?.length === 0 ? (
                      <div className="text-center py-8 text-surface-400 text-xs italic">
                        No candidates in this stage.
                      </div>
                    ) : (
                      col.candidates.map((c: any) => (
                        <motion.div
                          key={c.applicationId}
                          initial={{ opacity: 0, scale: 0.96 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="p-3 rounded-lg bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 shadow-sm space-y-2 group"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-semibold text-xs text-surface-900 dark:text-white">{c.name}</div>
                              <div className="text-[10px] text-surface-400 font-mono">{c.studentId} • {c.department}</div>
                            </div>
                            <span className="text-[10px] font-bold font-mono text-primary-600 bg-primary-50 dark:bg-primary-900/30 px-1.5 py-0.5 rounded">
                              GPA {c.gpa}
                            </span>
                          </div>

                          <div className="text-[11px] text-surface-600 dark:text-surface-300 font-medium">
                            {c.company}
                          </div>

                          {/* Authenticity Badge if assessment taken */}
                          {c.authenticityScore !== null && (
                            <div className="flex items-center justify-between pt-1 border-t border-surface-100 dark:border-surface-700/60 text-[10px]">
                              <span className="text-surface-400 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-emerald-500" /> Auth Score:
                              </span>
                              <span
                                className={`font-mono font-bold ${
                                  c.authenticityScore >= 80
                                    ? 'text-emerald-500'
                                    : c.authenticityScore >= 60
                                    ? 'text-amber-500'
                                    : 'text-red-500'
                                }`}
                              >
                                {c.authenticityScore}/100
                              </span>
                            </div>
                          )}

                          {/* 1-Click Progression Action */}
                          {nextStage && (
                            <button
                              onClick={() => handleAdvance(c.applicationId, nextStage.nextStatus, nextStage.nextRound)}
                              disabled={advancingId === c.applicationId}
                              className="btn w-full text-[10px] py-1 bg-surface-100 hover:bg-primary-600 hover:text-white dark:bg-surface-700 dark:hover:bg-primary-600 transition-colors flex items-center justify-center gap-1"
                            >
                              {advancingId === c.applicationId ? (
                                'Advancing...'
                              ) : (
                                <>
                                  {nextStage.label} <ArrowRight className="w-3 h-3" />
                                </>
                              )}
                            </button>
                          )}
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
