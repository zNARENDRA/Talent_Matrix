import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../lib/authStore';
import {
  LayoutDashboard, Users, Building2, Megaphone, Shuffle, CalendarClock,
  Code2, ShieldAlert, BarChart3, FileText, ScrollText, Settings,
  ChevronLeft, ChevronRight, Moon, Sun, HelpCircle, UserCircle, Terminal,
  GraduationCap, LogIn, LogOut, UserCheck, Sparkles, Globe, FileSpreadsheet
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { sidebarCollapsed, toggleSidebar, theme, toggleTheme } = useAppStore();
  const { user, role, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const isStudent = role === 'student';

  const staffNavItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/allocation', label: 'Allocation Engine', icon: Shuffle },
    { path: '/selection-studio', label: 'Selection Studio', icon: UserCheck },
    { path: '/simulation', label: 'What-If Simulation', icon: Sparkles },
    { path: '/crawler', label: 'Job Crawler', icon: Globe },
    { path: '/yearly-reports', label: 'Yearly Reports', icon: FileSpreadsheet },
    { path: '/drives', label: 'Recruitment Drives', icon: Megaphone },
    { path: '/students', label: 'Students', icon: Users },
    { path: '/companies', label: 'Companies', icon: Building2 },
    { path: '/scheduler', label: 'Interview Scheduler', icon: CalendarClock },
    { path: '/candidate-sandbox', label: 'Candidate Assessment Sandbox', icon: Terminal },
    { path: '/anomalies', label: 'Anomaly Center', icon: ShieldAlert },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/reports', label: 'Quick Reports', icon: FileText },
    { path: '/audit', label: 'Audit Logs', icon: ScrollText },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  const studentNavItems = [
    { path: '/student-portal', label: 'My Student Portal', icon: GraduationCap },
    { path: '/candidate-sandbox', label: 'Take Coding Assessment', icon: Terminal },
    { path: '/drives', label: 'Explore Drives', icon: Megaphone },
    { path: '/companies', label: 'Companies', icon: Building2 },
    { path: '/analytics', label: 'Placement Stats', icon: BarChart3 },
  ];

  const navItems = isStudent ? studentNavItems : staffNavItems;

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="fixed left-0 top-0 h-screen bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800 z-40 flex flex-col"
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-surface-200 dark:border-surface-800">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">TM</span>
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="font-bold text-lg text-surface-900 dark:text-white whitespace-nowrap"
              >
                TalentMatrix
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Role Indicator Banner */}
      {!sidebarCollapsed && (
        <div className="px-3 pt-3">
          <div className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between ${
            isStudent ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40' : 'bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-400 border border-primary-200 dark:border-primary-800/40'
          }`}>
            <span className="uppercase text-[10px] tracking-wider">
              {isStudent ? 'Student Portal' : 'T&P Command Center'}
            </span>
            <button
              onClick={() => navigate('/login')}
              className="text-[10px] underline hover:opacity-80"
            >
              Switch
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`sidebar-item ${isActive ? 'active' : ''} relative group`}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {isActive && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary-600 rounded-r-full"
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom User Area */}
      <div className="border-t border-surface-200 dark:border-surface-800 p-2.5 space-y-1">
        <button onClick={toggleTheme} className="sidebar-item w-full" title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          {!sidebarCollapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        <div
          onClick={() => navigate('/login')}
          className="sidebar-item cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800"
          title="Switch User / Login"
        >
          <div className="w-7 h-7 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center flex-shrink-0">
            <UserCircle className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold truncate text-surface-900 dark:text-white">
                {user?.name || 'Dr. Rajesh Kumar'}
              </div>
              <div className="text-[10px] text-surface-400 truncate uppercase">
                {user?.role?.replace('_', ' ') || 'Super Admin'}
              </div>
            </div>
          )}
        </div>

        <button onClick={toggleSidebar} className="sidebar-item w-full justify-center" title="Toggle sidebar">
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </motion.aside>
  );
};
