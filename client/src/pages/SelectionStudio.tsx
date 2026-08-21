import React, { useState, useEffect } from 'react';
import {
  Users, CheckCircle2, XCircle, Award, Sliders, Search, ArrowUpDown,
  Filter, AlertCircle, History, RefreshCw, ChevronRight, UserCheck, Star
} from 'lucide-react';
import { api } from '../lib/api';

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

  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  const getTierColor = (tier: string) => {
    const t = tier?.toUpperCase() || '';
    if (t.includes('DREAM') || t.includes('SUPER')) return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    if (t.includes('CORE')) return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  };

  const getDecisionBadge = (decision: string, reason?: string) => {
    switch (decision) {
      case 'SELECTED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Selected (Ranked)</span>;
      case 'SHORTLISTED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">Shortlisted</span>;
      case 'DESELECTED':
        return (
          <div className="flex flex-col items-start gap-0.5">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">Deselected</span>
            {reason && <span className="text-[10px] text-zinc-400 tracking-tight">{reason.replace(/_/g, ' ')}</span>}
          </div>
        );
      case 'INELIGIBLE':
        return (
          <div className="flex flex-col items-start gap-0.5">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">Ineligible</span>
            {reason && <span className="text-[10px] text-amber-500/80">{reason}</span>}
          </div>
        );
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-zinc-500/10 text-zinc-400 border border-zinc-500/30">{decision}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">Selection & Deselection Studio</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              Module A
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Deterministic candidate scoring, transparent tie-breaking, shortlisting cutoffs, and audit-backed deselection tracking.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setActiveTab('candidates')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-all ${
              activeTab === 'candidates' ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            Candidate Roster
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-all ${
              activeTab === 'logs' ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            Deselection Audit Log ({logs.length})
          </button>
        </div>
      </div>

      {activeTab === 'candidates' ? (
        <>
          {/* Drive Selector Bar */}
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-[280px]">
              <label className="text-xs font-medium text-zinc-400 whitespace-nowrap">Target Recruitment Drive:</label>
              <select
                value={selectedDriveId}
                onChange={(e) => setSelectedDriveId(e.target.value)}
                className="w-full bg-zinc-800/80 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {drives.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.company?.name || d.companyName} — {d.role} ({d.packageLpa} LPA, {d.offerTier})
                  </option>
                ))}
              </select>
            </div>

            {driveData && (
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700">
                  <Award className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-zinc-400">Open Quota:</span>
                  <span className="font-bold text-white">{driveData.quota} seats</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700">
                  <span className="text-zinc-400">Min GPA Cutoff:</span>
                  <span className="font-bold text-white">{driveData.minGpa}</span>
                </div>
                <span className={`px-3 py-1 text-xs font-semibold rounded-lg border ${getTierColor(driveData.tier)}`}>
                  {driveData.tier} TIER
                </span>
              </div>
            )}
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search candidate name, STU ID, dept..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-zinc-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Decision Statuses</option>
                <option value="SELECTED">Selected</option>
                <option value="SHORTLISTED">Shortlisted</option>
                <option value="DESELECTED">Deselected</option>
                <option value="INELIGIBLE">Ineligible</option>
              </select>
              <button
                onClick={() => loadDriveCandidates(selectedDriveId)}
                className="p-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white"
                title="Refresh Candidates"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Candidate Evaluation Table */}
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="bg-zinc-800/60 text-xs font-semibold uppercase text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="px-4 py-3 text-center">Rank</th>
                    <th className="px-4 py-3">Candidate</th>
                    <th className="px-4 py-3">Dept & GPA</th>
                    <th className="px-4 py-3">Skill Match</th>
                    <th className="px-4 py-3">Recruiter Score</th>
                    <th className="px-4 py-3">Composite</th>
                    <th className="px-4 py-3">Decision</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-zinc-500">
                        <div className="inline-flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                          Evaluating applicants with deterministic formula...
                        </div>
                      </td>
                    </tr>
                  ) : filteredCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-zinc-500">
                        No candidate applications found matching current criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCandidates.map((c) => (
                      <tr key={c.studentId} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-4 py-3 text-center font-bold text-zinc-400">
                          {c.rank <= 999 ? `#${c.rank}` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-white">{c.studentName}</div>
                          <div className="text-xs text-zinc-500 font-mono">{c.studentId}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-zinc-300">{c.department}</div>
                          <div className="text-xs font-semibold text-indigo-400">{c.gpa.toFixed(2)} GPA</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-zinc-800 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full ${
                                  c.skillScore >= 80 ? 'bg-emerald-500' : c.skillScore >= 60 ? 'bg-blue-500' : 'bg-amber-500'
                                }`}
                                style={{ width: `${c.skillScore}%` }}
                              />
                            </div>
                            <span className="font-bold text-xs text-zinc-200">{c.skillScore}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-white">{c.recruiterScore || '—'}</span>
                            <button
                              onClick={() => {
                                setScoringCandidate(c);
                                setEvalScore(c.recruiterScore || 80);
                              }}
                              className="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2 ml-1"
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                          {c.compositeScore?.toFixed(1) || '—'}
                        </td>
                        <td className="px-4 py-3">
                          {getDecisionBadge(c.decision, c.deselectionReason)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleDecision(c, 'SELECTED')}
                              disabled={updatingId === (c.studentDbId || c.studentId)}
                              className={`p-2 rounded-xl transition-all flex items-center justify-center ${
                                c.decision === 'SELECTED'
                                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105'
                                  : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 hover:scale-105'
                              }`}
                              title="Approve / Select Candidate"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDecision(c, 'DESELECTED', 'TPO_MANUAL_OVERRIDE')}
                              disabled={updatingId === (c.studentDbId || c.studentId)}
                              className={`p-2 rounded-xl transition-all flex items-center justify-center ${
                                c.decision === 'DESELECTED'
                                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 scale-105'
                                  : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 hover:scale-105'
                              }`}
                              title="Deselect / Reject Candidate"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Deselection Audit Log View */
        <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-400" />
              Candidate Decision & Deselection Audit Trail
            </h3>
            <span className="text-xs text-zinc-400">{logs.length} logged events</span>
          </div>

          <div className="divide-y divide-zinc-800">
            {logs.length === 0 ? (
              <p className="text-sm text-zinc-500 py-8 text-center">No selection logs recorded yet.</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="py-3 flex items-center justify-between gap-4 text-sm">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        log.decision === 'SELECTED'
                          ? 'bg-emerald-400'
                          : log.decision === 'DESELECTED'
                          ? 'bg-rose-400'
                          : 'bg-indigo-400'
                      }`}
                    />
                    <div>
                      <span className="font-semibold text-white">{log.student?.name || log.studentId}</span>
                      <span className="text-xs text-zinc-400 ml-2">({log.student?.studentId || log.studentId})</span>
                      <p className="text-xs text-zinc-400">
                        {log.drive?.company?.name} — {log.drive?.role} | Decision: <strong className="text-zinc-200">{log.decision}</strong> ({log.reason || 'None'})
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {log.source || 'SYSTEM'}
                    </span>
                    <p className="text-[10px] text-zinc-500 mt-1">{new Date(log.createdAt).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Recruiter Scoring Modal */}
      {scoringCandidate && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400" />
              Recruiter Evaluation: {scoringCandidate.studentName}
            </h3>
            <p className="text-xs text-zinc-400">
              Update recruiter evaluation score for {driveData?.companyName} ({driveData?.role}).
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-300">Score (0 - 100): {evalScore}</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={evalScore}
                  onChange={(e) => setEvalScore(Number(e.target.value))}
                  className="w-full mt-1 accent-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300">Review Notes</label>
                <textarea
                  value={evalNotes}
                  onChange={(e) => setEvalNotes(e.target.value)}
                  placeholder="Strong DSA skills, clear communication in round 1..."
                  rows={3}
                  className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setScoringCandidate(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleScoreSubmit}
                disabled={submittingScore}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-lg"
              >
                {submittingScore ? 'Saving...' : 'Save Evaluation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default SelectionStudio;
