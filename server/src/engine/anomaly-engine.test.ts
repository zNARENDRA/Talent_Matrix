import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  AnomalyEngine,
  SignalExtractor,
  RiskScorer,
  AnomalyDetector,
  TelemetryEventData,
} from './anomaly-engine.js';

describe('Anomaly Detection Engine', () => {
  it('SignalExtractor correctly tallies paste events, blur durations, and large insertions', () => {
    const extractor = new SignalExtractor();

    const events: TelemetryEventData[] = [
      {
        id: 'e-1',
        sessionId: 'sess-1',
        eventType: 'keystroke',
        timestamp: new Date('2026-08-25T10:00:00Z'),
        data: { chars: 1 },
      },
      {
        id: 'e-2',
        sessionId: 'sess-1',
        eventType: 'paste',
        timestamp: new Date('2026-08-25T10:02:00Z'),
        data: { size: 450 },
      },
      {
        id: 'e-3',
        sessionId: 'sess-1',
        eventType: 'tab_blur',
        timestamp: new Date('2026-08-25T10:05:00Z'),
        data: { duration: 45 },
      },
      {
        id: 'e-4',
        sessionId: 'sess-1',
        eventType: 'code_insert',
        timestamp: new Date('2026-08-25T10:08:00Z'),
        data: { size: 650 },
      },
    ];

    const { signals } = extractor.extract(events);
    assert.strictEqual(signals.paste_frequency, 1);
    assert.strictEqual(signals.paste_size, 450);
    assert.strictEqual(signals.tab_blur_count, 1);
    assert.strictEqual(signals.tab_blur_duration, 45);
    assert.strictEqual(signals.large_insertion, 650);
  });

  it('RiskScorer computes weighted risk and marks high risk correctly', () => {
    const scorer = new RiskScorer();

    // High anomaly telemetry signals
    const signals = {
      paste_frequency: 12, // triggers high threshold (>= 10) -> 25 * 1.0 = 25
      paste_size: 600,     // triggers high threshold (>= 500) -> 25 * 1.2 = 30
      tab_blur_count: 14,  // triggers high threshold (>= 12) -> 25 * 0.8 = 20
      tab_blur_duration: 150, // triggers high threshold (>= 120) -> 25 * 1.0 = 25
      large_insertion: 700,   // triggers high threshold (>= 600) -> 25 * 1.5 = 37.5
      typing_speed_anomaly: 0,
      idle_periods: 0,
    };

    const { totalRisk, signalResults } = scorer.score(signals);
    assert(totalRisk >= 70, `Expected totalRisk >= 70, got ${totalRisk}`);
    assert.strictEqual(signalResults.length, 7);
  });

  it('AnomalyEngine end-to-end analyzes assessment session and generates alerts for suspicious behaviour', () => {
    const engine = new AnomalyEngine();

    const normalEvents: TelemetryEventData[] = [
      {
        id: 'e-1',
        sessionId: 'sess-normal',
        eventType: 'keystroke',
        timestamp: new Date('2026-08-25T10:00:00Z'),
        data: { chars: 3 },
      },
      {
        id: 'e-2',
        sessionId: 'sess-normal',
        eventType: 'keystroke',
        timestamp: new Date('2026-08-25T10:00:10Z'),
        data: { chars: 2 },
      },
      {
        id: 'e-3',
        sessionId: 'sess-normal',
        eventType: 'submission',
        timestamp: new Date('2026-08-25T10:30:00Z'),
        data: {},
      },
    ];

    const normalResult = engine.analyze('sess-normal', normalEvents);
    assert.strictEqual(normalResult.riskLevel, 'normal');
    assert.strictEqual(normalResult.authenticityScore, 100);
    assert.strictEqual(normalResult.alerts.length, 0);

    // Suspicious session
    const suspiciousEvents: TelemetryEventData[] = [
      {
        id: 'e-s1',
        sessionId: 'sess-sus',
        eventType: 'tab_blur',
        timestamp: new Date('2026-08-25T10:00:00Z'),
        data: { duration: 90 },
      },
      {
        id: 'e-s2',
        sessionId: 'sess-sus',
        eventType: 'paste',
        timestamp: new Date('2026-08-25T10:02:00Z'),
        data: { size: 600 },
      },
      {
        id: 'e-s3',
        sessionId: 'sess-sus',
        eventType: 'code_insert',
        timestamp: new Date('2026-08-25T10:03:00Z'),
        data: { size: 800 },
      },
    ];

    for (let i = 0; i < 12; i++) {
      suspiciousEvents.push({
        id: `e-paste-${i}`,
        sessionId: 'sess-sus',
        eventType: 'paste',
        timestamp: new Date(`2026-08-25T10:0${i % 9}:00Z`),
        data: { size: 350 },
      });
      suspiciousEvents.push({
        id: `e-blur-${i}`,
        sessionId: 'sess-sus',
        eventType: 'tab_blur',
        timestamp: new Date(`2026-08-25T10:1${i % 9}:00Z`),
        data: { duration: 15 },
      });
    }

    const susResult = engine.analyze('sess-sus', suspiciousEvents);
    assert(susResult.authenticityScore < 60, `Expected authenticityScore < 60, got ${susResult.authenticityScore}`);
    assert(susResult.riskLevel === 'high' || susResult.riskLevel === 'critical');
    assert(susResult.alerts.length > 0);
    assert(susResult.alerts[0].description.includes('integrity concern'));
  });

  it('AnomalyEngine correctly flags webcam face absence and camera blockage anomalies', () => {
    const engine = new AnomalyEngine();

    const webcamAnomalousEvents: TelemetryEventData[] = [
      {
        id: 'w-1',
        sessionId: 'sess-webcam',
        eventType: 'webcam_blocked',
        timestamp: new Date('2026-08-25T10:00:00Z'),
        data: { reason: 'camera_covered' },
      },
      {
        id: 'w-2',
        sessionId: 'sess-webcam',
        eventType: 'webcam_face_absence',
        timestamp: new Date('2026-08-25T10:01:00Z'),
        data: { durationSec: 15 },
      },
      {
        id: 'w-3',
        sessionId: 'sess-webcam',
        eventType: 'webcam_face_absence',
        timestamp: new Date('2026-08-25T10:02:00Z'),
        data: { durationSec: 20 },
      },
      {
        id: 'w-4',
        sessionId: 'sess-webcam',
        eventType: 'webcam_multiple_faces',
        timestamp: new Date('2026-08-25T10:03:00Z'),
        data: { faceCount: 2 },
      },
    ];

    const result = engine.analyze('sess-webcam', webcamAnomalousEvents);
    assert(result.authenticityScore < 100, 'Score should drop on webcam violations');
    const webcamSignals = result.signals.filter((s) => s.signal.startsWith('webcam_') && s.value > 0);
    assert.strictEqual(webcamSignals.length, 3);
  });
});

