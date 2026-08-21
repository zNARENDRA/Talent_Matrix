/**
 * TalentMatrix — Recruitment Intelligence Crawler & Ingestion Engine
 * 
 * Ingests external career postings, parses descriptions, extracts skill entities,
 * matches against student talent pools, and enables 1-click conversion to official drives.
 */

import { prisma } from '../../app.js';
import { SkillMatchingService } from '../../engine/skill-matching.js';

export interface RawCrawledListing {
  companyName: string;
  jobTitle: string;
  jobDescription: string;
  requiredSkills: string[];
  preferredSkills: string[];
  location: string;
  experience: string;
  packageLpa: number;
  deadline?: Date;
  sourceUrl: string;
}

export class CrawlerService {
  private skillMatcher = new SkillMatchingService();

  /**
   * Mock crawling pipeline that fetches and parses public tech hiring sources
   */
  async runCrawlForSource(sourceId: string): Promise<{ createdCount: number; duplicateCount: number }> {
    const source = await prisma.crawlerSource.findUnique({ where: { id: sourceId } });
    if (!source) throw new Error('Crawler source not found');

    await prisma.crawlerSource.update({
      where: { id: sourceId },
      data: { status: 'CRAWLING', lastCrawl: new Date() },
    });

    // Realistic discovery catalog from external boards
    const mockListings: RawCrawledListing[] = [
      {
        companyName: 'NVIDIA',
        jobTitle: 'AI Infrastructure & CUDA Engineer',
        jobDescription: 'Design next-generation parallel compute kernels, optimize deep learning transformer inference, and scale GPU cluster orchestration.',
        requiredSkills: ['C++', 'CUDA', 'Python', 'Data Structures', 'Linux'],
        preferredSkills: ['PyTorch', 'Distributed Systems', 'Docker'],
        location: 'Bengaluru / Hybrid',
        experience: 'Fresher / 2026 Batch',
        packageLpa: 36.0,
        deadline: new Date(Date.now() + 14 * 86400000),
        sourceUrl: 'https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite/job/AI-Infrastructure-Engineer',
      },
      {
        companyName: 'Stripe',
        jobTitle: 'Software Engineer - Payments Core',
        jobDescription: 'Build high-availability financial infrastructure handling billions in global transactions. Focus on idempotency, zero-downtime migrations, and distributed ledger consistency.',
        requiredSkills: ['Java', 'Distributed Systems', 'SQL', 'REST APIs'],
        preferredSkills: ['Ruby', 'Kubernetes', 'Kafka', 'Redis'],
        location: 'Bengaluru / Remote',
        experience: 'Fresher / 2026 Batch',
        packageLpa: 32.0,
        deadline: new Date(Date.now() + 10 * 86400000),
        sourceUrl: 'https://stripe.com/jobs/listings/payments-core-engineer',
      },
      {
        companyName: 'Uber',
        jobTitle: 'Software Engineer - Marketplace Dispatch',
        jobDescription: 'Develop geospatial algorithms, dynamic pricing engines, and real-time dispatch matching systems for global mobility services.',
        requiredSkills: ['Go', 'Algorithms', 'Microservices', 'Distributed Systems'],
        preferredSkills: ['Kafka', 'Docker', 'PostgreSQL', 'gRPC'],
        location: 'Hyderabad',
        experience: 'Fresher / 2026 Batch',
        packageLpa: 34.0,
        deadline: new Date(Date.now() + 20 * 86400000),
        sourceUrl: 'https://uber.com/careers/marketplace-dispatch-eng',
      },
      {
        companyName: 'Databricks',
        jobTitle: 'Platform Engineer - Spark & Lakehouse',
        jobDescription: 'Optimize distributed query execution across cloud object storage, improve caching layers, and automate big data cluster provisioning.',
        requiredSkills: ['Scala', 'Java', 'Apache Spark', 'Cloud Computing'],
        preferredSkills: ['AWS', 'Data Engineering', 'Python', 'SQL'],
        location: 'Bengaluru',
        experience: 'Fresher / 2026 Batch',
        packageLpa: 38.0,
        deadline: new Date(Date.now() + 25 * 86400000),
        sourceUrl: 'https://databricks.com/company/careers/spark-lakehouse-eng',
      },
      {
        companyName: 'Razorpay',
        jobTitle: 'Backend Engineer - Gateway Platform',
        jobDescription: 'Scale payment gateway microservices, minimize checkout latency, and engineer bank integration adapters with 99.999% uptime.',
        requiredSkills: ['PHP', 'Go', 'MySQL', 'Redis', 'REST APIs'],
        preferredSkills: ['Docker', 'Kafka', 'AWS'],
        location: 'Bengaluru',
        experience: 'Fresher / 2026 Batch',
        packageLpa: 22.0,
        deadline: new Date(Date.now() + 12 * 86400000),
        sourceUrl: 'https://razorpay.com/jobs/gateway-backend-engineer',
      },
      {
        companyName: 'Cred',
        jobTitle: 'Full Stack Engineer - Member Experience',
        jobDescription: 'Craft intuitive mobile-first consumer fintech experiences, gamified rewards interfaces, and real-time transaction notifications.',
        requiredSkills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
        preferredSkills: ['Tailwind CSS', 'Next.js', 'GraphQL', 'AWS'],
        location: 'Bengaluru',
        experience: 'Fresher / 2026 Batch',
        packageLpa: 26.0,
        deadline: new Date(Date.now() + 18 * 86400000),
        sourceUrl: 'https://cred.club/careers/member-experience-eng',
      },
    ];

    let createdCount = 0;
    let duplicateCount = 0;

    for (const item of mockListings) {
      // Duplicate detection
      const existing = await prisma.crawledJob.findFirst({
        where: {
          companyName: item.companyName,
          jobTitle: item.jobTitle,
        },
      });

      if (existing) {
        duplicateCount++;
        continue;
      }

      await prisma.crawledJob.create({
        data: {
          sourceId,
          companyName: item.companyName,
          jobTitle: item.jobTitle,
          jobDescription: item.jobDescription,
          requiredSkills: JSON.stringify(item.requiredSkills),
          preferredSkills: JSON.stringify(item.preferredSkills),
          location: item.location,
          experience: item.experience,
          packageLpa: item.packageLpa,
          deadline: item.deadline,
          sourceUrl: item.sourceUrl,
          publishedDate: new Date(),
          status: 'NEW',
        },
      });

      createdCount++;
    }

    await prisma.crawlerSource.update({
      where: { id: sourceId },
      data: {
        status: 'SUCCESS',
        nextCrawl: new Date(Date.now() + 86400000),
      },
    });

    return { createdCount, duplicateCount };
  }

