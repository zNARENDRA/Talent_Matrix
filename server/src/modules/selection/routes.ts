import { Router, Request, Response } from 'express';
import { prisma } from '../../app.js';
import { SelectionEngine } from '../../engine/selection-engine.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

export const selectionRouter = Router();
const selectionEngine = new SelectionEngine();

// GET /api/selection/drives/:driveId/candidates - Get scored & ranked applicants
selectionRouter.get('/drives/:driveId/candidates', async (req: Request, res: Response) => {
  try {
    const { driveId } = req.params;
    const drive = await prisma.recruitmentDrive.findUnique({
      where: { id: driveId },
      include: {
        company: true,
        skillRequirements: { include: { skill: true } },
        recruiterScores: true,
        applications: {
          include: {
            student: {
              include: {
                studentSkills: { include: { skill: true } },
                preferences: true,
              },
            },
          },
        },
      },
    });

    if (!drive) return res.status(404).json({ error: 'Recruitment drive not found.' });

    let eligibleDepts: string[] = [];
    try {
      eligibleDepts = JSON.parse(drive.eligibleDepts || '[]');
    } catch (e) {
      eligibleDepts = [drive.eligibleDepts];
    }

    let gradYears: number[] = [2026];
    try {
      gradYears = JSON.parse(drive.graduationYears || '[2026]');
    } catch (e) {}

    let skillReqs = drive.skillRequirements.map((sr) => ({
      skillName: sr.skill.name,
      isRequired: sr.isRequired,
      weight: sr.weight,
      minProficiency: sr.minProficiency,
    }));

    if (skillReqs.length === 0) {
      try {
        const parsed = JSON.parse(drive.requiredSkills || '[]');
        skillReqs = parsed.map((name: string) => ({
          skillName: name,
          isRequired: true,
          weight: 1.0,
          minProficiency: 50,
        }));
      } catch (e) {}
    }

    const recruiterScoreMap = new Map<string, number>();
    for (const rs of drive.recruiterScores) {
      recruiterScoreMap.set(rs.studentId, rs.score);
    }

    const candidateInputs = drive.applications.map((app) => {
      const s = app.student;
      let sSkills = s.studentSkills.map((ss) => ({
        skillName: ss.skill.name,
        proficiency: ss.proficiency,
      }));

      if (sSkills.length === 0) {
        try {
          const parsed = JSON.parse(s.skills || '[]');
          sSkills = parsed.map((name: string) => ({ skillName: name, proficiency: 75 }));
        } catch (e) {}
      }

      const pref = s.preferences.find((p) => p.driveId === driveId);

      return {
        applicationId: app.id,
        studentId: s.studentId,
        studentDbId: s.id,
        studentName: s.name,
        department: s.department,
        gpa: s.gpa,
        graduationYear: s.graduationYear,
        status: s.status,
        skills: sSkills,
        recruiterScore: recruiterScoreMap.get(s.id),
        preferenceRank: pref ? pref.rank : 99,
      };
    });

    const evaluated = selectionEngine.evaluateApplicants(candidateInputs, {
      driveId: drive.id,
      companyName: drive.company.name,
      role: drive.role,
      minGpa: drive.minGpa,
      eligibleDepts,
      graduationYears: gradYears,
      skillRequirements: skillReqs,
      shortlistCapacity: drive.openPositions * 3, // e.g. 3x quota for interview shortlists
      recruiterScoreCutoff: 50,
      status: drive.status,
    });

    // Merge latest manual decisions from SelectionLog
    const latestLogs = await prisma.selectionLog.findMany({
      where: { driveId },
      orderBy: { createdAt: 'desc' },
    });

    const overrideMap = new Map<string, { decision: string; reason: string }>();
    for (const log of latestLogs) {
      if (!overrideMap.has(log.studentId)) {
        overrideMap.set(log.studentId, { decision: log.decision, reason: log.reason });
      }
    }

    const finalEvaluated = evaluated.map((cand) => {
      const override = overrideMap.get(cand.studentDbId);
      if (override) {
        return {
          ...cand,
          decision: override.decision as any,
          deselectionReason: override.decision === 'DESELECTED' ? override.reason : undefined,
        };
      }
      return cand;
    });

    res.json({
      drive: {
        id: drive.id,
        companyName: drive.company.name,
        role: drive.role,
        tier: drive.offerTier,
        quota: drive.openPositions,
        minGpa: drive.minGpa,
        packageLpa: drive.packageLpa,
      },
      totalApplicants: candidateInputs.length,
      evaluatedCandidates: finalEvaluated,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/selection/drives/:driveId/scores - Record candidate recruiter evaluations
selectionRouter.post('/drives/:driveId/scores', requireAuth, async (req: Request, res: Response) => {
  try {
    const { driveId } = req.params;
    const { studentId, score, technicalScore, softSkillScore, notes, evaluatedBy } = req.body;

    if (!studentId || score === undefined) {
      return res.status(400).json({ error: 'studentId and score are required.' });
    }

    const student = await prisma.student.findFirst({
      where: { OR: [{ id: studentId }, { studentId: studentId.toUpperCase() }] },
    });

    if (!student) return res.status(404).json({ error: 'Student not found.' });

    const recruiterScore = await prisma.recruiterScore.upsert({
      where: {
        studentId_driveId: {
          studentId: student.id,
          driveId,
        },
      },
      create: {
        studentId: student.id,
        driveId,
        score: Math.min(100, Math.max(0, score)),
        technicalScore: technicalScore !== undefined ? Math.min(100, Math.max(0, technicalScore)) : null,
        softSkillScore: softSkillScore !== undefined ? Math.min(100, Math.max(0, softSkillScore)) : null,
        notes: notes || null,
        evaluatedBy: evaluatedBy || (req as any).user?.name || 'TPO Reviewer',
      },
      update: {
        score: Math.min(100, Math.max(0, score)),
        technicalScore: technicalScore !== undefined ? Math.min(100, Math.max(0, technicalScore)) : null,
        softSkillScore: softSkillScore !== undefined ? Math.min(100, Math.max(0, softSkillScore)) : null,
        notes: notes || null,
        evaluatedBy: evaluatedBy || (req as any).user?.name || 'TPO Reviewer',
      },
    });

    await prisma.selectionLog.create({
      data: {
        studentId: student.id,
        driveId,
        decision: 'EVALUATED',
        score: recruiterScore.score,
        reason: 'Recruiter scoring completed',
        source: 'RECRUITER',
      },
    });

    res.json({ success: true, data: recruiterScore });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/selection/drives/:driveId/decide - Manual Selection / Deselection Override
selectionRouter.post('/drives/:driveId/decide', requireAuth, requireRole(['super_admin', 'admin', 'coordinator']), async (req: Request, res: Response) => {
  try {
    const { driveId } = req.params;
    const { studentId, decision, reason, score, cutoff } = req.body;

    if (!studentId || !decision) {
      return res.status(400).json({ error: 'studentId and decision are required.' });
    }

    const student = await prisma.student.findFirst({
      where: { OR: [{ id: studentId }, { studentId: studentId.toUpperCase() }] },
    });

    if (!student) return res.status(404).json({ error: 'Student not found.' });

    // Update or create application status
    const app = await prisma.application.findUnique({
      where: {
        studentId_driveId: {
          studentId: student.id,
          driveId,
        },
      },
    });

    if (app) {
      await prisma.application.update({
        where: { id: app.id },
        data: {
          status: decision.toLowerCase(),
        },
      });
    } else {
      await prisma.application.create({
        data: {
          studentId: student.id,
          driveId,
          status: decision.toLowerCase(),
        },
      });
    }

    const log = await prisma.selectionLog.create({
      data: {
        studentId: student.id,
        driveId,
        decision: decision.toUpperCase(),
        reason: reason || (decision === 'DESELECTED' ? 'TPO_DECISION' : 'SELECTION_APPROVED'),
        score: score || null,
        cutoff: cutoff || null,
        previousState: app?.status || 'applied',
        newState: decision.toLowerCase(),
        source: 'TPO_OVERRIDE',
      },
    });

    res.json({ success: true, log });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/selection/logs - Fetch Selection & Deselection Audit Logs
selectionRouter.get('/logs', async (req: Request, res: Response) => {
  try {
    const { driveId, studentId, decision, limit } = req.query;

    const where: any = {};
    if (driveId) where.driveId = String(driveId);
    if (decision) where.decision = String(decision).toUpperCase();
    if (studentId) {
      const student = await prisma.student.findFirst({
        where: { OR: [{ id: String(studentId) }, { studentId: String(studentId).toUpperCase() }] },
      });
      if (student) where.studentId = student.id;
    }

    const logs = await prisma.selectionLog.findMany({
      where,
      take: limit ? parseInt(String(limit), 10) : 100,
      orderBy: { createdAt: 'desc' },
      include: {
        student: { select: { studentId: true, name: true, department: true, gpa: true } },
        drive: { include: { company: true } },
      },
    });

    res.json({ data: logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
