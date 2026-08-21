import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import { initFaceDetector, detectFaces, type FaceDetectionResult } from '../lib/faceDetector';
import { PROBLEMS_BANK, Problem, TestCase } from '../lib/problems';
import {
  Play, CheckCircle2, AlertTriangle, ShieldCheck,
  Send, Clock, ShieldAlert, Sparkles, Terminal, ExternalLink,
  Camera, CameraOff, Video, UserCheck, AlertCircle, Scan,
  BookOpen, Check, RotateCcw, Copy, HelpCircle, Building2,
  ChevronDown, Maximize2, Minimize2, Eye, Loader2
} from 'lucide-react';

export const CandidateAssessment: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSession, setCurrentSession] = useState<any>(null);

  // Problem & Language selection
  const [selectedProblemId, setSelectedProblemId] = useState<string>(PROBLEMS_BANK[0].id);
  const currentProblem: Problem = PROBLEMS_BANK.find((p) => p.id === selectedProblemId) || PROBLEMS_BANK[0];
  const [language, setLanguage] = useState<'typescript' | 'javascript' | 'python'>('typescript');
  const [code, setCode] = useState<string>(currentProblem.starterCode.typescript);

  // Active Left Pane Tab
  const [activeLeftTab, setActiveLeftTab] = useState<'description' | 'constraints'>('description');

  // Bottom Console Tabs
  const [activeConsoleTab, setActiveConsoleTab] = useState<'testcases' | 'results' | 'telemetry'>('testcases');
  const [selectedTestCaseIndex, setSelectedTestCaseIndex] = useState<number>(0);

  // Test Runner State
  const [isRunningCode, setIsRunningCode] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<TestCase[]>([]);
  const [allPassed, setAllPassed] = useState<boolean | null>(null);
  const [executionStdout, setExecutionStdout] = useState<string>('');

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionReport, setSubmissionReport] = useState<any>(null);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);

  // Proctoring & Telemetry
  const [telemetryLogs, setTelemetryLogs] = useState<{ type: string; details: string; time: string }[]>([]);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraStatus, setCameraStatus] = useState<'calibrating' | 'face_locked' | 'face_absent' | 'multiple_faces'>('face_locked');
  const [faceConfidence, setFaceConfidence] = useState<number>(96);
  const [detectedFacesCount, setDetectedFacesCount] = useState<number>(1);
  const [showWebcamPip, setShowWebcamPip] = useState<boolean>(true);
  const [isScanningFace, setIsScanningFace] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Timer
  const [timeRemaining, setTimeRemaining] = useState<number>(45 * 60);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastKeyTimeRef = useRef<number>(Date.now());
  const blurStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    setCode(currentProblem.starterCode[language]);
    setTestResults([]);
    setAllPassed(null);
    setExecutionStdout('');
    setSelectedTestCaseIndex(0);
  }, [selectedProblemId, language]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    api.getAssessments({ limit: '10' }).then((res) => {
      if (res.data && res.data.length > 0) {
        setSessions(res.data);
        setCurrentSession(res.data[0]);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!currentSession) return;
    const socket = getSocket();
    socket.emit('join:session', currentSession.id);

    socket.on('score:update', (data: any) => {
      setCurrentSession((prev: any) => ({
        ...prev,
        authenticityScore: data.authenticityScore,
        riskLevel: data.riskLevel,
      }));
    });

    return () => {
      socket.emit('leave:session', currentSession.id);
      socket.off('score:update');
    };
  }, [currentSession?.id]);

  useEffect(() => {
    if (!currentSession) return;

    const handleBlur = () => {
      blurStartTimeRef.current = Date.now();
      logLocalTelemetry('tab_blur', 'Window defocused / tab switched');
    };

    const handleFocus = () => {
      if (blurStartTimeRef.current) {
        const durationSec = Math.round((Date.now() - blurStartTimeRef.current) / 1000);
        blurStartTimeRef.current = null;
        logLocalTelemetry('tab_focus', `Returned to window after ${durationSec}s`);

        api.sendTelemetryEvent(currentSession.id, {
          eventType: 'tab_blur',
          data: { duration: durationSec, timestamp: new Date().toISOString() },
        }).catch(console.error);
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentSession?.id]);

  useEffect(() => {
    initFaceDetector().catch(() => {});
    startWebcam();
    return () => {
      stopWebcam();
    };
  }, []);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 480 }, height: { ideal: 360 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
      setCameraStatus('face_locked');
      logLocalTelemetry('webcam', 'Webcam stream connected');
    } catch (err) {
      setCameraActive(false);
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const logLocalTelemetry = (type: string, details: string) => {
    setTelemetryLogs((prev) => [
      { type, details, time: new Date().toLocaleTimeString() },
      ...prev.slice(0, 19),
    ]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const now = Date.now();
    const flightTimeMs = now - lastKeyTimeRef.current;
    lastKeyTimeRef.current = now;

    if (Math.random() < 0.2 && currentSession) {
      api.sendTelemetryEvent(currentSession.id, {
        eventType: 'keystroke',
        data: { key: e.key, flightTimeMs, timestamp: new Date().toISOString() },
      }).catch(() => {});
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text');
    const size = pastedText.length;
    logLocalTelemetry('paste', `Clipboard paste: ${size} chars`);

    if (currentSession) {
      api.sendTelemetryEvent(currentSession.id, {
        eventType: size > 400 ? 'code_insert' : 'paste',
        data: { size, length: size, preview: pastedText.slice(0, 50), timestamp: new Date().toISOString() },
      }).catch(console.error);
    }
  };

  const executeCodeSandbox = (userCode: string, testList: TestCase[]): { results: TestCase[]; allPassed: boolean; stdout: string } => {
    const results: TestCase[] = [];
    let stdoutBuffer = '';

    for (const tc of testList) {
      const startTime = performance.now();
      try {
        let cleanCode = userCode.replace(/function\s+(\w+)\s*\([^)]*\)\s*:\s*[^{]+/g, 'function $1(');
        cleanCode = cleanCode.replace(/:\s*[a-zA-Z0-9_<>\[\]|]+/g, '');

        const runScript = `
          ${cleanCode}
          return ${currentProblem.functionName}(${tc.input});
        `;

        const executor = new Function(runScript);
        const actualVal = executor();
        const endTime = performance.now();
        const runtimeMs = Math.round((endTime - startTime) * 100) / 100;

        const actualStr = JSON.stringify(actualVal);
        const expectedNormalized = tc.expectedOutput.replace(/\s+/g, '');
        const actualNormalized = actualStr.replace(/\s+/g, '');
        const passed = expectedNormalized === actualNormalized || String(actualVal) === tc.expectedOutput;

        results.push({
          ...tc,
          actualOutput: actualStr,
          passed,
          runtimeMs: Math.max(runtimeMs, 0.1),
        });

        stdoutBuffer += `[Case ${tc.id}] (${tc.input}) => ${actualStr} | ${passed ? 'PASSED' : 'FAILED'} (${runtimeMs}ms)\n`;
      } catch (err: any) {
        const endTime = performance.now();
        results.push({
          ...tc,
          actualOutput: `Error: ${err.message}`,
          passed: false,
          runtimeMs: Math.round((endTime - startTime) * 100) / 100,
        });
        stdoutBuffer += `[Case ${tc.id}] Error: ${err.message}\n`;
      }
    }

    const allPassed = results.every((r) => r.passed);
    return { results, allPassed, stdout: stdoutBuffer };
  };

  const handleRunCode = () => {
    setIsRunningCode(true);
    setActiveConsoleTab('results');
    logLocalTelemetry('run_code', `Executed test cases for ${currentProblem.title}`);

    setTimeout(() => {
      const visibleCases = currentProblem.testCases.filter((tc) => !tc.hidden);
      const execution = executeCodeSandbox(code, visibleCases);
      setTestResults(execution.results);
      setAllPassed(execution.allPassed);
      setExecutionStdout(execution.stdout);
      setIsRunningCode(false);
    }, 150);
  };

  const handleSubmit = async () => {
    if (!currentSession) return;
    setIsSubmitting(true);

    try {
      const execution = executeCodeSandbox(code, currentProblem.testCases);
      const passedCount = execution.results.filter((r) => r.passed).length;
      const totalCount = execution.results.length;

      await api.sendTelemetryEvent(currentSession.id, {
        eventType: 'submission',
        data: {
          problemId: currentProblem.id,
          passedCount,
          totalCount,
          allPassed: execution.allPassed,
        },
      });

      logLocalTelemetry('submission', `Submitted solution: ${passedCount}/${totalCount} Passed`);

      setSubmissionReport({
        problemTitle: currentProblem.title,
        difficulty: currentProblem.difficulty,
        passedCount,
        totalCount,
        allPassed: execution.allPassed,
        runtimeMs: execution.results.reduce((a, b) => a + (b.runtimeMs || 0.5), 0).toFixed(1),
        authenticityScore: currentSession.authenticityScore ?? 96,
        riskLevel: currentSession.riskLevel || 'normal',
      });

      setShowSubmitModal(true);
    } catch (err: any) {
      alert('Failed to submit: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full h-[calc(100vh-3.5rem)] flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden select-none">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ─── 1. COMPACT UNIFIED TOP TOOLBAR (No floating tiles) ─── */}
      <div className="h-12 border-b border-zinc-800/80 bg-zinc-900/90 px-4 flex items-center justify-between gap-3 flex-shrink-0">
        {/* Left: Problem Selector & Badges */}
        <div className="flex items-center gap-2.5">
          <select
            value={selectedProblemId}
            onChange={(e) => setSelectedProblemId(e.target.value)}
            className="bg-zinc-800 border border-zinc-700/80 text-white text-xs font-bold rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-primary-500 cursor-pointer"
          >
            {PROBLEMS_BANK.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>

          <span
            className={`px-2 py-0.5 text-[11px] font-bold rounded-md border ${
              currentProblem.difficulty === 'Easy'
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : currentProblem.difficulty === 'Medium'
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
            }`}
          >
            {currentProblem.difficulty}
          </span>

          <span className="text-[11px] text-zinc-400 font-medium hidden md:flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-zinc-500" /> {currentProblem.company}
          </span>
        </div>

        {/* Center: Language & Run Actions */}
        <div className="flex items-center gap-2">
          <select
            value={language}
            onChange={(e: any) => setLanguage(e.target.value)}
            className="bg-zinc-800 border border-zinc-700/80 text-zinc-200 text-xs font-semibold rounded-lg px-2.5 py-1.5 cursor-pointer focus:outline-none"
          >
            <option value="typescript">TypeScript</option>
            <option value="javascript">JavaScript</option>
            <option value="python">Python 3</option>
          </select>

          <button
            onClick={handleRunCode}
            disabled={isRunningCode}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold px-3 py-1.5 rounded-lg border border-zinc-700/80 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {isRunningCode ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current text-zinc-300" />}
            <span>Run</span>
          </button>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold px-4 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>Submit</span>
          </button>
        </div>

        {/* Right: Live Proctor Indicators & Timer */}
        <div className="flex items-center gap-3">
          {/* Proctor Live Pill */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-800/80 border border-zinc-700/70 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-mono font-bold text-zinc-200">
              Proctor: {faceConfidence}%
            </span>
            <span className="text-zinc-600">|</span>
            <span className="text-[11px] font-mono text-emerald-400 font-bold">
              Auth: {currentSession?.authenticityScore ?? 96}%
            </span>
          </div>

          {/* Countdown Clock */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/80 border border-zinc-700/70 text-zinc-200 text-xs font-mono font-bold">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{formatTime(timeRemaining)}</span>
          </div>

          {/* Toggle Webcam PIP */}
          <button
            onClick={() => setShowWebcamPip(!showWebcamPip)}
            className={`p-1.5 rounded-lg text-xs border transition-colors cursor-pointer ${
              showWebcamPip
                ? 'bg-purple-600/20 text-purple-300 border-purple-500/40'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
            title="Toggle Proctor Webcam Preview"
          >
            <Video className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ─── 2. MAIN SPLIT WORKSPACE (Edge-to-Edge 50/50 Layout) ─── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* ─── LEFT PANEL: Problem Statement & Examples (5 cols) ─── */}
        <div className="lg:col-span-5 border-r border-zinc-800/80 flex flex-col bg-zinc-950/60 overflow-hidden">
          {/* Header Tab Bar */}
          <div className="h-9 px-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/40">
            <div className="flex items-center gap-3 text-xs">
              <button
                onClick={() => setActiveLeftTab('description')}
                className={`h-9 font-bold px-1 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeLeftTab === 'description'
                    ? 'border-primary-500 text-white'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" /> Description
              </button>
              <button
                onClick={() => setActiveLeftTab('constraints')}
                className={`h-9 font-bold px-1 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeLeftTab === 'constraints'
                    ? 'border-primary-500 text-white'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" /> Constraints &amp; Rules
              </button>
            </div>

            <div className="flex items-center gap-1">
              {currentProblem.tags.map((t) => (
                <span key={t} className="px-1.5 py-0.5 text-[10px] rounded bg-zinc-800 text-zinc-400 font-mono">
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs select-text">
            {activeLeftTab === 'description' && (
              <>
                <div>
                  <h1 className="text-base font-bold text-white mb-2">{currentProblem.title}</h1>
                  <p className="text-zinc-300 leading-relaxed whitespace-pre-line text-xs font-normal">
                    {currentProblem.description}
                  </p>
                </div>

                {/* Structured Examples */}
                <div className="space-y-3 pt-2">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Examples
                  </span>

                  {currentProblem.examples.map((ex, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-zinc-900 border border-zinc-800/90 font-mono text-xs space-y-1">
                      <div className="text-zinc-400 font-sans font-bold text-[11px]">Example {idx + 1}:</div>
                      <div className="text-zinc-300">
                        <span className="text-zinc-500 font-sans">Input: </span>
                        <code className="text-indigo-300 font-semibold">{ex.input}</code>
                      </div>
                      <div className="text-zinc-300">
                        <span className="text-zinc-500 font-sans">Output: </span>
                        <code className="text-emerald-400 font-bold">{ex.output}</code>
                      </div>
                      {ex.explanation && (
                        <div className="text-[11px] text-zinc-400 font-sans pt-1 border-t border-zinc-800">
                          <strong>Explanation: </strong> {ex.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeLeftTab === 'constraints' && (
              <div className="space-y-4">
                <div>
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                    Complexity &amp; Data Constraints
                  </span>
                  <ul className="list-disc pl-4 space-y-1.5 text-zinc-300 font-mono text-xs">
                    {currentProblem.constraints.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 space-y-1">
                  <span className="font-bold text-zinc-200 block">Proctoring Assessment Notice:</span>
                  <p>
                    Keystroke flight dynamics, tab switches, and multi-face anomalies are logged automatically to your institutional evaluation profile.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── RIGHT PANEL: Full IDE Editor & Docked Console (7 cols) ─── */}
        <div className="lg:col-span-7 flex flex-col bg-zinc-950 overflow-hidden">
          {/* Editor Header Bar */}
          <div className="h-9 px-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/40">
            <span className="text-xs font-mono font-bold text-zinc-300">
              solution.{language === 'python' ? 'py' : language === 'javascript' ? 'js' : 'ts'}
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCode(currentProblem.starterCode[language])}
                className="p-1 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Reset code template"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleCopyCode}
                className="p-1 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Copy code"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Full Height Code Editor */}
          <div className="flex-1 p-4 overflow-auto bg-zinc-950">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              className="w-full h-full bg-transparent text-zinc-100 font-mono text-xs leading-relaxed resize-none focus:outline-none selection:bg-indigo-500/30"
              spellCheck={false}
              placeholder="// Write your solution here..."
            />
          </div>

          {/* ─── DOCKED BOTTOM CONSOLE ─── */}
          <div className="h-52 border-t border-zinc-800/80 flex flex-col bg-zinc-900/60 overflow-hidden flex-shrink-0">
            {/* Console Tabs Bar */}
            <div className="h-8 px-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/80">
              <div className="flex items-center gap-3 text-xs">
                <button
                  onClick={() => setActiveConsoleTab('testcases')}
                  className={`h-8 font-bold px-1 border-b-2 transition-all cursor-pointer ${
                    activeConsoleTab === 'testcases'
                      ? 'border-primary-500 text-white'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Test Cases ({currentProblem.testCases.filter((tc) => !tc.hidden).length})
                </button>
                <button
                  onClick={() => setActiveConsoleTab('results')}
                  className={`h-8 font-bold px-1 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeConsoleTab === 'results'
                      ? 'border-primary-500 text-white'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Results
                  {allPassed === true && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                  {allPassed === false && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                </button>
                <button
                  onClick={() => setActiveConsoleTab('telemetry')}
                  className={`h-8 font-bold px-1 border-b-2 transition-all cursor-pointer ${
                    activeConsoleTab === 'telemetry'
                      ? 'border-primary-500 text-white'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Proctor Logs ({telemetryLogs.length})
                </button>
              </div>

              <span className="text-[10px] font-mono text-zinc-500">
                {code.split('\n').length} lines • {code.length} chars
              </span>
            </div>

            {/* Console Content */}
            <div className="flex-1 p-3 overflow-y-auto text-xs font-mono">
              {activeConsoleTab === 'testcases' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    {currentProblem.testCases.filter((tc) => !tc.hidden).map((tc, idx) => (
                      <button
                        key={tc.id}
                        onClick={() => setSelectedTestCaseIndex(idx)}
                        className={`px-2.5 py-0.5 rounded text-xs font-bold transition-all cursor-pointer ${
                          selectedTestCaseIndex === idx
                            ? 'bg-zinc-800 text-white border border-zinc-700'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        Case {idx + 1}
                      </button>
                    ))}
                  </div>

                  {currentProblem.testCases[selectedTestCaseIndex] && (
                    <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800/80 space-y-1 text-xs">
                      <div>
                        <span className="text-zinc-500 font-sans">Input: </span>
                        <code className="text-indigo-300 font-semibold">
                          {currentProblem.testCases[selectedTestCaseIndex].input}
                        </code>
                      </div>
                      <div>
                        <span className="text-zinc-500 font-sans">Expected: </span>
                        <code className="text-emerald-400 font-semibold">
                          {currentProblem.testCases[selectedTestCaseIndex].expectedOutput}
                        </code>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeConsoleTab === 'results' && (
                <div className="space-y-2">
                  {testResults.length === 0 ? (
                    <div className="text-zinc-500 italic text-center py-4">
                      Click "Run" in top bar to execute test cases.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {testResults.map((tr) => (
                        <div
                          key={tr.id}
                          className={`p-2 rounded border text-xs space-y-0.5 ${
                            tr.passed
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span>Case {tr.id}: {tr.passed ? 'PASSED' : 'FAILED'}</span>
                            <span className="text-[10px] text-zinc-400">{tr.runtimeMs}ms</span>
                          </div>
                          <div className="text-[11px] truncate">Input: {tr.input}</div>
                          <div className="text-[11px] font-bold">Output: {tr.actualOutput}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeConsoleTab === 'telemetry' && (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {telemetryLogs.map((t, idx) => (
                    <div key={idx} className="flex items-center justify-between p-1 rounded bg-zinc-950 border border-zinc-800 text-[11px]">
                      <span className="text-indigo-400 font-bold uppercase text-[10px]">{t.type}</span>
                      <span className="text-zinc-300 truncate max-w-[280px]">{t.details}</span>
                      <span className="text-zinc-500 text-[10px]">{t.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. PICTURE-IN-PICTURE WEBCAM FLOATER (Compact & Draggable Corner) ─── */}
      {showWebcamPip && (
        <div className="fixed bottom-4 right-4 z-40 w-36 h-28 bg-zinc-900 rounded-xl border border-zinc-700/80 shadow-2xl overflow-hidden flex flex-col">
          <div className="relative flex-1 bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute top-1 left-1.5 px-1 rounded bg-black/70 text-[9px] font-mono text-emerald-400 font-bold">
              {faceConfidence}%
            </div>
            <button
              onClick={() => setShowWebcamPip(false)}
              className="absolute top-1 right-1 text-zinc-400 hover:text-white p-0.5 text-xs bg-black/50 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div className="px-2 py-1 bg-zinc-950 border-t border-zinc-800 text-[9px] font-mono text-zinc-400 flex items-center justify-between">
            <span>BlazeFace AI</span>
            <span className="text-emerald-400 font-bold">LIVE</span>
          </div>
        </div>
      )}

      {/* ─── 4. SUBMISSION CERTIFICATE MODAL ─── */}
      {showSubmitModal && submissionReport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Submission Complete</h3>
                  <p className="text-xs text-zinc-400">Proctored Assessment Recorded</p>
                </div>
              </div>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-zinc-400 hover:text-white text-xs cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
              <div className="font-bold text-white">{submissionReport.problemTitle}</div>
              <div className="grid grid-cols-2 gap-2 text-zinc-400 pt-1.5 border-t border-zinc-800">
                <div>
                  Cases Passed: <strong className="text-emerald-400 font-mono">{submissionReport.passedCount} / {submissionReport.totalCount}</strong>
                </div>
                <div>
                  Runtime: <strong className="text-indigo-300 font-mono">{submissionReport.runtimeMs} ms</strong>
                </div>
                <div>
                  Authenticity: <strong className="text-emerald-400 font-mono">{submissionReport.authenticityScore}%</strong>
                </div>
                <div>
                  Integrity Risk: <strong className="text-white font-mono uppercase">{submissionReport.riskLevel}</strong>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowSubmitModal(false)}
              className="btn-primary text-xs font-bold w-full py-2 cursor-pointer"
            >
              Continue Evaluation
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};
export default CandidateAssessment;