  /**
   * Matches candidate pool against a crawled job
   */
  async matchStudentsForJob(jobId: string, limit = 10) {
    const job = await prisma.crawledJob.findUnique({ where: { id: jobId } });
    if (!job) throw new Error('Crawled job not found');

    let requiredSkills: string[] = [];
    let preferredSkills: string[] = [];
    try {
      requiredSkills = JSON.parse(job.requiredSkills || '[]');
      preferredSkills = JSON.parse(job.preferredSkills || '[]');
    } catch (e) {}

    const skillRequirements = [
      ...requiredSkills.map((name) => ({ skillName: name, isRequired: true, weight: 2.0, minProficiency: 50 })),
      ...preferredSkills.map((name) => ({ skillName: name, isRequired: false, weight: 1.0, minProficiency: 40 })),
    ];

    const students = await prisma.student.findMany({
      where: { status: { in: ['registered', 'eligible'] } },
      include: {
        studentSkills: { include: { skill: true } },
      },
    });

    const matches = students.map((s) => {
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

      const matchRes = this.skillMatcher.calculateMatch(sSkills, skillRequirements);

      return {
        studentId: s.studentId,
        studentName: s.name,
        department: s.department,
        gpa: s.gpa,
        compatibilityScore: matchRes.compatibilityScore,
        requiredSkillsMet: matchRes.requiredSkillsMet,
        missingRequiredSkills: matchRes.missingRequiredSkills,
      };
    });

    matches.sort((a, b) => {
      if (a.requiredSkillsMet !== b.requiredSkillsMet) return a.requiredSkillsMet ? -1 : 1;
      return b.compatibilityScore - a.compatibilityScore;
    });

    return {
      job: {
        id: job.id,
        companyName: job.companyName,
        jobTitle: job.jobTitle,
        packageLpa: job.packageLpa,
        location: job.location,
      },
      totalEligibleMatches: matches.filter((m) => m.compatibilityScore >= 60).length,
      topMatches: matches.slice(0, limit),
    };
  }

