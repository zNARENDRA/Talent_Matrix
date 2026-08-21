import { Router, Request, Response } from 'express';
import { prisma } from '../../app.js';
import { CrawlerService } from './crawler-service.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

export const crawlerRouter = Router();
const crawlerService = new CrawlerService();

// GET /api/crawler/sources - List all crawler sources
crawlerRouter.get('/sources', async (_req: Request, res: Response) => {
  try {
    const sources = await prisma.crawlerSource.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { crawledJobs: true } },
      },
    });

    res.json({ data: sources });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/crawler/sources - Add crawler source
crawlerRouter.post('/sources', requireAuth, requireRole(['super_admin', 'admin']), async (req: Request, res: Response) => {
  try {
    const { name, url, frequency } = req.body;
    if (!name || !url) {
      return res.status(400).json({ error: 'Name and URL are required.' });
    }

    const source = await prisma.crawlerSource.create({
      data: {
        name,
        url,
        frequency: frequency || 'DAILY',
        status: 'IDLE',
        enabled: true,
      },
    });

    res.status(201).json({ success: true, data: source });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/crawler/run - Trigger crawler execution
crawlerRouter.post('/run', requireAuth, requireRole(['super_admin', 'admin']), async (req: Request, res: Response) => {
  try {
    const { sourceId } = req.body;
    let targetSourceId = sourceId;

    if (!targetSourceId) {
      const firstSource = await prisma.crawlerSource.findFirst({ where: { enabled: true } });
      if (!firstSource) {
        // Create default source if none
        const def = await prisma.crawlerSource.create({
          data: {
            name: 'Tech Careers Aggregator (LinkedIn & Career Portals)',
            url: 'https://careers.google.com, https://stripe.com/jobs, https://nvidia.com',
            frequency: 'DAILY',
            status: 'IDLE',
          },
        });
        targetSourceId = def.id;
      } else {
        targetSourceId = firstSource.id;
      }
    }

    const result = await crawlerService.runCrawlForSource(targetSourceId);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/crawler/jobs - List discovered crawled jobs
crawlerRouter.get('/jobs', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const where: any = {};
    if (status) where.status = String(status);

    const jobs = await prisma.crawledJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { source: true },
    });

    res.json({ data: jobs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/crawler/jobs/:id/matches - Get top student matches for crawled job
crawlerRouter.get('/jobs/:id/matches', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const matches = await crawlerService.matchStudentsForJob(id);
    res.json(matches);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/crawler/jobs/:id/convert - 1-Click Convert Crawled Job into Recruitment Drive
crawlerRouter.post('/jobs/:id/convert', requireAuth, requireRole(['super_admin', 'admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { openPositions, minGpa } = req.body;

    const drive = await crawlerService.convertToDrive(id, openPositions || 5, minGpa || 7.0);

    await prisma.auditLog.create({
      data: {
        userId: (req as any).user?.id,
        action: 'convert_job_to_drive',
        entity: 'recruitment_drive',
        entityId: drive.id,
        description: `Crawled job converted to active recruitment drive for ${drive.role}.`,
      },
    });

    res.status(201).json({ success: true, drive });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
