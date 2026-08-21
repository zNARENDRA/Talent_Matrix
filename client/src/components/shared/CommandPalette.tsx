import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/appStore';
import { useKeyboardShortcut } from '../../hooks/useApi';
import {
  Search, Users, Building2, Megaphone, CalendarClock, ShieldAlert,
  BarChart3, ArrowRight, Shuffle, Code2, X,
} from 'lucide-react';

const quickActions = [
  { label: 'Dashboard', path: '/', icon: BarChart3, section: 'Pages' },
  { label: 'Students', path: '/students', icon: Users, section: 'Pages' },
  { label: 'Companies', path: '/companies', icon: Building2, section: 'Pages' },
  { label: 'Recruitment Drives', path: '/drives', icon: Megaphone, section: 'Pages' },
  { label: 'Allocation Engine', path: '/allocation', icon: Shuffle, section: 'Pages' },
  { label: 'Interview Scheduler', path: '/scheduler', icon: CalendarClock, section: 'Pages' },
  { label: 'Coding Assessments', path: '/assessments', icon: Code2, section: 'Pages' },
  { label: 'Anomaly Center', path: '/anomalies', icon: ShieldAlert, section: 'Pages' },
  { label: 'Analytics', path: '/analytics', icon: BarChart3, section: 'Pages' },
  { label: 'Run Allocation', path: '/allocation', icon: Shuffle, section: 'Actions' },
  { label: 'View Scheduling Conflicts', path: '/scheduler', icon: CalendarClock, section: 'Actions' },
  { label: 'Review Anomaly Alerts', path: '/anomalies', icon: ShieldAlert, section: 'Actions' },
];

export const CommandPalette: React.FC = () => {
  const { commandPaletteOpen, setCommandPaletteOpen } = useAppStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useKeyboardShortcut('k', () => setCommandPaletteOpen(true), { ctrl: true });

  const filtered = useMemo(() => {
    if (!query) return quickActions;
    return quickActions.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()));
  }, [query]);

  const handleSelect = useCallback((path: string) => {
    navigate(path);
    setCommandPaletteOpen(false);
    setQuery('');
  }, [navigate, setCommandPaletteOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!commandPaletteOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setCommandPaletteOpen(false); setQuery(''); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); }
      if (e.key === 'Enter' && filtered[selectedIndex]) { handleSelect(filtered[selectedIndex].path); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [commandPaletteOpen, filtered, selectedIndex, handleSelect, setCommandPaletteOpen]);

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={() => { setCommandPaletteOpen(false); setQuery(''); }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg bg-white dark:bg-surface-900 rounded-2xl shadow-2xl z-50 overflow-hidden border border-surface-200 dark:border-surface-700"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-200 dark:border-surface-700">
              <Search className="w-5 h-5 text-surface-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search pages, actions, students..."
                className="flex-1 bg-transparent text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 outline-none"
              />
              <button onClick={() => { setCommandPaletteOpen(false); setQuery(''); }}>
                <X className="w-4 h-4 text-surface-400" />
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto py-2">
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-surface-400">No results found</div>
              ) : (
                <>
                  {['Pages', 'Actions'].map((section) => {
                    const items = filtered.filter((a) => a.section === section);
                    if (items.length === 0) return null;
                    return (
                      <div key={section}>
                        <div className="px-4 py-1.5 text-xs font-semibold text-surface-400 uppercase tracking-wider">{section}</div>
                        {items.map((item) => {
                          const globalIdx = filtered.indexOf(item);
                          return (
                            <button
                              key={item.label}
                              onClick={() => handleSelect(item.path)}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${globalIdx === selectedIndex ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' : 'text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800'}`}
                            >
                              <item.icon className="w-4 h-4" />
                              <span className="flex-1">{item.label}</span>
                              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100" />
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
            <div className="px-4 py-2 border-t border-surface-200 dark:border-surface-700 flex items-center gap-4 text-xs text-surface-400">
              <span><kbd className="bg-surface-100 dark:bg-surface-800 px-1 rounded">↑↓</kbd> Navigate</span>
              <span><kbd className="bg-surface-100 dark:bg-surface-800 px-1 rounded">⏎</kbd> Open</span>
              <span><kbd className="bg-surface-100 dark:bg-surface-800 px-1 rounded">Esc</kbd> Close</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
