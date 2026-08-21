/**
 * TalentMatrix — Multi-Tier Recursive Offer Cascade Engine
 * 
 * Manages the tier hierarchy: DREAM > CORE > MASS
 * 
 * Execution Flow on Tier Upgrade:
 * 1. Student A holds CORE offer.
 * 2. Student A qualifies for & accepts DREAM offer.
 * 3. CORE offer is released.
 * 4. CORE drive quota increases by 1.
 * 5. Next highest-ranked eligible candidate B is identified.
 * 6. CORE offer is assigned to Student B.
 * 7. If Student B previously held a MASS offer, Student B's MASS offer is released,
 *    triggering a recursive cascade.
 */

export type OfferTier = 'DREAM' | 'CORE' | 'MASS';

export const TIER_LEVELS: Record<string, number> = {
  MASS: 1,
  standard: 1,
  CORE: 2,
  core: 2,
  DREAM: 3,
  dream: 3,
  SUPER_DREAM: 4,
  super_dream: 4,
};

export interface CascadeCandidate {
  studentId: string;
  studentName: string;
  currentOffer?: {
    driveId: string;
    companyName: string;
    tier: string;
    packageLpa: number;
  };
  // Ranked list of preferred drives
  preferences: string[];
}

export interface CascadeDrive {
  driveId: string;
  companyName: string;
  role: string;
  tier: string;
  quota: number;
  packageLpa: number;
  // Ranked list of candidate studentIds
  candidateRankings: string[];
  // Currently assigned studentIds
  assignedStudents: Set<string>;
}

export interface CascadeLogEntry {
  type: 'CASCADE_STARTED' | 'TIER_UPGRADE' | 'OFFER_RELEASED' | 'OFFER_CREATED' | 'CASCADE_CONTINUED' | 'CASCADE_COMPLETED';
  studentId: string;
  studentName: string;
  driveId: string;
  companyName: string;
  tier: string;
  releasedDriveId?: string;
  releasedCompanyName?: string;
  releasedTier?: string;
  depth: number;
  description: string;
}

export interface CascadeExecutionResult {
  cascadeCount: number;
  totalUpgrades: number;
  totalReleases: number;
  logs: CascadeLogEntry[];
  finalAssignments: Map<string, { driveId: string; tier: string; companyName: string }>;
}

export class TierCascadeEngine {
  /**
   * Evaluates if newTier is strictly higher than existingTier
   */
  isTierUpgrade(newTier: string, existingTier?: string): boolean {
    if (!existingTier) return true;
    const newLvl = TIER_LEVELS[newTier] || TIER_LEVELS[newTier.toUpperCase()] || 1;
    const existLvl = TIER_LEVELS[existingTier] || TIER_LEVELS[existingTier.toUpperCase()] || 1;
    return newLvl > existLvl;
  }

