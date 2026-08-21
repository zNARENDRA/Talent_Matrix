import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../lib/authStore';
import { api } from '../../lib/api';
import {
  Search, Bell, ChevronDown, X, Clock, AlertTriangle,
  CheckCircle, Info, ShieldAlert, CalendarClock, Shuffle,
  UserCircle, LogIn, GraduationCap, ShieldCheck,
} from 'lucide-react';

export const Topbar: React.FC = () => {
  const navigate = useNavigate();
  const { currentSeason, setCommandPaletteOpen } = useAppStore();
  const { user, role } = useAuthStore();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    api.getNotifications().then((res) => {
      setNotifications(res.data || []);
      setUnreadCount(res.unreadCount || 0);
    }).catch(() => {});
  }, []);

  const severityIcon: Record<string, React.ReactNode> = {
    critical: <ShieldAlert className="w-4 h-4 text-danger-500" />,
    error: <AlertTriangle className="w-4 h-4 text-danger-500" />,
    warning: <AlertTriangle className="w-4 h-4 text-warning-500" />,
    info: <Info className="w-4 h-4 text-info-500" />,
  };

  const typeIcon: Record<string, React.ReactNode> = {
    anomaly: <ShieldAlert className="w-4 h-4" />,
    scheduling_conflict: <CalendarClock className="w-4 h-4" />,
    allocation: <Shuffle className="w-4 h-4" />,
    offer: <CheckCircle className="w-4 h-4" />,
    deadline: <Clock className="w-4 h-4" />,
    system: <Info className="w-4 h-4" />,
  };

  const isStudent = role === 'student';

  return (
    <header className="h-16 bg-white/80 dark:bg-surface-900/80 backdrop-blur-md border-b border-surface-200 dark:border-surface-800 flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Search */}
      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-800 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 text-sm transition-colors w-72 group"
      >
        <Search className="w-4 h-4" />
        <span>Search students, companies, drives...</span>
        <kbd className="ml-auto text-xs bg-surface-200 dark:bg-surface-700 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
      </button>

      <div className="flex items-center gap-3">
        {/* Season Selector */}
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 text-sm font-medium hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors">
          <span>{currentSeason} Placement Season</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        {/* System Status */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-success-600 dark:text-success-500">
          <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
          Live
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          >
            <Bell className="w-5 h-5 text-surface-500" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-danger-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifs && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 top-12 w-96 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl shadow-xl z-50 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200 dark:border-surface-700">
                    <h3 className="font-semibold text-sm">Notifications</h3>
                    <button
                      onClick={() => { api.markAllRead(); setUnreadCount(0); }}
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`px-4 py-3 border-b border-surface-100 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors ${!n.isRead ? 'bg-primary-50/30 dark:bg-primary-900/10' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">{severityIcon[n.severity] || typeIcon[n.type]}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-surface-900 dark:text-surface-100">{n.title}</div>
                            <div className="text-xs text-surface-500 mt-0.5 line-clamp-2">{n.message}</div>
                            <div className="text-xs text-surface-400 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
                          </div>
                          {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary-500 mt-2" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* User / Persona Switcher Button */}
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/80 hover:border-primary-500 transition-all text-xs"
        >
          <div className="w-6 h-6 rounded-lg bg-primary-600 text-white font-bold flex items-center justify-center text-[10px]">
            {isStudent ? <GraduationCap className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
          </div>
          <div className="text-left hidden md:block">
            <div className="font-semibold text-surface-900 dark:text-white leading-tight">
              {user?.name || 'Dr. Rajesh Kumar'}
            </div>
            <div className="text-[10px] text-surface-400 uppercase font-mono">
              {isStudent ? `Student (${user?.studentId || 'STU1001'})` : 'T&P Staff'}
            </div>
          </div>
          <span className="text-[10px] text-primary-600 dark:text-primary-400 font-semibold ml-1">Switch</span>
        </button>
      </div>
    </header>
  );
};