  /**
   * 1-Click Convert Crawled Job into an Official RecruitmentDrive
   */
  async convertToDrive(jobId: string, openPositions = 5, minGpa = 7.5) {
    const job = await prisma.crawledJob.findUnique({ where: { id: jobId } });
    if (!job) throw new Error('Crawled job not found');

    // 1. Get or create company
    let company = await prisma.company.findFirst({
      where: { name: { equals: job.companyName } },
    });

    if (!company) {
      company = await prisma.company.create({
        data: {
          name: job.companyName,
          industry: 'Software / Technology',
          website: job.sourceUrl ? new URL(job.sourceUrl).origin : 'https://example.com',
          description: `Discovered and ingested from recruitment intelligence crawler.`,
        },
      });
    }

    // 2. Determine tier based on package
    let tier = 'CORE';
    const pkg = job.packageLpa || 10.0;
    if (pkg >= 20.0) tier = 'DREAM';
    else if (pkg < 8.0) tier = 'MASS';

    // 3. Create Recruitment Drive
    const drive = await prisma.recruitmentDrive.create({
      data: {
        companyId: company.id,
        role: job.jobTitle,
        packageLpa: pkg,
        jobType: 'full_time',
        offerTier: tier,
        eligibleDepts: JSON.stringify(['ALL_DEPARTMENTS']),
        minGpa,
        requiredSkills: job.requiredSkills,
        openPositions,
        filledPositions: 0,
        applicationDeadline: job.deadline || new Date(Date.now() + 14 * 86400000),
        status: 'open',
        season: '2026',
      },
    });

    // 4. Create normalized CompanySkillRequirement records
    let reqSkills: string[] = [];
    let prefSkills: string[] = [];
    try {
      reqSkills = JSON.parse(job.requiredSkills || '[]');
      prefSkills = JSON.parse(job.preferredSkills || '[]');
    } catch (e) {}

    for (const skillName of reqSkills) {
      let skill = await prisma.skill.findUnique({ where: { name: skillName } });
      if (!skill) {
        skill = await prisma.skill.create({ data: { name: skillName, category: 'Technical' } });
      }
      await prisma.companySkillRequirement.create({
        data: {
          driveId: drive.id,
          skillId: skill.id,
          isRequired: true,
          weight: 2.0,
          minProficiency: 55.0,
        },
      });
    }

    for (const skillName of prefSkills) {
      let skill = await prisma.skill.findUnique({ where: { name: skillName } });
      if (!skill) {
        skill = await prisma.skill.create({ data: { name: skillName, category: 'Technical' } });
      }
      await prisma.companySkillRequirement.create({
        data: {
          driveId: drive.id,
          skillId: skill.id,
          isRequired: false,
          weight: 1.0,
          minProficiency: 40.0,
        },
      });
    }

    // 5. Update crawled job status
    await prisma.crawledJob.update({
      where: { id: jobId },
      data: {
        status: 'CONVERTED_TO_DRIVE',
        convertedDriveId: drive.id,
      },
    });

    return drive;
  }
}
