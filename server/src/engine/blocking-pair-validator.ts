/**
 * TalentMatrix — Algorithmic Blocking-Pair Stability Validator
 * 
 * Validates whether an allocation outcome is stable under the Many-to-One Gale-Shapley model.
 * 
 * A pair (Student s, Company c) blocks an allocation if:
 * 1. Student s strictly prefers Company c over their currently allocated company (or prefers c over unallocated).
 * 2. AND Company c has available unfilled quota OR prefers Student s over at least one candidate currently assigned to c.
 */

export interface StabilityStudent {
  id: string;
  studentId: string;
  name: string;
  // Ranked list of driveIds in strict order of preference (most preferred first)
  preferences: string[];
}

export interface StabilityDrive {
  id: string;
  companyName: string;
  role: string;
  quota: number;
  // Ranked list of studentIds in strict order of preference (most preferred first)
  candidateRankings: string[];
}

export interface BlockingPairInfo {
  studentId: string;
  studentName: string;
  driveId: string;
  companyName: string;
  currentAssignmentName?: string;
  reason: 'UNFILLED_QUOTA' | 'CANDIDATE_PREFERRED_OVER_CURRENT_MATCH';
  worseStudentId?: string;
}

export interface StabilityValidationResult {
  isStable: boolean;
  blockingPairCount: number;
  blockingPairs: BlockingPairInfo[];
  totalInspectedPairs: number;
}

export class BlockingPairValidator {
  /**
   * Exhaustively validates the stability of an allocation
   * @param students Map of studentId -> StabilityStudent
   * @param drives Map of driveId -> StabilityDrive
   * @param assignments Map of studentId -> driveId (the allocation result)
   */
  validateStability(
    students: Map<string, StabilityStudent>,
    drives: Map<string, StabilityDrive>,
    assignments: Map<string, string>
  ): StabilityValidationResult {
    const blockingPairs: BlockingPairInfo[] = [];
    let totalInspectedPairs = 0;

    // Invert assignments: driveId -> Set<studentId>
    const driveMatches = new Map<string, Set<string>>();
    for (const [driveId] of drives) {
      driveMatches.set(driveId, new Set());
    }
    for (const [studentId, driveId] of assignments) {
      if (driveMatches.has(driveId)) {
        driveMatches.get(driveId)!.add(studentId);
      }
    }

    for (const [studentId, student] of students) {
      const currentAssignedDriveId = assignments.get(studentId);
      const studentPrefs = student.preferences;
      const currentRankIndex = currentAssignedDriveId !== undefined
        ? studentPrefs.indexOf(currentAssignedDriveId)
        : Infinity;

      // Candidate prefers drives ranked before their current allocation
      const preferredDrives = studentPrefs.filter((driveId, idx) => {
        return idx < currentRankIndex;
      });

      for (const targetDriveId of preferredDrives) {
        totalInspectedPairs++;
        const targetDrive = drives.get(targetDriveId);
        if (!targetDrive) continue;

        const currentMatches = driveMatches.get(targetDriveId) || new Set();
        const driveRanking = targetDrive.candidateRankings;
        const studentDriveRankIndex = driveRanking.indexOf(studentId);

        // If candidate is acceptable to target drive (appears in its rankings)
        if (studentDriveRankIndex === -1) continue;

        // Condition A: Target drive has unfilled quota
        if (currentMatches.size < targetDrive.quota) {
          const currentDriveObj = currentAssignedDriveId ? drives.get(currentAssignedDriveId) : undefined;
          blockingPairs.push({
            studentId,
            studentName: student.name,
            driveId: targetDriveId,
            companyName: targetDrive.companyName,
            currentAssignmentName: currentDriveObj ? `${currentDriveObj.companyName} (${currentDriveObj.role})` : 'Unallocated',
            reason: 'UNFILLED_QUOTA',
          });
          continue;
        }

        // Condition B: Target drive prefers this student over at least one currently matched student
        let worstMatchedStudentId: string | null = null;
        let worstMatchedRankIndex = -1;

        for (const matchedStudentId of currentMatches) {
          const matchedRankIndex = driveRanking.indexOf(matchedStudentId);
          if (matchedRankIndex > worstMatchedRankIndex) {
            worstMatchedRankIndex = matchedRankIndex;
            worstMatchedStudentId = matchedStudentId;
          }
        }

        if (worstMatchedRankIndex > studentDriveRankIndex && worstMatchedStudentId !== null) {
          const currentDriveObj = currentAssignedDriveId ? drives.get(currentAssignedDriveId) : undefined;
          blockingPairs.push({
            studentId,
            studentName: student.name,
            driveId: targetDriveId,
            companyName: targetDrive.companyName,
            currentAssignmentName: currentDriveObj ? `${currentDriveObj.companyName} (${currentDriveObj.role})` : 'Unallocated',
            reason: 'CANDIDATE_PREFERRED_OVER_CURRENT_MATCH',
            worseStudentId: worstMatchedStudentId,
          });
        }
      }
    }

    return {
      isStable: blockingPairs.length === 0,
      blockingPairCount: blockingPairs.length,
      blockingPairs,
      totalInspectedPairs,
    };
  }
}
