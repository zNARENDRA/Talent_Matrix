import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SelectionEngine } from './selection-engine.js';

describe('Selection & Deselection Engine', () => {
  const engine = new SelectionEngine();

  const mockDriveConfig = {
    driveId: 'drive-sde',
    companyName: 'Microsoft',
    role: 'SDE',
    minGpa: 7.0,
    eligibleDepts: ['CSE', 'IT'],
    graduationYears: [2026],
    skillRequirements: [
      { skillName: 'TypeScript', isRequired: true, weight: 2.0 },
      { skillName: 'React', isRequired: false, weight: 1.0 },
    ],
    shortlistCapacity: 2,
    recruiterScoreCutoff: 60,
    status: 'open',
  };

  it('ranks candidates deterministically and enforces shortlist capacity with deselection reasons', () => {
    const candidates = [
      {
        applicationId: 'app-1',
        studentId: 'STU1001',
        studentDbId: 'db-1',
        studentName: 'Candidate A',
        department: 'CSE',
        gpa: 9.0,
        graduationYear: 2026,
        status: 'eligible',
        skills: [{ skillName: 'TypeScript', proficiency: 95 }, { skillName: 'React', proficiency: 90 }],
        recruiterScore: 90,
        preferenceRank: 1,
      },
      {
        applicationId: 'app-2',
        studentId: 'STU1002',
        studentDbId: 'db-2',
        studentName: 'Candidate B',
        department: 'CSE',
        gpa: 8.5,
        graduationYear: 2026,
        status: 'eligible',
        skills: [{ skillName: 'TypeScript', proficiency: 85 }, { skillName: 'React', proficiency: 80 }],
        recruiterScore: 85,
        preferenceRank: 2,
      },
      {
        applicationId: 'app-3',
        studentId: 'STU1003',
        studentDbId: 'db-3',
        studentName: 'Candidate C',
        department: 'CSE',
        gpa: 8.0,
        graduationYear: 2026,
        status: 'eligible',
        skills: [{ skillName: 'TypeScript', proficiency: 75 }, { skillName: 'React', proficiency: 70 }],
        recruiterScore: 75,
        preferenceRank: 3,
      },
    ];

    const results = engine.evaluateApplicants(candidates, mockDriveConfig);
    assert.equal(results.length, 3);
    assert.equal(results[0].studentId, 'STU1001');
    assert.equal(results[0].decision, 'SELECTED');
    assert.equal(results[1].studentId, 'STU1002');
    assert.equal(results[1].decision, 'SELECTED');

    // 3rd candidate exceeds capacity 2 -> DESELECTED
    assert.equal(results[2].studentId, 'STU1003');
    assert.equal(results[2].decision, 'DESELECTED');
    assert.equal(results[2].deselectionReason, 'SHORTLIST_CAP_REACHED');
  });

  it('marks candidates below recruiter score cutoff as DESELECTED', () => {
    const candidate = {
      applicationId: 'app-4',
      studentId: 'STU1004',
      studentDbId: 'db-4',
      studentName: 'Candidate D',
      department: 'CSE',
      gpa: 8.0,
      graduationYear: 2026,
      status: 'eligible',
      skills: [{ skillName: 'TypeScript', proficiency: 90 }],
      recruiterScore: 45, // Below cutoff 60
      preferenceRank: 1,
    };

    const results = engine.evaluateApplicants([candidate], mockDriveConfig);
    assert.equal(results[0].decision, 'DESELECTED');
    assert.equal(results[0].deselectionReason, 'RECRUITER_SCORE_BELOW_CUTOFF');
  });
});
