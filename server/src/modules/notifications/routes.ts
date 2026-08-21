import { Router, Request, Response } from 'express';
import { prisma } from '../../app.js';

export const notificationsRouter = Router();

notificationsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { isRead, type } = req.query;
    const where: any = {};
    if (isRead !== undefined) where.isRead = isRead === 'true';
    if (type) where.type = type;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unreadCount = await prisma.notification.count({ where: { isRead: false } });
    res.json({ data: notifications, unreadCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

notificationsRouter.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    const notification = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    res.json(notification);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

notificationsRouter.patch('/read-all', async (_req: Request, res: Response) => {
  try {
    await prisma.notification.updateMany({ where: { isRead: false }, data: { isRead: true } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
