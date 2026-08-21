import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ModuleAAllocationEngine } from './module-a-allocation.js';

describe('Module A — Pure Domain Allocation Engine', () => {
  const engine = new ModuleAAllocationEngine();

  const students = [
    {
      id: 's1',
      studentId: 'STU1001',
      name: 'Aarav Sharma',
      department: 'CSE',
      gpa: 9.2,
      graduationYear: 2026,
      status: 'eligible',
      skills: [{ skillName: 'Data Structures', proficiency: 95 }, { skillName: 'Java', proficiency: 90 }],
      preferences: ['d1', 'd2', 'd3'],
    },
    {
      id: 's2',
      studentId: 'STU1002',
      name: 'Priya Patel',
      department: 'IT',
      gpa: 8.7,
      graduationYear: 2026,
      status: 'eligible',
      skills: [{ skillName: 'Data Structures', proficiency: 85 }, { skillName: 'Python', proficiency: 90 }],
      preferences: ['d1', 'd2', 'd3'],
    },
    {
      id: 's3',
      studentId: 'STU1003',
      name: 'Rohan Verma',
      department: 'CSE',
      gpa: 7.8,
      graduationYear: 2026,
      status: 'eligible',
      skills: [{ skillName: 'Data Structures', proficiency: 75 }, { skillName: 'C++', proficiency: 80 }],
      preferences: ['d2', 'd3'],
    },
  ];

  const drives = [
    {
      id: 'd1',
      companyId: 'c1',
      companyName: 'Google',
      role: 'SDE',
      packageLpa: 42,
      tier: 'DREAM',
      quota: 1,
      minGpa: 8.5,
      eligibleDepts: ['CSE', 'IT'],
      graduationYears: [2026],
      skillRequirements: [{ skillName: 'Data Structures', isRequired: true, weight: 2.0 }],
    },
    {
      id: 'd2',
      companyId: 'c2',
      companyName: 'Amazon',
      role: 'SDE',
      packageLpa: 28,
      tier: 'CORE',
      quota: 1,
      minGpa: 7.5,
      eligibleDepts: ['CSE', 'IT'],
      graduationYears: [2026],
      skillRequirements: [{ skillName: 'Data Structures', isRequired: true, weight: 1.0 }],
    },
    {
      id: 'd3',
      companyId: 'c3',
      companyName: 'Infosys',
      role: 'Systems Engineer',
      packageLpa: 7,
      tier: 'MASS',
      quota: 5,
      minGpa: 6.0,
      eligibleDepts: ['ALL_DEPARTMENTS'],
      graduationYears: [2026],
      skillRequirements: [],
    },
  ];

  it('allocates candidates to quotas while guaranteeing stability and generating full metrics', () => {
    const result = engine.run(students, drives);

    assert.equal(result.matches.size, 3);
    // Aarav has highest score for Google (d1) -> gets d1
    assert.equal(result.matches.get('s1')?.companyName, 'Google');
    assert.equal(result.matches.get('s1')?.tier, 'DREAM');

    // Priya gets Amazon (d2)
    assert.equal(result.matches.get('s2')?.companyName, 'Amazon');

    // Rohan gets Infosys (d3)
    assert.equal(result.matches.get('s3')?.companyName, 'Infosys');

    // Metrics validation
    assert.equal(result.metrics.placementRate, 100);
    assert.equal(result.metrics.allocatedCount, 3);
    assert.equal(result.metrics.unallocatedCount, 0);
    assert.equal(result.stability.isStable, true);
    assert.equal(result.stability.blockingPairCount, 0);

    // Explanations generated for all candidates
    assert.equal(result.explanations.length, 3);
    assert.ok(result.explanations[0].studentSafeExplanation.includes('Google'));
  });
});
