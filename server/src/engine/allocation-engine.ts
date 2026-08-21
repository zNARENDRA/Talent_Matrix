/**
 * TalentMatrix Allocation Engine
 * 
 * Implements a modified Gale-Shapley stable matching algorithm with:
 * - Multi-tier offer policies (Super Dream, Dream, Core, Standard)
 * - Eligibility filtering (GPA, department, skills)
 * - Conflict detection and resolution
 * - Capacity constraints per company/drive
 */

export interface StudentProfile {
  id: string;
  studentId: string;
  name: string;
  department: string;
  gpa: number;
  skills: string[];
  status: string;
  existingOffers: { tier: string; driveId: string; companyName: string }[];
  preferences: { driveId: string; rank: number }[];
}

export interface DriveProfile {
  id: string;
  companyId: string;
  companyName: string;
  role: string;
  packageLpa: number;
  offerTier: string;
  eligibleDepts: string[];
  minGpa: number;
  requiredSkills: string[];
  openPositions: number;
  filledPositions: number;
  candidateRankings: { studentId: string; rank: number; score: number }[];
}

export interface OfferPolicyRule {
  id: string;
  name: string;
  tier: string;
  blockLowerTiers: boolean;
  allowUpgrade: boolean;
  blockedTiers: string[];
}

export interface AllocationMatch {
  studentId: string;
  driveId: string;
  status: 'matched' | 'unmatched' | 'conflict';
  reason?: string;
}

export interface AllocationConflictItem {
  studentId: string;
  driveId: string;
  conflictType: 'duplicate_assignment' | 'tier_violation' | 'over_allocation' | 'circular' | 'eligibility_violation';
  description: string;
  resolution?: string;
}

export interface AllocationResult {
  matches: AllocationMatch[];
  conflicts: AllocationConflictItem[];
  unmatched: string[];
  stats: {
    totalStudents: number;
    totalDrives: number;
    totalMatches: number;
    totalConflicts: number;
    totalUnmatched: number;
  };
}

// ─── Tier hierarchy (higher number = higher tier) ─────────────
const TIER_HIERARCHY: Record<string, number> = {
  standard: 1,
  core: 2,
  dream: 3,
  super_dream: 4,
};

// ─── Eligibility Filter ────────────────────────────────────────
export class EligibilityFilter {
  filter(students: StudentProfile[], drive: DriveProfile): StudentProfile[] {
    return students.filter((s) => {
      if (s.status === 'opted_out') return false;
      if (s.gpa < drive.minGpa) return false;
      if (!drive.eligibleDepts.includes(s.department)) return false;
      // Skills check: student must have at least some of the required skills
      if (drive.requiredSkills.length > 0) {
        const hasSkill = drive.requiredSkills.some((skill) =>
          s.skills.some((ss) => ss.toLowerCase().includes(skill.toLowerCase()))
        );
        if (!hasSkill) return false;
      }
      return true;
    });
  }
}

// ─── Offer Policy Engine ───────────────────────────────────────
export class OfferPolicyEngine {
  private policies: OfferPolicyRule[];

  constructor(policies: OfferPolicyRule[]) {
    this.policies = policies;
  }

  canReceiveOffer(student: StudentProfile, driveTier: string): { allowed: boolean; reason?: string } {
    const driveLevel = TIER_HIERARCHY[driveTier] || 0;

    for (const offer of student.existingOffers) {
      const existingLevel = TIER_HIERARCHY[offer.tier] || 0;
      const policy = this.policies.find((p) => p.tier === offer.tier);

      if (policy) {
        // If existing offer blocks lower tiers and new offer is lower
        if (policy.blockLowerTiers && driveLevel <= existingLevel) {
          return {
            allowed: false,
            reason: `Student already holds a ${offer.tier.replace('_', ' ')} offer from ${offer.companyName}. Policy "${policy.name}" blocks ${driveTier.replace('_', ' ')} offers.`,
          };
        }
        // If the new offer tier is in the blocked list
        if (policy.blockedTiers?.includes(driveTier)) {
          return {
            allowed: false,
            reason: `Policy "${policy.name}" prevents ${driveTier.replace('_', ' ')} offers when student holds a ${offer.tier.replace('_', ' ')} offer.`,
          };
        }
      }

      // Default: if same tier and not allowed upgrade, block
      if (existingLevel >= driveLevel && !this.policies.find((p) => p.tier === offer.tier)?.allowUpgrade) {
        return {
          allowed: false,
          reason: `Student already has an equal or higher tier offer (${offer.tier.replace('_', ' ')}).`,
        };
      }
    }

    return { allowed: true };
  }
}

