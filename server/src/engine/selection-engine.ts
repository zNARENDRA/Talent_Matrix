/**
 * TalentMatrix — Selection & Deselection Engine
 * 
 * Manages the candidate selection lifecycle:
 * APPLIED → ELIGIBILITY CHECK → SHORTLISTING → SELECTION / DESELECTION → ALLOCATION
 * 
 * Implements deterministic candidate scoring & ranking with configurable weights:
 * Composite Score = (w_skill * SkillScore) + (w_recruiter * RecruiterScore) + (w_pref * PrefScore) + (w_gpa * GPAScore)
 */

import { SkillMatchingService, StudentSkillProfile, SkillRequirement } from './skill-matching.js';
import { EligibilityEngine, EligibilityStudentInput, EligibilityDriveInput } from './eligibility-engine.js';

export interface SelectionWeights {
  skillWeight: number;      // e.g. 0.40
  recruiterWeight: number;  // e.g. 0.30
  preferenceWeight: number; // e.g. 0.20
  gpaWeight: number;        // e.g. 0.10
}

export const DEFAULT_SELECTION_WEIGHTS: SelectionWeights = {
  skillWeight: 0.40,
  recruiterWeight: 0.30,
  preferenceWeight: 0.20,
  gpaWeight: 0.10,
};

export interface CandidateApplicationProfile {
  applicationId: string;
  studentId: string;
  studentDbId: string;
  studentName: string;
  department: string;
  gpa: number;
  graduationYear: number;
  status: string;
  skills: StudentSkillProfile[];
  recruiterScore?: number; // 0 - 100
  preferenceRank?: number; // 1 = 1st choice, 2 = 2nd choice, etc.
}

export interface DriveSelectionConfig {
  driveId: string;
  companyName: string;
  role: string;
  minGpa: number;
  eligibleDepts: string[];
  graduationYears: number[];
  skillRequirements: SkillRequirement[];
  shortlistCapacity?: number;
  recruiterScoreCutoff?: number;
  weights?: SelectionWeights;
  status: string;
}

export interface EvaluatedCandidate {
  studentDbId: string;
  studentId: string;
  studentName: string;
  department: string;
  gpa: number;
  isEligible: boolean;
  eligibilityReasons: string[];
  skillScore: number;
  recruiterScore: number;
  preferenceRank: number;
  compositeScore: number;
  rank: number;
  decision: 'SELECTED' | 'DESELECTED' | 'SHORTLISTED' | 'NOT_SHORTLISTED' | 'INELIGIBLE' | 'WAITLISTED';
  deselectionReason?: string;
}

export class SelectionEngine {
  private skillMatcher = new SkillMatchingService();
  private eligibilityEngine = new EligibilityEngine();

