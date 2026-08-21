/**
 * TalentMatrix — Unified Many-to-One Gale-Shapley Allocation Engine (Module A)
 * 
 * Pure domain algorithm combining:
 * 1. 5-Point Eligibility Filtering
 * 2. Deterministic Composite Scoring & Tie-Breaking
 * 3. Multi-Seat Gale-Shapley Matching with Quota Constraints
 * 4. DREAM > CORE > MASS Tier Cascading & Quota Recovery
 * 5. Explainable Allocation (Transparent Decision Breakdowns & Student-Safe Text)
 * 6. Algorithmic Blocking-Pair Stability Validation
 * 7. Comprehensive Institutional Metrics Computation
 */

import { SkillMatchingService, StudentSkillProfile, SkillRequirement } from './skill-matching.js';
import { EligibilityEngine } from './eligibility-engine.js';
import { SelectionEngine, SelectionWeights, DEFAULT_SELECTION_WEIGHTS } from './selection-engine.js';
import { TierCascadeEngine, CascadeCandidate, CascadeDrive } from './cascade-engine.js';
import { BlockingPairValidator, StabilityStudent, StabilityDrive } from './blocking-pair-validator.js';

export interface AllocationStudentInput {
  id: string;
  studentId: string;
  name: string;
  department: string;
  gpa: number;
  graduationYear: number;
  status: string; // 'registered', 'eligible', 'placed', 'opted_out'
  skills: StudentSkillProfile[];
  preferences: string[]; // Ordered list of driveIds (1st choice, 2nd choice, ...)
  existingOffer?: {
    driveId: string;
    companyName: string;
    tier: string;
    packageLpa: number;
  };
}

export interface AllocationDriveInput {
  id: string;
  companyId: string;
  companyName: string;
  role: string;
  packageLpa: number;
  tier: string; // DREAM, CORE, MASS, super_dream, dream, core, standard
  quota: number;
  minGpa: number;
  eligibleDepts: string[];
  graduationYears: number[];
  skillRequirements: SkillRequirement[];
  weights?: SelectionWeights;
  candidateScores?: Map<string, number>; // studentId -> recruiterScore (0-100)
  status?: string;
}

export interface MatchDecisionExplanation {
  studentId: string;
  studentName: string;
  driveId: string;
  companyName: string;
  tier: string;
  status: 'MATCHED' | 'PROVISIONAL' | 'REJECTED' | 'UPGRADED' | 'RELEASED' | 'UNALLOCATED';
  gpa: number;
  minGpaRequired: number;
  department: string;
  skillMatchPercentage: number;
  recruiterScore: number;
  preferenceRank: number;
  compositeScore: number;
  cutoffRank: number;
  quota: number;
  reason: string;
  studentSafeExplanation: string;
}

export interface AllocationMetricsSummary {
  totalStudents: number;
  eligibleStudents: number;
  totalCompanies: number;
  totalQuota: number;
  allocatedCount: number;
  unallocatedCount: number;
  placementRate: number;        // percentage
  firstChoiceRate: number;      // percentage of placed who got 1st choice
  top2Rate: number;             // percentage who got Top 2
  top3Rate: number;             // percentage who got Top 3
  avgPreferenceRank: number;
  avgRecruiterScore: number;
  avgSkillMatch: number;
  quotaUtilizationRate: number; // percentage of total quota filled
  cascadeCount: number;
  tierDistribution: {
    dream: number;
    core: number;
    mass: number;
  };
  isStable: boolean;
  blockingPairCount: number;
}

export interface AllocationExecutionResult {
  matches: Map<string, { driveId: string; companyName: string; role: string; tier: string; packageLpa: number }>;
  unmatchedStudentIds: string[];
  driveUtilization: Map<string, { quota: number; allocated: number; remaining: number; utilizationPercent: number }>;
  explanations: MatchDecisionExplanation[];
  metrics: AllocationMetricsSummary;
  cascadeLogs: any[];
  stability: {
    isStable: boolean;
    blockingPairCount: number;
    blockingPairs: any[];
  };
}

export class ModuleAAllocationEngine {
  private skillMatcher = new SkillMatchingService();
  private eligibilityEngine = new EligibilityEngine();
  private selectionEngine = new SelectionEngine();
  private cascadeEngine = new TierCascadeEngine();
  private stabilityValidator = new BlockingPairValidator();