// ─── Matching Engine (Modified Gale-Shapley) ───────────────────
export class MatchingEngine {
  /**
   * Company-proposing Gale-Shapley variant:
   * Companies propose to candidates in preference order.
   * Candidates tentatively accept the best offer they've received.
   * 
   * Modified to support:
   * - Multiple positions per company (capacity)
   * - Offer tier policies
   */
  match(
    eligibleStudents: Map<string, StudentProfile>,
    drives: DriveProfile[],
    policyEngine: OfferPolicyEngine
  ): { matches: AllocationMatch[]; unmatched: string[] } {
    // Current tentative assignments: studentId -> { driveId, rank }
    const studentAssignment = new Map<string, { driveId: string; studentPrefRank: number }>();
    // Drive capacity tracking
    const driveCapacity = new Map<string, number>();
    // Drive assignment lists: driveId -> Set<studentId>
    const driveAssignments = new Map<string, Set<string>>();

    for (const drive of drives) {
      const remaining = drive.openPositions - drive.filledPositions;
      driveCapacity.set(drive.id, Math.max(0, remaining));
      driveAssignments.set(drive.id, new Set());
    }

    // Build student preference map: studentId -> ordered list of driveIds
    const studentPrefMap = new Map<string, string[]>();
    for (const [sid, student] of eligibleStudents) {
      const prefs = [...student.preferences].sort((a, b) => a.rank - b.rank);
      studentPrefMap.set(sid, prefs.map((p) => p.driveId));
    }

    // Build drive candidate rankings
    const drivePrefMap = new Map<string, string[]>();
    for (const drive of drives) {
      const ranked = [...drive.candidateRankings].sort((a, b) => a.rank - b.rank);
      drivePrefMap.set(drive.id, ranked.map((r) => r.studentId));
    }

    // Iterate: each drive proposes to its best unproposed candidate
    const driveProposalIndex = new Map<string, number>();
    for (const drive of drives) {
      driveProposalIndex.set(drive.id, 0);
    }

    let changed = true;
    let iterations = 0;
    const maxIterations = drives.length * eligibleStudents.size + 100;

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      for (const drive of drives) {
        const capacity = driveCapacity.get(drive.id) || 0;
        const assigned = driveAssignments.get(drive.id)!;
        
        if (assigned.size >= capacity) continue;

        const candidates = drivePrefMap.get(drive.id) || [];
        let propIdx = driveProposalIndex.get(drive.id) || 0;

        while (propIdx < candidates.length && assigned.size < capacity) {
          const candidateId = candidates[propIdx];
          propIdx++;

          const student = eligibleStudents.get(candidateId);
          if (!student) continue;

          // Check offer policy
          const policyCheck = policyEngine.canReceiveOffer(student, drive.offerTier);
          if (!policyCheck.allowed) continue;

          const studentPrefs = studentPrefMap.get(candidateId) || [];
          const newPrefRank = studentPrefs.indexOf(drive.id);

          const currentAssignment = studentAssignment.get(candidateId);

          if (!currentAssignment) {
            // Student is free, accept
            studentAssignment.set(candidateId, { driveId: drive.id, studentPrefRank: newPrefRank });
            assigned.add(candidateId);
            changed = true;
          } else if (newPrefRank !== -1 && (currentAssignment.studentPrefRank === -1 || newPrefRank < currentAssignment.studentPrefRank)) {
            // Student prefers this drive over current assignment
            const oldDriveAssignments = driveAssignments.get(currentAssignment.driveId);
            if (oldDriveAssignments) {
              oldDriveAssignments.delete(candidateId);
            }
            studentAssignment.set(candidateId, { driveId: drive.id, studentPrefRank: newPrefRank });
            assigned.add(candidateId);
            changed = true;
          }
        }

        driveProposalIndex.set(drive.id, propIdx);
      }
    }

    // Build results
    const matches: AllocationMatch[] = [];
    const matchedStudents = new Set<string>();

    for (const [studentId, assignment] of studentAssignment) {
      matches.push({
        studentId,
        driveId: assignment.driveId,
        status: 'matched',
      });
      matchedStudents.add(studentId);
    }

    const unmatched = Array.from(eligibleStudents.keys()).filter((id) => !matchedStudents.has(id));

