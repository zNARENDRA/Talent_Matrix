import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { useAuthStore } from '../lib/authStore';
import {
  GraduationCap, Building2, Briefcase, CalendarClock, ShieldCheck,
  CheckCircle2, XCircle, ArrowRight, Video, MapPin, Sparkles,
  Award, Clock, Code2, AlertTriangle, Play, RefreshCw, LogOut, Sliders, Info
} from 'lucide-react';

export const StudentPortalPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const [studentId, setStudentId] = useState<string>(user?.studentId || 'STU1001');
  const [respondingOfferId, setRespondingOfferId] = useState<string | null>(null);
  const [editingSkills, setEditingSkills] = useState<boolean>(false);
  const [skillsList, setSkillsList] = useState<any[]>([]);
  const [savingSkills, setSavingSkills] = useState<boolean>(false);

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
    }
  }, [studentId]);

  const loadStudentSkills = async () => {
    try {
      const res = await api.getStudentSkills(studentId);
      setSkillsList(res.skills || []);
    } catch (e) {
      console.error(e);
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
  const preferences = portalData?.preferences || [];

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
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditingSkills(!editingSkills)}
              className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 flex items-center gap-1.5 transition-all"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              {editingSkills ? 'Close Skill Editor' : 'Edit Skill Proficiencies'}
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

        {/* Skill Management Drawer / Bar */}
        {editingSkills ? (
          <div className="mt-4 pt-4 border-t border-zinc-700/60 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" /> Adjust Normalized Skill Proficiencies (0 - 100%)
              </span>
              <button
                onClick={handleSaveSkills}
                disabled={savingSkills}
                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md"
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
                  <span className="text-[10px] font-mono font-bold text-indigo-400">{Math.round(skill.proficiency)}%</span>
                </span>
              ))}
            </div>
          )
        )}
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
                      <span className="badge badge-primary text-[10px] uppercase font-mono">
                        {offer.tier}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-700 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-400">Decision Status:</span>
                      <span
                        className={`badge font-semibold uppercase text-[10px] ${
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
                          className="btn-primary text-xs py-1 px-3 bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Accept Offer
                        </button>
                        <button
                          onClick={() => handleOfferResponse(offer.id, 'rejected')}
                          disabled={respondingOfferId === offer.id}
                          className="btn text-xs py-1 px-3 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
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
                    <span className="badge badge-info text-[10px] uppercase font-mono">{iv.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── My Applications & Gale-Shapley Preferences ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Applications */}
        <div className="lg:col-span-2 glass-card p-6 space-y-4">
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
                      No active applications found.
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

        {/* Gale-Shapley Ranked Preferences */}
        <div className="glass-card p-6 space-y-4">
          <div>
            <h2 className="card-title text-base flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" /> Gale-Shapley Preference Vector
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Your ranked company preference hierarchy for the deferred-acceptance matching algorithm.
            </p>
          </div>

          {preferences.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-xs italic">
              No preferences configured yet.
            </div>
          ) : (
            <div className="space-y-2">
              {preferences.map((pref: any, idx: number) => (
                <div
                  key={pref.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-800/60 border border-zinc-700"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center font-mono">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-xs text-white">
                        {pref.drive?.company?.name}
                      </div>
                      <div className="text-[10px] text-zinc-400">{pref.drive?.role}</div>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">₹{pref.drive?.packageLpa} LPA</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default StudentPortalPage;
