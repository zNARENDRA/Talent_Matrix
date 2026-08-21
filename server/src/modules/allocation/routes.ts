import { Router, Request, Response } from 'express';
import { prisma, io } from '../../app.js';
import {
  ModuleAAllocationEngine,
  AllocationStudentInput,
  AllocationDriveInput,
} from '../../engine/module-a-allocation.js';
import { SimulationEngine, SimulationOverride } from '../../engine/simulation-engine.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

export const allocationRouter = Router();
const moduleAEngine = new ModuleAAllocationEngine();
const simulationEngine = new SimulationEngine();

// Helper to fetch normalized allocation inputs from DB
async function fetchAllocationInputs(season = '2026', cycleId?: string) {
  const [studentsRaw, drivesRaw, prefsRaw, scoresRaw, offersRaw] = await Promise.all([
    prisma.student.findMany({
      where: {
        status: { in: ['eligible', 'registered', 'placed'] },
        ...(cycleId ? { recruitmentCycleId: cycleId } : {}),
      },
      include: {
        studentSkills: { include: { skill: true } },
      },
    }),
    prisma.recruitmentDrive.findMany({
      where: {
        status: { in: ['open', 'in_progress'] },
        ...(cycleId ? { recruitmentCycleId: cycleId } : { season }),
      },
      include: {
        company: true,
        skillRequirements: { include: { skill: true } },
      },
    }),
    prisma.studentPreference.findMany({
      orderBy: { rank: 'asc' },
    }),
    prisma.recruiterScore.findMany(),
    prisma.offer.findMany({
      where: { status: { in: ['accepted', 'pending'] } },
      include: { drive: { include: { company: true } } },
    }),
  ]);

  const students: AllocationStudentInput[] = studentsRaw.map((s) => {
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

    const studentPrefs = prefsRaw
      .filter((p) => p.studentId === s.id)
      .sort((a, b) => a.rank - b.rank)
      .map((p) => p.driveId);

    const existingOffer = offersRaw.find((o) => o.studentId === s.id);

    return {
      id: s.id,
      studentId: s.studentId,
      name: s.name,
      department: s.department,
      gpa: s.gpa,
      graduationYear: s.graduationYear,
      status: s.status,
      skills: sSkills,
      preferences: studentPrefs,
      existingOffer: existingOffer ? {
        driveId: existingOffer.driveId,
        companyName: existingOffer.drive.company.name,
        tier: existingOffer.tier,
        packageLpa: existingOffer.packageLpa,
      } : undefined,
    };
  });

  const drives: AllocationDriveInput[] = drivesRaw.map((d) => {
    let elDepts: string[] = [];
    try {
      elDepts = JSON.parse(d.eligibleDepts || '[]');
    } catch (e) {
      elDepts = [d.eligibleDepts];
    }

    let gradYears: number[] = [2026];
    try {
      gradYears = JSON.parse(d.graduationYears || '[2026]');
    } catch (e) {}

    let skillReqs = d.skillRequirements.map((sr) => ({
      skillName: sr.skill.name,
      isRequired: sr.isRequired,
      weight: sr.weight,
      minProficiency: sr.minProficiency,
    }));

    if (skillReqs.length === 0) {
      try {
        const parsed = JSON.parse(d.requiredSkills || '[]');
        skillReqs = parsed.map((name: string) => ({
          skillName: name,
          isRequired: true,
          weight: 1.0,
          minProficiency: 50,
        }));
      } catch (e) {}
    }

    const driveScores = new Map<string, number>();
    for (const rs of scoresRaw.filter((s) => s.driveId === d.id)) {
      driveScores.set(rs.studentId, rs.score);
    }

    let weights;
    try {
      if (d.selectionCriteria) weights = JSON.parse(d.selectionCriteria);
    } catch (e) {}

    return {
      id: d.id,
      companyId: d.companyId,
      companyName: d.company.name,
      role: d.role,
      packageLpa: d.packageLpa,
      tier: d.offerTier,
      quota: d.openPositions,
      minGpa: d.minGpa,
      eligibleDepts: elDepts,
      graduationYears: gradYears,
      skillRequirements: skillReqs,
      weights,
      candidateScores: driveScores,
      status: d.status,
    };
  });

  return { students, drives };
}

