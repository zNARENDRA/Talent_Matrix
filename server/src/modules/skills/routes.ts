import { Router, Request, Response } from 'express';
import { prisma } from '../../app.js';
import { SkillMatchingService } from '../../engine/skill-matching.js';
import { requireAuth } from '../../middleware/auth.js';

export const skillsRouter = Router();
const skillMatcher = new SkillMatchingService();

// GET /api/skills - List all skills in catalog
skillsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const skills = await prisma.skill.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    res.json({ data: skills });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/skills - Create new skill in catalog
skillsRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, category } = req.body;
    if (!name) return res.status(400).json({ error: 'Skill name is required.' });

    const normName = name.trim();
    const existing = await prisma.skill.findUnique({ where: { name: normName } });
    if (existing) return res.json({ data: existing });

    const skill = await prisma.skill.create({
      data: {
        name: normName,
        category: category || 'General',
      },
    });

    res.status(201).json({ success: true, data: skill });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/skills/students/:studentId - Get student's skill profile
skillsRouter.get('/students/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const student = await prisma.student.findFirst({
      where: {
        OR: [{ id: studentId }, { studentId: studentId.toUpperCase() }],
      },
      include: {
        studentSkills: {
          include: { skill: true },
          orderBy: { proficiency: 'desc' },
        },
      },
    });

    if (!student) return res.status(404).json({ error: 'Student not found.' });

    res.json({
      studentId: student.studentId,
      studentName: student.name,
      skills: student.studentSkills.map((ss) => ({
        skillId: ss.skillId,
        skillName: ss.skill.name,
        category: ss.skill.category,
        proficiency: ss.proficiency,
        isVerified: ss.isVerified,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/skills/students/:studentId - Update student's skills and proficiencies
skillsRouter.post('/students/:studentId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { skills } = req.body; // Array<{ skillName?: string; skillId?: string; proficiency: number }>

    if (!Array.isArray(skills)) {
      return res.status(400).json({ error: 'skills array is required.' });
    }

    const student = await prisma.student.findFirst({
      where: {
        OR: [{ id: studentId }, { studentId: studentId.toUpperCase() }],
      },
    });

    if (!student) return res.status(404).json({ error: 'Student not found.' });

    // Upsert skills in transaction
    await prisma.$transaction(async (tx) => {
      // Clear existing student skills
      await tx.studentSkill.deleteMany({ where: { studentId: student.id } });

      const legacySkillNames: string[] = [];

      for (const item of skills) {
        let skillId = item.skillId;
        if (!skillId && item.skillName) {
          let foundSkill = await tx.skill.findUnique({ where: { name: item.skillName.trim() } });
          if (!foundSkill) {
            foundSkill = await tx.skill.create({
              data: { name: item.skillName.trim(), category: 'General' },
            });
          }
          skillId = foundSkill.id;
          legacySkillNames.push(foundSkill.name);
        }

        if (skillId) {
          await tx.studentSkill.create({
            data: {
              studentId: student.id,
              skillId,
              proficiency: Math.min(100, Math.max(0, item.proficiency ?? 70)),
              isVerified: item.isVerified ?? false,
            },
          });
        }
      }

      if (legacySkillNames.length > 0) {
        await tx.student.update({
          where: { id: student.id },
          data: { skills: JSON.stringify(legacySkillNames) },
        });
      }
    });

    res.json({ success: true, message: 'Skills updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/skills/compatibility - Compute real-time compatibility score
skillsRouter.get('/compatibility', async (req: Request, res: Response) => {
  try {
    const { studentId, driveId } = req.query;
    if (!studentId || !driveId) {
      return res.status(400).json({ error: 'studentId and driveId query params required.' });
    }

    const student = await prisma.student.findFirst({
      where: { OR: [{ id: String(studentId) }, { studentId: String(studentId).toUpperCase() }] },
      include: { studentSkills: { include: { skill: true } } },
    });

    const drive = await prisma.recruitmentDrive.findUnique({
      where: { id: String(driveId) },
      include: {
        company: true,
        skillRequirements: { include: { skill: true } },
      },
    });

    if (!student || !drive) return res.status(404).json({ error: 'Student or Drive not found.' });

    // Build skill lists
    let studentSkills = student.studentSkills.map((ss) => ({
      skillName: ss.skill.name,
      proficiency: ss.proficiency,
    }));

    if (studentSkills.length === 0) {
      try {
        const parsed = JSON.parse(student.skills || '[]');
        studentSkills = parsed.map((name: string) => ({ skillName: name, proficiency: 75 }));
      } catch (e) {}
    }

    let requirements = drive.skillRequirements.map((sr) => ({
      skillName: sr.skill.name,
      isRequired: sr.isRequired,
      weight: sr.weight,
      minProficiency: sr.minProficiency,
    }));

    if (requirements.length === 0) {
      try {
        const parsed = JSON.parse(drive.requiredSkills || '[]');
        requirements = parsed.map((name: string) => ({
          skillName: name,
          isRequired: true,
          weight: 1.0,
          minProficiency: 50,
        }));
      } catch (e) {}
    }

    const result = skillMatcher.calculateMatch(studentSkills, requirements);

    res.json({
      student: { id: student.id, studentId: student.studentId, name: student.name },
      drive: { id: drive.id, companyName: drive.company.name, role: drive.role },
      ...result,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
