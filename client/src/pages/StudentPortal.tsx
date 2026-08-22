import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { useAuthStore } from '../lib/authStore';
import {
  GraduationCap, Building2, Briefcase, CalendarClock, ShieldCheck,
  CheckCircle2, XCircle, ArrowRight, Video, MapPin, Sparkles,
  Award, Clock, Code2, AlertTriangle, Play, RefreshCw, LogOut, Sliders, Info,
  ChevronUp, ChevronDown, Plus, X, Save, Edit3, Loader2, ArrowUpDown, Search, Trash2
} from 'lucide-react';

interface AvailableDrive {
  id: string;
  companyName: string;
  companyId: string;
  role: string;
  packageLpa: number;
  offerTier: string;
  positions: number;
  status: string;
  alreadyApplied: boolean;
}

interface RankedPreference {
  driveId: string;
  companyName: string;
  role: string;
  packageLpa: number;
  offerTier: string;
}

export const StudentPortalPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const [studentId, setStudentId] = useState<string>(user?.studentId || 'STU1001');
  const [respondingOfferId, setRespondingOfferId] = useState<string | null>(null);
  const [editingSkills, setEditingSkills] = useState<boolean>(false);
  const [skillsList, setSkillsList] = useState<any[]>([]);
  const [savingSkills, setSavingSkills] = useState<boolean>(false);

  // Editable profile state
  const [editingProfile, setEditingProfile] = useState<boolean>(false);
  const [profileForm, setProfileForm] = useState<{ name: string; email: string; phone: string; department: string }>({
    name: '', email: '', phone: '', department: '',
  });
  const [savingProfile, setSavingProfile] = useState<boolean>(false);

  // Dream Company Preference Selector state
  const [availableDrives, setAvailableDrives] = useState<AvailableDrive[]>([]);
  const [rankedPreferences, setRankedPreferences] = useState<RankedPreference[]>([]);
  const [savingPreferences, setSavingPreferences] = useState<boolean>(false);
  const [loadingDrives, setLoadingDrives] = useState<boolean>(false);
  const [applyingDriveId, setApplyingDriveId] = useState<string | null>(null);
  const [driveSearchTerm, setDriveSearchTerm] = useState<string>('');
  const [prefsDirty, setPrefsDirty] = useState<boolean>(false);

  const {
    data: portalData,
    loading,
    refetch,
  } = useApi(() => api.getStudentPortalMe(studentId), [studentId]);

  useEffect(() => {
    if (user?.studentId && user.studentId !== studentId) {
      setStudentId(user.studentId);
    }
  }, [user]);

  useEffect(() => {
    if (studentId) {
      loadStudentSkills();
      loadAvailableDrives();
    }
  }, [studentId]);

  // Initialize profile form and preferences from portal data
  useEffect(() => {
    if (portalData?.student) {
      const s = portalData.student;
      setProfileForm({
        name: s.name || '',
        email: s.email || '',
        phone: s.phone || '',
        department: s.department || '',
      });
    }

    if (portalData?.preferences) {
      const existingPrefs: RankedPreference[] = portalData.preferences
        .filter((p: any) => p.drive)
        .map((p: any) => ({
          driveId: p.driveId,
          companyName: p.drive.company?.name || 'Unknown',
          role: p.drive.role || '',
          packageLpa: p.drive.packageLpa || 0,
          offerTier: p.drive.offerTier || '',
        }));
      setRankedPreferences(existingPrefs);
    }
  }, [portalData]);

  const loadStudentSkills = async () => {
    try {
      const res = await api.getStudentSkills(studentId);
      setSkillsList(res.skills || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadAvailableDrives = async () => {
    setLoadingDrives(true);
    try {
      const res = await api.getAvailableDrives(studentId);
      setAvailableDrives(res.drives || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDrives(false);
    }
  };

  const handleOfferResponse = async (offerId: string, action: 'accepted' | 'rejected') => {
    setRespondingOfferId(offerId);
    try {
      await api.respondToOffer(offerId, action);
      refetch();
    } catch (err: any) {
      alert('Error updating offer: ' + err.message);
    } finally {
      setRespondingOfferId(null);
    }
  };

  const handleSkillProficiencyChange = (skillId: string, prof: number) => {
    setSkillsList((prev) =>
      prev.map((s) => (s.skillId === skillId ? { ...s, proficiency: prof } : s))
    );
  };

  const handleSaveSkills = async () => {
    try {
      setSavingSkills(true);
      await api.updateStudentSkills(
        studentId,
        skillsList.map((s) => ({ skillId: s.skillId, proficiency: s.proficiency }))
      );
      setEditingSkills(false);
      refetch();
      alert('Skill proficiencies updated successfully!');
    } catch (err: any) {
      alert('Failed to update skills: ' + err.message);
    } finally {
      setSavingSkills(false);
    }
  };

  // ─── Profile Edit Handlers ───────────────────────────────
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await api.updateStudentProfile(studentId, profileForm);
      setEditingProfile(false);
      refetch();
    } catch (err: any) {
      alert('Failed to update profile: ' + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  // ─── Apply to Drive Handler ──────────────────────────────
  const handleApplyToDrive = async (drive: AvailableDrive) => {
    setApplyingDriveId(drive.id);
    try {
      await api.applyToDrive({ studentId, driveId: drive.id });
      // Mark as applied in local state immediately
      setAvailableDrives((prev) =>
        prev.map((d) => (d.id === drive.id ? { ...d, alreadyApplied: true } : d))
      );
      refetch();
    } catch (err: any) {
      alert('Failed to apply: ' + err.message);
    } finally {
      setApplyingDriveId(null);
    }
  };

  // ─── Preference Ranking Handlers ─────────────────────────
  const addToPreferences = (drive: AvailableDrive) => {
    if (rankedPreferences.some((p) => p.driveId === drive.id)) return;
    setRankedPreferences((prev) => [
      ...prev,
      {
        driveId: drive.id,
        companyName: drive.companyName,
        role: drive.role,
        packageLpa: drive.packageLpa,
        offerTier: drive.offerTier,
      },
    ]);
    setPrefsDirty(true);
  };

  const removeFromPreferences = (driveId: string) => {
    setRankedPreferences((prev) => prev.filter((p) => p.driveId !== driveId));
    setPrefsDirty(true);
  };

  const movePreferenceUp = (index: number) => {
    if (index === 0) return;
    setRankedPreferences((prev) => {
      const updated = [...prev];
      [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
      return updated;
    });
    setPrefsDirty(true);
  };

  const movePreferenceDown = (index: number) => {
    if (index >= rankedPreferences.length - 1) return;
    setRankedPreferences((prev) => {
      const updated = [...prev];
      [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
      return updated;
    });
    setPrefsDirty(true);
  };

  const handleSavePreferences = async () => {
    setSavingPreferences(true);
    try {
      await api.submitStudentPreferences({
        studentId,
        preferences: rankedPreferences.map((p, idx) => ({
          driveId: p.driveId,
          rank: idx + 1,
        })),
      });
      setPrefsDirty(false);
      refetch();
    } catch (err: any) {
      alert('Failed to save preferences: ' + err.message);
    } finally {
      setSavingPreferences(false);
    }
  };

  // ─── Derived Data ────────────────────────────────────────
  const tierColor = (tier: string) => {
    const t = tier.toUpperCase();
    if (t.includes('SUPER')) return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
    if (t.includes('DREAM')) return 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30';
    if (t.includes('CORE')) return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
    return 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30';
  };

  const filteredDrives = availableDrives.filter((d) => {
    if (!driveSearchTerm) return true;
    const term = driveSearchTerm.toLowerCase();
    return (
      d.companyName.toLowerCase().includes(term) ||
      d.role.toLowerCase().includes(term) ||
      d.offerTier.toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="skeleton h-32 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="skeleton h-64 rounded-xl" />
          <div className="skeleton h-64 rounded-xl" />
          <div className="skeleton h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  const s = portalData?.student || user;
  const applications = portalData?.applications || [];
  const offers = portalData?.offers || [];
  const interviews = portalData?.interviews || [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* ─── Student Profile Hero Banner ──────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 relative overflow-hidden bg-gradient-to-r from-indigo-600/10 via-purple-600/10 to-transparent border border-indigo-500/20"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/20">
              {s?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'ST'}
            </div>
            <div>
              {editingProfile ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="bg-zinc-800 border border-zinc-700 text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                      placeholder="Full Name"
                    />
                    <input
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="bg-zinc-800 border border-zinc-700 text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                      placeholder="Email"
                    />
                    <input
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="bg-zinc-800 border border-zinc-700 text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                      placeholder="Phone"
                    />
                    <input
                      value={profileForm.department}
                      onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                      className="bg-zinc-800 border border-zinc-700 text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                      placeholder="Department"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveProfile}
                      disabled={savingProfile}
                      className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {savingProfile ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      Save
                    </button>
                    <button
                      onClick={() => setEditingProfile(false)}
                      className="px-3 py-1 rounded-lg bg-zinc-700 text-zinc-300 text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-2xl font-bold text-white">{s?.name}</h1>
                    <span
                      className={`badge uppercase text-xs font-mono font-semibold ${
                        s?.status === 'placed' ? 'badge-success' : 'badge-primary'
                      }`}
                    >
                      {s?.placementOutcome === 'PLACED' || s?.status === 'placed' ? 'PLACED' : s?.status || 'ELIGIBLE'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 mt-1 font-mono">
                    <span>{s?.studentId}</span>
                    <span>•</span>
                    <span>{s?.department} Department</span>
                    <span>•</span>
                    <span>GPA: <strong className="text-indigo-400 font-bold">{s?.gpa}</strong></span>
                    <span>•</span>
                    <span>Class of {s?.graduationYear || 2026}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!editingProfile && (
              <button
                onClick={() => setEditingProfile(true)}
                className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-400" /> Edit Profile
              </button>
            )}
            <button
              onClick={() => setEditingSkills(!editingSkills)}
              className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              {editingSkills ? 'Close Skill Editor' : 'Edit Skills'}
            </button>
            <button
              onClick={() => navigate('/candidate-sandbox')}
              className="btn-primary text-xs py-2 flex items-center gap-1.5 shadow-md shadow-indigo-500/20"
            >
              <Code2 className="w-4 h-4" /> Assessment Sandbox
            </button>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="btn-secondary text-xs py-2 flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>

        {/* Skill Management Drawer */}
        {editingSkills ? (
          <div className="mt-4 pt-4 border-t border-zinc-700/60 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" /> Adjust Normalized Skill Proficiencies (0 - 100%)
              </span>
              <button
                onClick={handleSaveSkills}
                disabled={savingSkills}
                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md cursor-pointer"
              >
                {savingSkills ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {skillsList.map((skill) => (
                <div key={skill.skillId} className="p-2.5 rounded-xl bg-zinc-800/80 border border-zinc-700 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white font-medium">{skill.skillName}</span>
                    <span className="text-indigo-400 font-mono font-bold">{Math.round(skill.proficiency)}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={skill.proficiency}
                    onChange={(e) => handleSkillProficiencyChange(skill.skillId, Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          skillsList.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-zinc-700/60">
              <span className="text-xs text-zinc-400 mr-1">Verified Technical Profile:</span>
              {skillsList.map((skill) => (
                <span
                  key={skill.skillId}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-200 border border-zinc-700 flex items-center gap-1.5"
                >
                  {skill.skillName}
                  <span className="text-xs font-mono font-bold text-indigo-400">{Math.round(skill.proficiency)}%</span>
                </span>
              ))}
            </div>
          )
        )}
      </motion.div>

      {/* ─── DREAM COMPANY PREFERENCE SELECTOR ────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass-card p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="card-title text-base flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" /> Set My Dream Company Preferences
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Rank companies in order of preference. This vector feeds into the Gale-Shapley stable matching algorithm for optimal placement allocation.
            </p>
          </div>
          <button
            onClick={handleSavePreferences}
            disabled={savingPreferences || !prefsDirty}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              prefsDirty
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
            }`}
          >
            {savingPreferences ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {savingPreferences ? 'Saving...' : prefsDirty ? 'Save Preferences' : 'Saved ✓'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* LEFT: Available Drives to Add */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-zinc-500" /> Available Recruitment Drives
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">{filteredDrives.length} drives</span>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <input
                type="text"
                value={driveSearchTerm}
                onChange={(e) => setDriveSearchTerm(e.target.value)}
                placeholder="Search companies, roles, tiers..."
                className="w-full bg-zinc-800/80 border border-zinc-700 text-white text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
              {loadingDrives ? (
                <div className="text-center py-6 text-zinc-500 text-xs">Loading drives...</div>
              ) : filteredDrives.length === 0 ? (
                <div className="text-center py-6 text-zinc-500 text-xs italic">No matching drives found.</div>
              ) : (
                filteredDrives.map((drive) => {
                  const alreadyInPrefs = rankedPreferences.some((p) => p.driveId === drive.id);
                  return (
                    <div
                      key={drive.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                        alreadyInPrefs
                          ? 'bg-indigo-500/10 border-indigo-500/30'
                          : 'bg-zinc-800/60 border-zinc-700 hover:border-zinc-600'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-white truncate">{drive.companyName}</span>
                          <span className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border ${tierColor(drive.offerTier)}`}>
                            {drive.offerTier.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 truncate">{drive.role} • ₹{drive.packageLpa} LPA • {drive.positions} pos</div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Apply button */}
                        {drive.alreadyApplied ? (
                          <span className="px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                            Applied ✓
                          </span>
                        ) : (
                          <button
                            onClick={() => handleApplyToDrive(drive)}
                            disabled={applyingDriveId === drive.id}
                            className="px-2 py-1 rounded-lg bg-indigo-500/15 text-indigo-400 text-[10px] font-bold border border-indigo-500/30 hover:bg-indigo-500/25 cursor-pointer transition-colors"
                          >
                            {applyingDriveId === drive.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Apply'}
                          </button>
                        )}

                        {/* Add to preferences */}
                        <button
                          onClick={() => addToPreferences(drive)}
                          disabled={alreadyInPrefs}
                          className={`p-1 rounded-lg transition-colors cursor-pointer ${
                            alreadyInPrefs
                              ? 'text-indigo-400 bg-indigo-500/20'
                              : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
                          }`}
                          title={alreadyInPrefs ? 'Already in your preferences' : 'Add to dream preferences'}
                        >
                          {alreadyInPrefs ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT: Ranked Preference Vector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-purple-400" /> My Ranked Preference Vector
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">{rankedPreferences.length} ranked</span>
            </div>

            {rankedPreferences.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-xs italic border border-dashed border-zinc-700 rounded-xl">
                <Sparkles className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                Click <strong className="text-zinc-300">+</strong> on available drives to add them here, then reorder by priority.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {rankedPreferences.map((pref, idx) => (
                  <motion.div
                    key={pref.driveId}
                    layout
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="p-3 rounded-xl bg-zinc-800/60 border border-zinc-700 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center font-mono flex-shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-white truncate">{pref.companyName}</div>
                        <div className="text-[11px] text-zinc-400 truncate">{pref.role} • ₹{pref.packageLpa} LPA</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => movePreferenceUp(idx)}
                        disabled={idx === 0}
                        className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors cursor-pointer disabled:opacity-30"
                        title="Move up"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => movePreferenceDown(idx)}
                        disabled={idx === rankedPreferences.length - 1}
                        className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors cursor-pointer disabled:opacity-30"
                        title="Move down"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => removeFromPreferences(pref.driveId)}
                        className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Remove from preferences"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ─── Grid: Offers & Scheduled Interviews ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Placement Offers Decision Studio */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="card-title text-base flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" /> My Placement Offers & Decision Studio
            </h2>
            <span className="badge badge-neutral text-xs font-mono">{offers.length} offer(s)</span>
          </div>

          {offers.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-xs italic">
              No placement offers extended yet. Keep participating in active recruitment rounds!
            </div>
          ) : (
            <div className="space-y-3">
              {offers.map((offer: any) => (
                <motion.div
                  key={offer.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-zinc-800/60 border border-zinc-700 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs text-zinc-400 font-semibold uppercase">
                        {offer.drive?.company?.name}
                      </div>
                      <div className="font-bold text-base text-white mt-0.5">
                        {offer.drive?.role}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold font-mono text-emerald-400">
                        ₹{offer.packageLpa} LPA
                      </div>
                      <span className="badge badge-primary text-xs uppercase font-mono">
                        {offer.tier}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-700 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-400">Decision Status:</span>
                      <span
                        className={`badge font-semibold uppercase text-xs ${
                          offer.status === 'accepted'
                            ? 'badge-success'
                            : offer.status === 'released'
                            ? 'badge-neutral'
                            : 'badge-warning'
                        }`}
                      >
                        {offer.status}
                      </span>
                    </div>

                    {offer.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOfferResponse(offer.id, 'accepted')}
                          disabled={respondingOfferId === offer.id}
                          className="btn-primary text-xs py-1 px-3 bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Accept Offer
                        </button>
                        <button
                          onClick={() => handleOfferResponse(offer.id, 'rejected')}
                          disabled={respondingOfferId === offer.id}
                          className="btn text-xs py-1 px-3 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Decline
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Scheduled Interviews & Panels */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="card-title text-base flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-indigo-400" /> My Scheduled Interview Sessions
            </h2>
            <span className="badge badge-neutral text-xs font-mono">{interviews.length} session(s)</span>
          </div>

          {interviews.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-xs italic">
              No interview rounds currently scheduled on calendar.
            </div>
          ) : (
            <div className="space-y-3">
              {interviews.map((iv: any) => (
                <div
                  key={iv.id}
                  className="p-3.5 rounded-xl bg-zinc-800/60 border border-zinc-700 flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-sm text-white">
                      {iv.round?.drive?.company?.name} — {iv.round?.roundType?.toUpperCase()} Round
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      {iv.panel?.location === 'Online' ? (
                        <span className="flex items-center gap-1 text-cyan-400">
                          <Video className="w-3.5 h-3.5" /> Virtual ({iv.panel?.name})
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-zinc-500" /> {iv.panel?.location || 'Campus Center'} ({iv.panel?.name})
                        </span>
                      )}
                      <span>•</span>
                      <span>{iv.duration} mins</span>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="font-mono text-xs font-semibold text-white">
                      {new Date(iv.scheduledAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    <span className="badge badge-info text-xs uppercase font-mono">{iv.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── My Applications Table ──────────────────────────────── */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="card-title text-base flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-400" /> My Applied Recruitment Drives
          </h2>
          <span className="badge badge-neutral text-xs font-mono">{applications.length} drive(s)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Company & Role</th>
                <th>Package</th>
                <th>Tier</th>
                <th>Application Stage</th>
                <th>Applied On</th>
              </tr>
            </thead>
            <tbody>
              {applications.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-zinc-500">
                    No active applications found. Apply to drives above to get started!
                  </td>
                </tr>
              ) : (
                applications.map((app: any) => (
                  <tr key={app.id}>
                    <td>
                      <div className="font-semibold text-white">{app.drive?.company?.name}</div>
                      <div className="text-xs text-zinc-400">{app.drive?.role}</div>
                    </td>
                    <td className="font-mono font-medium">₹{app.drive?.packageLpa} LPA</td>
                    <td>
                      <span className="badge badge-neutral text-xs font-mono">
                        {app.drive?.offerTier}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-primary text-xs uppercase">{app.status}</span>
                    </td>
                    <td className="text-xs text-zinc-400 font-mono">
                      {new Date(app.appliedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default StudentPortalPage;
