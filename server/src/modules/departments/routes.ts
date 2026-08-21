import { Router, Request, Response } from 'express';
import { prisma } from '../../app.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

export const departmentsRouter = Router();

// GET /api/departments - List all departments with placement metrics
departmentsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const departments = await prisma.department.findMany({
      orderBy: { code: 'asc' },
    });

    const students = await prisma.student.findMany({
      select: { department: true, status: true, placementOutcome: true },
    });

    const deptStats = departments.map((d) => {
      const deptStudents = students.filter(
        (s) => s.department.toLowerCase() === d.code.toLowerCase() || s.department.toLowerCase() === d.name.toLowerCase()
      );
      const total = deptStudents.length;
      const placed = deptStudents.filter((s) => s.status === 'placed' || s.placementOutcome === 'PLACED').length;
      const placementRate = total > 0 ? Math.round((placed / total) * 1000) / 10 : 0;

      return {
        ...d,
        totalStudents: total,
        placedStudents: placed,
        placementRate,
      };
    });

    res.json({ data: deptStats });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/departments - Create a department
departmentsRouter.post('/', requireAuth, requireRole(['super_admin', 'admin']), async (req: Request, res: Response) => {
  try {
    const { code, name } = req.body;
    if (!code || !name) {
      return res.status(400).json({ error: 'Department code and name are required.' });
    }

    const normCode = code.toUpperCase().trim();
    const existing = await prisma.department.findUnique({ where: { code: normCode } });
    if (existing) {
      return res.status(400).json({ error: `Department code ${normCode} already exists.` });
    }

    const department = await prisma.department.create({
      data: {
        code: normCode,
        name: name.trim(),
        isActive: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: (req as any).user?.id,
        action: 'create',
        entity: 'department',
        entityId: department.id,
        description: `Department ${department.name} (${department.code}) added.`,
      },
    });

    res.status(201).json({ success: true, data: department });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/departments/:id - Toggle active or update name
departmentsRouter.patch('/:id', requireAuth, requireRole(['super_admin', 'admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;

    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Department not found.' });

    const updated = await prisma.department.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
