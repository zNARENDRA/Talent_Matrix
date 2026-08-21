import { PrismaClient } from '@prisma/client';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const pickN = <T>(arr: T[], n: number): T[] => {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
};
const randBetween = (min: number, max: number) => Math.round((Math.random() * (max - min) + min) * 100) / 100;
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);

// ─── Data Constants ───────────────────────────────────────────
const DEPARTMENTS_DATA = [
  { code: 'CSE', name: 'Computer Science & Engineering' },
  { code: 'IT', name: 'Information Technology' },
  { code: 'ECE', name: 'Electronics & Communication Engineering' },
  { code: 'EEE', name: 'Electrical & Electronics Engineering' },
  { code: 'ME', name: 'Mechanical Engineering' },
  { code: 'CE', name: 'Civil Engineering' },
  { code: 'CHE', name: 'Chemical Engineering' },
  { code: 'MBA', name: 'Master of Business Administration' },
  { code: 'AIDS', name: 'Artificial Intelligence & Data Science' },
];

const SKILLS_CATALOG = [
  { name: 'JavaScript', category: 'Programming' },
  { name: 'TypeScript', category: 'Programming' },
  { name: 'Python', category: 'Programming' },
  { name: 'Java', category: 'Programming' },
  { name: 'C++', category: 'Programming' },
  { name: 'Go', category: 'Programming' },
  { name: 'Rust', category: 'Programming' },
  { name: 'React', category: 'Framework' },
  { name: 'Angular', category: 'Framework' },
  { name: 'Vue', category: 'Framework' },
  { name: 'Node.js', category: 'Framework' },
  { name: 'Express', category: 'Framework' },
  { name: 'Django', category: 'Framework' },
  { name: 'Spring Boot', category: 'Framework' },
  { name: 'SQL', category: 'Database' },
  { name: 'PostgreSQL', category: 'Database' },
  { name: 'MongoDB', category: 'Database' },
  { name: 'Redis', category: 'Database' },
  { name: 'AWS', category: 'Cloud' },
  { name: 'GCP', category: 'Cloud' },
  { name: 'Docker', category: 'Cloud' },
  { name: 'Kubernetes', category: 'Cloud' },
  { name: 'Machine Learning', category: 'AI_ML' },
  { name: 'Deep Learning', category: 'AI_ML' },
  { name: 'NLP', category: 'AI_ML' },
  { name: 'Data Structures', category: 'Core_CS' },
  { name: 'Algorithms', category: 'Core_CS' },
  { name: 'System Design', category: 'Core_CS' },
  { name: 'DBMS', category: 'Core_CS' },
  { name: 'OS', category: 'Core_CS' },
  { name: 'Git', category: 'Tools' },
  { name: 'REST APIs', category: 'Web' },
  { name: 'GraphQL', category: 'Web' },
  { name: 'Kafka', category: 'Database' },
  { name: 'PyTorch', category: 'AI_ML' },
];

const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan',
  'Shaurya', 'Atharva', 'Advik', 'Pranav', 'Advaith', 'Aarush', 'Kabir', 'Ritvik', 'Anirudh', 'Dhruv',
  'Ananya', 'Aadhya', 'Saanvi', 'Isha', 'Diya', 'Priya', 'Kavya', 'Aanya', 'Myra', 'Sara',
  'Riya', 'Neha', 'Pooja', 'Shreya', 'Tanvi', 'Aisha', 'Kiara', 'Avni', 'Zara', 'Navya',
  'Rohan', 'Karan', 'Rahul', 'Amit', 'Vikram', 'Nikhil', 'Harsh', 'Dev', 'Raj', 'Manav',
  'Simran', 'Divya', 'Meera', 'Swati', 'Nisha', 'Ankita', 'Jyoti', 'Pallavi', 'Sneha', 'Komal',
  'Arnav', 'Yash', 'Laksh', 'Rudra', 'Veer', 'Parth', 'Ansh', 'Neel', 'Om', 'Ishan',
  'Tara', 'Sia', 'Anika', 'Mira', 'Ira', 'Pihu', 'Ridhi', 'Siya', 'Trisha', 'Vanya',
];

