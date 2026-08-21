import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet, Download, Calendar, BarChart3, TrendingUp,
  Award, Building2, CheckCircle2, ShieldCheck, History, ArrowDownToLine,
  Sparkles, FileText, Check
} from 'lucide-react';
import { api } from '../lib/api';

export const YearlyReports: React.FC = () => {
  const [yoyData, setYoyData] = useState<any[]>([]);
  const [cycles, setCycles] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    loadReportsData();
  }, []);

  const loadReportsData = async () => {
    try {
      setLoading(true);
      const [yoyRes, cyclesRes] = await Promise.all([
        api.getYoYAnalytics(),
        api.getRecruitmentCycles(),
      ]);
      setYoyData(yoyRes.data || []);
      setCycles(cyclesRes.data || []);
    } catch (err) {
      console.error('Failed to load yearly reports data:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = (endpoint: string, id: string) => {
    setDownloadingId(id);
    const fullUrl = `http://localhost:3001${endpoint}`;
    window.open(fullUrl, '_blank');
    setTimeout(() => setDownloadingId(null), 2000);
  };

  const reportCards = [
    {
      id: 'yearly',
      title: 'Institutional Yearly Placement Report',
      description: 'Comprehensive academic year report detailing overall placement rates, package statistics, corporate participation, and tier breakdown.',
      icon: Calendar,
      color: 'from-blue-600 to-indigo-600',
      endpoint: '/api/reports/yearly/csv',
      tags: ['Accreditation', 'NIRF / NAAC', 'Annual Review'],
    },
    {
      id: 'selection',
      title: 'Selection & Deselection Audit Report',
      description: 'Complete audit trail of all candidate progression decisions, shortlisting scores, cutoffs, and explicit deselection reason codes.',
      icon: History,
      color: 'from-purple-600 to-pink-600',
      endpoint: '/api/reports/selection/csv',
      tags: ['T&P Governance', 'Audit Trail', 'Transparency'],
    },
    {
      id: 'outcomes',
      title: 'Candidate Placement Outcomes Report',
      description: 'Individual candidate outcome status (Campus Placed, Higher Studies, Off-Campus Offer, Unallocated) with final package & company details.',
      icon: Award,
      color: 'from-emerald-600 to-teal-600',
      endpoint: '/api/reports/outcomes/csv',
      tags: ['Student Roster', 'Final Offers', 'Outcomes'],
    },
    {
      id: 'companies',
      title: 'Corporate Partner Recruitment Report',
      description: 'Company-by-company recruitment summary detailing open quota positions, total applications received, and offers accepted.',
      icon: Building2,
      color: 'from-amber-600 to-orange-600',
      endpoint: '/api/reports/companies/csv',
      tags: ['Corporate Relations', 'Hiring Trends', 'Drive Analytics'],
    },
    {
      id: 'students',
      title: 'Student Performance & Skill Profile Roster',
      description: 'Complete student roster including GPA, verified technical skills, application counts, and offer statuses.',
      icon: BarChart3,
      color: 'from-cyan-600 to-blue-600',
      endpoint: '/api/reports/students/csv',
      tags: ['Student Profiles', 'Academic Records', 'GPA'],
    },
    {
      id: 'integrity',
      title: 'Assessment Integrity & Proctoring Telemetry',
      description: 'Technical assessment session logs, Shannon entropy scores, paste events, focus blurs, and risk classifications.',
      icon: ShieldCheck,
      color: 'from-rose-600 to-red-600',
      endpoint: '/api/reports/integrity/csv',
      tags: ['Academic Integrity', 'Anomaly Detection', 'Proctoring'],
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <FileSpreadsheet className="w-7 h-7 text-emerald-400" />
              Yearly Institutional Reports & CSV Exports
            </h1>
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              RFC-4180 Streaming
            </span>
          </div>
          <p className="text-sm text-zinc-300 mt-1">
            Generate and export institutional placement data, Year-over-Year analytics, selection audits, and candidate outcomes for NAAC, NBA, and NIRF compliance.
          </p>
        </div>
      </div>

      {/* Year-over-Year Institutional Comparison Table */}
      <div className="glass-card p-6 space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Year-over-Year (YoY) Multi-Cycle Placement Comparison
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Historical multi-year placement performance and cascading statistics.
            </p>
          </div>
          <span className="text-xs font-semibold text-zinc-400">Institutional Performance Trends</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/60 text-xs font-bold uppercase tracking-wider text-zinc-300">
                <th className="px-4 py-3.5">Academic Year</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-center">Total Students</th>
                <th className="px-4 py-3.5 text-center">Placed</th>
                <th className="px-4 py-3.5 text-center">Placement Rate</th>
                <th className="px-4 py-3.5 text-center">Avg Package</th>
                <th className="px-4 py-3.5 text-center">Highest Package</th>
                <th className="px-4 py-3.5 text-center">Dream Offers</th>
                <th className="px-4 py-3.5 text-center">Cascades</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-sm">
              {yoyData.map((y) => (
                <tr key={y.academicYear} className="hover:bg-zinc-800/40 transition-colors">
                  <td className="px-4 py-4 font-bold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="text-sm font-semibold">{y.academicYear}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`px-3 py-1 text-xs font-bold rounded-lg border ${
                        y.status === 'ACTIVE'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      }`}
                    >
                      {y.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-white text-sm">
                    {y.totalStudents}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-emerald-400 text-sm">
                    {y.placedStudents}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-extrabold text-indigo-400 text-sm">
                    {y.placementRate}%
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-zinc-200 text-sm">
                    ₹{y.avgPackageLpa} LPA
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-extrabold text-emerald-400 text-sm">
                    ₹{y.highestPackageLpa} LPA
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-amber-400 text-sm">
                    {y.dreamOffers}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-purple-400 text-sm">
                    {y.cascadeCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Exportable Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {reportCards.map((report) => {
          const Icon = report.icon;
          const isDownloading = downloadingId === report.id;

          return (
            <div
              key={report.id}
              className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-emerald-500/40 transition-all space-y-4 shadow-md flex flex-col justify-between group"
            >
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${report.color} flex items-center justify-center shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700">
                    RFC-4180 CSV
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-white text-base group-hover:text-emerald-300 transition-colors">
                    {report.title}
                  </h3>
                  <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed">{report.description}</p>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {report.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-800/80 text-zinc-300 border border-zinc-700/60"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800/80">
                <button
                  onClick={() => downloadCSV(report.endpoint, report.id)}
                  disabled={isDownloading}
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-emerald-600 hover:text-white text-zinc-200 text-xs font-bold border border-zinc-700 hover:border-emerald-500 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  {isDownloading ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      Downloading CSV...
                    </>
                  ) : (
                    <>
                      <ArrowDownToLine className="w-4 h-4" />
                      Export & Stream CSV
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default YearlyReports;