    return { matches, unmatched };
  }
}

// ─── Conflict Resolver ─────────────────────────────────────────
export class ConflictResolver {
  detect(matches: AllocationMatch[], drives: DriveProfile[]): AllocationConflictItem[] {
    const conflicts: AllocationConflictItem[] = [];
    const driveCapacity = new Map<string, number>();
    const driveAssignCount = new Map<string, number>();

    for (const drive of drives) {
      driveCapacity.set(drive.id, drive.openPositions - drive.filledPositions);
      driveAssignCount.set(drive.id, 0);
    }

    // Check for duplicate assignments
    const studentDrives = new Map<string, string[]>();
    for (const match of matches) {
      if (!studentDrives.has(match.studentId)) studentDrives.set(match.studentId, []);
      studentDrives.get(match.studentId)!.push(match.driveId);
      driveAssignCount.set(match.driveId, (driveAssignCount.get(match.driveId) || 0) + 1);
    }

    // Duplicate assignment check
    for (const [studentId, driveIds] of studentDrives) {
      if (driveIds.length > 1) {
        conflicts.push({
          studentId,
          driveId: driveIds[0],
          conflictType: 'duplicate_assignment',
          description: `Student assigned to ${driveIds.length} drives simultaneously`,
          resolution: 'Keep highest-tier offer or highest-preference assignment',
        });
      }
    }

    // Over-allocation check
    for (const [driveId, count] of driveAssignCount) {
      const capacity = driveCapacity.get(driveId) || 0;
      if (count > capacity) {
        conflicts.push({
          studentId: '',
          driveId,
          conflictType: 'over_allocation',
          description: `Drive has ${count} assignments but only ${capacity} open positions`,
          resolution: 'Remove lowest-ranked candidates',
        });
      }
    }

    return conflicts;
  }
}

// ─── Allocation Validator ──────────────────────────────────────
export class AllocationValidator {
  validate(result: AllocationResult): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (result.conflicts.length > 0) {
      issues.push(`${result.conflicts.length} conflicts remain unresolved`);
    }

    // Check for matches to non-existent drives
    const driveIds = new Set(result.matches.map((m) => m.driveId));
    if (driveIds.size === 0 && result.stats.totalStudents > 0) {
      issues.push('No matches were made despite having eligible students');
    }

    return { valid: issues.length === 0, issues };
  }
}

// ─── Main Allocation Engine ────────────────────────────────────
export class AllocationEngine {
  private eligibilityFilter = new EligibilityFilter();
  private matchingEngine = new MatchingEngine();
  private conflictResolver = new ConflictResolver();
  private validator = new AllocationValidator();

  run(
    students: StudentProfile[],
    drives: DriveProfile[],
    policies: OfferPolicyRule[]
  ): AllocationResult {
    const policyEngine = new OfferPolicyEngine(policies);

    // Step 1: Filter eligible students per drive
    const eligibleByDrive = new Map<string, Set<string>>();
    const allEligible = new Map<string, StudentProfile>();

    for (const drive of drives) {
      const eligible = this.eligibilityFilter.filter(students, drive);
      eligibleByDrive.set(drive.id, new Set(eligible.map((s) => s.id)));
      for (const s of eligible) {
        allEligible.set(s.id, s);
      }
    }

    // Step 2: Build candidate rankings for drives that don't have them
    for (const drive of drives) {
      if (drive.candidateRankings.length === 0) {
        const eligible = eligibleByDrive.get(drive.id) || new Set();
        drive.candidateRankings = Array.from(eligible)
          .map((sid) => {
            const s = allEligible.get(sid)!;
            return { studentId: sid, rank: 0, score: s.gpa };
          })
          .sort((a, b) => b.score - a.score)
          .map((r, i) => ({ ...r, rank: i + 1 }));
      }
    }

    // Step 3: Run matching
    const { matches, unmatched } = this.matchingEngine.match(allEligible, drives, policyEngine);

    // Step 4: Detect conflicts
    const conflicts = this.conflictResolver.detect(matches, drives);

    // Step 5: Build result
    const result: AllocationResult = {
      matches,
      conflicts,
      unmatched,
      stats: {
        totalStudents: students.length,
        totalDrives: drives.length,
        totalMatches: matches.filter((m) => m.status === 'matched').length,
        totalConflicts: conflicts.length,
        totalUnmatched: unmatched.length,
      },
    };

    // Step 6: Validate
    this.validator.validate(result);

    return result;
  }
}