const LAST_NAMES = [
  'Sharma', 'Patel', 'Singh', 'Kumar', 'Gupta', 'Joshi', 'Verma', 'Reddy', 'Nair', 'Iyer',
  'Chopra', 'Kapoor', 'Malhotra', 'Mehta', 'Shah', 'Agarwal', 'Banerjee', 'Chatterjee', 'Das', 'Roy',
  'Pillai', 'Menon', 'Rao', 'Pandey', 'Mishra', 'Tiwari', 'Dubey', 'Saxena', 'Bhat', 'Hegde',
  'Srinivasan', 'Krishnamurthy', 'Subramaniam', 'Venkatesh', 'Murthy', 'Desai', 'Kulkarni', 'Jain', 'Chauhan', 'Yadav',
];

const COMPANIES_DATA = [
  { name: 'Google', industry: 'Technology', roles: [{ role: 'SDE', pkg: 42, tier: 'DREAM', positions: 5 }, { role: 'ML Engineer', pkg: 45, tier: 'DREAM', positions: 3 }] },
  { name: 'Microsoft', industry: 'Technology', roles: [{ role: 'SDE', pkg: 38, tier: 'DREAM', positions: 8 }, { role: 'PM', pkg: 35, tier: 'DREAM', positions: 3 }] },
  { name: 'Amazon', industry: 'Technology', roles: [{ role: 'SDE', pkg: 32, tier: 'DREAM', positions: 12 }, { role: 'Data Engineer', pkg: 30, tier: 'DREAM', positions: 5 }] },
  { name: 'Adobe', industry: 'Technology', roles: [{ role: 'SDE', pkg: 28, tier: 'DREAM', positions: 6 }] },
  { name: 'Goldman Sachs', industry: 'Finance', roles: [{ role: 'Technology Analyst', pkg: 30, tier: 'DREAM', positions: 8 }] },
  { name: 'JP Morgan Chase', industry: 'Finance', roles: [{ role: 'Software Engineer', pkg: 25, tier: 'DREAM', positions: 10 }] },
  { name: 'Flipkart', industry: 'E-Commerce', roles: [{ role: 'SDE', pkg: 22, tier: 'DREAM', positions: 8 }] },
  { name: 'Razorpay', industry: 'FinTech', roles: [{ role: 'Backend Engineer', pkg: 20, tier: 'CORE', positions: 6 }] },
  { name: 'PhonePe', industry: 'FinTech', roles: [{ role: 'SDE', pkg: 18, tier: 'CORE', positions: 8 }] },
  { name: 'Juspay', industry: 'FinTech', roles: [{ role: 'Full Stack Developer', pkg: 16, tier: 'CORE', positions: 5 }] },
  { name: 'Infosys', industry: 'IT Services', roles: [{ role: 'Systems Engineer', pkg: 6.5, tier: 'MASS', positions: 40 }, { role: 'Digital Specialist', pkg: 9, tier: 'CORE', positions: 15 }] },
  { name: 'TCS', industry: 'IT Services', roles: [{ role: 'Assistant System Engineer', pkg: 7, tier: 'MASS', positions: 50 }, { role: 'Digital Engineer', pkg: 11, tier: 'CORE', positions: 12 }] },
  { name: 'Wipro', industry: 'IT Services', roles: [{ role: 'Project Engineer', pkg: 6, tier: 'MASS', positions: 35 }] },
  { name: 'Oracle', industry: 'Technology', roles: [{ role: 'Application Developer', pkg: 15, tier: 'CORE', positions: 10 }] },
  { name: 'Deloitte', industry: 'Consulting', roles: [{ role: 'Technology Consultant', pkg: 12, tier: 'CORE', positions: 15 }] },
  { name: 'Uber', industry: 'Technology', roles: [{ role: 'SDE', pkg: 35, tier: 'DREAM', positions: 4 }] },
];