  /**
   * Processes a cascading upgrade when a candidate receives a higher tier offer
   */
  processCascade(
    triggerStudentId: string,
    targetDriveId: string,
    candidates: Map<string, CascadeCandidate>,
    drives: Map<string, CascadeDrive>
  ): CascadeExecutionResult {
    const logs: CascadeLogEntry[] = [];
    let cascadeCount = 0;
    let totalUpgrades = 0;
    let totalReleases = 0;

    const student = candidates.get(triggerStudentId);
    const targetDrive = drives.get(targetDriveId);

    if (!student || !targetDrive) {
      return {
        cascadeCount: 0,
        totalUpgrades: 0,
        totalReleases: 0,
        logs: [],
        finalAssignments: this.buildAssignmentMap(candidates),
      };
    }

    logs.push({
      type: 'CASCADE_STARTED',
      studentId: student.studentId,
      studentName: student.studentName,
      driveId: targetDrive.driveId,
      companyName: targetDrive.companyName,
      tier: targetDrive.tier,
      depth: 0,
      description: `Cascade initiated: Student ${student.studentName} eligible for ${targetDrive.tier} offer from ${targetDrive.companyName}`,
    });

    // Queue of { studentId, targetDriveId, depth } to process recursively
    const queue: Array<{ studentId: string; targetDriveId: string; depth: number }> = [
      { studentId: triggerStudentId, targetDriveId, depth: 1 }
    ];

    while (queue.length > 0) {
      const { studentId: currStudentId, targetDriveId: currDriveId, depth } = queue.shift()!;
      const currStudent = candidates.get(currStudentId);
      const currDrive = drives.get(currDriveId);

      if (!currStudent || !currDrive) continue;

      const previousOffer = currStudent.currentOffer;

      // 1. Assign new higher tier offer
      targetDrive.assignedStudents.add(currStudentId);
      currStudent.currentOffer = {
        driveId: currDrive.driveId,
        companyName: currDrive.companyName,
        tier: currDrive.tier,
        packageLpa: currDrive.packageLpa,
      };
      totalUpgrades++;

      logs.push({
        type: 'TIER_UPGRADE',
        studentId: currStudent.studentId,
        studentName: currStudent.studentName,
        driveId: currDrive.driveId,
        companyName: currDrive.companyName,
        tier: currDrive.tier,
        releasedDriveId: previousOffer?.driveId,
        releasedCompanyName: previousOffer?.companyName,
        releasedTier: previousOffer?.tier,
        depth,
        description: previousOffer
          ? `Upgraded from ${previousOffer.tier} (${previousOffer.companyName}) to ${currDrive.tier} (${currDrive.companyName})`
          : `Assigned new ${currDrive.tier} offer from ${currDrive.companyName}`,
      });

      // 2. If previous offer existed, release it and cascade to next in line
      if (previousOffer) {
        const releasedDrive = drives.get(previousOffer.driveId);
        if (releasedDrive) {
          releasedDrive.assignedStudents.delete(currStudentId);
          totalReleases++;
          cascadeCount++;

          logs.push({
            type: 'OFFER_RELEASED',
            studentId: currStudent.studentId,
            studentName: currStudent.studentName,
            driveId: releasedDrive.driveId,
            companyName: releasedDrive.companyName,
            tier: releasedDrive.tier,
            depth,
            description: `Released ${releasedDrive.tier} offer from ${releasedDrive.companyName}. Quota seat reopened.`,
          });

          // 3. Find next candidate in ranking list for releasedDrive
          for (const nextStudentId of releasedDrive.candidateRankings) {
            const nextCandidate = candidates.get(nextStudentId);
            if (!nextCandidate) continue;

            // Candidate must not already be assigned to this drive
            if (releasedDrive.assignedStudents.has(nextStudentId)) continue;

            // Check if this drive is an upgrade for the candidate
            if (this.isTierUpgrade(releasedDrive.tier, nextCandidate.currentOffer?.tier)) {
              logs.push({
                type: 'CASCADE_CONTINUED',
                studentId: nextCandidate.studentId,
                studentName: nextCandidate.studentName,
                driveId: releasedDrive.driveId,
                companyName: releasedDrive.companyName,
                tier: releasedDrive.tier,
                depth: depth + 1,
                description: `Cascade propagating: Next in line candidate ${nextCandidate.studentName} offered reopened seat at ${releasedDrive.companyName}`,
              });

              queue.push({
                studentId: nextStudentId,
                targetDriveId: releasedDrive.driveId,
                depth: depth + 1,
              });
              break; // Seat filled
            }
          }
        }
      }
    }

    logs.push({
      type: 'CASCADE_COMPLETED',
      studentId: student.studentId,
      studentName: student.studentName,
      driveId: targetDrive.driveId,
      companyName: targetDrive.companyName,
      tier: targetDrive.tier,
      depth: 0,
      description: `Cascade resolution completed with ${cascadeCount} secondary offer cascades.`,
    });

    return {
      cascadeCount,
      totalUpgrades,
      totalReleases,
      logs,
      finalAssignments: this.buildAssignmentMap(candidates),
    };
  }

  private buildAssignmentMap(candidates: Map<string, CascadeCandidate>): Map<string, { driveId: string; tier: string; companyName: string }> {
    const map = new Map<string, { driveId: string; tier: string; companyName: string }>();
    for (const [id, c] of candidates) {
      if (c.currentOffer) {
        map.set(id, {
          driveId: c.currentOffer.driveId,
          tier: c.currentOffer.tier,
          companyName: c.currentOffer.companyName,
        });
      }
    }
    return map;
  }
}
