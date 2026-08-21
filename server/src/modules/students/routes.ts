import { Router, Request, Response } from 'express';
import { prisma } from '../../app.js';

export const studentsRouter = Router();

// GET /api/students - List students with filtering & pagination
studentsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', search, department, status, minGpa, maxGpa, sort = 'name', order = 'asc' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { studentId: { contains: search as string } },
        { email: { contains: search as string } },
      ];
    }
    if (department) where.department = department;
    if (status) where.status = status;
    if (minGpa) where.gpa = { ...where.gpa, gte: parseFloat(minGpa as string) };
    if (maxGpa) where.gpa = { ...where.gpa, lte: parseFloat(maxGpa as string) };

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip,
        take,
        orderBy: { [sort as string]: order },
        include: {
          offers: true,
          applications: { include: { drive: { include: { company: true } } } },
          _count: { select: { interviews: true, assessments: true } },
        },
      }),
      prisma.student.count({ where }),
    ]);

    res.json({ data: students, total, page: parseInt(page as string), limit: take, totalPages: Math.ceil(total / take) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/students/:id - Get student detail
studentsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.params.id },
      include: {
        offers: { include: { drive: { include: { company: true } } } },
        applications: { include: { drive: { include: { company: true } } } },
        interviews: { include: { round: { include: { drive: { include: { company: true } } } }, panel: true } },
        assessments: { include: { alerts: true } },
        preferences: true,
      },
    });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json(student);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/students - Create student
studentsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const student = await prisma.student.create({ data: req.body });
    res.status(201).json(student);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/students/:id - Update student
studentsRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const student = await prisma.student.update({ where: { id: req.params.id }, data: req.body });
    res.json(student);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/students/stats/summary - Quick stats
studentsRouter.get('/stats/summary', async (_req: Request, res: Response) => {
  try {
    const [total, eligible, placed] = await Promise.all([
      prisma.student.count(),
      prisma.student.count({ where: { status: 'eligible' } }),
      prisma.student.count({ where: { status: 'placed' } }),
    ]);
    res.json({ total, eligible, placed, registered: total });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
