import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { useAuthStore } from '../lib/authStore';
import { getSocket } from '../lib/socket';
import { initFaceDetector, detectFaces, type FaceDetectionResult } from '../lib/faceDetector';
import { createAudioDetector, type AudioDetectorController, type AudioDetectionEvent } from '../lib/audioDetector';
import { PROBLEMS_BANK, Problem, TestCase } from '../lib/problems';
import {
  Play, CheckCircle2, AlertTriangle, ShieldCheck,
  Send, Clock, ShieldAlert, Sparkles, Terminal,
  Camera, Building2, Check, RotateCcw, Copy, Loader2, Video,
  Maximize2, Scan, AlertCircle, RefreshCw, X, Eye, UserX, Users, LogOut, User,
  Mic, MicOff, Volume2, VolumeX, Radio, Activity, MessageSquareWarning
} from 'lucide-react';

export const CandidateAssessment: React.FC = () => {
  const navigate = useNavigate();
  const { user, role } = useAuthStore();
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSession, setCurrentSession] = useState<any>(null);

  // Problem & Language selection
  const [selectedProblemId, setSelectedProblemId] = useState<string>(PROBLEMS_BANK[0].id);
  const currentProblem: Problem = PROBLEMS_BANK.find((p) => p.id === selectedProblemId) || PROBLEMS_BANK[0];
  const [language, setLanguage] = useState<'typescript' | 'javascript' | 'python'>('typescript');
  const [code, setCode] = useState<string>(currentProblem.starterCode.typescript);

  // Unified Console Output State
  const [isRunningCode, setIsRunningCode] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<TestCase[]>([]);
  const [allPassed, setAllPassed] = useState<boolean | null>(null);
  const [executionStdout, setExecutionStdout] = useState<string>('');

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionReport, setSubmissionReport] = useState<any>(null);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);

  // Proctoring, Webcam & Diagnostic Modal State
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraStatus, setCameraStatus] = useState<'calibrating' | 'face_locked' | 'face_absent' | 'multiple_faces' | 'camera_blocked'>('face_locked');
  const [faceConfidence, setFaceConfidence] = useState<number>(96);
  const [detectedFacesCount, setDetectedFacesCount] = useState<number>(1);
  const [copied, setCopied] = useState<boolean>(false);
  const [showProctorModal, setShowProctorModal] = useState<boolean>(false);
  const [isScanningFace, setIsScanningFace] = useState<boolean>(false);

  // Background Audio Detection
  const audioDetectorRef = useRef<AudioDetectorController | null>(null);

  // Active Violation Banner/Toast State
  const [activeViolation, setActiveViolation] = useState<{ type: string; message: string; details?: string } | null>(null);

  // 45m Countdown Clock
  const [timeRemaining, setTimeRemaining] = useState<number>(45 * 60);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const modalVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastKeyTimeRef = useRef<number>(Date.now());
  const blurStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    setCode(currentProblem.starterCode[language]);
    setTestResults([]);
    setAllPassed(null);
    setExecutionStdout('');
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

  // Find or Create an active assessment session for this candidate
  useEffect(() => {
    const loadSession = async () => {
      try {
        const fetchedSessions = await api.getAssessments();
        setSessions(fetchedSessions);

        const currentCandidateId = user?.studentId || (role === 'student' ? 'STU1001' : null);
        const myActiveSession = fetchedSessions.find((s: any) =>
          s.status === 'in_progress' &&
          (currentCandidateId ? s.student?.studentId === currentCandidateId : true)
        );

        if (myActiveSession) {
          setCurrentSession(myActiveSession);
        } else {
          const newSession = await api.startAssessmentSession({
            assessmentName: 'Technical Coding Sandbox (Live AI Proctored)',
            studentId: currentCandidateId || 'STU1001',
          });
          setCurrentSession(newSession);
        }
      } catch (err) {
        console.error('Error initializing assessment session:', err);
      }
    };

    loadSession();
  }, [user?.studentId, role]);

  // Tab Switching & Window Defocus Telemetry
  useEffect(() => {
    const handleBlur = () => {
      blurStartTimeRef.current = Date.now();
      setActiveViolation({
        type: 'tab_blur',
        message: '⚠️ Focus Lost: Assessment tab was blurred or defocused!',
        details: 'Candidate navigated away from the assessment window. Defocus event logged.',
      });

      if (currentSession?.id) {
        api.sendTelemetryEvent(currentSession.id, {
          eventType: 'tab_blur',
          data: { timestamp: new Date().toISOString() },
        }).catch(console.error);
      }
    };

    const handleFocus = () => {
      const duration = blurStartTimeRef.current ? Math.round((Date.now() - blurStartTimeRef.current) / 1000) : 0;
      blurStartTimeRef.current = null;

      if (currentSession?.id) {
        api.sendTelemetryEvent(currentSession.id, {
          eventType: 'tab_focus',
          data: { duration, timestamp: new Date().toISOString() },
        }).catch(console.error);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleBlur();
      } else {
        handleFocus();
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    initFaceDetector().catch(() => {});
    startWebcam();
    return () => {
      stopWebcam();
    };
  }, []);

  const handleAudioProctorEvent = (event: AudioDetectionEvent) => {
    if (event.type === 'speech_detected') {
      if (currentSession?.id) {
        api.sendTelemetryEvent(currentSession.id, {
          eventType: 'audio_speech_detected',
          data: {
            volumeDb: event.volumeDb,
            duration: event.duration || 1200,
            transcript: event.transcript || '',
            timestamp: new Date().toISOString(),
          },
        }).catch(console.error);
      }
    } else if (event.type === 'noise_spike') {
      if (currentSession?.id) {
        api.sendTelemetryEvent(currentSession.id, {
          eventType: 'audio_noise_spike',
          data: { volumeDb: event.volumeDb, timestamp: new Date().toISOString() },
        }).catch(console.error);
      }
    }
  };

  const startWebcam = async () => {
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 480 }, height: { ideal: 360 }, frameRate: { ideal: 30 } },
          audio: true,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 480 }, height: { ideal: 360 }, frameRate: { ideal: 30 } },
          audio: false,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      if (modalVideoRef.current) {
        modalVideoRef.current.srcObject = stream;
        modalVideoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
      setCameraStatus('face_locked');

      if (stream.getAudioTracks().length > 0) {
        const audioController = createAudioDetector(stream, handleAudioProctorEvent);
        if (audioController) {
          audioDetectorRef.current = audioController;
        }
      }
    } catch (err) {
      console.warn('Webcam start error:', err);
      setCameraActive(false);
    }
  };

  const stopWebcam = () => {
    if (audioDetectorRef.current) {
      audioDetectorRef.current.stop();
      audioDetectorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const performFaceScan = async (): Promise<FaceDetectionResult> => {
    if (!videoRef.current || !canvasRef.current) {
      return { status: 'face_locked', confidence: 96, faceCount: 1, message: 'Webcam ready' };
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video.readyState < 2) return { status: 'face_locked', confidence: 96, faceCount: 1, message: 'Ready' };

      canvas.width = video.videoWidth || 480;
      canvas.height = video.videoHeight || 360;
      const ctx = canvas.getContext('2d');
      if (!ctx) return { status: 'face_locked', confidence: 96, faceCount: 1, message: 'Error' };

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const detection = await detectFaces(video, canvas);
      return detection;
    } catch (err) {
      return { status: 'face_locked', confidence: 92, faceCount: 1, message: 'Scanning' };
    }
  };

  useEffect(() => {
    if (!cameraActive || !currentSession?.id) return;

    const interval = setInterval(async () => {
      const detection = await performFaceScan();
      setFaceConfidence(detection.confidence);
      setDetectedFacesCount(detection.faceCount);
      setCameraStatus(detection.status);

      if (detection.status === 'multiple_faces') {
        setActiveViolation({
          type: 'multiple_faces',
          message: `🚨 Multiple Persons Detected! ${detection.faceCount} faces visible.`,
          details: `The AI proctor detected ${detection.faceCount} people in frame.`,
        });
        
        api.sendTelemetryEvent(currentSession.id, {
          eventType: 'webcam_multiple_faces',
          data: { faceCount: detection.faceCount, timestamp: new Date().toISOString() },
        }).catch(() => {});
      } else if (detection.status === 'face_absent') {
        setActiveViolation({
          type: 'face_absent',
          message: '⚠️ Candidate Face Absent: Please ensure your face is clearly visible.',
          details: 'No face is currently visible. Ensure your camera is unblocked and facing you directly.',
        });

        api.sendTelemetryEvent(currentSession.id, {
          eventType: 'webcam_face_absence',
          data: { faceCount: 0, timestamp: new Date().toISOString() },
        }).catch(() => {});
      } else {
        setActiveViolation((prev) => (prev?.type === 'multiple_faces' || prev?.type === 'face_absent' ? null : prev));
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [cameraActive, currentSession?.id]);

  const handleManualScan = async () => {
    setIsScanningFace(true);
    try {
      const result = await performFaceScan();
      setFaceConfidence(result.confidence);
      setDetectedFacesCount(result.faceCount);
      setCameraStatus(result.status);
    } finally {
      setIsScanningFace(false);
    }
  };

  const handleSimulateMultipleFaces = () => {
    setCameraStatus('multiple_faces');
    setDetectedFacesCount(2);
    setFaceConfidence(98);
    setShowProctorModal(true);
  };

  const handleSimulateFaceAbsent = () => {
    setCameraStatus('face_absent');
    setDetectedFacesCount(0);
    setFaceConfidence(0);
    setShowProctorModal(true);
  };

  const handleResetToNormal = () => {
    setCameraStatus('face_locked');
    setDetectedFacesCount(1);
    setFaceConfidence(96);
    setActiveViolation(null);
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

  const executeCodeSandbox = (userCode: string, testCases: TestCase[]) => {
    const results: TestCase[] = [];
    let stdoutBuffer = '';

    for (const tc of testCases) {
      const startTime = performance.now();
      try {
        const wrappedCode = `
          ${userCode}
          try {
            if (typeof lengthOfLongestSubstring === 'function') return lengthOfLongestSubstring(${tc.input});
            if (typeof lengthOfLIS === 'function') return lengthOfLIS(${tc.input});
            if (typeof trap === 'function') return trap(${tc.input});
            if (typeof minWindow === 'function') return minWindow(${tc.input});
            if (typeof solve === 'function') return solve(${tc.input});
            throw new Error('Solution function not found.');
          } catch(e) { throw e; }
        `;

        const runner = new Function(wrappedCode);
        const actualVal = runner();
        const endTime = performance.now();
        const runtimeMs = Math.round((endTime - startTime) * 100) / 100;

        const actualStr = JSON.stringify(actualVal);
        const expectedNormalized = tc.expectedOutput.replace(/\s+/g, '');
        const actualNormalized = actualStr.replace(/\s+/g, '');
        const passed = expectedNormalized === actualNormalized || String(actualVal) === tc.expectedOutput;

        results.push({ ...tc, actualOutput: actualStr, passed, runtimeMs: Math.max(runtimeMs, 0.1) });
        stdoutBuffer += `Case ${tc.id}: ${passed ? 'PASSED' : 'FAILED'}\n`;
      } catch (err: any) {
        const endTime = performance.now();
        results.push({ ...tc, actualOutput: `Error: ${err.message}`, passed: false, runtimeMs: Math.round((endTime - startTime) * 100) / 100 });
        stdoutBuffer += `Case ${tc.id}: Runtime Error - ${err.message}\n`;
      }
    }

    return { results, allPassed: results.every((r) => r.passed), stdout: stdoutBuffer };
  };

  const handleRunCode = () => {
    setIsRunningCode(true);
    setTimeout(() => {
      const execution = executeCodeSandbox(code, currentProblem.testCases.filter((tc) => !tc.hidden));
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
      const res = await api.submitAssessment(currentSession.id, {
        problemId: currentProblem.id,
        passedCount,
        allPassed: execution.allPassed,
        code,
      });

      setSubmissionReport({
        problemTitle: currentProblem.title,
        passedCount,
        totalCount: execution.results.length,
        allPassed: execution.allPassed,
        authenticityScore: res.authenticityScore ?? 96,
        riskLevel: res.riskLevel || 'normal',
      });
      setShowSubmitModal(true);
    } catch (err: any) {
      alert('Failed to submit: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden select-none">
      <canvas ref={canvasRef} className="hidden" />

      {/* Toolbar */}
      <div className="h-12 border-b border-zinc-800 bg-zinc-900/95 px-4 flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 pr-2 border-r border-zinc-800">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-xs text-white">TM</div>
            <span className="font-bold text-xs hidden md:inline">TalentMatrix <span className="text-purple-400">IDE</span></span>
          </div>
          <select value={selectedProblemId} onChange={(e) => setSelectedProblemId(e.target.value)} className="bg-zinc-800 border border-zinc-700 text-xs rounded-lg px-2 py-1.5 focus:outline-none">
            {PROBLEMS_BANK.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <select value={language} onChange={(e: any) => setLanguage(e.target.value)} className="bg-zinc-800 border border-zinc-700 text-xs rounded-lg px-2 py-1.5">
            <option value="typescript">TypeScript</option>
            <option value="javascript">JavaScript</option>
            <option value="python">Python 3</option>
          </select>
          <button onClick={handleRunCode} disabled={isRunningCode} className="bg-zinc-800 hover:bg-zinc-700 text-xs font-bold px-3 py-1.5 rounded-lg border flex items-center gap-1.5">
            {isRunningCode ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current text-emerald-400" />}
            <span>Run</span>
          </button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-500 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>Submit</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowProctorModal(true)} className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${cameraStatus === 'multiple_faces' ? 'bg-rose-500/20 text-rose-300' : 'bg-zinc-800'}`}>
            <Video className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Camera</span>
          </button>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-mono font-bold">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{formatTime(timeRemaining)}</span>
          </div>
        </div>
      </div>

      {activeViolation && (
        <div className="bg-rose-600 text-white text-xs font-bold px-4 py-2 flex items-center justify-between shadow-lg z-40 border-b border-rose-500">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{activeViolation.message}</span>
          </div>
          <button onClick={() => setActiveViolation(null)} className="text-white underline text-xs">Dismiss</button>
        </div>
      )}

      {/* Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        <div className="lg:col-span-5 border-r border-zinc-800 overflow-y-auto p-4 space-y-4">
          <h1 className="text-lg font-bold">{currentProblem.title}</h1>
          <p className="text-zinc-300 text-xs leading-relaxed">{currentProblem.description}</p>
          
          <div className="pt-3 border-t border-zinc-800">
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-cyan-400 uppercase tracking-wider">LIVE VIDEO PROCTORING FEED</span>
                <button onClick={() => (cameraActive ? stopWebcam() : startWebcam())} className="text-xs text-indigo-400 underline">{cameraActive ? 'Turn Off' : 'Turn On'}</button>
              </div>
              <div className="relative rounded-xl overflow-hidden bg-black border border-zinc-700 h-40">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className={`absolute inset-2.5 rounded-lg border-2 ${cameraStatus === 'multiple_faces' ? 'border-rose-500 animate-pulse' : 'border-emerald-400/80'}`} />
              </div>
              <div className="grid grid-cols-12 gap-2 pt-1">
                <button onClick={handleManualScan} disabled={isScanningFace} className="col-span-7 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-extrabold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer">
                  {isScanningFace ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scan className="w-3.5 h-3.5" />}
                  <span>Scan Face Live</span>
                </button>
                <button onClick={handleSimulateMultipleFaces} className="col-span-5 bg-zinc-800 text-amber-400 text-[11px] font-bold py-2 px-2 rounded-lg truncate cursor-pointer">
                  Demo Violation
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col bg-zinc-950">
          <div className="h-9 px-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
            <span className="text-xs font-mono font-bold text-zinc-300">solution.{language === 'python' ? 'py' : 'js'}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setCode(currentProblem.starterCode[language])} className="p-1"><RotateCcw className="w-3.5 h-3.5" /></button>
            </div>
          </div>
          <div className="flex-1 p-4 bg-zinc-950">
            <textarea value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={handleKeyDown} className="w-full h-full bg-transparent text-zinc-100 font-mono text-xs resize-none focus:outline-none" spellCheck={false} />
          </div>
          <div className="h-44 border-t border-zinc-800 bg-zinc-900/70 p-3 text-xs font-mono">
            {testResults.length === 0 ? <div className="text-zinc-500">Ready to evaluate.</div> : 
             <div className="space-y-1">{testResults.map((tr, i) => <div key={i} className={tr.passed ? 'text-emerald-400' : 'text-rose-400'}>Case {tr.id}: {tr.passed ? 'PASSED' : 'FAILED'}</div>)}</div>}
          </div>
        </div>
      </div>

      {/* Proctor Modal */}
      {showProctorModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-zinc-800">
                  {cameraStatus === 'multiple_faces' ? <Users className="w-5 h-5 text-rose-400" /> : <Camera className="w-5 h-5 text-emerald-400" />}
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Camera & AI Proctor Diagnostic</h3>
                </div>
              </div>
              <button onClick={() => setShowProctorModal(false)} className="text-zinc-400 cursor-pointer">✕</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-6 bg-black rounded-xl border border-zinc-700 h-48 flex items-center justify-center">
                 <video ref={(el) => { if (el && streamRef.current) el.srcObject = streamRef.current; }} autoPlay playsInline muted className="w-full h-full object-cover" />
              </div>
              <div className="md:col-span-6 space-y-3">
                 <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                      <span className="text-zinc-500 block">Faces:</span>
                      <strong className="text-white text-sm">{detectedFacesCount}</strong>
                    </div>
                    <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                      <span className="text-zinc-500 block">Confidence:</span>
                      <strong className="text-emerald-400 text-sm">{faceConfidence}%</strong>
                    </div>
                 </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleResetToNormal} className="bg-emerald-900/40 text-emerald-300 px-3 py-2 rounded-lg text-xs font-bold">Reset to Normal</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Submission Modal */}
      {showSubmitModal && submissionReport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-bold">Submission Complete</h3>
            <p className="text-xs text-zinc-400">Passed: {submissionReport.passedCount} / {submissionReport.totalCount}</p>
            <button onClick={() => setShowSubmitModal(false)} className="bg-indigo-600 text-xs font-bold w-full py-2 rounded-lg">Done</button>
          </motion.div>
        </div>
      )}
    </div>
  );
};
export default CandidateAssessment;
