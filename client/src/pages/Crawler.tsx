import React, { useState, useEffect } from 'react';
import {
  Globe, Search, Play, ArrowRight, Building2, MapPin, Briefcase,
  CheckCircle2, Sparkles, Plus, RefreshCw, Layers, Users, ExternalLink, Award, Filter
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
  const [searchTerm, setSearchTerm] = useState<string>('');

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

  const filteredJobs = jobs.filter((j) => {
    const term = searchTerm.toLowerCase();
    const titleMatch = (j.jobTitle || '').toLowerCase().includes(term);
    const companyMatch = (j.companyName || '').toLowerCase().includes(term);
    const skillsMatch = (j.requiredSkills || '').toLowerCase().includes(term);
    return titleMatch || companyMatch || skillsMatch;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Globe className="w-7 h-7 text-cyan-400" />
              Recruitment Intelligence & Ingestion Crawler
            </h1>
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              Automated Discovery
            </span>
          </div>
          <p className="text-sm text-zinc-300 mt-1">
            Ingests external postings from career portals, extracts normalized technical skill entities, calculates talent pool compatibility, and converts postings into official campus drives.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddSource(true)}
            className="btn-secondary text-xs font-semibold flex items-center gap-2 px-4 py-2.5"
          >
            <Plus className="w-4 h-4" />
            Add Source
          </button>
          <button
            onClick={handleTriggerCrawl}
            disabled={crawling}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50"
          >
            {crawling ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
            {crawling ? 'Crawling Sources...' : 'Trigger Crawler Pipeline'}
          </button>
        </div>
      </div>

      {/* Crawler Sources Bar */}
      <div className="glass-card p-5 space-y-3.5 shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-400" />
            Configured Career Discovery Portals ({sources.length})
          </span>
          <span className="text-xs text-zinc-400 font-medium">Automated sync frequency: Daily</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {sources.map((src) => (
            <div
              key={src.id}
              className="bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 rounded-xl p-3.5 flex items-center justify-between shadow-sm transition-all"
            >
              <div className="truncate mr-3">
                <h4 className="font-bold text-white text-sm truncate">{src.name}</h4>
                <p className="text-xs text-zinc-400 truncate mt-0.5 font-mono">{src.url}</p>
              </div>
              <span className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                {src.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Discovered Postings Catalog */}
      <div className="glass-card p-6 space-y-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-cyan-400" />
              Discovered Tech Career Opportunities ({filteredJobs.length})
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Live extracted career listings evaluated against candidate skill vectors.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search opportunity or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field text-xs pl-9 py-1.5 w-60"
            />
          </div>
        </div>

        {/* Job Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredJobs.map((job) => {
            let reqSkills: string[] = [];
            let prefSkills: string[] = [];
            try {
              reqSkills = JSON.parse(job.requiredSkills || '[]');
              prefSkills = JSON.parse(job.preferredSkills || '[]');
            } catch (e) {}

            return (
              <div
                key={job.id}
                className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-cyan-500/40 transition-all space-y-4 shadow-md flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  {/* Job Title & Conversion Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-white text-base group-hover:text-cyan-300 transition-colors leading-snug">
                        {job.jobTitle}
                      </h4>
                      <p className="text-sm font-bold text-cyan-400 flex items-center gap-1.5 mt-1">
                        <Building2 className="w-4 h-4" />
                        {job.companyName}
                      </p>
                    </div>
                    {job.status === 'CONVERTED_TO_DRIVE' ? (
                      <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                        Converted
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shrink-0">
                        New
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">
                    {job.jobDescription}
                  </p>

                  {/* Location & Package LPA (Large, High Contrast) */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-800/80">
                    <span className="flex items-center gap-1.5 text-zinc-300 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                      {job.location || 'Remote / Hybrid'}
                    </span>
                    <span className="font-mono font-extrabold text-sm text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/30">
                      {job.packageLpa ? `${job.packageLpa} LPA` : 'Competitive'}
                    </span>
                  </div>

                  {/* Skill Pills */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {reqSkills.slice(0, 3).map((s) => (
                      <span
                        key={s}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-800 text-zinc-200 border border-zinc-700"
                      >
                        {s}
                      </span>
                    ))}
                    {reqSkills.length > 3 && (
                      <span className="px-2 py-1 rounded-lg text-xs font-semibold text-zinc-400 bg-zinc-800/50">
                        +{reqSkills.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between gap-3 pt-3.5 border-t border-zinc-800/80">
                  <button
                    onClick={() => handleViewMatches(job)}
                    className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-bold px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all"
                  >
                    <Users className="w-4 h-4" />
                    Talent Matches
                  </button>

                  {job.status !== 'CONVERTED_TO_DRIVE' ? (
                    <button
                      onClick={() => setConvertingJob(job)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-primary-600 hover:from-indigo-500 hover:to-primary-500 text-white text-xs font-bold shadow-md transition-all hover:scale-105"
                    >
                      Convert to Drive
                    </button>
                  ) : (
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                      <CheckCircle2 className="w-4 h-4" /> Active Drive
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Talent Matches Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                  Candidate Skill Matches: {selectedJob.jobTitle}
                </h3>
                <p className="text-xs text-zinc-300 mt-0.5">
                  Deterministic compatibility scores for {selectedJob.companyName} against active students.
                </p>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-zinc-400 hover:text-white text-lg font-bold px-2 py-1 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {matchesLoading ? (
                <div className="py-12 text-center text-zinc-400 flex items-center justify-center gap-2 text-sm font-medium">
                  <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
                  Calculating candidate talent match compatibility...
                </div>
              ) : studentMatches?.topMatches?.length === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-8">No candidate matches found.</p>
              ) : (
                studentMatches?.topMatches?.map((match: any, idx: number) => (
                  <div
                    key={match.studentId}
                    className="p-4 rounded-xl bg-zinc-800/60 border border-zinc-700/60 flex items-center justify-between gap-4 shadow-sm"
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-cyan-400">
                        #{idx + 1}
                      </span>
                      <div>
                        <h4 className="font-bold text-white text-sm">{match.studentName}</h4>
                        <p className="text-xs text-zinc-400 font-medium">
                          {match.studentId} • {match.department} • <strong className="text-indigo-400">{match.gpa} GPA</strong>
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-extrabold font-mono text-emerald-400">{match.compatibilityScore}%</span>
                      <p className="text-xs font-semibold text-zinc-400">
                        {match.requiredSkillsMet ? 'Mandatory met' : 'Missing required'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => setSelectedJob(null)}
                className="btn-secondary text-xs font-semibold px-5 py-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Convert to Drive Modal */}
      {convertingJob && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-400" />
              Convert to Campus Recruitment Drive
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Create an official active drive for <strong className="text-white">{convertingJob.companyName} — {convertingJob.jobTitle}</strong> ({convertingJob.packageLpa} LPA).
            </p>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Open Position Quota Seats</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={convertPositions}
                  onChange={(e) => setConvertPositions(parseInt(e.target.value, 10))}
                  className="input-field text-sm mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Minimum GPA Cutoff</label>
                <input
                  type="number"
                  min="5.0"
                  max="10.0"
                  step="0.1"
                  value={convertGpa}
                  onChange={(e) => setConvertGpa(parseFloat(e.target.value))}
                  className="input-field text-sm mt-1"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
              <button
                onClick={() => setConvertingJob(null)}
                className="btn-secondary text-xs font-semibold px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleConvertToDrive}
                disabled={converting}
                className="btn-primary text-xs font-bold px-5 py-2 flex items-center gap-1.5"
              >
                {converting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                {converting ? 'Creating Drive...' : 'Confirm & Create Drive'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Source Modal */}
      {showAddSource && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-cyan-400" />
              Add Career Discovery Portal
            </h3>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Portal Name</label>
                <input
                  type="text"
                  placeholder="e.g. Google Careers / Stripe Jobs"
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                  className="input-field text-sm mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Career Portal URL</label>
                <input
                  type="url"
                  placeholder="https://careers.google.com"
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  className="input-field text-sm mt-1"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
              <button
                onClick={() => setShowAddSource(false)}
                className="btn-secondary text-xs font-semibold px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSource}
                className="btn-primary text-xs font-bold px-5 py-2 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Portal Source
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Crawler;
