import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { useAuthStore } from '../lib/authStore';
import { useAppStore } from '../store/appStore';
import {
  GraduationCap, ShieldCheck, Building2, User, KeyRound,
  ArrowRight, Sparkles, CheckCircle2, AlertCircle, Users,
  Sun, Moon, ShieldAlert, Laptop
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { cn } from '../lib/utils';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { theme, toggleTheme } = useAppStore();

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

  const s1 = demoData.students[0] || { studentId: 'STU1001', name: 'Aarav Sharma', department: 'CSE', gpa: 8.7 };
  const s2 = demoData.students[1] || { studentId: 'STU1002', name: 'Ananya Verma', department: 'CE', gpa: 9.35 };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8 bg-background relative overflow-hidden">
      {/* Background Decorative Ambient Glows */}
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
        {/* Left Column: Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-7 flex"
        >
          <Card className="w-full shadow-xl border-border bg-card flex flex-col justify-between p-8 space-y-6">
            <div>
              {/* Header Branding */}
              <div className="flex items-center gap-3 mb-4">
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

              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight mt-3">
                Sign In to Portal
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                Select your role to access placement allocations, interview schedules, or candidate assessments.
              </p>
            </div>

            {/* Portal Role Tabs */}
            <div className="grid grid-cols-2 gap-2 bg-muted/80 p-1.5 rounded-xl border border-border">
              <button
                type="button"
                onClick={() => {
                  setPortalType('student');
                  setIdentifier('STU1001');
                  setPassword('student123');
                  setError(null);
                }}
                className={cn(
                  'py-2.5 px-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer select-none',
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
                  setIdentifier('admin@talentmatrix.edu');
                  setPassword('admin123');
                  setError(null);
                }}
                className={cn(
                  'py-2.5 px-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer select-none',
                  portalType === 'admin'
                    ? 'bg-card text-foreground shadow-sm border border-border/80'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                T&amp;P Staff &amp; Admin
              </button>
            </div>

            {/* Error Banner */}
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm font-semibold flex items-center gap-2.5"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                  {portalType === 'student' ? 'Student ID or University Email' : 'Staff Email Address'}
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    value={identifier}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIdentifier(e.target.value)}
                    placeholder={portalType === 'student' ? 'e.g. STU1001 or student@university.edu' : 'e.g. admin@talentmatrix.edu'}
                    className="pl-10"
                    required
                  />
                  <User className="w-5 h-5 text-muted-foreground absolute left-3.5 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                  Password
                </label>
                <div className="relative">
                  <Input
                    type="password"
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 font-mono tracking-widest"
                    required
                  />
                  <KeyRound className="w-5 h-5 text-muted-foreground absolute left-3.5 top-3 pointer-events-none" />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                variant="brand"
                size="lg"
                className="w-full text-base font-bold shadow-lg shadow-indigo-500/20 mt-2 cursor-pointer"
              >
                {loading ? (
                  'Authenticating...'
                ) : (
                  <>
                    Enter {portalType === 'student' ? 'Student Portal' : 'Command Center'} <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </form>
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
                Quickly test the platform across different user perspectives for hackathon evaluation:
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
              Clicking any persona will instantly log in and take you to that user's view.
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
export default LoginPage;
