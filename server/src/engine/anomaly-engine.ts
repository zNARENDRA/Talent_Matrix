import { calculateShannonEntropy } from './entropy.js';

/**
 * TalentMatrix Anomaly Detection Engine (with Shannon Entropy Analysis)
 * 
 * Rules-based scoring system for coding assessment integrity.
 * Features:
 * - Keystroke flight-time latency
 * - Paste frequency and byte payload size
 * - Tab blur and window defocus duration
 * - Mathematical Shannon Code Entropy calculation: H = -∑ p_i * log2(p_i)
 * - Real-time Code Authenticity Score (0-100)
 */

export interface TelemetryEventData {
  id: string;
  sessionId: string;
  eventType: string; // keystroke, paste, tab_blur, tab_focus, code_insert, submission, idle
  timestamp: Date;
  data: Record<string, any>;
}

export interface SignalResult {
  signal: string;
  value: number;
  weight: number;
  riskContribution: number;
  description: string;
}

export interface AnomalyResult {
  sessionId: string;
  authenticityScore: number; // 0-100 (100 = clean)
  riskLevel: 'normal' | 'low' | 'moderate' | 'high' | 'critical';
  signals: SignalResult[];
  alerts: {
    severity: string;
    description: string;
    signals: string[];
    score: number;
  }[];
  entropyAnalysis?: {
    maxEntropy: number;
    isAnomalous: boolean;
    classification: string;
  };
}

// ─── Signal Weights (Configurable) ─────────────────────────────
export const DEFAULT_SIGNAL_WEIGHTS: Record<string, { weight: number; thresholds: Record<string, number> }> = {
  paste_frequency: {
    weight: 1.0,
    thresholds: { low: 3, medium: 6, high: 10 },
  },
  paste_size: {
    weight: 1.2,
    thresholds: { low: 100, medium: 300, high: 500 },
  },
  tab_blur_count: {
    weight: 0.8,
    thresholds: { low: 3, medium: 7, high: 12 },
  },
  tab_blur_duration: {
    weight: 1.0,
    thresholds: { low: 30, medium: 60, high: 120 }, // seconds
  },
  large_insertion: {
    weight: 1.5,
    thresholds: { low: 200, medium: 400, high: 600 }, // characters
  },
  code_entropy_anomaly: {
    weight: 1.3,
    thresholds: { low: 1, medium: 2, high: 3 }, // count of high-entropy insertions (>5.1 bits/char)
  },
  typing_speed_anomaly: {
    weight: 0.7,
    thresholds: { low: 150, medium: 200, high: 300 }, // chars per minute
  },
  idle_periods: {
    weight: 0.5,
    thresholds: { low: 2, medium: 4, high: 6 },
  },
  webcam_face_absence: {
    weight: 1.4,
    thresholds: { low: 1, medium: 3, high: 6 }, // occurrences where face is missing from camera frame
  },
  webcam_blocked: {
    weight: 1.6,
    thresholds: { low: 1, medium: 2, high: 4 }, // camera covered or pitch black stream
  },
  webcam_multiple_faces: {
    weight: 1.5,
    thresholds: { low: 1, medium: 2, high: 4 }, // multiple persons detected in frame
  },
};

