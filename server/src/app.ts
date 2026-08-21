import express from 'express';
import http from 'http';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { studentsRouter } from './modules/students/routes.js';
import { companiesRouter } from './modules/companies/routes.js';
import { recruitmentRouter } from './modules/recruitment/routes.js';
import { allocationRouter } from './modules/allocation/routes.js';
import { schedulingRouter } from './modules/scheduling/routes.js';
import { assessmentsRouter } from './modules/assessments/routes.js';
import { anomalyRouter } from './modules/anomaly/routes.js';
import { analyticsRouter } from './modules/analytics/routes.js';
import { notificationsRouter } from './modules/notifications/routes.js';
import { auditRouter } from './modules/audit/routes.js';
import { authRouter } from './modules/auth/routes.js';
import { offerPoliciesRouter } from './modules/offer-policies/routes.js';
import { reportsRouter } from './modules/reports/routes.js';
import { studentPortalRouter } from './modules/students/portal-routes.js';
import { recruitmentCyclesRouter } from './modules/recruitment-cycles/routes.js';
import { departmentsRouter } from './modules/departments/routes.js';
import { skillsRouter } from './modules/skills/routes.js';
import { selectionRouter } from './modules/selection/routes.js';
import { crawlerRouter } from './modules/crawler/routes.js';
import { initWebSocket } from './services/websocket.js';
import { aiService } from './services/ai/ai-service.js';

export const prisma = new PrismaClient();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Initialize Socket.IO
export const io = initWebSocket(server);

app.use(
  cors({
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    aiStatus: aiService.getStatus(),
    realtime: 'Socket.IO active',
  });
});

// AI Configuration & Provider Status
app.get('/api/ai/status', (_req, res) => {
  res.json(aiService.getStatus());
});

app.post('/api/ai/provider', (req, res) => {
  const { provider } = req.body;
  if (!provider) return res.status(400).json({ error: 'Provider is required' });
  const success = aiService.setProvider(provider);
  if (!success) return res.status(400).json({ error: 'Invalid provider name' });
  res.json({ success: true, active: aiService.getStatus() });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/offer-policies', offerPoliciesRouter);
app.use('/api/recruitment-cycles', recruitmentCyclesRouter);
app.use('/api/departments', departmentsRouter);
app.use('/api/skills', skillsRouter);
app.use('/api/selection', selectionRouter);
app.use('/api/crawler', crawlerRouter);
app.use('/api/students', studentsRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/recruitment-drives', recruitmentRouter);
app.use('/api/allocation', allocationRouter);
app.use('/api/scheduling', schedulingRouter);
app.use('/api/assessments', assessmentsRouter);
app.use('/api/anomalies', anomalyRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/audit-logs', auditRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/student-portal', studentPortalRouter);

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[API Error]:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

server.listen(PORT, () => {
  console.log(`🚀 TalentMatrix Enterprise Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server ready for live telemetry and anomalies`);
  console.log(`🧠 Active AI Intelligence: ${aiService.getStatus().activeProvider} (${aiService.getStatus().model})`);
});

export default app;
