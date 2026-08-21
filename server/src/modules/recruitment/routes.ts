import { Router, Request, Response } from 'express';
import { prisma } from '../../app.js';

export const recruitmentRouter = Router();

// GET /api/recruitment-drives - List drives
recruitmentRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { status, season, company } = req.query;
    const where: any = {};
    if (status) where.status = status;
    if (season) where.season = season;
    if (company) where.companyId = company;

    const drives = await prisma.recruitmentDrive.findMany({
      where,
      include: {
        company: true,
        interviewRounds: true,
        _count: { select: { applications: true, offers: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: drives, total: drives.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/recruitment-drives/pipeline/kanban - Multi-Round Kanban Candidate Pipeline
recruitmentRouter.get('/pipeline/kanban', async (req: Request, res: Response) => {
  try {
    const { driveId } = req.query;
    const where: any = {};
    if (driveId) where.driveId = driveId as string;

    const applications = await prisma.application.findMany({
      where,
      include: {
        student: {
          include: {
            assessments: {
              take: 1,
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        drive: {
          include: {
            company: true,
            interviewRounds: true,
          },
        },
      },
      orderBy: { appliedAt: 'desc' },
      take: 100,
    });

    const columns: Record<string, any[]> = {
      applied: [],
      shortlisted: [],
      assessment: [],
      technical_round: [],
      system_design: [],
      hr_round: [],
      offered: [],
    };

    for (const app of applications) {
      let stageKey = app.status;
      if (app.status === 'interview') {
        stageKey = 'technical_round';
      }

      if (!columns[stageKey]) {
        columns[stageKey] = [];
      }

      const latestSession = app.student.assessments?.[0];
      columns[stageKey].push({
        applicationId: app.id,
        studentId: app.student.studentId,
        name: app.student.name,
        email: app.student.email,
        department: app.student.department,
        gpa: app.student.gpa,
        company: app.drive.company.name,
        role: app.drive.role,
        tier: app.drive.offerTier,
        status: app.status,
        currentRound: app.currentRound || 1,
        authenticityScore: latestSession ? latestSession.authenticityScore : null,
      });
    }

    res.json({
      totalCandidates: applications.length,
      columns: [
        { id: 'applied', title: 'Applied / Profile Shortlist', candidates: columns.applied || [] },
        { id: 'assessment', title: 'Round 1: Online Coding', candidates: columns.assessment || [] },
        { id: 'technical_round', title: 'Round 2: Technical Interview', candidates: columns.technical_round || [] },
        { id: 'system_design', title: 'Round 3: System Design', candidates: columns.system_design || [] },
        { id: 'hr_round', title: 'Round 4: HR & Executive', candidates: columns.hr_round || [] },
        { id: 'offered', title: 'Offers Extended', candidates: columns.offered || [] },
      ],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/recruitment-drives/pipeline/advance - Promote candidate to next recruitment round
recruitmentRouter.post('/pipeline/advance', async (req: Request, res: Response) => {
  try {
    const { applicationId, nextStatus, nextRound } = req.body;
    if (!applicationId || !nextStatus) {
      return res.status(400).json({ error: 'applicationId and nextStatus are required' });
    }

    const app = await prisma.application.update({
      where: { id: applicationId },
      data: {
        status: nextStatus,
      },
      include: {
        student: true,
        drive: { include: { company: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'promote_round',
        entity: 'application',
        description: `Candidate ${app.student.name} (${app.student.studentId}) advanced to ${nextStatus} for ${app.drive.company.name}.`,
      },
    });

    res.json({ success: true, application: app });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/recruitment-drives/:id - Drive details
recruitmentRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const drive = await prisma.recruitmentDrive.findUnique({
      where: { id: req.params.id },
      include: {
        company: true,
        applications: { include: { student: true } },
        offers: { include: { student: true } },
        interviewRounds: { include: { interviews: { include: { student: true, panel: true } } } },
        companyPreferences: true,
      },
    });
    if (!drive) return res.status(404).json({ error: 'Drive not found' });
    res.json(drive);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/recruitment-drives - Create drive
recruitmentRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { rounds, ...driveData } = req.body;
    const drive = await prisma.recruitmentDrive.create({
      data: {
        ...driveData,
        interviewRounds: rounds ? { create: rounds } : undefined,
      },
      include: { company: true, interviewRounds: true },
    });
    res.status(201).json(drive);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/recruitment-drives/:id - Update drive
recruitmentRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const drive = await prisma.recruitmentDrive.update({
      where: { id: req.params.id },
      data: req.body,
      include: { company: true },
    });
    res.json(drive);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
