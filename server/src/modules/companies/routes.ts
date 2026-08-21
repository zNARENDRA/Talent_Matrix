import { Router, Request, Response } from 'express';
import { prisma } from '../../app.js';

export const companiesRouter = Router();

companiesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { search, industry } = req.query;
    const where: any = {};
    if (search) where.name = { contains: search as string };
    if (industry) where.industry = industry;

    const companies = await prisma.company.findMany({
      where,
      include: {
        recruitmentDrives: { include: { _count: { select: { applications: true, offers: true } } } },
        _count: { select: { recruitmentDrives: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json({ data: companies, total: companies.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

companiesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.params.id },
      include: {
        recruitmentDrives: {
          include: {
            applications: { include: { student: true } },
            offers: { include: { student: true } },
            interviewRounds: true,
            _count: { select: { applications: true, offers: true } },
          },
        },
      },
    });
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json(company);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

companiesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const company = await prisma.company.create({ data: req.body });
    res.status(201).json(company);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

companiesRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const company = await prisma.company.update({ where: { id: req.params.id }, data: req.body });
    res.json(company);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
