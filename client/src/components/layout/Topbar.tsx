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
    critical: <ShieldAlert className="w-5 h-5 text-rose-500" />,
    error: <AlertTriangle className="w-5 h-5 text-rose-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    info: <Info className="w-5 h-5 text-sky-500" />,
  };

  const isStudent = role === 'student';

  return (
    <header className="h-16 bg-card/90 backdrop-blur-md border-b border-border flex items-center justify-between px-6 sticky top-0 z-30 select-none">
      {/* Search Input Trigger */}
      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground text-sm font-medium transition-all w-80 border border-border/60 group cursor-pointer"
      >
        <Search className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        <span className="truncate">Search students, drives, algorithms...</span>
        <kbd className="ml-auto text-xs bg-background border border-border px-2 py-0.5 rounded-md font-mono text-muted-foreground shadow-xs font-semibold">
          ⌘K
        </kbd>
      </button>

      <div className="flex items-center gap-3.5">
        {/* Placement Season Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-muted/60 border border-border/80 text-sm font-semibold text-foreground">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
          <span>{currentSeason} Placement Season</span>
        </div>

        {/* Live Operational Status */}
        <Badge variant="success" className="hidden md:inline-flex gap-2 px-3 py-1.5 text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Live Platform
        </Badge>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-2.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="System Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
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
                  className="absolute right-0 top-14 w-96 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden text-card-foreground"
                >
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/40">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm uppercase tracking-wider text-foreground">Notifications</h3>
                      {unreadCount > 0 && (
                        <Badge variant="destructive" className="text-xs px-2 py-0.5 font-bold">
                          {unreadCount} New
                        </Badge>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        api.markAllRead();
                        setUnreadCount(0);
                      }}
                      className="text-xs font-bold text-primary hover:underline cursor-pointer"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-border">
                    {notifications.length === 0 ? (
                      <div className="py-10 text-center text-sm text-muted-foreground">
                        No notifications to display.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={cn(
                            'p-4 hover:bg-muted/50 transition-colors cursor-pointer',
                            !n.isRead ? 'bg-primary/5' : ''
                          )}
                        >
                          <div className="flex items-start gap-3.5">
                            <div className="mt-0.5">{severityIcon[n.severity] || <Info className="w-5 h-5 text-primary" />}</div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-foreground">{n.title}</div>
                              <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{n.message}</div>
                              <div className="text-xs text-muted-foreground/80 mt-1 font-mono">{new Date(n.createdAt).toLocaleTimeString()}</div>
                            </div>
                            {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary mt-2" />}
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
          className="flex items-center gap-3 pl-2.5 pr-3.5 py-2 rounded-xl bg-muted/60 border border-border/80 hover:bg-muted cursor-pointer transition-all"
        >
          <Avatar
            className="w-8 h-8 font-bold text-xs"
            fallback={user?.name ? user.name.slice(0, 2).toUpperCase() : isStudent ? 'ST' : 'RK'}
          />
          <div className="hidden lg:flex flex-col text-left">
            <span className="text-sm font-bold text-foreground leading-none">
              {user?.name || (isStudent ? 'Aarav Sharma' : 'Dr. Rajesh Kumar')}
            </span>
            <span className="text-xs text-muted-foreground font-bold uppercase leading-tight mt-1">
              {user?.role?.replace('_', ' ') || (isStudent ? 'Candidate' : 'TPO Super Admin')}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    </header>
  );
};
export default Topbar;
