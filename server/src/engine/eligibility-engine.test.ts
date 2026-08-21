import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EligibilityEngine } from './eligibility-engine.js';

describe('5-Point Eligibility Engine', () => {
  const engine = new EligibilityEngine();

  const mockDrive = {
    id: 'drive-1',
    companyName: 'Google',
    role: 'SDE',
    minGpa: 7.5,
    eligibleDepts: ['CSE', 'IT', 'AI&DS'],
    graduationYears: [2026],
    skillRequirements: [
      { skillName: 'Data Structures', isRequired: true, weight: 2.0, minProficiency: 60 },
      { skillName: 'Python', isRequired: false, weight: 1.0 },
    ],
    status: 'open',
  };

  it('marks student eligible when all 5 criteria pass', () => {
    const student = {
      id: 's-1',
      studentId: 'STU1001',
      name: 'Aarav Sharma',
      department: 'CSE',
      gpa: 8.8,
      graduationYear: 2026,
      status: 'eligible',
      skills: [{ skillName: 'Data Structures', proficiency: 85 }, { skillName: 'Python', proficiency: 90 }],
    };

    const res = engine.evaluate(student, mockDrive);
    assert.equal(res.isEligible, true);
    assert.equal(res.reasons.length, 0);
    assert.equal(res.criteriaBreakdown.gpaMet, true);
    assert.equal(res.criteriaBreakdown.deptMet, true);
    assert.equal(res.criteriaBreakdown.skillsMet, true);
  });

  it('detects GPA and Department failures simultaneously', () => {
    const student = {
      id: 's-2',
      studentId: 'STU1002',
      name: 'Rohan Verma',
      department: 'ME',
      gpa: 6.9,
      graduationYear: 2026,
      status: 'eligible',
      skills: [{ skillName: 'Data Structures', proficiency: 80 }],
    };

    const res = engine.evaluate(student, mockDrive);
    assert.equal(res.isEligible, false);
    assert.ok(res.reasons.includes('GPA_BELOW_MINIMUM'));
    assert.ok(res.reasons.includes('DEPARTMENT_NOT_ELIGIBLE'));
  });

  it('supports ALL_DEPARTMENTS wildcard', () => {
    const openDrive = { ...mockDrive, eligibleDepts: ['ALL_DEPARTMENTS'] };
    const student = {
      id: 's-3',
      studentId: 'STU1003',
      name: 'Kavya Nair',
      department: 'Civil Engineering',
      gpa: 8.0,
      graduationYear: 2026,
      status: 'eligible',
      skills: [{ skillName: 'Data Structures', proficiency: 75 }],
    };

    const res = engine.evaluate(student, openDrive);
    assert.equal(res.isEligible, true);
    assert.equal(res.criteriaBreakdown.deptMet, true);
  });

  it('flags missing required skill and inactive drive status', () => {
    const closedDrive = { ...mockDrive, status: 'draft' };
    const student = {
      id: 's-4',
      studentId: 'STU1004',
      name: 'Ishaan Gupta',
      department: 'CSE',
      gpa: 9.0,
      graduationYear: 2026,
      status: 'eligible',
      skills: [{ skillName: 'React', proficiency: 80 }], // Missing Data Structures
    };

    const res = engine.evaluate(student, closedDrive);
    assert.equal(res.isEligible, false);
    assert.ok(res.reasons.includes('MISSING_REQUIRED_SKILL'));
    assert.ok(res.reasons.includes('COMPANY_INACTIVE'));
  });
});
