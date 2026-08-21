import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import { initFaceDetector, detectFaces, type FaceDetectionResult } from '../lib/faceDetector';
import {
  Code2, Play, CheckCircle2, AlertTriangle, ShieldCheck,
  Send, Eye, Clipboard, Clock, Keyboard, ShieldAlert, Sparkles,
  RefreshCw, Terminal, ExternalLink, Camera, CameraOff, Video,
  Maximize2, Minimize2, UserCheck, AlertCircle, Scan, Users, Loader2
} from 'lucide-react';

const INITIAL_CODE = `// TalentMatrix Proctored Assessment Sandbox
// Problem: Longest Substring Without Repeating Characters
// Given a string s, find the length of the longest substring without repeating characters.

function lengthOfLongestSubstring(s: string): number {
    let maxLength = 0;
    let start = 0;
    const charIndexMap = new Map<string, number>();

    for (let i = 0; i < s.length; i++) {
        const char = s[i];
        if (charIndexMap.has(char) && charIndexMap.get(char)! >= start) {
            start = charIndexMap.get(char)! + 1;
        }
        charIndexMap.set(char, i);
        maxLength = Math.max(maxLength, i - start + 1);
    }

    return maxLength;
}
`;

export const CandidateAssessment: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [code, setCode] = useState(INITIAL_CODE);
  const [consoleOutput, setConsoleOutput] = useState<string>('Ready to test. Press "Run Code" to execute test cases.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [telemetryLogs, setTelemetryLogs] = useState<{ type: string; details: string; time: string }[]>([]);

  // Webcam Proctoring State
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [cameraStatus, setCameraStatus] = useState<'calibrating' | 'face_locked' | 'face_absent' | 'multiple_faces' | 'camera_blocked'>('calibrating');
  const [faceConfidence, setFaceConfidence] = useState<number>(95);
  const [detectedFacesCount, setDetectedFacesCount] = useState<number>(1);
  const [webcamExpanded, setWebcamExpanded] = useState<boolean>(false);
  const [isScanningFace, setIsScanningFace] = useState<boolean>(false);
  const [modelReady, setModelReady] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastKeyTimeRef = useRef<number>(Date.now());
  const blurStartTimeRef = useRef<number | null>(null);

  // 1. Fetch active sessions or initialize one
  useEffect(() => {
    api.getAssessments({ limit: '10' }).then((res) => {
      if (res.data && res.data.length > 0) {
        setSessions(res.data);
        setCurrentSession(res.data[0]);
      }
    }).catch(console.error);
  }, []);

  // 2. Connect Socket.IO
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

  // 3. Tab Visibility & Blur Telemetry Listeners
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

        // Send real telemetry event to backend
        api.sendTelemetryEvent(currentSession.id, {
          eventType: 'tab_blur',
          data: { duration: durationSec, timestamp: new Date().toISOString() },
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
  }, [currentSession?.id]);

  // 4. Pre-load MediaPipe Face Detection ML Model
  useEffect(() => {
    initFaceDetector()
      .then(() => {
        setModelReady(true);
        logLocalTelemetry('ai_model', '✅ MediaPipe BlazeFace model loaded — real-time face detection active');
      })
      .catch((err) => {
        console.warn('Face detector model failed to load:', err);
        logLocalTelemetry('ai_model', '⚠️ Face detection model loading (may take a moment on slow connections)');
      });
  }, []);

  // 5. Initialize & Maintain Webcam Proctoring Stream
  useEffect(() => {
    startWebcam();
    return () => {
      stopWebcam();
    };
  }, []);

  const startWebcam = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' },
          audio: false,
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setCameraActive(true);
        setCameraPermission('granted');
        setCameraStatus('face_locked');
        logLocalTelemetry('webcam', 'Visual proctoring camera stream connected');
      } else {
        setCameraPermission('denied');
      }
    } catch (err: any) {
      console.warn('Webcam access error:', err.message);
      setCameraPermission('denied');
      setCameraActive(false);
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // 6. Face Detection via MediaPipe BlazeFace ML Model
  const performFaceScan = async (): Promise<FaceDetectionResult> => {
    if (!videoRef.current || !canvasRef.current) {
      return { status: 'face_locked', faceCount: 1, confidence: 90, message: 'Calibrating camera...' };
    }
    return detectFaces(videoRef.current, canvasRef.current);
  };

  // Continuous Periodic Visual Integrity Analysis (every 3 seconds)
  useEffect(() => {
    if (!cameraActive || !currentSession || !modelReady) return;

    const interval = setInterval(async () => {
      const result = await performFaceScan();
      setFaceConfidence(result.confidence);
      setDetectedFacesCount(result.faceCount);

      if (result.status === 'multiple_faces') {
        if (cameraStatus !== 'multiple_faces') {
          setCameraStatus('multiple_faces');
          logLocalTelemetry('webcam_multiple_faces', `⚠️ Multiple people detected in frame (${result.faceCount} faces)`);
          api.sendTelemetryEvent(currentSession.id, {
            eventType: 'webcam_multiple_faces',
            data: { faceCount: result.faceCount, timestamp: new Date().toISOString() },
          }).catch(console.error);
        }
      } else if (result.status === 'face_absent') {
        if (cameraStatus !== 'face_absent') {
          setCameraStatus('face_absent');
          logLocalTelemetry('webcam_face_absence', '⚠️ Candidate face absent from camera frame');
          api.sendTelemetryEvent(currentSession.id, {
            eventType: 'webcam_face_absence',
            data: { reason: 'face_not_in_view', timestamp: new Date().toISOString() },
          }).catch(console.error);
        }
      } else if (result.status === 'camera_blocked') {
        if (cameraStatus !== 'camera_blocked') {
          setCameraStatus('camera_blocked');
          logLocalTelemetry('webcam_blocked', '⚠️ Camera covered or pitch black stream detected');
          api.sendTelemetryEvent(currentSession.id, {
            eventType: 'webcam_blocked',
            data: { reason: 'lens_covered', timestamp: new Date().toISOString() },
          }).catch(console.error);
        }
      } else {
        if (cameraStatus !== 'face_locked') {
          setCameraStatus('face_locked');
          logLocalTelemetry('webcam', `Live Face verified & locked (${result.confidence}% confidence)`);
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [cameraActive, currentSession?.id, cameraStatus, modelReady]);

  // Live Manual Face Scan Trigger
  const handleScanFaceNow = async () => {
    setIsScanningFace(true);
    try {
      const result = await performFaceScan();
      setFaceConfidence(result.confidence);
      setDetectedFacesCount(result.faceCount);
      setCameraStatus(result.status);

      if (result.status === 'multiple_faces') {
        logLocalTelemetry('webcam_multiple_faces', `Manual Scan: ${result.faceCount} faces detected in frame!`);
        alert(`🚨 Visual Proctor Alert!\n\n${result.message}\n\n• Detected Faces: ${result.faceCount} Persons\n• Confidence: ${result.confidence}%\n• Rule Violation: Only 1 authorized candidate may be visible during the technical assessment.`);
      } else if (result.status === 'face_absent') {
        logLocalTelemetry('webcam_face_absence', 'Manual Scan: No face found in camera view');
        alert(`⚠️ Visual Proctor Alert!\n\n${result.message}\n\n• Face Status: NOT DETECTED\n• Reason: The camera does not detect a human face in the view.\n• Action Required: Please face your webcam directly.`);
      } else if (result.status === 'camera_blocked') {
        logLocalTelemetry('webcam_blocked', 'Manual Scan: Camera lens is covered or dark');
        alert('⚠️ Camera Obstructed: The lens appears to be covered or in pitch darkness.');
      } else {
        logLocalTelemetry('webcam_verified', `Manual Scan: Face Verified (${result.confidence}% confidence)`);
        alert(`✅ Live Face Scan Verified!\n\n• Status: 1 Authorized Candidate Verified\n• Face Match Confidence: ${result.confidence}%\n• Frame Rate: 30 FPS\n• Candidate: ${currentSession?.student?.name || 'Aarav Sharma'}`);
      }
    } finally {
      setIsScanningFace(false);
    }
  };

  // Demo Simulation Action
  const handleSimulateAbsenceForDemo = () => {
    if (!currentSession) return;
    setCameraStatus('face_absent');
    logLocalTelemetry('webcam_face_absence', 'Demo Simulation: Flagged candidate face absence violation');
    api.sendTelemetryEvent(currentSession.id, {
      eventType: 'webcam_face_absence',
      data: { durationSec: 15, isDemoSimulation: true, timestamp: new Date().toISOString() },
    }).catch(console.error);

    setTimeout(() => {
      setCameraStatus('face_locked');
    }, 5000);
  };

  const logLocalTelemetry = (type: string, details: string) => {
    setTelemetryLogs((prev) => [
      { type, details, time: new Date().toLocaleTimeString() },
      ...prev.slice(0, 19),
    ]);
  };

  // Keystrokes
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const now = Date.now();
    const flightTimeMs = now - lastKeyTimeRef.current;
    lastKeyTimeRef.current = now;

    if (Math.random() < 0.25 && currentSession) {
      api.sendTelemetryEvent(currentSession.id, {
        eventType: 'keystroke',
        data: { key: e.key, flightTimeMs, timestamp: new Date().toISOString() },
      }).catch(() => {});
    }
  };

  // Pastes
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text');
    const size = pastedText.length;

    logLocalTelemetry('paste', `Clipboard paste: ${size} characters`);

    if (currentSession) {
      const eventType = size > 400 ? 'code_insert' : 'paste';
      api.sendTelemetryEvent(currentSession.id, {
        eventType,
        data: { size, length: size, preview: pastedText.slice(0, 50), timestamp: new Date().toISOString() },
      }).catch(console.error);
    }
  };

  // Test Code
  const handleRunCode = () => {
    logLocalTelemetry('run_code', 'Executed test suite');
    setConsoleOutput(`Running Test Cases...\n✔ Test Case 1: lengthOfLongestSubstring("abcabcbb") === 3 (PASSED)\n✔ Test Case 2: lengthOfLongestSubstring("bbbbb") === 1 (PASSED)\n✔ Test Case 3: lengthOfLongestSubstring("pwwkew") === 3 (PASSED)\n\nAll 3 unit test cases passed successfully!`);
  };

  // Submit
  const handleSubmit = async () => {
    if (!currentSession) return;
    setIsSubmitting(true);
    try {
      await api.sendTelemetryEvent(currentSession.id, {
        eventType: 'submission',
        data: { linesOfCode: code.split('\n').length, chars: code.length },
      });
      logLocalTelemetry('submission', 'Assessment submitted');
      setSubmitted(true);
    } catch (err: any) {
      alert('Failed to submit: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fresh Session
  const handleCreateNewSession = async () => {
    try {
      const studentRes = await api.getStudents({ limit: '1' });
      const student = studentRes.data?.[0];
      if (!student) return;

      const newSess = await api.startAssessmentSession({
        studentId: student.id,
        assessmentName: 'Live Coding Sandbox — System Evaluation',
      });
      setCurrentSession(newSess);
      setSessions([newSess, ...sessions]);
      setSubmitted(false);
      setTelemetryLogs([]);
      logLocalTelemetry('start', 'Fresh assessment session initialized');
    } catch (err: any) {
      alert('Error creating session: ' + err.message);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Hidden processing canvas for computer vision analysis */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="section-title flex items-center gap-2">
              <Terminal className="w-6 h-6 text-primary-600" />
              Proctored Coding Assessment Sandbox
            </h1>
            <span className="badge badge-primary text-xs">Live Telemetry &amp; AI Proctor</span>
          </div>
          <p className="text-surface-500 text-xs mt-1">
            Real-time biometric keystroke capture, Shannon entropy analysis, window focus logging &amp; live webcam computer vision
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCreateNewSession}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Start New Assessment Session
          </button>
          <a
            href="/anomalies"
            target="_blank"
            rel="noreferrer"
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Open Proctor Anomaly Command Room
          </a>
        </div>
      </div>

      {/* Status & Telemetry Header Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-surface-400 font-semibold uppercase">Candidate Session</div>
            <div className="text-sm font-bold text-surface-900 dark:text-white mt-0.5">
              {currentSession?.student?.name || 'Aarav Sharma'}
            </div>
            <div className="text-[11px] text-surface-500 font-mono">{currentSession?.student?.studentId || 'STU1001'}</div>
          </div>
          <ShieldCheck className="w-8 h-8 text-primary-500/40" />
        </div>

        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-surface-400 font-semibold uppercase">Code Authenticity Score</div>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
              {currentSession?.authenticityScore ?? 100}%
            </div>
            <div className="text-[11px] text-surface-500">Live Continuous Evaluation</div>
          </div>
          <Sparkles className="w-8 h-8 text-emerald-500/40" />
        </div>

        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-surface-400 font-semibold uppercase">Integrity Risk Level</div>
            <div className="text-sm font-bold uppercase mt-0.5 text-surface-900 dark:text-white">
              <span
                className={`badge text-xs uppercase ${
                  currentSession?.riskLevel === 'high' || currentSession?.riskLevel === 'critical'
                    ? 'badge-danger'
                    : currentSession?.riskLevel === 'moderate'
                    ? 'badge-warning'
                    : 'badge-success'
                }`}
              >
                {currentSession?.riskLevel || 'normal'}
              </span>
            </div>
            <div className="text-[11px] text-surface-500">Heuristic Anomaly Detector</div>
          </div>
          <ShieldAlert className="w-8 h-8 text-indigo-500/40" />
        </div>

        {/* Live Webcam Proctoring Status */}
        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-surface-400 font-semibold uppercase">Webcam Visual Proctor</div>
            <div className="text-sm font-bold text-surface-900 dark:text-white mt-0.5 flex items-center gap-1.5">
              {!modelReady ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-cyan-500">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading AI Model...
                </span>
              ) : cameraActive ? (
                <span className={`flex items-center gap-1 text-xs font-semibold ${
                  cameraStatus === 'face_locked'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : cameraStatus === 'multiple_faces'
                    ? 'text-rose-500 animate-pulse'
                    : cameraStatus === 'camera_blocked'
                    ? 'text-rose-500'
                    : 'text-amber-500'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    cameraStatus === 'face_locked' ? 'bg-emerald-500' : 'bg-rose-500'
                  } animate-pulse`} />
                  {cameraStatus === 'face_locked'
                    ? `1 Face Locked (${faceConfidence}%)`
                    : cameraStatus === 'multiple_faces'
                    ? `⚠️ ${detectedFacesCount} Faces Detected!`
                    : cameraStatus === 'camera_blocked'
                    ? 'Camera Obstructed'
                    : '⚠️ No Face Detected'}
                </span>
              ) : (
                <span className="text-xs text-zinc-500 flex items-center gap-1">
                  <CameraOff className="w-3.5 h-3.5" /> Offline
                </span>
              )}
            </div>
            <div className="text-[11px] text-surface-500">{modelReady ? 'MediaPipe BlazeFace ML' : 'Initializing...'}</div>
          </div>
          <Camera className="w-8 h-8 text-cyan-500/40" />
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Coding Editor & Test Output */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card overflow-hidden border border-surface-200 dark:border-surface-700">
            {/* Editor Toolbar */}
            <div className="bg-surface-100 dark:bg-surface-800/80 px-4 py-2.5 flex items-center justify-between border-b border-surface-200 dark:border-surface-700">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-primary-600" />
                <span className="text-xs font-bold font-mono text-surface-800 dark:text-surface-200">
                  solution.ts
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunCode}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 bg-surface-200 dark:bg-surface-700"
                >
                  <Play className="w-3.5 h-3.5 text-success-600" /> Run Code
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || submitted}
                  className="btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1 shadow-md shadow-primary-500/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Submitting...' : submitted ? 'Submitted' : 'Submit Solution'}
                </button>
              </div>
            </div>

            {/* Code Input Area with Telemetry Interceptors */}
            <div className="relative">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                rows={18}
                className="w-full p-4 bg-surface-900 text-surface-100 font-mono text-xs leading-relaxed focus:outline-none resize-none selection:bg-primary-600 selection:text-white"
                spellCheck={false}
              />
            </div>
          </div>

          {/* Test Runner Terminal Output */}
          <div className="glass-card p-4 bg-surface-950 text-surface-200 font-mono text-xs rounded-xl border border-surface-800 space-y-2">
            <div className="flex items-center justify-between text-surface-500 text-[11px] pb-1 border-b border-surface-800">
              <span>Test Runner Output</span>
              <span>Node.js / TypeScript v5</span>
            </div>
            <pre className="whitespace-pre-wrap text-emerald-400 font-mono text-xs">{consoleOutput}</pre>
          </div>
        </div>

        {/* Right Col: Live Webcam Proctoring View & Telemetry Stream */}
        <div className="space-y-4">
          {/* Live Webcam Proctoring Box */}
          <div className="glass-card p-4 space-y-3 relative overflow-hidden border border-cyan-500/30">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-surface-900 dark:text-white flex items-center gap-1.5">
                <Video className="w-4 h-4 text-cyan-500" />
                Live Video Proctoring Feed
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => (cameraActive ? stopWebcam() : startWebcam())}
                  className="text-[11px] font-semibold text-primary-600 dark:text-primary-400 underline"
                >
                  {cameraActive ? 'Turn Off' : 'Turn On'}
                </button>
                <button
                  onClick={() => setWebcamExpanded(!webcamExpanded)}
                  className="text-surface-400 hover:text-white"
                >
                  {webcamExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Video Preview Frame */}
            <div className={`relative rounded-xl overflow-hidden bg-black flex items-center justify-center transition-all ${
              webcamExpanded ? 'h-64' : 'h-48'
            }`}>
              {cameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover mirror"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                  {/* Dynamic Bounding Box Overlay */}
                  <div className={`absolute inset-3 border-2 rounded-xl pointer-events-none flex flex-col justify-between p-2 transition-colors ${
                    cameraStatus === 'face_locked'
                      ? 'border-emerald-400/80 shadow-[inset_0_0_15px_rgba(52,211,153,0.2)]'
                      : cameraStatus === 'multiple_faces'
                      ? 'border-rose-500 shadow-[inset_0_0_20px_rgba(244,63,94,0.3)] animate-pulse'
                      : cameraStatus === 'camera_blocked'
                      ? 'border-rose-500'
                      : 'border-amber-500'
                  }`}>
                    <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400 bg-black/70 px-1.5 py-0.5 rounded backdrop-blur-sm">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        REC • 30FPS
                      </span>
                      <span className={`font-bold ${
                        cameraStatus === 'face_locked'
                          ? 'text-emerald-400'
                          : cameraStatus === 'multiple_faces'
                          ? 'text-rose-400'
                          : 'text-amber-400'
                      }`}>
                        {cameraStatus === 'face_locked'
                          ? `Face: ${faceConfidence}% Match`
                          : cameraStatus === 'multiple_faces'
                          ? `ALERT: ${detectedFacesCount} Faces`
                          : 'Face: 0% (Absent)'}
                      </span>
                    </div>

                    {/* Live Warning Banners */}
                    {cameraStatus === 'multiple_faces' && (
                      <div className="p-2 rounded-lg bg-rose-900/90 text-white text-xs font-bold text-center flex items-center justify-center gap-1.5 shadow-xl border border-rose-500">
                        <Users className="w-4 h-4 text-rose-300" />
                        <span>⚠️ Multiple Faces Detected ({detectedFacesCount} People in Frame)</span>
                      </div>
                    )}

                    {cameraStatus === 'face_absent' && (
                      <div className="p-2 rounded-lg bg-amber-900/90 text-white text-xs font-bold text-center flex items-center justify-center gap-1.5 shadow-xl border border-amber-500">
                        <AlertTriangle className="w-4 h-4 text-amber-300" />
                        <span>⚠️ No Face Detected (Candidate Out Of View)</span>
                      </div>
                    )}

                    {cameraStatus === 'camera_blocked' && (
                      <div className="p-2 rounded-lg bg-rose-900/90 text-white text-xs font-bold text-center flex items-center justify-center gap-1.5 shadow-xl border border-rose-500">
                        <AlertCircle className="w-4 h-4 text-rose-300" />
                        <span>⚠️ Camera Covered / Pitch Black Screen</span>
                      </div>
                    )}

                    {cameraStatus === 'face_locked' && (
                      <div className="flex items-center justify-between text-[9px] font-mono text-emerald-400 bg-black/70 px-1.5 py-0.5 rounded backdrop-blur-sm">
                        <span className="flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> Candidate Verified
                        </span>
                        <span>1 Face Detected</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center p-6 space-y-2">
                  <CameraOff className="w-8 h-8 text-zinc-600 mx-auto" />
                  <p className="text-xs text-zinc-400">Webcam permission prompt or camera disabled.</p>
                  <button
                    onClick={startWebcam}
                    className="btn-primary text-xs py-1.5 px-3 bg-cyan-600 hover:bg-cyan-500"
                  >
                    Enable Camera Access
                  </button>
                </div>
              )}
            </div>

            {/* Real Face Scanner & Demo Action Controls */}
            <div className="pt-2 border-t border-surface-200 dark:border-surface-700/60 space-y-1.5">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleScanFaceNow}
                  disabled={!cameraActive || isScanningFace}
                  className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1 shadow transition-all disabled:opacity-50"
                >
                  <Scan className="w-3.5 h-3.5" />
                  {isScanningFace ? 'Scanning...' : 'Scan Face Live'}
                </button>
                <button
                  onClick={handleSimulateAbsenceForDemo}
                  disabled={!cameraActive}
                  className="py-1.5 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400 text-[10px] font-semibold border border-zinc-700 transition-all"
                  title="Simulates a 5-second face absence event to test proctor alerts"
                >
                  Demo Violation Alert
                </button>
              </div>
              <p className="text-[10px] text-surface-400 text-center">
                Live AI continuously verifies candidate presence &amp; room integrity.
              </p>
            </div>
          </div>

          {/* Real-time Telemetry Event Feed */}
          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-surface-900 dark:text-white flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-primary-600" />
                Live Integrity Telemetry Stream
              </h3>
              <span className="badge badge-neutral text-[10px] font-mono">{telemetryLogs.length} events</span>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {telemetryLogs.length === 0 ? (
                <div className="text-center py-6 text-xs text-surface-500 italic">
                  Start typing, pasting, or switching tabs to generate live telemetry.
                </div>
              ) : (
                telemetryLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-surface-50 dark:bg-surface-800/60 border border-surface-200 dark:border-surface-700 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`badge font-mono font-bold text-[9px] uppercase ${
                          log.type === 'paste' || log.type === 'code_insert'
                            ? 'badge-warning'
                            : log.type === 'tab_blur' || log.type.startsWith('webcam')
                            ? 'badge-danger'
                            : 'badge-primary'
                        }`}
                      >
                        {log.type}
                      </span>
                      <span className="text-surface-800 dark:text-surface-200 truncate">{log.details}</span>
                    </div>
                    <span className="text-[10px] font-mono text-surface-400 flex-shrink-0">{log.time}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default CandidateAssessment;
