import React, { useState, useEffect } from 'react';
import {
  Globe, Search, Play, ArrowRight, Building2, MapPin, Briefcase,
  CheckCircle2, Sparkles, Plus, RefreshCw, Layers, Users, ExternalLink, Award
} from 'lucide-react';
import { api } from '../lib/api';

export const Crawler: React.FC = () => {
  const [sources, setSources] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [crawling, setCrawling] = useState<boolean>(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [studentMatches, setStudentMatches] = useState<any>(null);
  const [matchesLoading, setMatchesLoading] = useState<boolean>(false);

  // Convert modal
  const [convertingJob, setConvertingJob] = useState<any>(null);
  const [convertPositions, setConvertPositions] = useState<number>(6);
  const [convertGpa, setConvertGpa] = useState<number>(7.5);
  const [converting, setConverting] = useState<boolean>(false);

  // Add source modal
  const [showAddSource, setShowAddSource] = useState<boolean>(false);
  const [newSourceName, setNewSourceName] = useState<string>('');
  const [newSourceUrl, setNewSourceUrl] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sourcesRes, jobsRes] = await Promise.all([
        api.getCrawlerSources(),
        api.getCrawledJobs(),
      ]);
      setSources(sourcesRes.data || []);
      setJobs(jobsRes.data || []);
    } catch (err) {
      console.error('Failed to load crawler data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerCrawl = async () => {
    try {
      setCrawling(true);
      await api.triggerCrawl();
      await loadData();
    } catch (err: any) {
      alert(`Crawler failed: ${err.message}`);
    } finally {
      setCrawling(false);
    }
  };

  const handleViewMatches = async (job: any) => {
    try {
      setSelectedJob(job);
      setMatchesLoading(true);
      const res = await api.getCrawledJobMatches(job.id);
      setStudentMatches(res);
    } catch (err: any) {
      alert(`Failed to load student matches: ${err.message}`);
    } finally {
      setMatchesLoading(false);
    }
  };

  const handleConvertToDrive = async () => {
    if (!convertingJob) return;
    try {
      setConverting(true);
      await api.convertCrawledJobToDrive(convertingJob.id, {
        openPositions: convertPositions,
        minGpa: convertGpa,
      });
      setConvertingJob(null);
      await loadData();
      alert(`Job "${convertingJob.jobTitle}" successfully converted into an active campus Recruitment Drive!`);
    } catch (err: any) {
      alert(`Conversion failed: ${err.message}`);
    } finally {
      setConverting(false);
    }
  };

  const handleAddSource = async () => {
    if (!newSourceName || !newSourceUrl) return;
    try {
      await api.createCrawlerSource({
        name: newSourceName,
        url: newSourceUrl,
      });
      setShowAddSource(false);
      setNewSourceName('');
      setNewSourceUrl('');
      loadData();
    } catch (err: any) {
      alert(`Failed to add source: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">Recruitment Intelligence & Ingestion Crawler</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              Automated Discovery
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Ingests external postings from career portals, extracts normalized technical skill entities, calculates talent pool compatibility, and converts postings into official campus drives.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddSource(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Source
          </button>
          <button
            onClick={handleTriggerCrawl}
            disabled={crawling}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
          >
            {crawling ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
            {crawling ? 'Crawling Sources...' : 'Trigger Crawler Pipeline'}
          </button>
        </div>
      </div>

      {/* Crawler Sources Bar */}
      <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            Configured Career Discovery Portals ({sources.length})
          </span>
          <span className="text-xs text-zinc-500">Pipeline runs on daily frequency</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sources.map((src) => (
            <div key={src.id} className="bg-zinc-800/40 border border-zinc-700/60 rounded-xl p-3 flex items-center justify-between">
              <div className="truncate mr-2">
                <h4 className="font-semibold text-white text-xs truncate">{src.name}</h4>
                <p className="text-[11px] text-zinc-400 truncate">{src.url}</p>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0">
                {src.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Discovered Postings Catalog */}
      <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-cyan-400" />
            Discovered Tech Career Opportunities ({jobs.length})
          </h3>
          <span className="text-xs text-zinc-400">Matched with active student skills</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => {
            let reqSkills: string[] = [];
            let prefSkills: string[] = [];
            try {
              reqSkills = JSON.parse(job.requiredSkills || '[]');
              prefSkills = JSON.parse(job.preferredSkills || '[]');
            } catch (e) {}

            return (
              <div
                key={job.id}
                className="bg-zinc-800/40 border border-zinc-700/60 rounded-xl p-4 space-y-3 flex flex-col justify-between hover:border-zinc-600 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-white text-sm">{job.jobTitle}</h4>
                      <p className="text-xs font-semibold text-cyan-400 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3.5 h-3.5" />
                        {job.companyName}
                      </p>
                    </div>
                    {job.status === 'CONVERTED_TO_DRIVE' ? (
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        Converted
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                        New
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-400 line-clamp-2">{job.jobDescription}</p>

                  <div className="flex items-center gap-3 text-xs text-zinc-400 pt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                      {job.location || 'Remote / Hybrid'}
                    </span>
                    <span className="font-bold text-emerald-400">
                      {job.packageLpa ? `${job.packageLpa} LPA` : 'Competitive'}
                    </span>
                  </div>

                  {/* Skills Pills */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {reqSkills.slice(0, 3).map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {s}
                      </span>
                    ))}
                    {reqSkills.length > 3 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] text-zinc-500">
                        +{reqSkills.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-zinc-700/40">
                  <button
                    onClick={() => handleViewMatches(job)}
                    className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Talent Matches
                  </button>

                  {job.status !== 'CONVERTED_TO_DRIVE' ? (
                    <button
                      onClick={() => setConvertingJob(job)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md"
                    >
                      Convert to Drive
                    </button>
                  ) : (
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active Drive
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Talent Matches Drawer / Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Candidate Skill Matches: {selectedJob.jobTitle} ({selectedJob.companyName})
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Deterministic compatibility scores against registered students.
                </p>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-zinc-500 hover:text-white text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {matchesLoading ? (
                <div className="py-12 text-center text-zinc-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                  Calculating candidate talent match compatibility...
                </div>
              ) : studentMatches?.topMatches?.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-8">No candidate matches found.</p>
              ) : (
                studentMatches?.topMatches?.map((match: any, idx: number) => (
                  <div
                    key={match.studentId}
                    className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/60 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center font-bold text-xs text-zinc-500">#{idx + 1}</span>
                      <div>
                        <h4 className="font-semibold text-white text-sm">{match.studentName}</h4>
                        <p className="text-xs text-zinc-400">{match.studentId} • {match.department} • GPA: {match.gpa}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-sm font-bold text-emerald-400">{match.compatibilityScore}%</span>
                        <p className="text-[10px] text-zinc-500">
                          {match.requiredSkillsMet ? 'Mandatory met' : 'Missing required skills'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => setSelectedJob(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Convert to Drive Modal */}
      {convertingJob && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-400" />
              Convert to Campus Recruitment Drive
            </h3>
            <p className="text-xs text-zinc-400">
              Create an official active drive for <strong>{convertingJob.companyName} — {convertingJob.jobTitle}</strong> ({convertingJob.packageLpa} LPA).
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-300">Open Position Quota Seats:</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={convertPositions}
                  onChange={(e) => setConvertPositions(Number(e.target.value))}
                  className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300">Minimum GPA Cutoff:</label>
                <input
                  type="number"
                  step="0.1"
                  min="5.0"
                  max="10.0"
                  value={convertGpa}
                  onChange={(e) => setConvertGpa(Number(e.target.value))}
                  className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConvertingJob(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConvertToDrive}
                disabled={converting}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-lg"
              >
                {converting ? 'Converting...' : 'Create Drive'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Source Modal */}
      {showAddSource && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-cyan-400" />
              Add Recruitment Source
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-300">Portal / Source Name</label>
                <input
                  type="text"
                  placeholder="e.g. Y Combinator Work at a Startup"
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                  className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300">Source Feed URLs</label>
                <input
                  type="text"
                  placeholder="https://workatastartup.com/jobs"
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddSource(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSource}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-all shadow-lg"
              >
                Add Portal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Crawler;
