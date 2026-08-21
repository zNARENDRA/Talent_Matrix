import { Router, Request, Response } from 'express';
import { prisma } from '../../app.js';

export const reportsRouter = Router();

export function formatCSVRow(fields: (string | number | boolean | null | undefined)[]): string {
  return fields
    .map((field) => {
      if (field === null || field === undefined) return '""';
      const str = String(field).replace(/"/g, '""');
      return `"${str}"`;
    })
    .join(',');
}

// GET /api/reports/placement/csv - Generate live placement report CSV
reportsRouter.get('/placement/csv', async (_req: Request, res: Response) => {
  try {
    const offers = await prisma.offer.findMany({
      include: {
        student: true,
        drive: { include: { company: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['Offer ID', 'Student Name', 'Student ID', 'Department', 'GPA', 'Company', 'Role', 'Package (LPA)', 'Offer Tier', 'Status', 'Offered Date'];
    const rows = [formatCSVRow(headers)];

    for (const o of offers) {
      rows.push(
        formatCSVRow([
          o.id,
          o.student.name,
          o.student.studentId,
          o.student.department,
          o.student.gpa.toFixed(2),
          o.drive.company.name,
          o.drive.role,
          o.packageLpa,
          o.tier,
          o.status,
          new Date(o.createdAt).toISOString().split('T')[0],
        ])
      );
    }

    const csvContent = rows.join('\r\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="talentmatrix-placement-report-${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/yearly/csv - Academic Year Multi-Year Institutional Report CSV
reportsRouter.get('/yearly/csv', async (req: Request, res: Response) => {
  try {
    const { year } = req.query;
    const whereCycle: any = year ? { academicYear: String(year) } : {};

    const cycles = await prisma.recruitmentCycle.findMany({
      where: whereCycle,
      orderBy: { academicYear: 'desc' },
      include: {
        students: true,
        recruitmentDrives: {
          include: { company: true, offers: true },
        },
        allocationRuns: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    });

    const headers = [
      'Academic Year',
      'Cycle Status',
      'Total Registered Students',
      'Total Placed Students',
      'Placement Rate (%)',
      'Total Partner Companies',
      'Total Offers Extended',
      'Dream Tier Offers',
      'Core Tier Offers',
      'Mass Tier Offers',
      'Average Package (LPA)',
      'Highest Package (LPA)',
      'Cascading Events Count',
    ];
    const rows = [formatCSVRow(headers)];

    for (const c of cycles) {
      const totalStudents = c.students.length;
      const placedStudents = c.students.filter((s) => s.status === 'placed' || s.placementOutcome === 'PLACED').length;
      const placementRate = totalStudents > 0 ? ((placedStudents / totalStudents) * 100).toFixed(1) : '0';
      const allOffers = c.recruitmentDrives.flatMap((d) => d.offers);
      const packages = allOffers.map((o) => o.packageLpa);
      const avgPkg = packages.length > 0 ? (packages.reduce((a, b) => a + b, 0) / packages.length).toFixed(2) : '0';
      const maxPkg = packages.length > 0 ? Math.max(...packages).toFixed(2) : '0';

      const dreamCount = allOffers.filter((o) => o.tier.toUpperCase().includes('DREAM')).length;
      const coreCount = allOffers.filter((o) => o.tier.toUpperCase().includes('CORE')).length;
      const massCount = allOffers.filter((o) => o.tier.toUpperCase().includes('MASS') || o.tier.toUpperCase().includes('STANDARD')).length;

      rows.push(
        formatCSVRow([
          c.academicYear,
          c.status,
          totalStudents,
          placedStudents,
          placementRate,
          new Set(c.recruitmentDrives.map((d) => d.companyId)).size,
          allOffers.length,
          dreamCount,
          coreCount,
          massCount,
          avgPkg,
          maxPkg,
          c.allocationRuns[0]?.cascadeCount || 0,
        ])
      );
    }

    const csvContent = rows.join('\r\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="talentmatrix-yearly-institutional-report-${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/selection/csv - Selection & Deselection Audit Report CSV
reportsRouter.get('/selection/csv', async (req: Request, res: Response) => {
  try {
    const logs = await prisma.selectionLog.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        student: true,
        drive: { include: { company: true } },
      },
    });

    const headers = [
      'Log ID',
      'Student ID',
      'Student Name',
      'Department',
      'GPA',
      'Company Name',
      'Job Role',
      'Stage / Decision',
      'Deselection / Selection Reason',
      'Candidate Score',
      'Cutoff Threshold',
      'Source / Trigger',
      'Timestamp',
    ];
    const rows = [formatCSVRow(headers)];

    for (const l of logs) {
      rows.push(
        formatCSVRow([
          l.id,
          l.student.studentId,
          l.student.name,
          l.student.department,
          l.student.gpa.toFixed(2),
          l.drive.company.name,
          l.drive.role,
          l.decision,
          l.reason || 'N/A',
          l.score !== null ? l.score : 'N/A',
          l.cutoff !== null ? l.cutoff : 'N/A',
          l.source,
          new Date(l.createdAt).toISOString(),
        ])
      );
    }

    const csvContent = rows.join('\r\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="talentmatrix-selection-deselection-report-${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/outcomes/csv - Complete Candidate Outcomes CSV
reportsRouter.get('/outcomes/csv', async (_req: Request, res: Response) => {
  try {
    const students = await prisma.student.findMany({
      include: {
        offers: {
          include: { drive: { include: { company: true } } },
        },
      },
      orderBy: { studentId: 'asc' },
    });

    const headers = [
      'Student ID',
      'Name',
      'Department',
      'GPA',
      'Graduation Year',
      'Placement Outcome',
      'Final Company',
      'Final Role',
      'Final Package (LPA)',
      'Final Tier',
    ];
    const rows = [formatCSVRow(headers)];

    for (const s of students) {
      const acceptedOffer = s.offers.find((o) => o.status === 'accepted') || s.offers[0];
      rows.push(
        formatCSVRow([
          s.studentId,
          s.name,
          s.department,
          s.gpa.toFixed(2),
          s.graduationYear,
          s.placementOutcome,
          acceptedOffer ? acceptedOffer.drive.company.name : 'N/A',
          acceptedOffer ? acceptedOffer.drive.role : 'N/A',
          acceptedOffer ? acceptedOffer.packageLpa : 'N/A',
          acceptedOffer ? acceptedOffer.tier : 'N/A',
        ])
      );
    }

    const csvContent = rows.join('\r\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="talentmatrix-candidate-outcomes-report-${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/students/csv - Generate live students roster CSV
reportsRouter.get('/students/csv', async (_req: Request, res: Response) => {
  try {
    const students = await prisma.student.findMany({
      include: {
        offers: { select: { id: true, tier: true, packageLpa: true } },
        _count: { select: { applications: true, interviews: true } },
      },
      orderBy: { studentId: 'asc' },
    });

    const headers = ['Student ID', 'Name', 'Email', 'Department', 'GPA', 'Status', 'Graduation Year', 'Total Offers', 'Highest Package (LPA)', 'Applications Count'];
    const rows = [formatCSVRow(headers)];

    for (const s of students) {
      const maxLpa = s.offers.length > 0 ? Math.max(...s.offers.map((o) => o.packageLpa)) : 0;
      rows.push(
        formatCSVRow([
          s.studentId,
          s.name,
          s.email,
          s.department,
          s.gpa.toFixed(2),
          s.status,
          s.graduationYear,
          s.offers.length,
          maxLpa > 0 ? maxLpa : 'N/A',
          s._count.applications,
        ])
      );
    }

    const csvContent = rows.join('\r\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="talentmatrix-students-report-${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/companies/csv - Generate live company recruitment report CSV
reportsRouter.get('/companies/csv', async (_req: Request, res: Response) => {
  try {
    const companies = await prisma.company.findMany({
      include: {
        recruitmentDrives: {
          include: {
            _count: { select: { applications: true, offers: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const headers = ['Company Name', 'Industry', 'Website', 'Total Drives', 'Total Positions Open', 'Total Offers Extended', 'Total Applications'];
    const rows = [formatCSVRow(headers)];

    for (const c of companies) {
      const totalPositions = c.recruitmentDrives.reduce((sum, d) => sum + d.openPositions, 0);
      const totalOffers = c.recruitmentDrives.reduce((sum, d) => sum + d._count.offers, 0);
      const totalApps = c.recruitmentDrives.reduce((sum, d) => sum + d._count.applications, 0);

      rows.push(
        formatCSVRow([
          c.name,
          c.industry,
          c.website || 'N/A',
          c.recruitmentDrives.length,
          totalPositions,
          totalOffers,
          totalApps,
        ])
      );
    }

    const csvContent = rows.join('\r\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="talentmatrix-companies-report-${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/integrity/csv - Generate assessment integrity & anomaly report CSV
reportsRouter.get('/integrity/csv', async (_req: Request, res: Response) => {
  try {
    const sessions = await prisma.assessmentSession.findMany({
      include: {
        student: true,
        alerts: true,
      },
      orderBy: { startedAt: 'desc' },
    });

    const headers = ['Session ID', 'Candidate Name', 'Student ID', 'Assessment Name', 'Authenticity Score', 'Risk Level', 'Total Events Logged', 'Active Alerts', 'Status', 'Timestamp'];
    const rows = [formatCSVRow(headers)];

    for (const s of sessions) {
      rows.push(
        formatCSVRow([
          s.id,
          s.student.name,
          s.student.studentId,
          s.assessmentName,
          Math.round(s.authenticityScore),
          s.riskLevel,
          s.totalEvents,
          s.alerts.length,
          s.status,
          s.startedAt.toISOString(),
        ])
      );
    }

    const csvContent = rows.join('\r\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="talentmatrix-integrity-report-${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
