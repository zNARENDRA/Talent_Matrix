import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import {
  Megaphone, Building2, Users, Briefcase, Clock,
  CheckCircle2, Kanban, LayoutGrid, ArrowRight, ShieldCheck,
  ChevronRight, Award, Filter
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { cn } from '../lib/utils';

const tierBadgeVariant: Record<string, 'purple' | 'info' | 'warning' | 'default'> = {
  super_dream: 'purple',
  dream: 'info',
  core: 'warning',
  standard: 'default',
};

const statusVariantMap: Record<string, 'outline' | 'success' | 'warning' | 'info' | 'destructive'> = {
  draft: 'outline',
  open: 'success',
  in_progress: 'warning',
  completed: 'info',
  cancelled: 'destructive',
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header with View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Recruitment Drives & Multi-Round Pipeline
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              {drivesData?.total || 0} Active Drives
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            End-to-end stage progression tracking from profile shortlisting through technical interviews and offer letters.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
            <Button
              variant={view === 'catalog' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('catalog')}
              className="text-xs font-semibold"
            >
              <LayoutGrid className="w-3.5 h-3.5 mr-1.5" /> Drives Catalog
            </Button>
            <Button
              variant={view === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('kanban')}
              className="text-xs font-semibold"
            >
              <Kanban className="w-3.5 h-3.5 mr-1.5" /> Multi-Round Kanban
            </Button>
          </div>

          <Button variant="brand" size="sm" className="text-xs font-semibold">
            <Megaphone className="w-3.5 h-3.5 mr-1.5" /> Create Drive
          </Button>
        </div>
      </div>

      {/* ─── 1. Drives Catalog View ──────────────────────────── */}
      {view === 'catalog' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {drivesLoading ? (
            [...Array(6)].map((_, i) => <Card key={i} className="h-56 animate-pulse bg-muted/40" />)
          ) : (
            drivesData?.data?.map((drive: any, i: number) => (
              <motion.div
                key={drive.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ y: -3 }}
                className="cursor-pointer group"
                onClick={() => {
                  setSelectedDriveId(drive.id);
                  setView('kanban');
                }}
              >
                <Card className="overflow-hidden h-full flex flex-col justify-between hover:border-primary/50 hover:shadow-md transition-all">
                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{drive.company?.name}</span>
                        </div>
                        <h3 className="font-bold text-base mt-1 text-foreground">{drive.role}</h3>
                      </div>
                      <Badge variant={statusVariantMap[drive.status] || 'outline'} className="capitalize text-[10px]">
                        {drive.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-extrabold text-foreground text-base font-mono">
                        ₹{drive.packageLpa} LPA
                      </span>
                      <Badge
                        variant={tierBadgeVariant[drive.offerTier] || 'default'}
                        className="text-[10px] uppercase font-mono"
                      >
                        {drive.offerTier.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Users className="w-3.5 h-3.5" /> {drive._count?.applications || 0} applied
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Briefcase className="w-3.5 h-3.5" /> {drive.openPositions} positions
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {drive._count?.offers || 0} offers
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="w-3.5 h-3.5 text-sky-500" /> {drive.interviewRounds?.length || 4} rounds
                      </div>
                    </div>
                  </div>

                  <div className="px-5 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {JSON.parse(drive.eligibleDepts || '[]').slice(0, 3).map((dept: string) => (
                        <Badge key={dept} variant="outline" className="text-[9px] px-1.5 py-0 font-mono">
                          {dept}
                        </Badge>
                      ))}
                    </div>
                    <span className="text-xs font-semibold text-primary flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      View Pipeline <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* ─── 2. Multi-Round Pipeline Kanban Board ─────────────── */}
      {view === 'kanban' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <Card>
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Target Drive:</span>
                <select
                  value={selectedDriveId}
                  onChange={(e) => setSelectedDriveId(e.target.value)}
                  className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-semibold text-foreground w-72 focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">All Recruitment Drives ({drivesData?.total || 0})</option>
                  {drivesData?.data?.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.company?.name} — {d.role} (₹{d.packageLpa} LPA)
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-xs text-muted-foreground font-medium">
                Tracking <strong className="text-foreground">{kanbanData?.totalCandidates || 0}</strong> applicants across stages
              </div>
            </CardContent>
          </Card>

          {/* Kanban Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 overflow-x-auto pb-4">
            {kanbanData?.columns?.map((col: any) => {
              const nextStage = getNextStageInfo(col.id);

              return (
                <div
                  key={col.id}
                  className="bg-muted/40 rounded-xl p-3 border border-border flex flex-col min-w-[220px]"
                >
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-tight">
                      {col.title}
                    </h3>
                    <Badge variant="secondary" className="text-[10px] font-mono font-bold px-1.5 py-0">
                      {col.candidates?.length || 0}
                    </Badge>
                  </div>

                  {/* Candidate Cards Column */}
                  <div className="space-y-2.5 flex-1 max-h-[620px] overflow-y-auto pr-1">
                    {col.candidates?.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-xs italic">
                        No candidates in this stage.
                      </div>
                    ) : (
                      col.candidates.map((c: any) => (
                        <Card
                          key={c.applicationId}
                          className="p-3 shadow-xs space-y-2 group border-border hover:border-primary/40 transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-bold text-xs text-foreground">{c.name}</div>
                              <div className="text-[10px] text-muted-foreground font-mono">{c.studentId} • {c.department}</div>
                            </div>
                            <Badge variant="brand" className="text-[10px] px-1 py-0 font-mono font-bold">
                              GPA {c.gpa}
                            </Badge>
                          </div>

                          <div className="text-[11px] text-foreground font-medium truncate">
                            {c.company}
                          </div>

                          {/* Authenticity Badge if assessment taken */}
                          {c.authenticityScore !== null && (
                            <div className="flex items-center justify-between pt-1 border-t border-border text-[10px]">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-emerald-500" /> Auth Score:
                              </span>
                              <span
                                className={`font-mono font-bold ${
                                  c.authenticityScore >= 80
                                    ? 'text-emerald-500'
                                    : c.authenticityScore >= 60
                                    ? 'text-amber-500'
                                    : 'text-rose-500'
                                }`}
                              >
                                {c.authenticityScore}/100
                              </span>
                            </div>
                          )}

                          {/* 1-Click Progression Action Button */}
                          {nextStage && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleAdvance(c.applicationId, nextStage.nextStatus, nextStage.nextRound)}
                              disabled={advancingId === c.applicationId}
                              className="w-full text-[10px] py-1 h-7 flex items-center justify-center gap-1 font-semibold hover:bg-primary hover:text-primary-foreground transition-all"
                            >
                              {advancingId === c.applicationId ? (
                                'Advancing...'
                              ) : (
                                <>
                                  {nextStage.label} <ArrowRight className="w-3 h-3" />
                                </>
                              )}
                            </Button>
                          )}
                        </Card>
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
export default DrivesPage;