// ─── Telemetry Processor ───────────────────────────────────────
export class TelemetryProcessor {
  normalize(events: TelemetryEventData[]): TelemetryEventData[] {
    return events
      .map((e) => ({
        ...e,
        timestamp: new Date(e.timestamp),
        data: typeof e.data === 'string' ? JSON.parse(e.data as string) : e.data,
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
}

// ─── Signal Extractor (with Shannon Entropy & Webcam Telemetry) ─
export class SignalExtractor {
  extract(events: TelemetryEventData[]): { signals: Record<string, number>; maxEntropy: number; entropyClassification: string } {
    const signals: Record<string, number> = {
      paste_frequency: 0,
      paste_size: 0,
      tab_blur_count: 0,
      tab_blur_duration: 0,
      large_insertion: 0,
      code_entropy_anomaly: 0,
      typing_speed_anomaly: 0,
      idle_periods: 0,
      webcam_face_absence: 0,
      webcam_blocked: 0,
      webcam_multiple_faces: 0,
    };

    let maxPasteSize = 0;
    let totalBlurDuration = 0;
    let maxInsertionSize = 0;
    let maxEntropy = 0;
    let entropyClassification = 'normal_human_typing';
    let lastEventTime: Date | null = null;

    for (const event of events) {
      switch (event.eventType) {
        case 'paste':
          signals.paste_frequency++;
          const pasteSize = event.data.size || event.data.length || 0;
          if (pasteSize > maxPasteSize) maxPasteSize = pasteSize;
          signals.paste_size = maxPasteSize;

          if (event.data.text || event.data.preview) {
            const entropyRes = calculateShannonEntropy(event.data.text || event.data.preview);
            if (entropyRes.entropy > maxEntropy) {
              maxEntropy = entropyRes.entropy;
              entropyClassification = entropyRes.classification;
            }
            if (entropyRes.isAnomalous) signals.code_entropy_anomaly++;
          }
          break;

        case 'tab_blur':
          signals.tab_blur_count++;
          const duration = event.data.duration || 0;
          totalBlurDuration += duration;
          signals.tab_blur_duration = totalBlurDuration;
          break;

        case 'code_insert':
          const insertSize = event.data.size || event.data.length || 0;
          if (insertSize > maxInsertionSize) maxInsertionSize = insertSize;
          signals.large_insertion = maxInsertionSize;

          if (event.data.text || event.data.code) {
            const entropyRes = calculateShannonEntropy(event.data.text || event.data.code);
            if (entropyRes.entropy > maxEntropy) {
              maxEntropy = entropyRes.entropy;
              entropyClassification = entropyRes.classification;
            }
            if (entropyRes.isAnomalous) signals.code_entropy_anomaly++;
          } else if (insertSize > 500) {
            // High size burst proxy
            signals.code_entropy_anomaly++;
          }
          break;

        case 'webcam_face_absence':
          signals.webcam_face_absence++;
          break;

        case 'webcam_blocked':
          signals.webcam_blocked++;
          break;

        case 'webcam_multiple_faces':
          signals.webcam_multiple_faces++;
          break;

        case 'idle':
          signals.idle_periods++;
          break;

        case 'keystroke':
          if (lastEventTime) {
            const timeDiff = (event.timestamp.getTime() - lastEventTime.getTime()) / 1000;
            if (timeDiff > 0) {
              const speed = (event.data.chars || 1) / (timeDiff / 60);
              if (speed > signals.typing_speed_anomaly) {
                signals.typing_speed_anomaly = speed;
              }
            }
          }
          break;
      }
      lastEventTime = event.timestamp;
    }

    return { signals, maxEntropy, entropyClassification };
  }
}

// ─── Risk Scorer ───────────────────────────────────────────────
export class RiskScorer {
  private weights: typeof DEFAULT_SIGNAL_WEIGHTS;

  constructor(weights?: typeof DEFAULT_SIGNAL_WEIGHTS) {
    this.weights = weights || DEFAULT_SIGNAL_WEIGHTS;
  }

  score(signals: Record<string, number>): { totalRisk: number; signalResults: SignalResult[] } {
    const signalResults: SignalResult[] = [];
    let totalRisk = 0;

    for (const [signalName, value] of Object.entries(signals)) {
      const config = this.weights[signalName];
      if (!config) continue;

      let riskPoints = 0;
      let description = '';

      if (value >= config.thresholds.high) {
        riskPoints = 25 * config.weight;
        description = `High ${signalName.replace(/_/g, ' ')}: ${value}`;
      } else if (value >= config.thresholds.medium) {
        riskPoints = 10 * config.weight;
        description = `Moderate ${signalName.replace(/_/g, ' ')}: ${value}`;
      } else if (value >= config.thresholds.low) {
        riskPoints = 5 * config.weight;
        description = `Elevated ${signalName.replace(/_/g, ' ')}: ${value}`;
      } else {
        description = `Normal ${signalName.replace(/_/g, ' ')}`;
      }

      signalResults.push({
        signal: signalName,
        value,
        weight: config.weight,
        riskContribution: riskPoints,
        description,
      });

      totalRisk += riskPoints;
    }

    return { totalRisk: Math.min(100, totalRisk), signalResults };
  }
}

// ─── Anomaly Detector ──────────────────────────────────────────
export class AnomalyDetector {
  determineRiskLevel(riskScore: number): AnomalyResult['riskLevel'] {
    if (riskScore >= 70) return 'critical';
    if (riskScore >= 50) return 'high';
    if (riskScore >= 30) return 'moderate';
    if (riskScore >= 15) return 'low';
    return 'normal';
  }

  generateAlerts(
    sessionId: string,
    riskLevel: AnomalyResult['riskLevel'],
    signalResults: SignalResult[]
  ): AnomalyResult['alerts'] {
    const alerts: AnomalyResult['alerts'] = [];
    if (riskLevel === 'normal' || riskLevel === 'low') return alerts;

    const significantSignals = signalResults.filter((s) => s.riskContribution > 0);

    if (significantSignals.length > 0) {
      const severity = riskLevel === 'critical' ? 'critical' : riskLevel === 'high' ? 'high' : 'moderate';
      alerts.push({
        severity,
        description: `Assessment integrity concern: ${significantSignals.length} anomalous vector(s) flagged. ${significantSignals.map((s) => s.description).join('; ')}`,
        signals: significantSignals.map((s) => s.signal),
        score: significantSignals.reduce((sum, s) => sum + s.riskContribution, 0),
      });
    }

    return alerts;
  }
}

// ─── Main Anomaly Engine ───────────────────────────────────────
export class AnomalyEngine {
  private processor = new TelemetryProcessor();
  private extractor = new SignalExtractor();
  private scorer = new RiskScorer();
  private detector = new AnomalyDetector();

  analyze(sessionId: string, rawEvents: TelemetryEventData[]): AnomalyResult {
    // 1. Normalize events
    const events = this.processor.normalize(rawEvents);

    // 2. Extract signals (including Shannon entropy)
    const { signals, maxEntropy, entropyClassification } = this.extractor.extract(events);

    // 3. Score risk
    const { totalRisk, signalResults } = this.scorer.score(signals);

    // 4. Determine risk level
    const authenticityScore = Math.max(0, 100 - totalRisk);
    const riskLevel = this.detector.determineRiskLevel(totalRisk);

    // 5. Generate alerts
    const alerts = this.detector.generateAlerts(sessionId, riskLevel, signalResults);

    return {
      sessionId,
      authenticityScore,
      riskLevel,
      signals: signalResults,
      alerts,
      entropyAnalysis: {
        maxEntropy,
        isAnomalous: signals.code_entropy_anomaly > 0,
        classification: entropyClassification,
      },
    };
  }
}
