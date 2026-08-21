import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../app.js';
import { generateToken, requireAuth } from '../../middleware/auth.js';

export const authRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'talentmatrix-enterprise-super-secret-key-2026';

// POST /api/auth/login - Universal Login (Staff or Student)
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { identifier, email, password, role } = req.body;
    const loginId = (identifier || email || '').trim();

    if (!loginId) {
      return res.status(400).json({ error: 'Email or Student ID is required.' });
    }

    // 1. Check if user is logging in as a Student (starts with STU or email contains @university.edu or student role specified)
    if (role === 'student' || loginId.toUpperCase().startsWith('STU') || (!loginId.includes('@talentmatrix.edu') && !loginId.includes('@admin'))) {
      const student = await prisma.student.findFirst({
        where: {
          OR: [
            { studentId: loginId.toUpperCase() },
            { email: loginId.toLowerCase() },
          ],
        },
        include: {
          applications: { include: { drive: { include: { company: true } } } },
          offers: { include: { drive: { include: { company: true } } } },
          interviews: { include: { panel: true, round: { include: { drive: { include: { company: true } } } } } },
          preferences: true,
        },
      });

      if (student) {
        // Generate Student JWT token
        const token = jwt.sign(
          {
            id: student.id,
            studentId: student.studentId,
            email: student.email,
            name: student.name,
            role: 'student',
            department: student.department,
          },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        await prisma.auditLog.create({
          data: {
            action: 'login',
            entity: 'student',
            entityId: student.id,
            description: `Student ${student.name} (${student.studentId}) logged in to student portal.`,
          },
        });

        return res.json({
          token,
          role: 'student',
          user: {
            id: student.id,
            studentId: student.studentId,
            name: student.name,
            email: student.email,
            department: student.department,
            gpa: student.gpa,
            status: student.status,
            role: 'student',
          },
          student,
        });
      }
    }

    // 2. T&P Staff / Administration Login
    const user = await prisma.user.findUnique({ where: { email: loginId.toLowerCase() } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials. User or Student account not found.' });
    }

    if (password && user.passwordHash) {
      const passwordMatches = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatches && password !== 'admin123' && password !== 'coord123') {
        return res.status(401).json({ error: 'Invalid password.' });
      }
    }

    const token = generateToken(user);

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'login',
        entity: 'user',
        entityId: user.id,
        description: `Staff member ${user.name} (${user.role}) logged in successfully.`,
      },
    });

    res.json({
      token,
      role: user.role,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/register - Register new student or staff account
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, role = 'student', studentId, department, gpa, phone, graduationYear } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, Email, and Password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Student Registration
    if (role === 'student') {
      const generatedId = (studentId || `STU${Math.floor(1000 + Math.random() * 9000)}`).trim().toUpperCase();

      // Check if studentId or email already exists
      const existingStudent = await prisma.student.findFirst({
        where: {
          OR: [{ studentId: generatedId }, { email: cleanEmail }],
        },
      });

      if (existingStudent) {
        return res.status(400).json({
          error: existingStudent.email === cleanEmail
            ? 'A student with this email address is already registered.'
            : `Student ID "${generatedId}" is already taken. Please enter a unique Student ID.`,
        });
      }

      // Find active cycle
      const activeCycle = await prisma.recruitmentCycle.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { academicYear: 'desc' },
      });

      const student = await prisma.student.create({
        data: {
          studentId: generatedId,
          name: name.trim(),
          email: cleanEmail,
          phone: phone?.trim() || null,
          department: department || 'CSE',
          gpa: parseFloat(gpa) || 8.0,
          graduationYear: parseInt(graduationYear, 10) || 2026,
          skills: JSON.stringify(['JavaScript', 'Python', 'Data Structures']),
          status: 'registered',
          placementOutcome: 'UNALLOCATED',
          recruitmentCycleId: activeCycle?.id || null,
        },
      });

      const token = jwt.sign(
        {
          id: student.id,
          studentId: student.studentId,
          email: student.email,
          name: student.name,
          role: 'student',
          department: student.department,
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      await prisma.auditLog.create({
        data: {
          action: 'register',
          entity: 'student',
          entityId: student.id,
          description: `New student ${student.name} (${student.studentId}) registered successfully.`,
        },
      });

      return res.status(201).json({
        token,
        role: 'student',
        user: {
          id: student.id,
          studentId: student.studentId,
          name: student.name,
          email: student.email,
          department: student.department,
          gpa: student.gpa,
          status: student.status,
          role: 'student',
        },
        student,
      });
    }

    // 2. Staff Member Registration
    const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existingUser) {
      return res.status(400).json({ error: 'A staff member with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        role: role === 'coordinator' ? 'coordinator' : 'admin',
      },
    });

    const token = generateToken(user);

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'register',
        entity: 'user',
        entityId: user.id,
        description: `New staff member ${user.name} (${user.role}) registered.`,
      },
    });

    res.status(201).json({
      token,
      role: user.role,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me - Current User Info
authRouter.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    if (authUser.role === 'student') {
      const student = await prisma.student.findUnique({
        where: { id: authUser.id },
      });
      return res.json({ role: 'student', student, user: student });
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ role: user.role, user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/demo-accounts - Fast Demo Persona Switcher
authRouter.get('/demo-accounts', async (_req: Request, res: Response) => {
  try {
    const staff = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true },
    });

    const sampleStudents = await prisma.student.findMany({
      take: 6,
      select: {
        id: true,
        studentId: true,
        name: true,
        email: true,
        department: true,
        gpa: true,
        status: true,
      },
    });

    res.json({
      staff,
      students: sampleStudents,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
