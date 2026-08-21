import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet, Download, Calendar, BarChart3, TrendingUp,
  Award, Building2, CheckCircle2, ShieldCheck, History, ArrowDownToLine
} from 'lucide-react';
import { api } from '../lib/api';

export const YearlyReports: React.FC = () => {
  const [yoyData, setYoyData] = useState<any[]>([]);
  const [cycles, setCycles] = useState<any[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);

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

  const downloadCSV = (endpoint: string) => {
    window.open(endpoint, '_blank');
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">Yearly Institutional Reports & CSV Exports</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              RFC-4180 Streaming
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Generate and export institutional placement data, Year-over-Year analytics, selection audits, and candidate outcomes for NAAC, NBA, and NIRF compliance.
          </p>
        </div>
      </div>

      {/* Year-over-Year Institutional Comparison Table */}
      <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Year-over-Year (YoY) Multi-Cycle Placement Comparison
          </h3>
          <span className="text-xs text-zinc-400">Institutional Performance Trends</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-zinc-800/60 text-xs font-semibold uppercase text-zinc-400 border-b border-zinc-800">
              <tr>
                <th className="px-4 py-3">Academic Year</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Total Students</th>
                <th className="px-4 py-3 text-center">Placed</th>
                <th className="px-4 py-3 text-center">Placement Rate</th>
                <th className="px-4 py-3 text-center">Avg Package</th>
                <th className="px-4 py-3 text-center">Highest Package</th>
                <th className="px-4 py-3 text-center">Dream Offers</th>
                <th className="px-4 py-3 text-center">Cascades</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono text-xs">
              {yoyData.map((y) => (
                <tr key={y.academicYear} className="hover:bg-zinc-800/30 transition-colors font-sans">
                  <td className="px-4 py-3 font-bold text-white flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    {y.academicYear}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                        y.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}
                    >
                      {y.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-mono font-semibold text-zinc-200">{y.totalStudents}</td>
                  <td className="px-4 py-3 text-center font-mono font-semibold text-emerald-400">{y.placedStudents}</td>
                  <td className="px-4 py-3 text-center font-mono font-bold text-indigo-400">{y.placementRate}%</td>
                  <td className="px-4 py-3 text-center font-mono text-zinc-200">{y.avgPackageLpa} LPA</td>
                  <td className="px-4 py-3 text-center font-mono font-bold text-emerald-400">{y.highestPackageLpa} LPA</td>
                  <td className="px-4 py-3 text-center font-mono text-amber-400 font-semibold">{y.dreamOffers}</td>
                  <td className="px-4 py-3 text-center font-mono text-purple-400">{y.cascadeCount}</td>
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
          return (
            <div
              key={report.id}
              className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between hover:border-zinc-700 transition-all hover:shadow-xl group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${report.color} flex items-center justify-center shadow-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                    RFC-4180 CSV
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-white text-base group-hover:text-emerald-400 transition-colors">
                    {report.title}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{report.description}</p>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {report.tags.map((t) => (
                    <span key={t} className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800/80 text-zinc-400 border border-zinc-700/60">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800">
                <button
                  onClick={() => downloadCSV(report.endpoint)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-800 hover:bg-emerald-600 hover:text-white text-zinc-200 text-xs font-semibold border border-zinc-700 hover:border-emerald-500 transition-all shadow-md"
                >
                  <ArrowDownToLine className="w-4 h-4" />
                  Export & Stream CSV
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
