import { Router, Request, Response } from 'express';
import { prisma } from '../../app.js';

export const studentPortalRouter = Router();

// Helper to extract student ID from header or query or body
async function getStudentFromRequest(req: Request) {
  const studentIdOrUid = req.headers['x-student-id'] as string || req.query.studentId as string;
  if (!studentIdOrUid) {
    // Return first student for dev convenience if not supplied
    return await prisma.student.findFirst({
      include: {
        applications: {
          include: {
            drive: { include: { company: true } },
          },
          orderBy: { appliedAt: 'desc' },
        },
        offers: {
          include: {
            drive: { include: { company: true } },
          },
        },
        interviews: {
          include: {
            panel: true,
            round: { include: { drive: { include: { company: true } } } },
          },
          orderBy: { scheduledAt: 'asc' },
        },
        preferences: {
          orderBy: { rank: 'asc' },
        },
        assessments: {
          take: 5,
          orderBy: { startedAt: 'desc' },
        },
      },
    });
  }

  return await prisma.student.findFirst({
    where: {
      OR: [
        { id: studentIdOrUid },
        { studentId: studentIdOrUid.toUpperCase() },
      ],
    },
    include: {
      applications: {
        include: {
          drive: { include: { company: true } },
        },
        orderBy: { appliedAt: 'desc' },
      },
      offers: {
        include: {
          drive: { include: { company: true } },
        },
      },
      interviews: {
        include: {
          panel: true,
          round: { include: { drive: { include: { company: true } } } },
        },
        orderBy: { scheduledAt: 'asc' },
      },
      preferences: {
        orderBy: { rank: 'asc' },
      },
      assessments: {
        take: 5,
        orderBy: { startedAt: 'desc' },
      },
    },
  });
}

