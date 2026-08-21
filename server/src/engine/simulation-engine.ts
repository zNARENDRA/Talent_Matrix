/**
 * TalentMatrix — What-If Simulation Engine
 * 
 * Executes hypothetical placement scenario analyses:
 * - Modifying drive GPA cutoffs
 * - Increasing/decreasing company quotas
 * - Changing tier classifications (e.g. CORE -> DREAM)
 * - Adjusting department eligibility
 * - Tweaking scoring weights
 * 
 * Provides side-by-side comparative deltas while guaranteeing complete
 * in-memory isolation from production database records.
 */

import {
  ModuleAAllocationEngine,
  AllocationStudentInput,
  AllocationDriveInput,
  AllocationExecutionResult,
} from './module-a-allocation.js';

export interface SimulationOverride {
  driveId: string;
  minGpa?: number;
  quota?: number;
  tier?: string;
  eligibleDepts?: string[];
  weights?: {
    skillWeight: number;
    recruiterWeight: number;
    preferenceWeight: number;
    gpaWeight: number;
  };
}

export interface StudentAllocationDelta {
  studentId: string;
  studentName: string;
  department: string;
  baselineMatch?: { driveId: string; companyName: string; tier: string; packageLpa: number };
  simulatedMatch?: { driveId: string; companyName: string; tier: string; packageLpa: number };
  outcomeChange: 'UPGRADED' | 'DOWNGRADED' | 'NEWLY_PLACED' | 'LOST_PLACEMENT' | 'UNCHANGED' | 'LATERAL_SHIFT';
  packageDifferenceLpa: number;
}

export interface SimulationComparisonResult {
  baseline: AllocationExecutionResult;
  simulated: AllocationExecutionResult;
  deltas: {
    totalChangedStudents: number;
    newlyPlacedCount: number;
    lostPlacementCount: number;
    upgradedCount: number;
    downgradedCount: number;
    placementRateDelta: number;
    avgPreferenceRankDelta: number;
    avgSkillMatchDelta: number;
    quotaUtilizationDelta: number;
    cascadeCountDelta: number;
    studentDeltas: StudentAllocationDelta[];
  };
}

export class SimulationEngine {
  private allocationEngine = new ModuleAAllocationEngine();

  simulate(
    baselineStudents: AllocationStudentInput[],
    baselineDrives: AllocationDriveInput[],
    overrides: SimulationOverride[]
  ): SimulationComparisonResult {
    // 1. Run baseline allocation
    const baselineResult = this.allocationEngine.run(baselineStudents, baselineDrives);

    // 2. Clone drives with applied overrides
    const overrideMap = new Map<string, SimulationOverride>();
    for (const ov of overrides) overrideMap.set(ov.driveId, ov);

    const simulatedDrives: AllocationDriveInput[] = baselineDrives.map((d) => {
      const ov = overrideMap.get(d.id);
      if (!ov) return { ...d };

      return {
        ...d,
        minGpa: ov.minGpa !== undefined ? ov.minGpa : d.minGpa,
        quota: ov.quota !== undefined ? ov.quota : d.quota,
        tier: ov.tier !== undefined ? ov.tier : d.tier,
        eligibleDepts: ov.eligibleDepts !== undefined ? ov.eligibleDepts : d.eligibleDepts,
        weights: ov.weights !== undefined ? ov.weights : d.weights,
      };
    });

    // 3. Run simulated allocation
    const simulatedResult = this.allocationEngine.run(baselineStudents, simulatedDrives);

    // 4. Compute student-by-student deltas
    const studentDeltas: StudentAllocationDelta[] = [];
    let newlyPlaced = 0;
    let lostPlacement = 0;
    let upgraded = 0;
    let downgraded = 0;
    let changedCount = 0;

    for (const s of baselineStudents) {
      const bMatch = baselineResult.matches.get(s.id);
      const sMatch = simulatedResult.matches.get(s.id);

      const isSameDrive = bMatch?.driveId === sMatch?.driveId;
      if (isSameDrive) continue; // Unchanged

      changedCount++;
      let outcomeChange: StudentAllocationDelta['outcomeChange'] = 'UNCHANGED';
      const pkgDiff = (sMatch?.packageLpa || 0) - (bMatch?.packageLpa || 0);

      if (!bMatch && sMatch) {
        outcomeChange = 'NEWLY_PLACED';
        newlyPlaced++;
      } else if (bMatch && !sMatch) {
        outcomeChange = 'LOST_PLACEMENT';
        lostPlacement++;
      } else if (bMatch && sMatch) {
        if (pkgDiff > 0) {
          outcomeChange = 'UPGRADED';
          upgraded++;
        } else if (pkgDiff < 0) {
          outcomeChange = 'DOWNGRADED';
          downgraded++;
        } else {
          outcomeChange = 'LATERAL_SHIFT';
        }
      }

      studentDeltas.push({
        studentId: s.studentId,
        studentName: s.name,
        department: s.department,
        baselineMatch: bMatch,
        simulatedMatch: sMatch,
        outcomeChange,
        packageDifferenceLpa: Math.round(pkgDiff * 100) / 100,
      });
    }

    const bMetrics = baselineResult.metrics;
    const sMetrics = simulatedResult.metrics;

    return {
      baseline: baselineResult,
      simulated: simulatedResult,
      deltas: {
        totalChangedStudents: changedCount,
        newlyPlacedCount: newlyPlaced,
        lostPlacementCount: lostPlacement,
        upgradedCount: upgraded,
        downgradedCount: downgraded,
        placementRateDelta: Math.round((sMetrics.placementRate - bMetrics.placementRate) * 10) / 10,
        avgPreferenceRankDelta: Math.round((sMetrics.avgPreferenceRank - bMetrics.avgPreferenceRank) * 100) / 100,
        avgSkillMatchDelta: Math.round((sMetrics.avgSkillMatch - bMetrics.avgSkillMatch) * 10) / 10,
        quotaUtilizationDelta: Math.round((sMetrics.quotaUtilizationRate - bMetrics.quotaUtilizationRate) * 10) / 10,
        cascadeCountDelta: sMetrics.cascadeCount - bMetrics.cascadeCount,
        studentDeltas,
      },
    };
  }
}
