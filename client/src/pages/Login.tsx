import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { useAuthStore } from '../lib/authStore';
import { useAppStore } from '../store/appStore';
import {
  GraduationCap, ShieldCheck, Building2, User, KeyRound,
  ArrowRight, Sparkles, CheckCircle2, AlertCircle, Users,
  Sun, Moon, ShieldAlert, Laptop, Shield, Mail, Phone, BookOpen, Award, UserPlus, LogIn
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { cn } from '../lib/utils';
import { SecurityCaptcha, CaptchaRef } from '../components/auth/SecurityCaptcha';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { theme, toggleTheme } = useAppStore();

  // Mode: 'login' | 'register'
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [portalType, setPortalType] = useState<'admin' | 'student'>('student');

  // Login form state
  const [identifier, setIdentifier] = useState('STU1001');
  const [password, setPassword] = useState('student123');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regStudentId, setRegStudentId] = useState('');
  const [regDepartment, setRegDepartment] = useState('CSE');
  const [regGpa, setRegGpa] = useState('8.5');
  const [regPhone, setRegPhone] = useState('');
  const [regGradYear, setRegGradYear] = useState('2026');
  const [regStaffRole, setRegStaffRole] = useState('coordinator');

  // CAPTCHA state
  const [captchaInput, setCaptchaInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [demoData, setDemoData] = useState<{ staff: any[]; students: any[] }>({ staff: [], students: [] });

  const captchaRef = useRef<CaptchaRef | null>(null);

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
    setSuccessMsg(null);

    // Verify CAPTCHA
    if (!captchaRef.current?.validate(captchaInput)) {
      setError('Invalid security CAPTCHA code. Please verify the characters in the badge.');
      captchaRef.current?.refresh();
      setCaptchaInput('');
      return;
    }

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
      captchaRef.current?.refresh();
      setCaptchaInput('');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // Validate passwords match
    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    // Verify CAPTCHA
    if (!captchaRef.current?.validate(captchaInput)) {
      setError('Invalid security CAPTCHA code. Please verify the characters in the badge.');
      captchaRef.current?.refresh();
      setCaptchaInput('');
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        name: regName,
        email: regEmail,
        password: regPassword,
        role: portalType === 'student' ? 'student' : regStaffRole,
      };

      if (portalType === 'student') {
        payload.studentId = regStudentId || `STU${Math.floor(1000 + Math.random() * 9000)}`;
        payload.department = regDepartment;
        payload.gpa = parseFloat(regGpa) || 8.0;
        payload.phone = regPhone;
        payload.graduationYear = parseInt(regGradYear, 10) || 2026;
      }

      const res = await api.register(payload);

      setSuccessMsg('Account registered successfully! Redirecting...');
      login(res.user, res.token);

      setTimeout(() => {
        if (res.role === 'student') {
          navigate('/student-portal');
        } else {
          navigate('/');
        }
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
      captchaRef.current?.refresh();
      setCaptchaInput('');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (id: string, pass: string, pType: 'admin' | 'student') => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    setPortalType(pType);
    setIdentifier(id);
    setPassword(pass);

    const currentCode = captchaRef.current?.getCode() || '';
    setCaptchaInput(currentCode);

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
      captchaRef.current?.refresh();
    } finally {
      setLoading(false);
    }
  };

  const s1 = demoData.students[0] || { studentId: 'STU1001', name: 'Aarav Sharma', department: 'CSE', gpa: 8.7 };
  const s2 = demoData.students[1] || { studentId: 'STU1002', name: 'Ananya Verma', department: 'CE', gpa: 9.35 };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8 bg-background relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-indigo-500/10 dark:bg-indigo-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-purple-500/10 dark:bg-purple-500/15 blur-3xl pointer-events-none" />

      {/* Theme Toggle Top Right */}
      <div className="absolute top-6 right-6 z-20">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleTheme}
          className="rounded-full shadow-xs gap-2 font-semibold text-xs"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
          <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </Button>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 z-10 my-auto items-stretch">
        {/* Left Column: Login / Registration Form */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-7 flex"
        >
          <Card className="w-full shadow-2xl border-border bg-card flex flex-col justify-between p-7 sm:p-8 space-y-5">
            <div>
              {/* Header Branding */}
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-base shadow-sm">
                    TM
                  </div>
                  <div>
                    <h2 className="font-extrabold text-xl tracking-tight text-foreground leading-none">
                      TalentMatrix
                    </h2>
                    <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                      Enterprise Placement Platform
                    </span>
                  </div>
                </div>

                {/* Sign In vs Register Toggle Pills */}
                <div className="flex items-center gap-1 bg-muted p-1 rounded-xl border border-border">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                      mode === 'login'
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <LogIn className="w-3.5 h-3.5" /> Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setError(null);
                      setSuccessMsg(null);
                      setRegStudentId(`STU${Math.floor(1000 + Math.random() * 9000)}`);
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                      mode === 'register'
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Register
                  </button>
                </div>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight mt-2">
                {mode === 'login' ? 'Sign In to Portal' : 'Create New Account'}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                {mode === 'login'
                  ? 'Access placement drives, interview schedules, and algorithmic matching.'
                  : 'Register as a candidate or staff coordinator for the 2026 placement cycle.'}
              </p>
            </div>

            {/* Portal Role Tabs */}
            <div className="grid grid-cols-2 gap-2 bg-muted/80 p-1.5 rounded-xl border border-border">
              <button
                type="button"
                onClick={() => {
                  setPortalType('student');
                  if (mode === 'login') {
                    setIdentifier('STU1001');
                    setPassword('student123');
                  }
                  setError(null);
                }}
                className={cn(
                  'py-2 px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer select-none',
                  portalType === 'student'
                    ? 'bg-card text-foreground shadow-sm border border-border/80'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <GraduationCap className="w-4 h-4 text-indigo-500" />
                Student / Candidate
              </button>

              <button
                type="button"
                onClick={() => {
                  setPortalType('admin');
                  if (mode === 'login') {
                    setIdentifier('admin@talentmatrix.edu');
                    setPassword('admin123');
                  }
                  setError(null);
                }}
                className={cn(
                  'py-2 px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer select-none',
                  portalType === 'admin'
                    ? 'bg-card text-foreground shadow-sm border border-border/80'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                T&amp;P Staff &amp; Admin
              </button>
            </div>

            {/* Notifications */}
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs sm:text-sm font-semibold flex items-center gap-2.5"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {successMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-semibold flex items-center gap-2.5"
              >
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{successMsg}</span>
              </motion.div>
            )}

            {/* ─── 1. SIGN IN FORM ────────────────────────────────────────── */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    {portalType === 'student' ? 'Student ID or University Email' : 'Staff Email Address'}
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      value={identifier}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIdentifier(e.target.value)}
                      placeholder={portalType === 'student' ? 'e.g. STU1001 or student@university.edu' : 'e.g. admin@talentmatrix.edu'}
                      className="pl-10 text-sm"
                      required
                    />
                    <User className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      type="password"
                      value={password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10 font-mono tracking-widest text-sm"
                      required
                    />
                    <KeyRound className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3 pointer-events-none" />
                  </div>
                </div>

                {/* Security CAPTCHA */}
                <div className="space-y-2 pt-1 border-t border-border">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-indigo-500" />
                      Security CAPTCHA
                    </label>
                    <span className="text-[11px] text-muted-foreground font-medium">Case-insensitive</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <SecurityCaptcha ref={captchaRef} />
                    <Input
                      type="text"
                      value={captchaInput}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCaptchaInput(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      className="font-mono text-sm uppercase tracking-widest font-bold text-center"
                      maxLength={6}
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  variant="brand"
                  size="lg"
                  className="w-full text-sm sm:text-base font-bold shadow-lg shadow-indigo-500/20 mt-1 cursor-pointer"
                >
                  {loading ? (
                    'Authenticating...'
                  ) : (
                    <>
                      Enter {portalType === 'student' ? 'Student Portal' : 'Command Center'} <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>

                <div className="text-center pt-1 text-xs text-muted-foreground">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="text-primary font-bold hover:underline cursor-pointer"
                  >
                    Register new candidate / staff
                  </button>
                </div>
              </form>
            )}

            {/* ─── 2. REGISTRATION FORM ────────────────────────────────────── */}
            {mode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3.5 max-h-[480px] overflow-y-auto pr-1">
                {/* Full Name & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                      Full Name *
                    </label>
                    <div className="relative">
                      <Input
                        type="text"
                        value={regName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRegName(e.target.value)}
                        placeholder="e.g. Rohan Gupta"
                        className="pl-9 text-sm"
                        required
                      />
                      <User className="w-4 h-4 text-muted-foreground absolute left-3 top-3 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                      Institutional Email *
                    </label>
                    <div className="relative">
                      <Input
                        type="email"
                        value={regEmail}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRegEmail(e.target.value)}
                        placeholder="user@university.edu"
                        className="pl-9 text-sm"
                        required
                      />
                      <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-3 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Candidate Specific Fields */}
                {portalType === 'student' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                          Student ID *
                        </label>
                        <Input
                          type="text"
                          value={regStudentId}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRegStudentId(e.target.value.toUpperCase())}
                          placeholder="STU1080"
                          className="font-mono text-xs uppercase"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                          Department *
                        </label>
                        <select
                          value={regDepartment}
                          onChange={(e) => setRegDepartment(e.target.value)}
                          className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="CSE">CSE (Computer Science)</option>
                          <option value="IT">IT (Information Tech)</option>
                          <option value="ECE">ECE (Electronics)</option>
                          <option value="AIDS">AIDS (AI & Data Science)</option>
                          <option value="ME">ME (Mechanical)</option>
                          <option value="EEE">EEE (Electrical)</option>
                          <option value="CE">CE (Civil)</option>
                          <option value="CHE">CHE (Chemical)</option>
                          <option value="MBA">MBA</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                          Current GPA *
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          min="5.0"
                          max="10.0"
                          value={regGpa}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRegGpa(e.target.value)}
                          placeholder="8.50"
                          className="font-mono text-xs"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                          Graduation Year
                        </label>
                        <Input
                          type="number"
                          value={regGradYear}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRegGradYear(e.target.value)}
                          placeholder="2026"
                          className="font-mono text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                          Phone Number
                        </label>
                        <Input
                          type="tel"
                          value={regPhone}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRegPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="text-xs"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Staff Specific Fields */}
                {portalType === 'admin' && (
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                      Staff Role Assignment *
                    </label>
                    <select
                      value={regStaffRole}
                      onChange={(e) => setRegStaffRole(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="coordinator">Department Placement Coordinator</option>
                      <option value="admin">T&P Officer / Administrator</option>
                    </select>
                  </div>
                )}

                {/* Password & Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                      Password *
                    </label>
                    <Input
                      type="password"
                      value={regPassword}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRegPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="text-xs font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                      Confirm Password *
                    </label>
                    <Input
                      type="password"
                      value={regConfirmPassword}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRegConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="text-xs font-mono"
                      required
                    />
                  </div>
                </div>

                {/* Security CAPTCHA */}
                <div className="space-y-1.5 pt-1 border-t border-border">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-indigo-500" />
                      Security CAPTCHA
                    </label>
                    <span className="text-[11px] text-muted-foreground font-medium">Case-insensitive</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <SecurityCaptcha ref={captchaRef} />
                    <Input
                      type="text"
                      value={captchaInput}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCaptchaInput(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      className="font-mono text-sm uppercase tracking-widest font-bold text-center"
                      maxLength={6}
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  variant="brand"
                  size="lg"
                  className="w-full text-sm sm:text-base font-bold shadow-lg shadow-indigo-500/20 mt-1 cursor-pointer"
                >
                  {loading ? (
                    'Registering Account...'
                  ) : (
                    <>
                      Complete Registration & Enter <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>

                <div className="text-center pt-1 text-xs text-muted-foreground">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="text-primary font-bold hover:underline cursor-pointer"
                  >
                    Sign In here
                  </button>
                </div>
              </form>
            )}
          </Card>
        </motion.div>

        {/* Right Column: 1-Click Demo Personas */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="lg:col-span-5 flex"
        >
          <Card className="w-full shadow-lg border-border bg-card/70 backdrop-blur-sm p-6 flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1.5">
                <Sparkles className="w-4 h-4" />
                1-Click Demo Personas
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Quickly test the platform across different user perspectives (auto-verified for hackathon evaluation):
              </p>
            </div>

            <div className="space-y-3">
              {/* Persona 1: Placement Officer */}
              <div
                onClick={() => handleQuickDemoLogin('admin@talentmatrix.edu', 'admin123', 'admin')}
                className="p-3.5 rounded-xl bg-card hover:bg-muted/60 border border-border hover:border-indigo-500/50 cursor-pointer transition-all hover:scale-[1.01] shadow-xs space-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-foreground flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-500" /> Dr. Rajesh Kumar
                  </span>
                  <Badge variant="brand" className="text-xs font-bold font-mono">
                    T&amp;P ADMIN
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Full access: Allocation, Scheduler, Policies, Anomaly Center
                </p>
              </div>

              {/* Persona 2: Coordinator */}
              <div
                onClick={() => handleQuickDemoLogin('coordinator@talentmatrix.edu', 'coord123', 'admin')}
                className="p-3.5 rounded-xl bg-card hover:bg-muted/60 border border-border hover:border-purple-500/50 cursor-pointer transition-all hover:scale-[1.01] shadow-xs space-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-500" /> Prof. Anita Sharma
                  </span>
                  <Badge variant="purple" className="text-xs font-bold font-mono">
                    COORDINATOR
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Drive management, interview panels &amp; scheduling logs
                </p>
              </div>

              {/* Persona 3: Student 1 */}
              <div
                onClick={() => handleQuickDemoLogin(s1.studentId, 'student123', 'student')}
                className="p-3.5 rounded-xl bg-card hover:bg-muted/60 border border-border hover:border-emerald-500/50 cursor-pointer transition-all hover:scale-[1.01] shadow-xs space-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-foreground flex items-center gap-2 truncate">
                    <GraduationCap className="w-4 h-4 text-emerald-500 flex-shrink-0" /> {s1.name || s1.studentId}
                  </span>
                  <Badge variant="success" className="text-xs font-bold font-mono">
                    STUDENT
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {s1.department} Department • GPA {s1.gpa} • Applications &amp; Offers
                </p>
              </div>

              {/* Persona 4: Student 2 */}
              <div
                onClick={() => handleQuickDemoLogin(s2.studentId, 'student123', 'student')}
                className="p-3.5 rounded-xl bg-card hover:bg-muted/60 border border-border hover:border-sky-500/50 cursor-pointer transition-all hover:scale-[1.01] shadow-xs space-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-foreground flex items-center gap-2 truncate">
                    <GraduationCap className="w-4 h-4 text-sky-500 flex-shrink-0" /> {s2.name || s2.studentId}
                  </span>
                  <Badge variant="info" className="text-xs font-bold font-mono">
                    STUDENT
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {s2.department} Department • GPA {s2.gpa} • Placement Offers
                </p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground text-center pt-3 border-t border-border font-medium">
              Clicking any persona auto-verifies CAPTCHA and logs in directly.
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
export default LoginPage;
