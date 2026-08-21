import { Router, Request, Response } from 'express';
import { prisma } from '../../app.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

export const recruitmentCyclesRouter = Router();

// GET /api/recruitment-cycles - List all recruitment cycles
recruitmentCyclesRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const cycles = await prisma.recruitmentCycle.findMany({
      orderBy: { academicYear: 'desc' },
      include: {
        _count: {
          select: {
            students: true,
            recruitmentDrives: true,
            allocationRuns: true,
          },
        },
      },
    });

    res.json({ data: cycles });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/recruitment-cycles/active - Get currently active cycle
recruitmentCyclesRouter.get('/active', async (_req: Request, res: Response) => {
  try {
    let cycle = await prisma.recruitmentCycle.findFirst({
      where: { status: { in: ['ACTIVE', 'APPLICATIONS_OPEN', 'ALLOCATION_RUNNING'] } },
      orderBy: { academicYear: 'desc' },
    });

    if (!cycle) {
      cycle = await prisma.recruitmentCycle.findFirst({
        orderBy: { academicYear: 'desc' },
      });
    }

    res.json({ data: cycle });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/recruitment-cycles - Create a new cycle (TPO Admin)
recruitmentCyclesRouter.post('/', requireAuth, requireRole(['super_admin', 'admin']), async (req: Request, res: Response) => {
  try {
    const { academicYear, startDate, endDate, description, status } = req.body;
    if (!academicYear || !startDate || !endDate) {
      return res.status(400).json({ error: 'academicYear, startDate, and endDate are required.' });
    }

    const existing = await prisma.recruitmentCycle.findUnique({ where: { academicYear } });
    if (existing) {
      return res.status(400).json({ error: `Recruitment cycle ${academicYear} already exists.` });
    }

    const cycle = await prisma.recruitmentCycle.create({
      data: {
        academicYear,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        description: description || `Placement cycle for academic year ${academicYear}`,
        status: status || 'DRAFT',
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: (req as any).user?.id,
        action: 'create',
        entity: 'recruitment_cycle',
        entityId: cycle.id,
        description: `Recruitment cycle ${academicYear} created with status ${cycle.status}.`,
      },
    });

    res.status(201).json({ success: true, data: cycle });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/recruitment-cycles/:id - Update cycle status or details
recruitmentCyclesRouter.patch('/:id', requireAuth, requireRole(['super_admin', 'admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, description, startDate, endDate } = req.body;

    const existing = await prisma.recruitmentCycle.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Recruitment cycle not found.' });

    const updated = await prisma.recruitmentCycle.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(startDate ? { startDate: new Date(startDate) } : {}),
        ...(endDate ? { endDate: new Date(endDate) } : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: (req as any).user?.id,
        action: 'update',
        entity: 'recruitment_cycle',
        entityId: updated.id,
        previousState: JSON.stringify({ status: existing.status }),
        newState: JSON.stringify({ status: updated.status }),
        description: `Recruitment cycle ${updated.academicYear} updated to ${updated.status}.`,
      },
    });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
