import { Router, Request, Response } from 'express';
import { prisma } from '../../app.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

export const offerPoliciesRouter = Router();

// GET /api/offer-policies - List all configured policies
offerPoliciesRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const policies = await prisma.offerPolicy.findMany({
      orderBy: { priority: 'asc' },
    });
    res.json({ data: policies });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/offer-policies - Create a new policy
offerPoliciesRouter.post('/', requireAuth, requireRole(['super_admin', 'admin']), async (req: Request, res: Response) => {
  try {
    const { name, description, tier, rules, priority, isActive } = req.body;
    if (!name || !tier) {
      return res.status(400).json({ error: 'Policy name and tier are required.' });
    }

    const policy = await prisma.offerPolicy.create({
      data: {
        name,
        description: description || '',
        tier,
        rules: typeof rules === 'string' ? rules : JSON.stringify(rules || {}),
        priority: priority ?? 0,
        isActive: isActive ?? true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'create',
        entity: 'offer_policy',
        entityId: policy.id,
        description: `Created offer policy "${policy.name}" for tier ${policy.tier}.`,
        newState: JSON.stringify(policy),
      },
    });

    res.status(201).json(policy);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/offer-policies/:id - Update policy rules
offerPoliciesRouter.patch('/:id', requireAuth, requireRole(['super_admin', 'admin']), async (req: Request, res: Response) => {
  try {
    const data: any = { ...req.body };
    if (data.rules && typeof data.rules !== 'string') {
      data.rules = JSON.stringify(data.rules);
    }

    const previous = await prisma.offerPolicy.findUnique({ where: { id: req.params.id } });
    if (!previous) return res.status(404).json({ error: 'Policy not found.' });

    const policy = await prisma.offerPolicy.update({
      where: { id: req.params.id },
      data,
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'update',
        entity: 'offer_policy',
        entityId: policy.id,
        description: `Updated offer policy "${policy.name}".`,
        previousState: JSON.stringify(previous),
        newState: JSON.stringify(policy),
      },
    });

    res.json(policy);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/offer-policies/:id
offerPoliciesRouter.delete('/:id', requireAuth, requireRole(['super_admin']), async (req: Request, res: Response) => {
  try {
    const policy = await prisma.offerPolicy.delete({ where: { id: req.params.id } });
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'delete',
        entity: 'offer_policy',
        entityId: req.params.id,
        description: `Deleted offer policy "${policy.name}".`,
      },
    });
    res.json({ success: true, deleted: policy });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
