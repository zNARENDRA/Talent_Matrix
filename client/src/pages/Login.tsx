import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { useAuthStore } from '../lib/authStore';
import {
  GraduationCap, ShieldCheck, Building2, User, KeyRound,
  ArrowRight, Sparkles, CheckCircle2, AlertCircle, Users,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [portalType, setPortalType] = useState<'admin' | 'student'>('student');
  const [identifier, setIdentifier] = useState('STU1001');
  const [password, setPassword] = useState('student123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoData, setDemoData] = useState<{ staff: any[]; students: any[] }>({ staff: [], students: [] });

  useEffect(() => {
    api.getDemoAccounts()
      .then((res) => {
        if (res.students && res.students.length > 0) {
          setDemoData(res);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.login({
        identifier,
        email: identifier,
        password,
        role: portalType === 'student' ? 'student' : undefined,
      });

      login(res.user, res.token);

      if (res.role === 'student') {
        navigate('/student-portal');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (id: string, pass: string, pType: 'admin' | 'student') => {
    setError(null);
    setLoading(true);
    setPortalType(pType);
    setIdentifier(id);
    setPassword(pass);

    try {
      const res = await api.login({
        identifier: id,
        email: id,
        password: pass,
        role: pType === 'student' ? 'student' : undefined,
      });

      login(res.user, res.token);

      if (res.role === 'student') {
        navigate('/student-portal');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  const s1 = demoData.students[0] || { studentId: 'STU1001', name: 'Candidate STU1001', department: 'CSE', gpa: 9.12 };
  const s2 = demoData.students[1] || { studentId: 'STU1020', name: 'Candidate STU1020', department: 'IT', gpa: 8.84 };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface-50 dark:bg-surface-950 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-6 z-10">
        {/* Left Column: Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-7 glass-card p-8 space-y-6"
        >
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-primary-500/20">
                TM
              </div>
              <span className="font-bold text-lg text-surface-900 dark:text-white">TalentMatrix</span>
            </div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white tracking-tight">
              Sign In to Your Portal
            </h1>
            <p className="text-xs text-surface-500 mt-1">
              Select your role to access placement allocations, interview schedules, or candidate assessments.
            </p>
          </div>

          {/* Portal Role Tabs */}
          <div className="grid grid-cols-2 gap-2 bg-surface-100 dark:bg-surface-800 p-1.5 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setPortalType('student');
                setIdentifier('STU1001');
                setPassword('student123');
                setError(null);
              }}
              className={`btn text-xs py-2 flex items-center justify-center gap-1.5 transition-all ${
                portalType === 'student'
                  ? 'bg-white dark:bg-surface-700 text-primary-600 dark:text-primary-300 shadow-sm font-semibold'
                  : 'text-surface-500 border-0 shadow-none'
              }`}
            >
              <GraduationCap className="w-4 h-4" /> Student / Candidate
            </button>

            <button
              type="button"
              onClick={() => {
                setPortalType('admin');
                setIdentifier('admin@talentmatrix.edu');
                setPassword('admin123');
                setError(null);
              }}
              className={`btn text-xs py-2 flex items-center justify-center gap-1.5 transition-all ${
                portalType === 'admin'
                  ? 'bg-white dark:bg-surface-700 text-primary-600 dark:text-primary-300 shadow-sm font-semibold'
                  : 'text-surface-500 border-0 shadow-none'
              }`}
            >
              <ShieldCheck className="w-4 h-4" /> T&P Staff & Admin
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-3 rounded-xl bg-danger-500/10 border border-danger-500/30 text-danger-600 dark:text-danger-400 text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-surface-600 dark:text-surface-300 uppercase block mb-1.5">
                {portalType === 'student' ? 'Student ID or University Email' : 'Staff Email Address'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={portalType === 'student' ? 'e.g. STU1001 or student@university.edu' : 'e.g. admin@talentmatrix.edu'}
                  className="input-field text-sm pl-9"
                  required
                />
                <User className="w-4 h-4 text-surface-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-surface-600 dark:text-surface-300 uppercase block mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field text-sm pl-9 font-mono"
                  required
                />
                <KeyRound className="w-4 h-4 text-surface-400 absolute left-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-sm py-2.5 flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20"
            >
              {loading ? (
                'Authenticating...'
              ) : (
                <>
                  Enter {portalType === 'student' ? 'Student Portal' : 'Command Center'} <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* Right Column: 1-Click Demo Personas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-5 glass-card p-6 space-y-4 flex flex-col justify-between bg-gradient-to-br from-surface-50/80 to-primary-50/30 dark:from-surface-900/90 dark:to-primary-950/20"
        >
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-700 dark:text-primary-300 mb-1">
              <Sparkles className="w-4 h-4 text-primary-500" />
              1-Click Demo Personas
            </div>
            <p className="text-xs text-surface-500">
              Quickly test the platform across different user perspectives for hackathon evaluation:
            </p>
          </div>

          <div className="space-y-2.5">
            {/* Persona 1: Placement Officer */}
            <div
              onClick={() => handleQuickDemoLogin('admin@talentmatrix.edu', 'admin123', 'admin')}
              className="p-3 rounded-xl bg-white dark:bg-surface-800/80 hover:border-primary-500 border border-surface-200 dark:border-surface-700 cursor-pointer transition-all hover:scale-[1.01] shadow-sm space-y-0.5 group"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-surface-900 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary-600" /> Dr. Rajesh Kumar
                </span>
                <span className="badge badge-primary text-[10px]">T&P ADMIN</span>
              </div>
              <p className="text-[11px] text-surface-500">Full access: Allocation, Scheduler, Policies, Anomaly Center</p>
            </div>

            {/* Persona 2: Coordinator */}
            <div
              onClick={() => handleQuickDemoLogin('coordinator@talentmatrix.edu', 'coord123', 'admin')}
              className="p-3 rounded-xl bg-white dark:bg-surface-800/80 hover:border-primary-500 border border-surface-200 dark:border-surface-700 cursor-pointer transition-all hover:scale-[1.01] shadow-sm space-y-0.5 group"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-surface-900 dark:text-white flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-purple-600" /> Prof. Anita Sharma
                </span>
                <span className="badge badge-warning text-[10px]">COORDINATOR</span>
              </div>
              <p className="text-[11px] text-surface-500">Drive management, interview panels & scheduling logs</p>
            </div>

            {/* Persona 3: Student 1 */}
            <div
              onClick={() => handleQuickDemoLogin(s1.studentId, 'student123', 'student')}
              className="p-3 rounded-xl bg-white dark:bg-surface-800/80 hover:border-emerald-500 border border-surface-200 dark:border-surface-700 cursor-pointer transition-all hover:scale-[1.01] shadow-sm space-y-0.5 group"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-surface-900 dark:text-white flex items-center gap-1.5 truncate">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" /> {s1.name} ({s1.studentId})
                </span>
                <span className="badge badge-success text-[10px] flex-shrink-0">STUDENT</span>
              </div>
              <p className="text-[11px] text-surface-500">{s1.department} Department • GPA {s1.gpa} • Applications & Offers</p>
            </div>

            {/* Persona 4: Student 2 */}
            <div
              onClick={() => handleQuickDemoLogin(s2.studentId, 'student123', 'student')}
              className="p-3 rounded-xl bg-white dark:bg-surface-800/80 hover:border-cyan-500 border border-surface-200 dark:border-surface-700 cursor-pointer transition-all hover:scale-[1.01] shadow-sm space-y-0.5 group"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-surface-900 dark:text-white flex items-center gap-1.5 truncate">
                  <GraduationCap className="w-3.5 h-3.5 text-cyan-600 flex-shrink-0" /> {s2.name} ({s2.studentId})
                </span>
                <span className="badge badge-info text-[10px] flex-shrink-0">STUDENT</span>
              </div>
              <p className="text-[11px] text-surface-500">{s2.department} Department • GPA {s2.gpa} • Placement Offers</p>
            </div>
          </div>

          <div className="text-[11px] text-surface-400 text-center pt-2 border-t border-surface-200 dark:border-surface-800">
            Clicking any persona will instantly log in and take you to that user's view.
          </div>
        </motion.div>
      </div>
    </div>
  );
};
