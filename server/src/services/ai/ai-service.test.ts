import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  AIService,
  BehavioralTelemetryEngine,
  GeminiProvider,
  OpenAIProvider,
  AnomalyAnalysisRequest,
} from './ai-service.js';

describe('AI & Behavioral Telemetry Architecture', () => {
  it('BehavioralTelemetryEngine produces structured heuristics for authentic sessions', () => {
    const engine = new BehavioralTelemetryEngine();
    assert.strictEqual(engine.version, 'telemetry-heuristics-v2.0');

    const request: AnomalyAnalysisRequest = {
      studentName: 'Aarav Sharma',
      studentId: 'STU1001',
      assessmentName: 'Coding Assessment - SDE',
      authenticityScore: 100,
      riskLevel: 'normal',
      signals: [
        { signal: 'paste_frequency', value: 0, weight: 1.0, riskContribution: 0, description: 'Normal paste frequency' },
      ],
      recentEvents: [],
    };

    const breakdown = engine.computeBehavioralBreakdown(request);
    assert.strictEqual(breakdown.authenticityScore, 100);
    assert.strictEqual(breakdown.riskLevel, 'normal');
    assert(breakdown.technicalHeuristics.includes('Standard human typing cadence') || breakdown.technicalHeuristics.includes('authentic'));
    assert(breakdown.recommendedActions.length > 0);
  });

  it('BehavioralTelemetryEngine isolates paste, blur, and insertion anomalies based on exact telemetry', () => {
    const engine = new BehavioralTelemetryEngine();

    const request: AnomalyAnalysisRequest = {
      studentName: 'Vihaan Patel',
      studentId: 'STU1042',
      assessmentName: 'Coding Assessment - SDE',
      authenticityScore: 28,
      riskLevel: 'critical',
      signals: [
        { signal: 'paste_frequency', value: 12, weight: 1.0, riskContribution: 25, description: 'High paste frequency: 12' },
        { signal: 'tab_blur_duration', value: 140, weight: 1.0, riskContribution: 25, description: 'High tab blur duration: 140s' },
        { signal: 'large_insertion', value: 650, weight: 1.5, riskContribution: 37.5, description: 'High large insertion: 650 chars' },
      ],
      recentEvents: [],
    };

    const breakdown = engine.computeBehavioralBreakdown(request);
    assert.strictEqual(breakdown.authenticityScore, 28);
    assert(breakdown.technicalHeuristics.includes('paste operations') || breakdown.technicalHeuristics.includes('12'));
    assert(breakdown.technicalHeuristics.includes('defocus') || breakdown.technicalHeuristics.includes('140s'));
    assert(breakdown.recommendedActions.length > 0);
  });

  it('GeminiProvider handles missing API keys gracefully without fabricating text', () => {
    const provider = new GeminiProvider();
    if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
      assert.strictEqual(provider.isAvailable(), false);
    }
  });

  it('AIService singleton provides clean provider status and separation', () => {
    const service = AIService.getInstance();
    const status = service.getStatus();
    assert(status.activeProvider.length > 0);
    assert(status.supportedProviders.includes('behavioral'));
    assert(status.supportedProviders.includes('gemini'));
    assert(status.supportedProviders.includes('openai'));
    assert.strictEqual(status.behavioralEngineVersion, 'telemetry-heuristics-v2.0');
  });
});