  run(
    students: AllocationStudentInput[],
    drives: AllocationDriveInput[]
  ): AllocationExecutionResult {
    // 1. Build lookup maps
    const studentMap = new Map<string, AllocationStudentInput>();
    const driveMap = new Map<string, AllocationDriveInput>();
    for (const s of students) studentMap.set(s.id, s);
    for (const d of drives) driveMap.set(d.id, d);

    // 2. Score and rank candidates for each drive
    const driveRankings = new Map<string, string[]>(); // driveId -> ranked list of studentIds
    const candidateScoreDetails = new Map<string, Map<string, { skillScore: number; recruiterScore: number; compositeScore: number; rank: number }>>();

    for (const drive of drives) {
      const candidatesForDrive = students.map((s) => {
        const prefIndex = s.preferences.indexOf(drive.id);
        return {
          applicationId: `${s.id}-${drive.id}`,
          studentId: s.studentId,
          studentDbId: s.id,
          studentName: s.name,
          department: s.department,
          gpa: s.gpa,
          graduationYear: s.graduationYear,
          status: s.status,
          skills: s.skills,
          recruiterScore: drive.candidateScores?.get(s.id),
          preferenceRank: prefIndex !== -1 ? prefIndex + 1 : 99,
        };
      });

      const evaluated = this.selectionEngine.evaluateApplicants(candidatesForDrive, {
        driveId: drive.id,
        companyName: drive.companyName,
        role: drive.role,
        minGpa: drive.minGpa,
        eligibleDepts: drive.eligibleDepts,
        graduationYears: drive.graduationYears,
        skillRequirements: drive.skillRequirements,
        weights: drive.weights,
        status: drive.status || 'open',
      });

      const eligibleRanked = evaluated.filter((e) => e.isEligible).map((e) => e.studentDbId);
      driveRankings.set(drive.id, eligibleRanked);

      const scoreMap = new Map<string, { skillScore: number; recruiterScore: number; compositeScore: number; rank: number }>();
      for (const e of evaluated) {
        scoreMap.set(e.studentDbId, {
          skillScore: e.skillScore,
          recruiterScore: e.recruiterScore,
          compositeScore: e.compositeScore,
          rank: e.rank,
        });
      }
      candidateScoreDetails.set(drive.id, scoreMap);
    }

    // 3. Multi-seat Gale-Shapley matching
    // tentativeAssignments: driveId -> Set<studentId>
    const driveAssignments = new Map<string, Set<string>>();
    // studentCurrentAssignment: studentId -> driveId
    const studentAssignment = new Map<string, string>();
    // studentProposalIndex: studentId -> number
    const studentProposalIndex = new Map<string, number>();

    for (const d of drives) driveAssignments.set(d.id, new Set());
    for (const s of students) studentProposalIndex.set(s.id, 0);

    const eligibleStudentsList = students.filter((s) => s.status !== 'opted_out');
    const freeStudents = [...eligibleStudentsList.map((s) => s.id)];

    let changed = true;
    let iteration = 0;
    const maxIterations = students.length * drives.length * 2 + 100;

    while (freeStudents.length > 0 && iteration < maxIterations) {
      iteration++;
      const studentId = freeStudents.shift()!;
      const student = studentMap.get(studentId);
      if (!student) continue;

      const propIdx = studentProposalIndex.get(studentId) || 0;
      if (propIdx >= student.preferences.length) {
        // Exhausted preferences
        continue;
      }

      const targetDriveId = student.preferences[propIdx];
      studentProposalIndex.set(studentId, propIdx + 1);

      const targetDrive = driveMap.get(targetDriveId);
      if (!targetDrive) {
        freeStudents.push(studentId);
        continue;
      }

      const ranking = driveRankings.get(targetDriveId) || [];
      const studentRankIndex = ranking.indexOf(studentId);

      if (studentRankIndex === -1) {
        // Ineligible / unacceptable for this drive, try next preference
        freeStudents.push(studentId);
        continue;
      }

      const assigned = driveAssignments.get(targetDriveId)!;

      if (assigned.size < targetDrive.quota) {
        // Available capacity -> tentative acceptance
        assigned.add(studentId);
        studentAssignment.set(studentId, targetDriveId);
      } else {
        // Over capacity -> check if company prefers this student over worst currently held student
        let worstStudentId: string | null = null;
        let worstRankIndex = -1;

        for (const heldId of assigned) {
          const heldRank = ranking.indexOf(heldId);
          if (heldRank > worstRankIndex) {
            worstRankIndex = heldRank;
            worstStudentId = heldId;
          }
        }

        if (studentRankIndex < worstRankIndex && worstStudentId !== null) {
          // Replace worst candidate
          assigned.delete(worstStudentId);
          studentAssignment.delete(worstStudentId);
          freeStudents.push(worstStudentId);

          assigned.add(studentId);
          studentAssignment.set(studentId, targetDriveId);
        } else {
          // Rejected by company -> student remains free to propose next choice
          freeStudents.push(studentId);
        }
      }
    }

    // 4. Multi-Tier Cascading Engine (DREAM > CORE > MASS)
    // Setup cascade structures
    const cascadeCandidates = new Map<string, CascadeCandidate>();
    const cascadeDrives = new Map<string, CascadeDrive>();

    for (const s of students) {
      const assignedDriveId = studentAssignment.get(s.id);
      const assignedDrive = assignedDriveId ? driveMap.get(assignedDriveId) : undefined;
      cascadeCandidates.set(s.id, {
        studentId: s.id,
        studentName: s.name,
        currentOffer: assignedDrive ? {
          driveId: assignedDrive.id,
          companyName: assignedDrive.companyName,
          tier: assignedDrive.tier,
          packageLpa: assignedDrive.packageLpa,
        } : undefined,
        preferences: s.preferences,
      });
    }

    for (const d of drives) {
      cascadeDrives.set(d.id, {
        driveId: d.id,
        companyName: d.companyName,
        role: d.role,
        tier: d.tier,
        quota: d.quota,
        packageLpa: d.packageLpa,
        candidateRankings: driveRankings.get(d.id) || [],
        assignedStudents: new Set(driveAssignments.get(d.id) || []),
      });
    }

    // Run cascade optimization for any unfilled high-tier seats
    let totalCascades = 0;
    const allCascadeLogs: any[] = [];

    for (const d of drives) {
      const assigned = cascadeDrives.get(d.id)!.assignedStudents;
      if (assigned.size < d.quota) {
        const ranking = driveRankings.get(d.id) || [];
        for (const candidateId of ranking) {
          if (assigned.size >= d.quota) break;
          if (assigned.has(candidateId)) continue;

          const candidate = cascadeCandidates.get(candidateId);
          if (candidate && this.cascadeEngine.isTierUpgrade(d.tier, candidate.currentOffer?.tier)) {
            const cascadeRes = this.cascadeEngine.processCascade(candidateId, d.id, cascadeCandidates, cascadeDrives);
            totalCascades += cascadeRes.cascadeCount;
            allCascadeLogs.push(...cascadeRes.logs);
          }
        }
      }
    }

    // 5. Build Final Output Matches
    const finalMatches = new Map<string, { driveId: string; companyName: string; role: string; tier: string; packageLpa: number }>();
    const driveUtilization = new Map<string, { quota: number; allocated: number; remaining: number; utilizationPercent: number }>();

    for (const d of drives) {
      const assigned = cascadeDrives.get(d.id)!.assignedStudents;
      driveUtilization.set(d.id, {
        quota: d.quota,
        allocated: assigned.size,
        remaining: Math.max(0, d.quota - assigned.size),
        utilizationPercent: d.quota > 0 ? Math.round((assigned.size / d.quota) * 100) : 0,
      });

      for (const studentId of assigned) {
        finalMatches.set(studentId, {
          driveId: d.id,
          companyName: d.companyName,
          role: d.role,
          tier: d.tier,
          packageLpa: d.packageLpa,
        });
      }
    }

    const unmatchedStudentIds = students
      .filter((s) => s.status !== 'opted_out' && !finalMatches.has(s.id))
      .map((s) => s.id);

    // 6. Generate Decision Explanations (TPO Deep-Dive + Student-Safe)
    const explanations: MatchDecisionExplanation[] = [];

    for (const s of students) {
      const match = finalMatches.get(s.id);
      if (match) {
        const drive = driveMap.get(match.driveId)!;
        const prefRank = s.preferences.indexOf(match.driveId) + 1;
        const scoreInfo = candidateScoreDetails.get(match.driveId)?.get(s.id);
        const skillScore = scoreInfo?.skillScore ?? 85;
        const recruiterScore = scoreInfo?.recruiterScore ?? 80;
        const compositeScore = scoreInfo?.compositeScore ?? 82.5;
        const cutoffRank = scoreInfo?.rank ?? 1;

        explanations.push({
          studentId: s.studentId,
          studentName: s.name,
          driveId: match.driveId,
          companyName: match.companyName,
          tier: match.tier,
          status: 'MATCHED',
          gpa: s.gpa,
          minGpaRequired: drive.minGpa,
          department: s.department,
          skillMatchPercentage: skillScore,
          recruiterScore,
          preferenceRank: prefRank,
          compositeScore,
          cutoffRank,
          quota: drive.quota,
          reason: `Matched based on preference #${prefRank} and composite score ${compositeScore} (Rank #${cutoffRank} in quota ${drive.quota}).`,
          studentSafeExplanation: `Congratulations! You have been matched with ${match.companyName} (${match.role}) based on your high evaluation ranking and preference choice.`,
        });
      } else {
        explanations.push({
          studentId: s.studentId,
          studentName: s.name,
          driveId: '',
          companyName: 'None',
          tier: 'NONE',
          status: 'UNALLOCATED',
          gpa: s.gpa,
          minGpaRequired: 0,
          department: s.department,
          skillMatchPercentage: 0,
          recruiterScore: 0,
          preferenceRank: 0,
          compositeScore: 0,
          cutoffRank: 0,
          quota: 0,
          reason: s.status === 'opted_out' ? 'Candidate opted out of placement' : 'Candidate preferences exhausted without qualifying within company capacity constraints.',
          studentSafeExplanation: s.status === 'opted_out' ? 'You have opted out of placement.' : 'Your ranking was outside the available open quotas for your submitted preferences.',
        });
      }
    }

    // 7. Validate Algorithmic Stability (Blocking-Pair Validator)
    const stabilityStudents = new Map<string, StabilityStudent>();
    const stabilityDrives = new Map<string, StabilityDrive>();
    const stabilityAssignments = new Map<string, string>();

    for (const s of students) {
      stabilityStudents.set(s.id, { id: s.id, studentId: s.studentId, name: s.name, preferences: s.preferences });
    }
    for (const d of drives) {
      stabilityDrives.set(d.id, {
        id: d.id,
        companyName: d.companyName,
        role: d.role,
        quota: d.quota,
        candidateRankings: driveRankings.get(d.id) || [],
      });
    }
    for (const [sId, m] of finalMatches) {
      stabilityAssignments.set(sId, m.driveId);
    }

    const stabilityResult = this.stabilityValidator.validateStability(
      stabilityStudents,
      stabilityDrives,
      stabilityAssignments
    );

    // 8. Compute Institutional Analytics & Metrics Summary
    let totalPrefRankSum = 0;
    let firstChoiceCount = 0;
    let top2Count = 0;
    let top3Count = 0;
    let skillScoreSum = 0;
    let recruiterScoreSum = 0;
    let dreamCount = 0;
    let coreCount = 0;
    let massCount = 0;

    for (const [studentId, match] of finalMatches) {
      const student = studentMap.get(studentId)!;
      const prefIdx = student.preferences.indexOf(match.driveId);
      const rank = prefIdx !== -1 ? prefIdx + 1 : 99;
      totalPrefRankSum += rank;

      if (rank === 1) firstChoiceCount++;
      if (rank <= 2) top2Count++;
      if (rank <= 3) top3Count++;

      const scoreInfo = candidateScoreDetails.get(match.driveId)?.get(studentId);
      if (scoreInfo) {
        skillScoreSum += scoreInfo.skillScore;
        recruiterScoreSum += scoreInfo.recruiterScore;
      }

      const t = match.tier.toLowerCase();
      if (t.includes('dream') || t.includes('super')) dreamCount++;
      else if (t.includes('core')) coreCount++;
      else massCount++;
    }

    const totalPlaced = finalMatches.size;
    const eligibleCount = eligibleStudentsList.length;
    const totalQuotaSum = drives.reduce((acc, d) => acc + d.quota, 0);

    const metrics: AllocationMetricsSummary = {
      totalStudents: students.length,
      eligibleStudents: eligibleCount,
      totalCompanies: drives.length,
      totalQuota: totalQuotaSum,
      allocatedCount: totalPlaced,
      unallocatedCount: unmatchedStudentIds.length,
      placementRate: eligibleCount > 0 ? Math.round((totalPlaced / eligibleCount) * 1000) / 10 : 0,
      firstChoiceRate: totalPlaced > 0 ? Math.round((firstChoiceCount / totalPlaced) * 1000) / 10 : 0,
      top2Rate: totalPlaced > 0 ? Math.round((top2Count / totalPlaced) * 1000) / 10 : 0,
      top3Rate: totalPlaced > 0 ? Math.round((top3Count / totalPlaced) * 1000) / 10 : 0,
      avgPreferenceRank: totalPlaced > 0 ? Math.round((totalPrefRankSum / totalPlaced) * 100) / 100 : 0,
      avgRecruiterScore: totalPlaced > 0 ? Math.round((recruiterScoreSum / totalPlaced) * 10) / 10 : 0,
      avgSkillMatch: totalPlaced > 0 ? Math.round((skillScoreSum / totalPlaced) * 10) / 10 : 0,
      quotaUtilizationRate: totalQuotaSum > 0 ? Math.round((totalPlaced / totalQuotaSum) * 1000) / 10 : 0,
      cascadeCount: totalCascades,
      tierDistribution: {
        dream: dreamCount,
        core: coreCount,
        mass: massCount,
      },
      isStable: stabilityResult.isStable,
      blockingPairCount: stabilityResult.blockingPairCount,
    };

    return {
      matches: finalMatches,
      unmatchedStudentIds,
      driveUtilization,
      explanations,
      metrics,
      cascadeLogs: allCascadeLogs,
      stability: {
        isStable: stabilityResult.isStable,
        blockingPairCount: stabilityResult.blockingPairCount,
        blockingPairs: stabilityResult.blockingPairs,
      },
    };
  }
}
