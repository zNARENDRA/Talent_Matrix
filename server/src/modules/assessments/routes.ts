import { Router, Request, Response } from 'express';
import { prisma } from '../../app.js';
import { AnomalyEngine, TelemetryEventData } from '../../engine/anomaly-engine.js';
import { aiService } from '../../services/ai/ai-service.js';
import { emitTelemetryEvent, emitScoreUpdate, emitNewAnomalyAlert } from '../../services/websocket.js';

export const assessmentsRouter = Router();
const anomalyEngine = new AnomalyEngine();

// GET /api/assessments - List assessment sessions
assessmentsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { status, riskLevel, studentId } = req.query;
    const where: any = {};
    if (status) where.status = status;
    if (riskLevel) where.riskLevel = riskLevel;
    if (studentId) where.studentId = studentId;

    const sessions = await prisma.assessmentSession.findMany({
      where,
      include: {
        student: true,
        _count: { select: { events: true, alerts: true } },
      },
      orderBy: { startedAt: 'desc' },
    });
    res.json({ data: sessions, total: sessions.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/assessments/start - Start a new candidate assessment session
assessmentsRouter.post('/start', async (req: Request, res: Response) => {
  try {
    const { studentId, assessmentName = 'Data Structures & Algorithms Assessment', driveId } = req.body;
    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required.' });
    }

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    const session = await prisma.assessmentSession.create({
      data: {
        studentId,
        driveId: driveId || null,
        assessmentName,
        startedAt: new Date(),
        status: 'in_progress',
        authenticityScore: 100,
        riskLevel: 'normal',
        totalEvents: 0,
      },
      include: { student: true },
    });

    res.status(201).json(session);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/assessments/:id - Get session detail with events & alerts
assessmentsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const session = await prisma.assessmentSession.findUnique({
      where: { id: req.params.id },
      include: {
        student: true,
        events: { orderBy: { timestamp: 'asc' } },
        alerts: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!session) return res.status(404).json({ error: 'Session not found.' });
    res.json(session);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/assessments/:id/telemetry - Ingest real telemetry event from candidate editor
assessmentsRouter.post('/:id/telemetry', async (req: Request, res: Response) => {
  try {
    const { eventType, data } = req.body;
    if (!eventType) {
      return res.status(400).json({ error: 'eventType is required.' });
    }

    const sessionId = req.params.id;
    const session = await prisma.assessmentSession.findUnique({ where: { id: sessionId }, include: { student: true } });
    if (!session) return res.status(404).json({ error: 'Assessment session not found.' });

    const timestamp = new Date();

    // 1. Record telemetry event in database
    const telemetryEvent = await prisma.telemetryEvent.create({
      data: {
        sessionId,
        eventType,
        timestamp,
        data: typeof data === 'string' ? data : JSON.stringify(data || {}),
      },
    });

    // 2. Fetch all telemetry events for this session to run real feature extraction & scoring
    const allEvents = await prisma.telemetryEvent.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'asc' },
    });

    const normalizedEvents: TelemetryEventData[] = allEvents.map((e) => ({
      id: e.id,
      sessionId: e.sessionId,
      eventType: e.eventType,
      timestamp: e.timestamp,
      data: typeof e.data === 'string' ? JSON.parse(e.data || '{}') : e.data,
    }));

    // 3. Run real Anomaly Scoring Engine on actual sequence
    const analysisResult = anomalyEngine.analyze(sessionId, normalizedEvents);

    // 4. Update session record with real score
    const updatedSession = await prisma.assessmentSession.update({
      where: { id: sessionId },
      data: {
        authenticityScore: analysisResult.authenticityScore,
        riskLevel: analysisResult.riskLevel,
        totalEvents: allEvents.length,
      },
    });

    // 5. Generate and store alerts if new risk detected
    if (analysisResult.alerts.length > 0) {
      for (const alertData of analysisResult.alerts) {
        // Check if matching alert already exists to prevent duplication
        const existingAlert = await prisma.anomalyAlert.findFirst({
          where: { sessionId, severity: alertData.severity },
        });

        if (!existingAlert) {
          const newAlert = await prisma.anomalyAlert.create({
            data: {
              sessionId,
              severity: alertData.severity,
              signals: JSON.stringify(alertData.signals),
              score: alertData.score,
              description: alertData.description,
              status: 'new',
            },
          });
          emitNewAnomalyAlert({ ...newAlert, session: { student: session.student } });
        }
      }
    }

    // 6. Broadcast real-time WebSocket updates to monitoring dashboards
    emitTelemetryEvent(sessionId, {
      id: telemetryEvent.id,
      eventType,
      timestamp,
      data: typeof data === 'string' ? JSON.parse(data) : data,
    });

    emitScoreUpdate(sessionId, {
      authenticityScore: analysisResult.authenticityScore,
      riskLevel: analysisResult.riskLevel,
      alertsCount: analysisResult.alerts.length,
    });

    res.status(201).json({
      success: true,
      event: telemetryEvent,
      currentScore: analysisResult.authenticityScore,
      riskLevel: analysisResult.riskLevel,
      signals: analysisResult.signals,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/assessments/:id/ai-analysis - Run real AI Inference on assessment telemetry
assessmentsRouter.get('/:id/ai-analysis', async (req: Request, res: Response) => {
  try {
    const session = await prisma.assessmentSession.findUnique({
      where: { id: req.params.id },
      include: {
        student: true,
        events: { orderBy: { timestamp: 'desc' }, take: 25 },
        alerts: true,
      },
    });

    if (!session) return res.status(404).json({ error: 'Session not found.' });

    // Fetch full events for exact feature extraction
    const allEvents = await prisma.telemetryEvent.findMany({
      where: { sessionId: req.params.id },
      orderBy: { timestamp: 'asc' },
    });

    const normalizedEvents: TelemetryEventData[] = allEvents.map((e) => ({
      id: e.id,
      sessionId: e.sessionId,
      eventType: e.eventType,
      timestamp: e.timestamp,
      data: typeof e.data === 'string' ? JSON.parse(e.data || '{}') : e.data,
    }));

    const analysisResult = anomalyEngine.analyze(session.id, normalizedEvents);

    const aiReport = await aiService.analyzeAssessmentAnomaly({
      studentName: session.student.name,
      studentId: session.student.studentId,
      assessmentName: session.assessmentName,
      authenticityScore: session.authenticityScore,
      riskLevel: session.riskLevel,
      signals: analysisResult.signals,
      recentEvents: session.events.map((e) => ({
        eventType: e.eventType,
        timestamp: e.timestamp.toISOString(),
        data: typeof e.data === 'string' ? JSON.parse(e.data || '{}') : e.data,
      })),
    });

    res.json({
      sessionId: session.id,
      aiReport,
      signals: analysisResult.signals,
      authenticityScore: session.authenticityScore,
      riskLevel: session.riskLevel,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
