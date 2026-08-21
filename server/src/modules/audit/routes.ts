import { Router, Request, Response } from 'express';
import { prisma } from '../../app.js';

export const auditRouter = Router();

auditRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { action, entity, page = '1', limit = '25' } = req.query;
    const where: any = {};
    if (action) where.action = action;
    if (entity) where.entity = entity;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ data: logs, total, page: parseInt(page as string), totalPages: Math.ceil(total / take) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
