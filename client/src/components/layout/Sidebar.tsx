import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../lib/authStore';
import {
  LayoutDashboard, Users, Building2, Megaphone, Shuffle, CalendarClock,
  Code2, ShieldAlert, BarChart3, FileText, ScrollText, Settings,
  ChevronLeft, ChevronRight, Moon, Sun, UserCircle, Terminal,
  GraduationCap, UserCheck, Sparkles, Globe, FileSpreadsheet,
  Command, LogOut, ArrowRightLeft
} from 'lucide-react';
import { Avatar } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

export const Sidebar: React.FC = () => {
  const { sidebarCollapsed, toggleSidebar, theme, toggleTheme } = useAppStore();
  const { user, role } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const isStudent = role === 'student';

  const staffNavSections = [
    {
      title: 'Placement Execution',
      items: [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/allocation', label: 'Allocation Engine', icon: Shuffle, badge: 'Module A' },
        { path: '/selection-studio', label: 'Selection Studio', icon: UserCheck },
        { path: '/simulation', label: 'What-If Simulation', icon: Sparkles },
        { path: '/drives', label: 'Recruitment Drives', icon: Megaphone },
      ],
    },
    {
      title: 'Assessments & Integrity',
      items: [
        { path: '/scheduler', label: 'Interview Scheduler', icon: CalendarClock },
        { path: '/assessments', label: 'Coding Assessments', icon: Code2 },
        { path: '/candidate-sandbox', label: 'Candidate Sandbox', icon: Terminal, badge: 'Live AI' },
        { path: '/anomalies', label: 'Anomaly Center', icon: ShieldAlert },
      ],
    },
    {
      title: 'Institutional Records',
      items: [
        { path: '/students', label: 'Students', icon: Users },
        { path: '/companies', label: 'Companies', icon: Building2 },
        { path: '/crawler', label: 'Job Crawler', icon: Globe },
        { path: '/yearly-reports', label: 'Yearly Reports', icon: FileSpreadsheet },
        { path: '/analytics', label: 'Analytics', icon: BarChart3 },
        { path: '/reports', label: 'Quick Reports', icon: FileText },
        { path: '/audit', label: 'Audit Logs', icon: ScrollText },
        { path: '/settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  const studentNavSections = [
    {
      title: 'My Career Portal',
      items: [
        { path: '/student-portal', label: 'Student Portal', icon: GraduationCap },
        { path: '/candidate-sandbox', label: 'Coding Assessment Sandbox', icon: Terminal, badge: 'Live' },
        { path: '/drives', label: 'Explore Corporate Drives', icon: Megaphone },
        { path: '/companies', label: 'Partner Companies', icon: Building2 },
        { path: '/analytics', label: 'Placement Statistics', icon: BarChart3 },
      ],
    },
  ];

  const sections = isStudent ? studentNavSections : staffNavSections;

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 76 : 280 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="fixed left-0 top-0 h-screen bg-card text-card-foreground border-r border-border z-40 flex flex-col select-none"
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-sm flex-shrink-0 font-extrabold text-sm tracking-tight">
            TM
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="flex flex-col"
              >
                <span className="font-extrabold text-base tracking-tight leading-none text-foreground">
                  TalentMatrix
                </span>
                <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider mt-1">
                  Enterprise Platform
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!sidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Collapse Sidebar"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Role Switcher Pill */}
      {!sidebarCollapsed && (
        <div className="px-3.5 pt-3.5">
          <div className="p-2.5 rounded-xl bg-muted/60 border border-border/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-bold text-foreground">
                {isStudent ? 'Student Portal' : 'T&P Command Center'}
              </span>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 transition-colors cursor-pointer"
              title="Switch between Admin & Student roles"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" /> Switch
            </button>
          </div>
        </div>
      )}

      {/* Navigation Links by Section */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-5">
        {sections.map((sec, sIdx) => (
          <div key={sIdx} className="space-y-1.5">
            {!sidebarCollapsed && (
              <div className="px-3 text-xs font-extrabold text-muted-foreground/90 uppercase tracking-wider mb-2">
                {sec.title}
              </div>
            )}
            {sec.items.map((item) => {
              const isActive =
                location.pathname === item.path ||
                (item.path !== '/' && location.pathname.startsWith(item.path));

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all group select-none',
                    isActive
                      ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <item.icon
                      className={cn(
                        'w-5 h-5 flex-shrink-0 transition-colors',
                        isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'
                      )}
                    />
                    <AnimatePresence>
                      {!sidebarCollapsed && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="truncate"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>

                  {!sidebarCollapsed && item.badge && (
                    <Badge
                      variant={isActive ? 'secondary' : 'outline'}
                      className={cn('text-xs px-2 py-0.5 font-mono', isActive ? 'text-primary-foreground bg-white/20 border-white/30' : '')}
                    >
                      {item.badge}
                    </Badge>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom User Profile Tile */}
      <div className="border-t border-border p-3 space-y-1.5 bg-card">
        {sidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            className="w-full p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors mb-1 cursor-pointer"
            title="Expand Sidebar"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-500" />}
          {!sidebarCollapsed && (
            <span>{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
          )}
        </button>

        <div
          onClick={() => navigate('/login')}
          className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted cursor-pointer transition-colors"
          title="User Profile / Switch Account"
        >
          <Avatar
            className="w-9 h-9 font-bold text-sm"
            fallback={user?.name ? user.name.slice(0, 2).toUpperCase() : isStudent ? 'ST' : 'RK'}
          />
          {!sidebarCollapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold truncate text-foreground">
                {user?.name || (isStudent ? 'Aarav Sharma' : 'Dr. Rajesh Kumar')}
              </div>
              <div className="text-xs text-muted-foreground truncate uppercase font-semibold">
                {user?.role?.replace('_', ' ') || (isStudent ? 'Candidate STU1001' : 'TPO Super Admin')}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
};
export default Sidebar;
