import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SimulationEngine } from './simulation-engine.js';

describe('What-If Simulation Engine', () => {
  const simulator = new SimulationEngine();

  const students = [
    {
      id: 's1',
      studentId: 'STU1001',
      name: 'Aarav Sharma',
      department: 'CSE',
      gpa: 8.0,
      graduationYear: 2026,
      status: 'eligible',
      skills: [{ skillName: 'Data Structures', proficiency: 90 }],
      preferences: ['d1', 'd2'],
    },
    {
      id: 's2',
      studentId: 'STU1002',
      name: 'Priya Patel',
      department: 'CSE',
      gpa: 7.2,
      graduationYear: 2026,
      status: 'eligible',
      skills: [{ skillName: 'Data Structures', proficiency: 80 }],
      preferences: ['d1', 'd2'],
    },
  ];

  const drives = [
    {
      id: 'd1',
      companyId: 'c1',
      companyName: 'Company A',
      role: 'SDE',
      packageLpa: 30,
      tier: 'DREAM',
      quota: 1, // Only 1 quota in baseline
      minGpa: 7.5,
      eligibleDepts: ['CSE'],
      graduationYears: [2026],
      skillRequirements: [{ skillName: 'Data Structures', isRequired: true, weight: 1.0 }],
    },
    {
      id: 'd2',
      companyId: 'c2',
      companyName: 'Company B',
      role: 'Analyst',
      packageLpa: 12,
      tier: 'CORE',
      quota: 2,
      minGpa: 6.0,
      eligibleDepts: ['CSE'],
      graduationYears: [2026],
      skillRequirements: [],
    },
  ];

  it('correctly isolates simulation and reflects delta when increasing quota from 1 to 2', () => {
    // In baseline: s1 gets d1 (quota 1, minGpa 7.5), s2 gets d2.
    // In simulation: d1 quota increased to 2 & minGpa relaxed to 7.0 -> both s1 and s2 get d1 (DREAM)!
    const result = simulator.simulate(students, drives, [
      { driveId: 'd1', quota: 2, minGpa: 7.0 },
    ]);

    assert.equal(result.baseline.matches.get('s2')?.driveId, 'd2');
    assert.equal(result.simulated.matches.get('s2')?.driveId, 'd1');

    assert.equal(result.deltas.totalChangedStudents, 1);
    assert.equal(result.deltas.upgradedCount, 1);
    assert.equal(result.deltas.studentDeltas[0].studentId, 'STU1002');
    assert.equal(result.deltas.studentDeltas[0].outcomeChange, 'UPGRADED');
    assert.equal(result.deltas.studentDeltas[0].packageDifferenceLpa, 18); // 30 - 12 = 18 LPA
  });
});