async function seed() {
  console.log('🌱 Seeding TalentMatrix Enterprise database (Module A)...');

  // Clear existing records
  await prisma.crawledJob.deleteMany();
  await prisma.crawlerSource.deleteMany();
  await prisma.selectionLog.deleteMany();
  await prisma.recruiterScore.deleteMany();
  await prisma.companySkillRequirement.deleteMany();
  await prisma.studentSkill.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.department.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.anomalyAlert.deleteMany();
  await prisma.telemetryEvent.deleteMany();
  await prisma.assessmentSession.deleteMany();
  await prisma.interview.deleteMany();
  await prisma.interviewSlot.deleteMany();
  await prisma.interviewPanel.deleteMany();
  await prisma.interviewRound.deleteMany();
  await prisma.allocationEvent.deleteMany();
  await prisma.allocationConflict.deleteMany();
  await prisma.allocationResult.deleteMany();
  await prisma.allocationRun.deleteMany();
  await prisma.companyPreference.deleteMany();
  await prisma.studentPreference.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.offerPolicy.deleteMany();
  await prisma.application.deleteMany();
  await prisma.recruitmentDrive.deleteMany();
  await prisma.company.deleteMany();
  await prisma.student.deleteMany();
  await prisma.recruitmentCycle.deleteMany();
  await prisma.user.deleteMany();

  // 1. Recruitment Cycles
  console.log('  Creating recruitment cycles...');
  const cycle2024 = await prisma.recruitmentCycle.create({
    data: {
      academicYear: '2024-25',
      startDate: new Date('2024-07-01'),
      endDate: new Date('2025-06-30'),
      status: 'COMPLETED',
      description: 'Campus Placement Cycle for 2024-25 batch',
    },
  });

  const cycle2025 = await prisma.recruitmentCycle.create({
    data: {
      academicYear: '2025-26',
      startDate: new Date('2025-07-01'),
      endDate: new Date('2026-06-30'),
      status: 'COMPLETED',
      description: 'Campus Placement Cycle for 2025-26 batch',
    },
  });

  const cycle2026 = await prisma.recruitmentCycle.create({
    data: {
      academicYear: '2026-27',
      startDate: new Date('2026-07-01'),
      endDate: new Date('2027-06-30'),
      status: 'ACTIVE',
      description: 'Current Active Campus Placement Cycle for 2026-27 batch',
    },
  });

  // 2. Departments
  console.log('  Creating departments...');
  const deptMap = new Map<string, string>();
  for (const d of DEPARTMENTS_DATA) {
    const dept = await prisma.department.create({
      data: { code: d.code, name: d.name, isActive: true },
    });
    deptMap.set(d.code, dept.id);
  }

  // 3. Skills Catalog
  console.log('  Creating skills catalog...');
  const skillEntityMap = new Map<string, string>();
  for (const s of SKILLS_CATALOG) {
    const skill = await prisma.skill.create({
      data: { name: s.name, category: s.category },
    });
    skillEntityMap.set(s.name, skill.id);
  }

  // 4. Users
  console.log('  Creating admin & coordinator users...');
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@talentmatrix.edu',
      name: 'Dr. Rajesh Kumar (TPO Head)',
      passwordHash: await bcrypt.hash('admin123', 10),
      role: 'super_admin',
    },
  });

  await prisma.user.create({
    data: {
      email: 'coordinator@talentmatrix.edu',
      name: 'Prof. Sneha Deshmukh',
      passwordHash: await bcrypt.hash('admin123', 10),
      role: 'coordinator',
    },
  });

  // 5. Companies & Recruitment Drives
  console.log('  Creating companies & recruitment drives...');
  const createdDrives: any[] = [];

  for (const compData of COMPANIES_DATA) {
    const company = await prisma.company.create({
      data: {
        name: compData.name,
        industry: compData.industry,
        website: `https://${compData.name.toLowerCase().replace(/\s+/g, '')}.com`,
        description: `Global leader in ${compData.industry}`,
      },
    });

    for (const roleData of compData.roles) {
      const minGpa = roleData.pkg >= 30 ? 8.0 : roleData.pkg >= 15 ? 7.0 : 6.0;
      const eligibleDepts = roleData.pkg >= 30 ? ['CSE', 'IT', 'AIDS'] : ['ALL_DEPARTMENTS'];
      const reqSkills = pickN(SKILLS_CATALOG.map((s) => s.name), randInt(3, 5));

      const drive = await prisma.recruitmentDrive.create({
        data: {
          companyId: company.id,
          recruitmentCycleId: cycle2026.id,
          role: roleData.role,
          packageLpa: roleData.pkg,
          jobType: 'full_time',
          offerTier: roleData.tier,
          eligibleDepts: JSON.stringify(eligibleDepts),
          minGpa,
          graduationYears: JSON.stringify([2026, 2027]),
          requiredSkills: JSON.stringify(reqSkills),
          openPositions: roleData.positions,
          filledPositions: 0,
          applicationDeadline: new Date(Date.now() + 14 * 86400000),
          status: 'open',
          season: '2026',
        },
      });

      // Add CompanySkillRequirement records
      for (let i = 0; i < reqSkills.length; i++) {
        const skillName = reqSkills[i];
        const skillId = skillEntityMap.get(skillName);
        if (skillId) {
          await prisma.companySkillRequirement.create({
            data: {
              driveId: drive.id,
              skillId,
              isRequired: i < 2, // First 2 are required
              weight: i < 2 ? 2.0 : 1.0,
              minProficiency: minGpa >= 8.0 ? 65.0 : 50.0,
            },
          });
        }
      }

      createdDrives.push({ ...drive, companyName: compData.name });
    }
  }

  // 6. Students (500+ students)
  console.log('  Generating students with normalized skills...');
  const createdStudents: any[] = [];

  for (let i = 1; i <= 520; i++) {
    const fn = pick(FIRST_NAMES);
    const ln = pick(LAST_NAMES);
    const name = `${fn} ${ln}`;
    const studentId = `STU${1000 + i}`;
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@talentmatrix.edu`;
    const deptCode = pick(DEPARTMENTS_DATA.map((d) => d.code));
    const gpa = randBetween(6.0, 9.8);
    const studentSkills = pickN(SKILLS_CATALOG.map((s) => s.name), randInt(4, 7));

    const student = await prisma.student.create({
      data: {
        studentId,
        name,
        email,
        phone: `+91 98${randInt(10000000, 99999999)}`,
        department: deptCode,
        departmentId: deptMap.get(deptCode),
        recruitmentCycleId: cycle2026.id,
        gpa,
        skills: JSON.stringify(studentSkills),
        graduationYear: 2026,
        status: 'eligible',
        placementOutcome: 'UNALLOCATED',
      },
    });

    // Create StudentSkill records
    for (const skillName of studentSkills) {
      const skillId = skillEntityMap.get(skillName);
      if (skillId) {
        await prisma.studentSkill.create({
          data: {
            studentId: student.id,
            skillId,
            proficiency: randBetween(60, 96),
            isVerified: Math.random() > 0.4,
          },
        });
      }
    }

    createdStudents.push(student);
  }

  // 7. Applications, Preferences, & Recruiter Scores
  console.log('  Creating applications, preferences & recruiter scoring...');
  for (const student of createdStudents) {
    const preferredDrives = pickN(createdDrives, randInt(3, 5));

    for (let r = 0; r < preferredDrives.length; r++) {
      const drive = preferredDrives[r];

      await prisma.application.create({
        data: {
          studentId: student.id,
          driveId: drive.id,
          status: 'applied',
        },
      });

      await prisma.studentPreference.create({
        data: {
          studentId: student.id,
          driveId: drive.id,
          rank: r + 1,
        },
      });

      // Recruiter score (correlated with GPA)
      const score = Math.min(100, Math.max(30, Math.round(student.gpa * 10 + randBetween(-10, 10))));
      await prisma.recruiterScore.create({
        data: {
          studentId: student.id,
          driveId: drive.id,
          score,
          technicalScore: Math.min(100, score + randInt(-5, 5)),
          softSkillScore: Math.min(100, score + randInt(-8, 8)),
          evaluatedBy: 'Senior Interview Panelist',
        },
      });
    }
  }

  // 8. Offer Policies
  console.log('  Creating multi-tier offer policies...');
  await prisma.offerPolicy.createMany({
    data: [
      {
        name: 'Super Dream Policy',
        description: 'Super Dream offers block all lower tiers. Cannot hold multiple offers once accepted.',
        tier: 'DREAM',
        rules: JSON.stringify({ blockLowerTiers: true, allowUpgrade: false, blockedTiers: ['CORE', 'MASS', 'standard'] }),
        priority: 1,
        isActive: true,
      },
      {
        name: 'Dream Policy',
        description: 'Dream offers block Core and Standard. Can upgrade to Super Dream.',
        tier: 'DREAM',
        rules: JSON.stringify({ blockLowerTiers: true, allowUpgrade: true, blockedTiers: ['CORE', 'MASS', 'standard'] }),
        priority: 2,
        isActive: true,
      },
      {
        name: 'Core Policy',
        description: 'Core offers allow upgrades to Dream and Super Dream.',
        tier: 'CORE',
        rules: JSON.stringify({ blockLowerTiers: true, allowUpgrade: true, blockedTiers: ['MASS', 'standard'] }),
        priority: 3,
        isActive: true,
      },
    ],
  });

  // 9. Recruitment Crawler Sources & Crawled Postings
  console.log('  Creating crawler sources and discovered job listings...');
  const source = await prisma.crawlerSource.create({
    data: {
      name: 'Global Tech Careers & LinkedIn Feed',
      url: 'https://careers.google.com, https://stripe.com/jobs, https://nvidia.com',
      status: 'SUCCESS',
      frequency: 'DAILY',
      enabled: true,
      lastCrawl: new Date(),
      nextCrawl: new Date(Date.now() + 86400000),
    },
  });

  const crawledJobs = [
    {
      companyName: 'NVIDIA',
      jobTitle: 'AI Infrastructure & CUDA Engineer',
      jobDescription: 'Design parallel compute kernels, optimize deep learning transformer inference, and scale GPU cluster orchestration.',
      requiredSkills: ['C++', 'Python', 'Data Structures', 'OS'],
      preferredSkills: ['Deep Learning', 'Docker', 'Kubernetes'],
      location: 'Bengaluru / Hybrid',
      experience: 'Fresher / 2026 Batch',
      packageLpa: 36.0,
    },
    {
      companyName: 'Stripe',
      jobTitle: 'Software Engineer - Payments Core',
      jobDescription: 'Build high-availability financial infrastructure handling billions in global transactions. Focus on idempotency and distributed ledger consistency.',
      requiredSkills: ['Java', 'SQL', 'REST APIs', 'System Design'],
      preferredSkills: ['Redis', 'Docker', 'Kafka'],
      location: 'Bengaluru / Remote',
      experience: 'Fresher / 2026 Batch',
      packageLpa: 32.0,
    },
    {
      companyName: 'Databricks',
      jobTitle: 'Platform Engineer - Spark & Lakehouse',
      jobDescription: 'Optimize distributed query execution across cloud object storage and automate big data cluster provisioning.',
      requiredSkills: ['Java', 'Python', 'SQL', 'DBMS'],
      preferredSkills: ['AWS', 'GCP', 'Docker'],
      location: 'Bengaluru',
      experience: 'Fresher / 2026 Batch',
      packageLpa: 38.0,
    },
  ];

  for (const job of crawledJobs) {
    await prisma.crawledJob.create({
      data: {
        sourceId: source.id,
        companyName: job.companyName,
        jobTitle: job.jobTitle,
        jobDescription: job.jobDescription,
        requiredSkills: JSON.stringify(job.requiredSkills),
        preferredSkills: JSON.stringify(job.preferredSkills),
        location: job.location,
        experience: job.experience,
        packageLpa: job.packageLpa,
        deadline: new Date(Date.now() + 14 * 86400000),
        status: 'NEW',
      },
    });
  }

  // 10. Historical Completed Allocation Runs for YoY
  console.log('  Creating historical allocation runs for YoY analytics...');
  await prisma.allocationRun.create({
    data: {
      season: '2024',
      recruitmentCycleId: cycle2024.id,
      status: 'SUCCESS',
      totalStudents: 480,
      totalCompanies: 28,
      totalMatches: 412,
      totalUnallocated: 68,
      cascadeCount: 14,
      blockingPairCount: 0,
      startedAt: new Date('2025-04-10T10:00:00Z'),
      completedAt: new Date('2025-04-10T10:05:00Z'),
      metrics: JSON.stringify({
        placementRate: 85.8,
        firstChoiceRate: 64.2,
        top2Rate: 81.0,
        top3Rate: 92.5,
        avgPreferenceRank: 1.62,
        avgSkillMatch: 81.4,
        quotaUtilizationRate: 91.2,
        cascadeCount: 14,
        isStable: true,
        blockingPairCount: 0,
      }),
    },
  });

  await prisma.allocationRun.create({
    data: {
      season: '2025',
      recruitmentCycleId: cycle2025.id,
      status: 'SUCCESS',
      totalStudents: 510,
      totalCompanies: 32,
      totalMatches: 468,
      totalUnallocated: 42,
      cascadeCount: 22,
      blockingPairCount: 0,
      startedAt: new Date('2026-04-12T10:00:00Z'),
      completedAt: new Date('2026-04-12T10:06:00Z'),
      metrics: JSON.stringify({
        placementRate: 91.8,
        firstChoiceRate: 71.4,
        top2Rate: 87.2,
        top3Rate: 95.6,
        avgPreferenceRank: 1.48,
        avgSkillMatch: 84.8,
        quotaUtilizationRate: 94.6,
        cascadeCount: 22,
        isStable: true,
        blockingPairCount: 0,
      }),
    },
  });

  console.log('✅ TalentMatrix Module A Database Seeded Successfully!');
}

seed()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
