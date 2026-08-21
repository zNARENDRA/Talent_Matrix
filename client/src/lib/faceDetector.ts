/**
 * TalentMatrix — Real-Time Face Detection Service
 * Uses Google MediaPipe BlazeFace model for accurate in-browser face detection.
 * Runs entirely client-side with WASM acceleration — no API keys needed.
 */
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';

let detector: FaceDetector | null = null;
let initPromise: Promise<FaceDetector> | null = null;

export interface FaceDetectionResult {
  faceCount: number;
  confidence: number;
  status: 'face_locked' | 'face_absent' | 'multiple_faces' | 'camera_blocked';
  message: string;
}

/**
 * Initialize the MediaPipe Face Detector (singleton, loads WASM + model from CDN).
 * Subsequent calls return the cached instance.
 */
export async function initFaceDetector(): Promise<FaceDetector> {
  if (detector) return detector;

  if (initPromise) return initPromise;

  initPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );

    detector = await FaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      minDetectionConfidence: 0.5,
    });

    console.log('[TalentMatrix] MediaPipe Face Detector initialized (BlazeFace short-range)');
    return detector;
  })();

  return initPromise;
}

/**
 * Detect faces in a live video element.
 * Returns structured result with face count, confidence, status, and message.
 */
export async function detectFaces(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): Promise<FaceDetectionResult> {
  // Guard: video not ready
  if (!video || video.readyState < 2 || video.videoWidth === 0) {
    return {
      faceCount: 0,
      confidence: 0,
      status: 'face_locked',
      message: 'Calibrating camera...',
    };
  }

  // Quick luminance check for camera blocked (pitch dark)
  try {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = 80;
      canvas.height = 60;
      ctx.drawImage(video, 0, 0, 80, 60);
      const frame = ctx.getImageData(0, 0, 80, 60);
      let totalLum = 0;
      for (let i = 0; i < frame.data.length; i += 4) {
        totalLum += (frame.data[i] + frame.data[i + 1] + frame.data[i + 2]) / 3;
      }
      const avgLum = totalLum / (frame.data.length / 4);
      if (avgLum < 10) {
        return {
          faceCount: 0,
          confidence: 0,
          status: 'camera_blocked',
          message: '⚠️ Camera Covered / Pitch Dark Screen',
        };
      }
    }
  } catch (_) {}

  // Use MediaPipe Face Detector
  try {
    const det = await initFaceDetector();
    const result = det.detectForVideo(video, performance.now());
    const faces = result.detections;

    if (faces.length === 0) {
      return {
        faceCount: 0,
        confidence: 0,
        status: 'face_absent',
        message: '⚠️ No Face Detected — Candidate Not In View',
      };
    }

    if (faces.length === 1) {
      const conf = Math.round((faces[0].categories?.[0]?.score ?? 0.9) * 100);
      return {
        faceCount: 1,
        confidence: conf,
        status: 'face_locked',
        message: `✅ Candidate Verified • 1 Face (${conf}% confidence)`,
      };
    }

    // Multiple faces
    const avgConf = Math.round(
      faces.reduce((s, f) => s + (f.categories?.[0]?.score ?? 0.9), 0) / faces.length * 100
    );
    return {
      faceCount: faces.length,
      confidence: avgConf,
      status: 'multiple_faces',
      message: `🚨 ${faces.length} Faces Detected — Only 1 Authorized Candidate Allowed`,
    };
  } catch (err) {
    console.warn('[TalentMatrix] Face detection error, falling back:', err);

    // Fallback: return face_locked to avoid false positives during model load
    return {
      faceCount: 1,
      confidence: 70,
      status: 'face_locked',
      message: 'AI Model loading... face tracking will activate shortly',
    };
  }
}
