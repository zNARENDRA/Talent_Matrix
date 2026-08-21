import { Router, Request, Response } from 'express';
import { prisma } from '../../app.js';

export const anomalyRouter = Router();

// GET /api/anomalies - List anomaly alerts
anomalyRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { severity, status } = req.query;
    const where: any = {};
    if (severity) where.severity = severity;
    if (status) where.status = status;

    const alerts = await prisma.anomalyAlert.findMany({
      where,
      include: {
        session: { include: { student: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: alerts, total: alerts.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/anomalies/:id/review - Review an alert
anomalyRouter.patch('/:id/review', async (req: Request, res: Response) => {
  try {
    const { status, reviewNote } = req.body;
    const alert = await prisma.anomalyAlert.update({
      where: { id: req.params.id },
      data: {
        status,
        reviewNote,
        reviewedBy: 'admin', // In production, use auth
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'review',
        entity: 'anomaly',
        entityId: req.params.id,
        description: `Anomaly alert reviewed: ${status}`,
        newState: JSON.stringify({ status, reviewNote }),
      },
    });

    res.json(alert);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/anomalies/stats - Anomaly statistics
anomalyRouter.get('/stats/summary', async (_req: Request, res: Response) => {
  try {
    const [total, critical, high, moderate, newAlerts, sessions] = await Promise.all([
      prisma.anomalyAlert.count(),
      prisma.anomalyAlert.count({ where: { severity: 'critical' } }),
      prisma.anomalyAlert.count({ where: { severity: 'high' } }),
      prisma.anomalyAlert.count({ where: { severity: 'moderate' } }),
      prisma.anomalyAlert.count({ where: { status: 'new' } }),
      prisma.assessmentSession.findMany({ select: { authenticityScore: true } }),
    ]);

    const avgScore = sessions.length > 0
      ? sessions.reduce((sum, s) => sum + s.authenticityScore, 0) / sessions.length
      : 100;

    res.json({
      totalAlerts: total,
      criticalAlerts: critical,
      highAlerts: high,
      moderateAlerts: moderate,
      newAlerts,
      averageAuthenticityScore: Math.round(avgScore),
      totalSessions: sessions.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