  /**
   * Evaluates all applicants for a drive, scores them deterministically, and ranks them
   */
  evaluateApplicants(
    candidates: CandidateApplicationProfile[],
    driveConfig: DriveSelectionConfig
  ): EvaluatedCandidate[] {
    const weights = driveConfig.weights || DEFAULT_SELECTION_WEIGHTS;
    const totalW = (weights.skillWeight + weights.recruiterWeight + weights.preferenceWeight + weights.gpaWeight) || 1.0;
    const wSkill = weights.skillWeight / totalW;
    const wRecruiter = weights.recruiterWeight / totalW;
    const wPref = weights.preferenceWeight / totalW;
    const wGpa = weights.gpaWeight / totalW;

    const driveEligibilityInput: EligibilityDriveInput = {
      id: driveConfig.driveId,
      companyName: driveConfig.companyName,
      role: driveConfig.role,
      minGpa: driveConfig.minGpa,
      eligibleDepts: driveConfig.eligibleDepts,
      graduationYears: driveConfig.graduationYears,
      skillRequirements: driveConfig.skillRequirements,
      status: driveConfig.status,
    };

    // Step 1: Compute raw scores for each candidate
    const scoredList: Array<{
      candidate: CandidateApplicationProfile;
      isEligible: boolean;
      eligibilityReasons: string[];
      skillScore: number;
      recruiterScore: number;
      preferenceRank: number;
      compositeScore: number;
    }> = [];

    for (const c of candidates) {
      const eligStudentInput: EligibilityStudentInput = {
        id: c.studentDbId,
        studentId: c.studentId,
        name: c.studentName,
        department: c.department,
        gpa: c.gpa,
        graduationYear: c.graduationYear,
        status: c.status,
        skills: c.skills,
      };

      const eligResult = this.eligibilityEngine.evaluate(eligStudentInput, driveEligibilityInput);
      const skillRes = this.skillMatcher.calculateMatch(c.skills, driveConfig.skillRequirements);
      const skillScore = skillRes.compatibilityScore;
      const recruiterScore = c.recruiterScore ?? (c.gpa * 10); // fallback based on academic performance
      
      // Preference score: Rank 1 -> 100, Rank 2 -> 80, Rank 3 -> 60, Rank 4 -> 40, Rank 5+ -> 20
      const prefRank = c.preferenceRank || 5;
      const prefScore = Math.max(10, 100 - (prefRank - 1) * 20);

      // GPA score normalized to 0-100 (assuming 10.0 scale)
      const gpaScore = Math.min(100, (c.gpa / 10.0) * 100);

      const compositeScore = Math.round(
        (skillScore * wSkill + recruiterScore * wRecruiter + prefScore * wPref + gpaScore * wGpa) * 100
      ) / 100;

      scoredList.push({
        candidate: c,
        isEligible: eligResult.isEligible,
        eligibilityReasons: eligResult.reasons,
        skillScore,
        recruiterScore,
        preferenceRank: prefRank,
        compositeScore,
      });
    }

    // Step 2: Deterministic Sorting / Ranking
    // Tie-breaker order:
    // 1. Composite Score (descending)
    // 2. Recruiter Score (descending)
    // 3. Skill Score (descending)
    // 4. GPA (descending)
    // 5. Student ID (lexicographical ascending)
    scoredList.sort((a, b) => {
      // Eligible candidates come before ineligible
      if (a.isEligible !== b.isEligible) {
        return a.isEligible ? -1 : 1;
      }
      if (b.compositeScore !== a.compositeScore) {
        return b.compositeScore - a.compositeScore;
      }
      if (b.recruiterScore !== a.recruiterScore) {
        return b.recruiterScore - a.recruiterScore;
      }
      if (b.skillScore !== a.skillScore) {
        return b.skillScore - a.skillScore;
      }
      if (b.candidate.gpa !== a.candidate.gpa) {
        return b.candidate.gpa - a.candidate.gpa;
      }
      return a.candidate.studentId.localeCompare(b.candidate.studentId);
    });

    // Step 3: Assign Ranks and Decisions with Deselection Reasons
    const capacity = driveConfig.shortlistCapacity || scoredList.length;
    const scoreCutoff = driveConfig.recruiterScoreCutoff || 0;

    const evaluated: EvaluatedCandidate[] = [];
    let rank = 1;

    for (const item of scoredList) {
      let decision: EvaluatedCandidate['decision'] = 'SELECTED';
      let deselectionReason: string | undefined;

      if (!item.isEligible) {
        decision = 'INELIGIBLE';
        deselectionReason = item.eligibilityReasons.join(', ');
      } else if (item.recruiterScore < scoreCutoff) {
        decision = 'DESELECTED';
        deselectionReason = 'RECRUITER_SCORE_BELOW_CUTOFF';
      } else if (rank > capacity) {
        decision = 'DESELECTED';
        deselectionReason = 'SHORTLIST_CAP_REACHED';
      }

      evaluated.push({
        studentDbId: item.candidate.studentDbId,
        studentId: item.candidate.studentId,
        studentName: item.candidate.studentName,
        department: item.candidate.department,
        gpa: item.candidate.gpa,
        isEligible: item.isEligible,
        eligibilityReasons: item.eligibilityReasons,
        skillScore: item.skillScore,
        recruiterScore: item.recruiterScore,
        preferenceRank: item.preferenceRank,
        compositeScore: item.compositeScore,
        rank: item.isEligible ? rank++ : 9999,
        decision,
        deselectionReason,
      });
    }

    return evaluated;
  }
}
