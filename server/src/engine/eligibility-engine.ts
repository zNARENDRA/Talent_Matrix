/**
 * TalentMatrix — 5-Point Eligibility Engine
 * 
 * Evaluates candidate eligibility for recruitment drives based on:
 * 1. Minimum GPA cutoff
 * 2. Department eligibility (or ALL_DEPARTMENTS)
 * 3. Graduation year criteria
 * 4. Mandatory required skill proficiencies
 * 5. Company active drive status
 */

import { SkillMatchingService, StudentSkillProfile, SkillRequirement } from './skill-matching.js';

export interface EligibilityStudentInput {
  id: string;
  studentId: string;
  name: string;
  department: string;
  gpa: number;
  graduationYear: number;
  status: string; // 'registered', 'eligible', 'placed', 'opted_out'
  skills: StudentSkillProfile[];
}

export interface EligibilityDriveInput {
  id: string;
  companyName: string;
  role: string;
  minGpa: number;
  eligibleDepts: string[]; // e.g. ["CSE", "IT"] or ["ALL_DEPARTMENTS"]
  graduationYears: number[]; // e.g. [2026]
  skillRequirements: SkillRequirement[];
  status: string; // 'open', 'in_progress', 'draft', 'cancelled', 'completed'
}

export interface EligibilityEvaluation {
  isEligible: boolean;
  reasons: string[];
  criteriaBreakdown: {
    gpaMet: boolean;
    studentGpa: number;
    requiredMinGpa: number;
    deptMet: boolean;
    studentDept: string;
    allowedDepts: string[];
    gradYearMet: boolean;
    studentGradYear: number;
    allowedGradYears: number[];
    skillsMet: boolean;
    missingSkills: string[];
    companyActiveMet: boolean;
    driveStatus: string;
  };
}

export class EligibilityEngine {
  private skillMatcher = new SkillMatchingService();

  evaluate(student: EligibilityStudentInput, drive: EligibilityDriveInput): EligibilityEvaluation {
    const reasons: string[] = [];

    // 1. Opt-out check
    if (student.status === 'opted_out') {
      reasons.push('STUDENT_OPTED_OUT');
    }

    // 2. GPA Check
    const gpaMet = student.gpa >= drive.minGpa;
    if (!gpaMet) {
      reasons.push('GPA_BELOW_MINIMUM');
    }

    // 3. Department Check
    const isAllDepts = drive.eligibleDepts.includes('ALL_DEPARTMENTS') || drive.eligibleDepts.includes('*');
    const deptMet = isAllDepts || drive.eligibleDepts.some(
      (d) => d.toLowerCase().trim() === student.department.toLowerCase().trim()
    );
    if (!deptMet) {
      reasons.push('DEPARTMENT_NOT_ELIGIBLE');
    }

    // 4. Graduation Year Check
    const gradYears = drive.graduationYears && drive.graduationYears.length > 0 ? drive.graduationYears : [2026];
    const gradYearMet = gradYears.includes(student.graduationYear);
    if (!gradYearMet) {
      reasons.push('GRADUATION_YEAR_NOT_ELIGIBLE');
    }

    // 5. Skills Check
    const skillRes = this.skillMatcher.calculateMatch(student.skills, drive.skillRequirements);
    const skillsMet = skillRes.requiredSkillsMet;
    if (!skillsMet) {
      reasons.push('MISSING_REQUIRED_SKILL');
    }

    // 6. Company Drive Active Check
    const companyActiveMet = ['open', 'in_progress', 'active'].includes(drive.status.toLowerCase());
    if (!companyActiveMet) {
      reasons.push('COMPANY_INACTIVE');
    }

    const isEligible = reasons.length === 0;

    return {
      isEligible,
      reasons,
      criteriaBreakdown: {
        gpaMet,
        studentGpa: student.gpa,
        requiredMinGpa: drive.minGpa,
        deptMet,
        studentDept: student.department,
        allowedDepts: drive.eligibleDepts,
        gradYearMet,
        studentGradYear: student.graduationYear,
        allowedGradYears: gradYears,
        skillsMet,
        missingSkills: skillRes.missingRequiredSkills,
        companyActiveMet,
        driveStatus: drive.status,
      },
    };
  }
}
