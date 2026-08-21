import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/appStore';
import { useKeyboardShortcut } from '../../hooks/useApi';
import {
  Search, Users, Building2, Megaphone, CalendarClock, ShieldAlert,
  BarChart3, ArrowRight, Shuffle, Code2, X, Sparkles, UserCheck,
  Globe, FileSpreadsheet, Terminal, Settings, GraduationCap
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

const quickActions = [
  { label: 'Executive Dashboard', path: '/', icon: BarChart3, section: 'Core Views' },
  { label: 'Placement Allocation Engine (Gale-Shapley)', path: '/allocation', icon: Shuffle, section: 'Core Views', badge: 'Module A' },
  { label: 'Selection & Deselection Studio', path: '/selection-studio', icon: UserCheck, section: 'Core Views' },
  { label: 'What-If Simulation Lab', path: '/simulation', icon: Sparkles, section: 'Core Views' },
  { label: 'Job Crawler & Ingestion', path: '/crawler', icon: Globe, section: 'Core Views' },
  { label: 'Multi-Round Recruitment Drives', path: '/drives', icon: Megaphone, section: 'Management' },
  { label: 'Dynamic Interview Scheduler', path: '/scheduler', icon: CalendarClock, section: 'Management' },
  { label: 'Proctored Coding Sandbox', path: '/candidate-sandbox', icon: Terminal, section: 'Assessments' },
  { label: 'Candidate Coding Assessments', path: '/assessments', icon: Code2, section: 'Assessments' },
  { label: 'AI Anomaly Center & Telemetry', path: '/anomalies', icon: ShieldAlert, section: 'Assessments' },
  { label: 'Student Directory', path: '/students', icon: Users, section: 'Institutional' },
  { label: 'Partner Companies', path: '/companies', icon: Building2, section: 'Institutional' },
  { label: 'Yearly Placement Reports', path: '/yearly-reports', icon: FileSpreadsheet, section: 'Institutional' },
  { label: 'System Settings', path: '/settings', icon: Settings, section: 'Institutional' },
  { label: 'Student Career Portal', path: '/student-portal', icon: GraduationCap, section: 'Candidate' },
];

export const CommandPalette: React.FC = () => {
  const { commandPaletteOpen, setCommandPaletteOpen } = useAppStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useKeyboardShortcut('k', () => setCommandPaletteOpen(true), { ctrl: true });

  const filtered = useMemo(() => {
    if (!query) return quickActions;
    return quickActions.filter((a) =>
      a.label.toLowerCase().includes(query.toLowerCase()) ||
      a.section.toLowerCase().includes(query.toLowerCase())
    );
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
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
        setQuery('');
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter' && filtered[selectedIndex]) {
        handleSelect(filtered[selectedIndex].path);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [commandPaletteOpen, filtered, selectedIndex, handleSelect, setCommandPaletteOpen]);

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => {
              setCommandPaletteOpen(false);
              setQuery('');
            }}
          />

          {/* Dialog Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.15 }}
            className="relative z-50 w-full max-w-xl rounded-xl border border-border bg-card shadow-2xl text-card-foreground overflow-hidden"
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a command or search modules..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              <kbd className="text-[10px] font-mono bg-muted border border-border px-1.5 py-0.5 rounded text-muted-foreground">
                ESC
              </kbd>
            </div>

            {/* Results List */}
            <div className="max-h-80 overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                  No matching commands or pages found.
                </div>
              ) : (
                <div className="space-y-1">
                  {filtered.map((action, idx) => {
                    const isSelected = idx === selectedIndex;

                    return (
                      <div
                        key={`${action.path}-${action.label}`}
                        onClick={() => handleSelect(action.path)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={cn(
                          'flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium cursor-pointer transition-colors',
                          isSelected
                            ? 'bg-primary text-primary-foreground font-semibold'
                            : 'text-foreground hover:bg-muted'
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <action.icon
                            className={cn(
                              'w-4 h-4 flex-shrink-0',
                              isSelected ? 'text-primary-foreground' : 'text-muted-foreground'
                            )}
                          />
                          <span className="truncate">{action.label}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {action.badge && (
                            <Badge
                              variant={isSelected ? 'secondary' : 'outline'}
                              className="text-[9px] px-1.5 py-0"
                            >
                              {action.badge}
                            </Badge>
                          )}
                          <span
                            className={cn(
                              'text-[10px] uppercase font-semibold',
                              isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                            )}
                          >
                            {action.section}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Tip */}
            <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Use <kbd className="font-mono bg-background border px-1 rounded">↑</kbd> <kbd className="font-mono bg-background border px-1 rounded">↓</kbd> to navigate</span>
              <span>Press <kbd className="font-mono bg-background border px-1 rounded">↵</kbd> to select</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
export default CommandPalette;
