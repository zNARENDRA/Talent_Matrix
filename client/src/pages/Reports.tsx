import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, FileSpreadsheet, Building2, Users, ShieldAlert, BarChart3, CalendarClock } from 'lucide-react';

const reports = [
  {
    title: 'Placement Report',
    description: 'Complete student offer records, packages (LPA), tier categories, and acceptance status',
    icon: BarChart3,
    color: 'bg-primary-50 dark:bg-primary-900/20 text-primary-600',
    csvUrl: '/api/reports/placement/csv',
  },
  {
    title: 'Student Roster Report',
    description: 'Comprehensive student directory with GPA, department, offer counts, and application statistics',
    icon: Users,
    color: 'bg-success-50 dark:bg-success-900/20 text-success-600',
    csvUrl: '/api/reports/students/csv',
  },
  {
    title: 'Company Recruitment Report',
    description: 'Recruitment drive capacities, open position counts, and offer metrics across companies',
    icon: Building2,
    color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600',
    csvUrl: '/api/reports/companies/csv',
  },
  {
    title: 'Assessment Integrity & Telemetry Report',
    description: 'Proctored coding assessment logs, authenticity score indices, and flagged anomaly alerts',
    icon: ShieldAlert,
    color: 'bg-danger-50 dark:bg-danger-900/20 text-danger-500',
    csvUrl: '/api/reports/integrity/csv',
  },
  {
    title: 'Interview Utilization Report',
    description: 'Panel slot occupancy, duration analytics, and scheduling efficiency metrics',
    icon: CalendarClock,
    color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600',
    csvUrl: '/api/reports/placement/csv',
  },
  {
    title: 'Allocation Engine Execution Report',
    description: 'Gale-Shapley matching convergence records, stability verification, and policy lock logs',
    icon: FileText,
    color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600',
    csvUrl: '/api/reports/placement/csv',
  },
];

export const ReportsPage: React.FC = () => {
  const handleDownloadCSV = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="section-title">Institutional Reports & Exports</h1>
        <p className="text-surface-500 mt-1">
          Export live placement records, student directories, and integrity analytics generated directly from database tables
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {reports.map((report, i) => (
          <motion.div
            key={report.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            whileHover={{ y: -3 }}
            className="glass-card p-5 space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${report.color}`}>
                <report.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-surface-900 dark:text-white text-base">{report.title}</h3>
              <p className="text-xs text-surface-500 leading-relaxed">{report.description}</p>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-surface-100 dark:border-surface-800">
              <button
                onClick={() => handleDownloadCSV(report.csvUrl)}
                className="btn-primary text-xs py-1.5 w-full flex items-center justify-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Download Live CSV
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