// GET /api/student-portal/me - Complete Student Portal Profile
studentPortalRouter.get('/me', async (req: Request, res: Response) => {
  try {
    const student = await getStudentFromRequest(req);
    if (!student) {
      return res.status(404).json({ error: 'Student record not found' });
    }

    const driveIds = student.preferences.map((p) => p.driveId);
    const drives = await prisma.recruitmentDrive.findMany({
      where: { id: { in: driveIds } },
      include: { company: true },
    });
    const enrichedPreferences = student.preferences.map((p) => ({
      ...p,
      drive: drives.find((d) => d.id === p.driveId),
    }));

    res.json({
      student: {
        id: student.id,
        studentId: student.studentId,
        name: student.name,
        email: student.email,
        phone: student.phone,
        department: student.department,
        gpa: student.gpa,
        skills: JSON.parse(student.skills || '[]'),
        status: student.status,
        graduationYear: student.graduationYear,
      },
      applications: student.applications,
      offers: student.offers,
      interviews: student.interviews,
      preferences: enrichedPreferences,
      assessments: student.assessments,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/student-portal/offers/:id/respond - Accept or Decline Placement Offer
studentPortalRouter.post('/offers/:id/respond', async (req: Request, res: Response) => {
  try {
    const { action } = req.body; // 'accepted' | 'rejected'
    if (!['accepted', 'rejected'].includes(action)) {
      return res.status(400).json({ error: 'Action must be accepted or rejected' });
    }

    const offer = await prisma.offer.findUnique({
      where: { id: req.params.id },
      include: {
        student: true,
        drive: { include: { company: true } },
      },
    });

    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update the offer status
      await tx.offer.update({
        where: { id: offer.id },
        data: { status: action },
      });

      // 2. If accepted, update student status and lock other lower-tier offers
      if (action === 'accepted') {
        await tx.student.update({
          where: { id: offer.studentId },
          data: { status: 'placed' },
        });

        // If it's a Super Dream or Dream offer, lock other pending offers
        if (offer.tier === 'super_dream' || offer.tier === 'dream') {
          await tx.offer.updateMany({
            where: {
              studentId: offer.studentId,
              id: { not: offer.id },
              status: 'pending',
            },
            data: {
              status: 'locked',
              reason: `Locked due to acceptance of ${offer.tier.replace('_', ' ')} offer from ${offer.drive.company.name}.`,
            },
          });
        }
      }

      // 3. Log audit event
      await tx.auditLog.create({
        data: {
          action: 'offer_response',
          entity: 'offer',
          entityId: offer.id,
          description: `Student ${offer.student.name} (${offer.student.studentId}) ${action} offer from ${offer.drive.company.name} (₹${offer.packageLpa} LPA, ${offer.tier}).`,
        },
      });

      // 4. Dispatch notification
      await tx.notification.create({
        data: {
          type: 'offer',
          title: `Offer ${action.toUpperCase()}`,
          message: `${offer.student.name} (${offer.student.studentId}) ${action} ${offer.drive.company.name} offer for ₹${offer.packageLpa} LPA.`,
          severity: 'info',
        },
      });
    });

    res.json({ success: true, message: `Offer successfully marked as ${action}.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/student-portal/preferences - Submit / Update Company Preferences
studentPortalRouter.post('/preferences', async (req: Request, res: Response) => {
  try {
    const { studentId, preferences } = req.body; // preferences: Array<{ driveId: string; rank: number }>
    if (!studentId || !Array.isArray(preferences)) {
      return res.status(400).json({ error: 'studentId and preferences array are required' });
    }

    const student = await prisma.student.findFirst({
      where: {
        OR: [{ id: studentId }, { studentId: studentId.toUpperCase() }],
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Delete existing and insert new rankings atomically
    await prisma.$transaction(async (tx) => {
      await tx.studentPreference.deleteMany({
        where: { studentId: student.id },
      });

      for (const p of preferences) {
        await tx.studentPreference.create({
          data: {
            studentId: student.id,
            driveId: p.driveId,
            rank: p.rank,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          action: 'update_preferences',
          entity: 'student_preference',
          entityId: student.id,
          description: `Student ${student.name} (${student.studentId}) submitted ${preferences.length} ranked company preferences.`,
        },
      });
    });

    res.json({ success: true, count: preferences.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/student-portal/available-drives - List drives the student can apply to
studentPortalRouter.get('/available-drives', async (req: Request, res: Response) => {
  try {
    const studentIdOrUid = req.headers['x-student-id'] as string || req.query.studentId as string;

    // Get the active recruitment cycle
    const activeCycle = await prisma.recruitmentCycle.findFirst({
      where: { status: 'ACTIVE' },
    });

    // Get all drives (optionally filtered to the active cycle)
    const drives = await prisma.recruitmentDrive.findMany({
      where: activeCycle ? { recruitmentCycleId: activeCycle.id } : {},
      include: { company: true },
      orderBy: { packageLpa: 'desc' },
    });

    // If we have a student, mark which drives they've already applied to
    let appliedDriveIds: string[] = [];
    if (studentIdOrUid) {
      const student = await prisma.student.findFirst({
        where: {
          OR: [{ id: studentIdOrUid }, { studentId: studentIdOrUid.toUpperCase() }],
        },
        include: { applications: { select: { driveId: true } } },
      });
      if (student) {
        appliedDriveIds = student.applications.map((a) => a.driveId);
      }
    }

    const enrichedDrives = drives.map((d) => ({
      id: d.id,
      companyName: d.company.name,
      companyId: d.company.id,
      role: d.role,
      packageLpa: d.packageLpa,
      offerTier: d.offerTier,
      positions: d.positions,
      status: d.status,
      alreadyApplied: appliedDriveIds.includes(d.id),
    }));

    res.json({ drives: enrichedDrives });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/student-portal/apply - Student applies to a recruitment drive
studentPortalRouter.post('/apply', async (req: Request, res: Response) => {
  try {
    const { studentId, driveId } = req.body;
    if (!studentId || !driveId) {
      return res.status(400).json({ error: 'studentId and driveId are required' });
    }

    const student = await prisma.student.findFirst({
      where: {
        OR: [{ id: studentId }, { studentId: studentId.toUpperCase() }],
      },
    });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const drive = await prisma.recruitmentDrive.findUnique({
      where: { id: driveId },
      include: { company: true },
    });
    if (!drive) {
      return res.status(404).json({ error: 'Recruitment drive not found' });
    }

    // Check if already applied
    const existing = await prisma.application.findFirst({
      where: { studentId: student.id, driveId: drive.id },
    });
    if (existing) {
      return res.status(409).json({ error: 'Already applied to this drive', applicationId: existing.id });
    }

    const application = await prisma.$transaction(async (tx) => {
      const app = await tx.application.create({
        data: {
          studentId: student.id,
          driveId: drive.id,
          status: 'applied',
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'student_applied',
          entity: 'application',
          entityId: app.id,
          description: `Student ${student.name} (${student.studentId}) applied to ${drive.company.name} — ${drive.role} (₹${drive.packageLpa} LPA, ${drive.offerTier}).`,
        },
      });

      await tx.notification.create({
        data: {
          type: 'drive',
          title: 'New Application',
          message: `${student.name} (${student.studentId}) applied to ${drive.company.name} — ${drive.role}.`,
          severity: 'info',
        },
      });

      return app;
    });

    res.json({ success: true, applicationId: application.id, message: `Applied to ${drive.company.name} — ${drive.role}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/student-portal/profile - Student updates their own profile
studentPortalRouter.patch('/profile', async (req: Request, res: Response) => {
  try {
    const { studentId, name, email, phone, department } = req.body;
    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required' });
    }

    const student = await prisma.student.findFirst({
      where: {
        OR: [{ id: studentId }, { studentId: studentId.toUpperCase() }],
      },
    });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (department !== undefined) updateData.department = department;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.student.update({
        where: { id: student.id },
        data: updateData,
      });

      const changedFields = Object.keys(updateData).join(', ');
      await tx.auditLog.create({
        data: {
          action: 'profile_update',
          entity: 'student',
          entityId: student.id,
          description: `Student ${student.name} (${student.studentId}) updated profile fields: ${changedFields}.`,
        },
      });
    });

    res.json({ success: true, message: 'Profile updated successfully', updatedFields: Object.keys(updateData) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
