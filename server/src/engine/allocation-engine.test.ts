import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  AllocationEngine,
  EligibilityFilter,
  OfferPolicyEngine,
  MatchingEngine,
  ConflictResolver,
  StudentProfile,
  DriveProfile,
  OfferPolicyRule,
} from './allocation-engine.js';

describe('Allocation Engine', () => {
  const policies: OfferPolicyRule[] = [
    {
      id: 'p-1',
      name: 'Super Dream Policy',
      tier: 'super_dream',
      blockLowerTiers: true,
      allowUpgrade: false,
      blockedTiers: ['dream', 'core', 'standard'],
    },
    {
      id: 'p-2',
      name: 'Dream Policy',
      tier: 'dream',
      blockLowerTiers: true,
      allowUpgrade: true,
      blockedTiers: ['core', 'standard'],
    },
    {
      id: 'p-3',
      name: 'Core Policy',
      tier: 'core',
      blockLowerTiers: true,
      allowUpgrade: true,
      blockedTiers: ['standard'],
    },
    {
      id: 'p-4',
      name: 'Standard Policy',
      tier: 'standard',
      blockLowerTiers: false,
      allowUpgrade: true,
      blockedTiers: [],
    },
  ];

  it('EligibilityFilter filters by GPA and Department correctly', () => {
    const filter = new EligibilityFilter();
    const students: StudentProfile[] = [
      {
        id: 's-1',
        studentId: 'STU1001',
        name: 'Alice',
        department: 'CSE',
        gpa: 8.5,
        skills: ['React', 'Node.js'],
        status: 'eligible',
        existingOffers: [],
        preferences: [],
      },
      {
        id: 's-2',
        studentId: 'STU1002',
        name: 'Bob',
        department: 'ME',
        gpa: 8.0,
        skills: ['AutoCAD'],
        status: 'eligible',
        existingOffers: [],
        preferences: [],
      },
      {
        id: 's-3',
        studentId: 'STU1003',
        name: 'Charlie',
        department: 'CSE',
        gpa: 6.5,
        skills: ['Python'],
        status: 'eligible',
        existingOffers: [],
        preferences: [],
      },
    ];

    const drive: DriveProfile = {
      id: 'd-1',
      companyId: 'c-1',
      companyName: 'Google',
      role: 'SDE',
      packageLpa: 40,
      offerTier: 'super_dream',
      eligibleDepts: ['CSE', 'IT'],
      minGpa: 7.5,
      requiredSkills: [],
      openPositions: 5,
      filledPositions: 0,
      candidateRankings: [],
    };

    const eligible = filter.filter(students, drive);
    assert.strictEqual(eligible.length, 1);
    assert.strictEqual(eligible[0].name, 'Alice');
  });

  it('OfferPolicyEngine prevents lower tier offers when holding higher tier', () => {
    const policyEngine = new OfferPolicyEngine(policies);

    const studentWithSuperDream: StudentProfile = {
      id: 's-1',
      studentId: 'STU1001',
      name: 'Alice',
      department: 'CSE',
      gpa: 9.0,
      skills: ['Go', 'Kubernetes'],
      status: 'placed',
      existingOffers: [{ tier: 'super_dream', driveId: 'd-1', companyName: 'Google' }],
      preferences: [],
    };

    const check = policyEngine.canReceiveOffer(studentWithSuperDream, 'core');
    assert.strictEqual(check.allowed, false);
    assert(check.reason?.includes('Super Dream') || check.reason?.includes('blocks'));
  });

  it('OfferPolicyEngine allows upgrading from Core to Super Dream', () => {
    const policyEngine = new OfferPolicyEngine(policies);

    const studentWithCore: StudentProfile = {
      id: 's-2',
      studentId: 'STU1002',
      name: 'Bob',
      department: 'CSE',
      gpa: 8.5,
      skills: ['Java'],
      status: 'placed',
      existingOffers: [{ tier: 'core', driveId: 'd-2', companyName: 'TCS Digital' }],
      preferences: [],
    };

    const check = policyEngine.canReceiveOffer(studentWithCore, 'super_dream');
    assert.strictEqual(check.allowed, true);
  });

  it('Modified Gale-Shapley matching allocates candidates to preferences within capacity', () => {
    const engine = new AllocationEngine();

    const students: StudentProfile[] = [
      {
        id: 's-1',
        studentId: 'STU1',
        name: 'Aarav',
        department: 'CSE',
        gpa: 9.5,
        skills: ['C++', 'Python'],
        status: 'eligible',
        existingOffers: [],
        preferences: [
          { driveId: 'd-1', rank: 1 },
          { driveId: 'd-2', rank: 2 },
        ],
      },
      {
        id: 's-2',
        studentId: 'STU2',
        name: 'Vihaan',
        department: 'CSE',
        gpa: 9.0,
        skills: ['Java', 'SQL'],
        status: 'eligible',
        existingOffers: [],
        preferences: [
          { driveId: 'd-1', rank: 1 },
          { driveId: 'd-2', rank: 2 },
        ],
      },
      {
        id: 's-3',
        studentId: 'STU3',
        name: 'Aditya',
        department: 'CSE',
        gpa: 8.5,
        skills: ['Python'],
        status: 'eligible',
        existingOffers: [],
        preferences: [
          { driveId: 'd-2', rank: 1 },
          { driveId: 'd-1', rank: 2 },
        ],
      },
    ];

    const drives: DriveProfile[] = [
      {
        id: 'd-1',
        companyId: 'c-1',
        companyName: 'Tech Corp',
        role: 'SDE',
        packageLpa: 30,
        offerTier: 'dream',
        eligibleDepts: ['CSE'],
        minGpa: 7.0,
        requiredSkills: [],
        openPositions: 1, // Only 1 position!
        filledPositions: 0,
        candidateRankings: [
          { studentId: 's-1', rank: 1, score: 95 },
          { studentId: 's-2', rank: 2, score: 90 },
          { studentId: 's-3', rank: 3, score: 85 },
        ],
      },
      {
        id: 'd-2',
        companyId: 'c-2',
        companyName: 'Fintech Inc',
        role: 'Backend Dev',
        packageLpa: 20,
        offerTier: 'core',
        eligibleDepts: ['CSE'],
        minGpa: 7.0,
        requiredSkills: [],
        openPositions: 2,
        filledPositions: 0,
        candidateRankings: [
          { studentId: 's-2', rank: 1, score: 90 },
          { studentId: 's-3', rank: 2, score: 85 },
          { studentId: 's-1', rank: 3, score: 95 },
        ],
      },
    ];

    const result = engine.run(students, drives, policies);

    assert.strictEqual(result.stats.totalMatches, 3);
    assert.strictEqual(result.conflicts.length, 0);

    // s-1 gets d-1 (top pref for both)
    const matchS1 = result.matches.find((m) => m.studentId === 's-1');
    assert.strictEqual(matchS1?.driveId, 'd-1');

    // s-2 and s-3 get d-2
    const matchS2 = result.matches.find((m) => m.studentId === 's-2');
    assert.strictEqual(matchS2?.driveId, 'd-2');

    const matchS3 = result.matches.find((m) => m.studentId === 's-3');
    assert.strictEqual(matchS3?.driveId, 'd-2');
  });
});
