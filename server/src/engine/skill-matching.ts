/**
 * TalentMatrix — Deterministic Skill Matching Engine
 * 
 * Computes deterministic candidate skill compatibility:
 * Skill Match = Σ(Student Proficiency × Skill Weight) / Σ(Skill Weights)
 * Normalized to 0–100%.
 */

export interface SkillRequirement {
  skillName: string;
  isRequired: boolean; // true = mandatory, false = preferred
  weight: number;      // e.g. 1.0 - 5.0
  minProficiency?: number; // e.g. 50
}

export interface StudentSkillProfile {
  skillName: string;
  proficiency: number; // 0 - 100
}

export interface SkillMatchResult {
  compatibilityScore: number; // 0 - 100%
  requiredSkillsMet: boolean;
  missingRequiredSkills: string[];
  matchedSkills: {
    skillName: string;
    studentProficiency: number;
    weight: number;
    isRequired: boolean;
    weightedContribution: number;
  }[];
  requiredSkillCoverage: number; // % of required skills satisfied
  preferredSkillCoverage: number; // % of preferred skills satisfied
  totalWeight: number;
}

export class SkillMatchingService {
  /**
   * Calculate deterministic compatibility score between a candidate's skills and company requirements
   */
  calculateMatch(
    studentSkills: StudentSkillProfile[],
    requirements: SkillRequirement[]
  ): SkillMatchResult {
    if (!requirements || requirements.length === 0) {
      return {
        compatibilityScore: 100,
        requiredSkillsMet: true,
        missingRequiredSkills: [],
        matchedSkills: [],
        requiredSkillCoverage: 100,
        preferredSkillCoverage: 100,
        totalWeight: 0,
      };
    }

    const studentSkillMap = new Map<string, number>();
    for (const s of studentSkills) {
      studentSkillMap.set(s.skillName.toLowerCase().trim(), s.proficiency);
    }

    const missingRequired: string[] = [];
    const matchedSkills: SkillMatchResult['matchedSkills'] = [];
    let totalWeight = 0;
    let weightedSum = 0;

    let requiredCount = 0;
    let requiredMetCount = 0;
    let preferredCount = 0;
    let preferredMetCount = 0;

    for (const req of requirements) {
      const weight = req.weight > 0 ? req.weight : 1.0;
      totalWeight += weight;

      const normName = req.skillName.toLowerCase().trim();
      const studentProf = studentSkillMap.get(normName) ?? 0;
      const minProf = req.minProficiency ?? 40;

      if (req.isRequired) {
        requiredCount++;
        if (studentProf >= minProf) {
          requiredMetCount++;
        } else {
          missingRequired.push(req.skillName);
        }
      } else {
        preferredCount++;
        if (studentProf >= minProf) {
          preferredMetCount++;
        }
      }

      const weightedContribution = studentProf * weight;
      weightedSum += weightedContribution;

      matchedSkills.push({
        skillName: req.skillName,
        studentProficiency: studentProf,
        weight,
        isRequired: req.isRequired,
        weightedContribution: Math.round(weightedContribution * 100) / 100,
      });
    }

    const rawScore = totalWeight > 0 ? (weightedSum / (totalWeight * 100)) * 100 : 100;
    const compatibilityScore = Math.round(Math.min(100, Math.max(0, rawScore)) * 10) / 10;

    return {
      compatibilityScore,
      requiredSkillsMet: missingRequired.length === 0,
      missingRequiredSkills: missingRequired,
      matchedSkills,
      requiredSkillCoverage: requiredCount > 0 ? Math.round((requiredMetCount / requiredCount) * 100) : 100,
      preferredSkillCoverage: preferredCount > 0 ? Math.round((preferredMetCount / preferredCount) * 100) : 100,
      totalWeight: Math.round(totalWeight * 100) / 100,
    };
  }
}
