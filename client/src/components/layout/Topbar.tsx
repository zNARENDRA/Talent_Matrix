import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../lib/authStore';
import { api } from '../../lib/api';
import {
  Search, Bell, ChevronDown, Clock, AlertTriangle,
  CheckCircle, Info, ShieldAlert, CalendarClock, Shuffle,
  UserCircle, LogIn, GraduationCap, ShieldCheck, Check
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar } from '../ui/avatar';
import { cn } from '../../lib/utils';

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
    critical: <ShieldAlert className="w-4 h-4 text-rose-500" />,
    error: <AlertTriangle className="w-4 h-4 text-rose-500" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-500" />,
    info: <Info className="w-4 h-4 text-sky-500" />,
  };

  const isStudent = role === 'student';

  return (
    <header className="h-16 bg-card/90 backdrop-blur-md border-b border-border flex items-center justify-between px-6 sticky top-0 z-30 select-none">
      {/* Search Input Trigger */}
      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-medium transition-all w-72 border border-border/60 group"
      >
        <Search className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        <span className="truncate">Search students, drives, algorithms...</span>
        <kbd className="ml-auto text-[10px] bg-background border border-border px-1.5 py-0.5 rounded font-mono text-muted-foreground shadow-xs">
          ⌘K
        </kbd>
      </button>

      <div className="flex items-center gap-3">
        {/* Placement Season Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 border border-border/80 text-xs font-semibold text-foreground">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          <span>{currentSeason} Placement Season</span>
        </div>

        {/* Live Operational Status */}
        <Badge variant="success" className="hidden md:inline-flex gap-1.5 px-2.5 py-1 text-[11px] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </Badge>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="System Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute 1 top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifs && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-12 w-96 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden text-card-foreground"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-xs uppercase tracking-wider text-foreground">Notifications</h3>
                      {unreadCount > 0 && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          {unreadCount} New
                        </Badge>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        api.markAllRead();
                        setUnreadCount(0);
                      }}
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-border">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-xs text-muted-foreground">
                        No notifications to display.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={cn(
                            'p-3.5 hover:bg-muted/50 transition-colors cursor-pointer',
                            !n.isRead ? 'bg-primary/5' : ''
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5">{severityIcon[n.severity] || <Info className="w-4 h-4 text-primary" />}</div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-foreground">{n.title}</div>
                              <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</div>
                              <div className="text-[10px] text-muted-foreground/80 mt-1 font-mono">{new Date(n.createdAt).toLocaleTimeString()}</div>
                            </div>
                            {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* User Profile Pill */}
        <div
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg bg-muted/60 border border-border/80 hover:bg-muted cursor-pointer transition-all"
        >
          <Avatar
            className="w-7 h-7 font-bold text-[11px]"
            fallback={user?.name ? user.name.slice(0, 2).toUpperCase() : isStudent ? 'ST' : 'RK'}
          />
          <div className="hidden lg:flex flex-col text-left">
            <span className="text-xs font-bold text-foreground leading-none">
              {user?.name || (isStudent ? 'Aarav Sharma' : 'Dr. Rajesh Kumar')}
            </span>
            <span className="text-[10px] text-muted-foreground font-semibold uppercase leading-tight mt-0.5">
              {user?.role?.replace('_', ' ') || (isStudent ? 'Candidate' : 'TPO Admin')}
            </span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      </div>
    </header>
  );
};
export default Topbar;