// POST /api/allocation/run - Execute Module A Many-to-One Gale-Shapley Allocation
allocationRouter.post('/run', requireAuth, requireRole(['super_admin', 'admin', 'coordinator']), async (req: Request, res: Response) => {
  try {
    const { season = '2026', recruitmentCycleId } = req.body;

    const { students, drives } = await fetchAllocationInputs(season, recruitmentCycleId);

    // Create allocation run in database
    const run = await prisma.allocationRun.create({
      data: {
        season,
        recruitmentCycleId: recruitmentCycleId || null,
        status: 'RUNNING',
        startedAt: new Date(),
        triggeredBy: (req as any).user?.email || 'admin',
      },
    });

    if (io) {
      io.emit('allocation:started', { runId: run.id, totalStudents: students.length, totalDrives: drives.length });
    }

    // Execute Pure Domain Many-to-One Gale-Shapley Engine
    const result = moduleAEngine.run(students, drives);

    // Persist matches into AllocationResult
    const resultCreates = [];
    for (const [studentId, match] of result.matches) {
      const expl = result.explanations.find((e) => e.studentId === studentId || e.studentName === studentId);
      resultCreates.push(
        prisma.allocationResult.create({
          data: {
            runId: run.id,
            studentId,
            driveId: match.driveId,
            status: 'matched',
            reason: expl?.reason || `Matched with ${match.companyName}`,
          },
        })
      );
    }

    // Persist unmatched records
    for (const sId of result.unmatchedStudentIds) {
      const expl = result.explanations.find((e) => e.studentId === sId);
      resultCreates.push(
        prisma.allocationResult.create({
          data: {
            runId: run.id,
            studentId: sId,
            driveId: drives[0]?.id || '',
            status: 'unmatched',
            reason: expl?.reason || 'Preferences exhausted without capacity',
          },
        })
      );
    }

    await prisma.$transaction(resultCreates);

    // Persist audit events & cascade logs
    const eventCreates = [];
    for (const log of result.cascadeLogs) {
      eventCreates.push(
        prisma.allocationEvent.create({
          data: {
            runId: run.id,
            studentId: log.studentId,
            driveId: log.driveId,
            eventType: log.type,
            tier: log.tier,
            reason: log.description,
            metadata: JSON.stringify(log),
          },
        })
      );
    }
    if (eventCreates.length > 0) {
      await prisma.$transaction(eventCreates);
    }

    // Update AllocationRun with complete metrics
    const updatedRun = await prisma.allocationRun.update({
      where: { id: run.id },
      data: {
        status: 'SUCCESS',
        completedAt: new Date(),
        totalStudents: result.metrics.totalStudents,
        totalCompanies: result.metrics.totalCompanies,
        totalMatches: result.metrics.allocatedCount,
        totalUnallocated: result.metrics.unallocatedCount,
        cascadeCount: result.metrics.cascadeCount,
        blockingPairCount: result.stability.blockingPairCount,
        metrics: JSON.stringify(result.metrics),
      },
    });

    // Update student placement statuses and outcomes in DB
    const studentStatusUpdates = [];
    for (const [studentId, match] of result.matches) {
      studentStatusUpdates.push(
        prisma.student.update({
          where: { id: studentId },
          data: {
            status: 'placed',
            placementOutcome: 'PLACED',
          },
        })
      );
    }
    for (const sId of result.unmatchedStudentIds) {
      studentStatusUpdates.push(
        prisma.student.update({
          where: { id: sId },
          data: {
            placementOutcome: 'UNALLOCATED',
          },
        })
      );
    }
    if (studentStatusUpdates.length > 0) {
      await prisma.$transaction(studentStatusUpdates);
    }

    // Update drive filled positions
    const driveUpdates = [];
    for (const [driveId, util] of result.driveUtilization) {
      driveUpdates.push(
        prisma.recruitmentDrive.update({
          where: { id: driveId },
          data: { filledPositions: util.allocated },
        })
      );
    }
    if (driveUpdates.length > 0) {
      await prisma.$transaction(driveUpdates);
    }

    // Serialize matches Map to array with real student names for frontend graph and tables
    const serializedMatches = Array.from(result.matches.entries()).map(([studentDbId, match]) => {
      const student = students.find((s) => s.id === studentDbId);
      const expl = result.explanations.find((e) => e.studentId === student?.studentId || e.studentName === student?.name);
      return {
        studentDbId,
        studentId: student?.studentId || studentDbId,
        studentName: student?.name || expl?.studentName || 'Student Candidate',
        department: student?.department || expl?.department || 'Engineering',
        gpa: student?.gpa || expl?.gpa || 8.0,
        driveId: match.driveId,
        companyName: match.companyName,
        role: match.role,
        tier: match.tier,
        packageLpa: match.packageLpa,
        status: 'matched',
      };
    });

    res.json({
      success: true,
      runId: run.id,
      run: updatedRun,
      metrics: result.metrics,
      stability: result.stability,
      matches: serializedMatches,
      explanations: result.explanations,
      cascadeLogs: result.cascadeLogs,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/allocation/simulate - Execute What-If scenario simulation in-memory
allocationRouter.post('/simulate', requireAuth, async (req: Request, res: Response) => {
  try {
    const { season = '2026', recruitmentCycleId, overrides } = req.body;

    if (!Array.isArray(overrides)) {
      return res.status(400).json({ error: 'overrides array is required.' });
    }

    const { students, drives } = await fetchAllocationInputs(season, recruitmentCycleId);
    const simulationResult = simulationEngine.simulate(students, drives, overrides as SimulationOverride[]);

    res.json({
      success: true,
      isSimulation: true,
      ...simulationResult,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/allocation/runs - List historical runs
allocationRouter.get('/runs', async (_req: Request, res: Response) => {
  try {
    const runs = await prisma.allocationRun.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        cycle: true,
        _count: { select: { results: true, events: true, conflicts: true } },
      },
    });

    const parsed = runs.map((r) => ({
      ...r,
      metrics: r.metrics ? JSON.parse(r.metrics) : null,
    }));

    res.json({ data: parsed });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/allocation/runs/:id - Get specific run details with stability certificate
allocationRouter.get('/runs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const run = await prisma.allocationRun.findUnique({
      where: { id },
      include: {
        cycle: true,
        results: {
          include: {
            drive: { include: { company: true } },
          },
        },
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!run) return res.status(404).json({ error: 'Allocation run not found.' });

    res.json({
      ...run,
      metrics: run.metrics ? JSON.parse(run.metrics) : null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/allocation/preview - Real-time pre-flight inspection
allocationRouter.get('/preview', async (req: Request, res: Response) => {
  try {
    const season = (req.query.season as string) || '2026';
    const cycleId = req.query.cycleId as string;

    const [students, drives, offers, prefsCount] = await Promise.all([
      prisma.student.count({
        where: {
          status: { in: ['eligible', 'registered'] },
          ...(cycleId ? { recruitmentCycleId: cycleId } : {}),
        },
      }),
      prisma.recruitmentDrive.findMany({
        where: {
          status: { in: ['open', 'in_progress'] },
          ...(cycleId ? { recruitmentCycleId: cycleId } : { season }),
        },
        include: { company: true, _count: { select: { applications: true, skillRequirements: true } } },
      }),
      prisma.offer.count({ where: { status: { in: ['accepted', 'pending'] } } }),
      prisma.studentPreference.count(),
    ]);

    const totalPositions = drives.reduce((sum, d) => sum + (d.openPositions - d.filledPositions), 0);

    res.json({
      eligibleStudents: students,
      activeDrives: drives.length,
      totalPositions,
      existingOffers: offers,
      totalPreferencesSubmitted: prefsCount,
      drives: drives.map((d) => ({
        id: d.id,
        company: d.company.name,
        role: d.role,
        tier: d.offerTier,
        openPositions: d.openPositions - d.filledPositions,
        packageLpa: d.packageLpa,
        applications: d._count.applications,
        skillRequirementsCount: d._count.skillRequirements,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
