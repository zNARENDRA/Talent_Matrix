import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SkillMatchingService } from './skill-matching.js';

describe('Skill Matching Engine', () => {
  const service = new SkillMatchingService();

  it('calculates 100% compatibility for empty requirements', () => {
    const res = service.calculateMatch([{ skillName: 'TypeScript', proficiency: 90 }], []);
    assert.equal(res.compatibilityScore, 100);
    assert.equal(res.requiredSkillsMet, true);
  });

  it('calculates exact weighted compatibility score', () => {
    const studentSkills = [
      { skillName: 'Java', proficiency: 90 },
      { skillName: 'Python', proficiency: 80 },
      { skillName: 'SQL', proficiency: 70 },
    ];
    const requirements = [
      { skillName: 'Java', isRequired: true, weight: 2.0 },    // 90 * 2 = 180
      { skillName: 'Python', isRequired: false, weight: 1.0 }, // 80 * 1 = 80
      { skillName: 'SQL', isRequired: false, weight: 1.0 },    // 70 * 1 = 70
    ];
    // Total weight = 4, Total sum = 330, Score = 330 / 4 = 82.5%
    const res = service.calculateMatch(studentSkills, requirements);
    assert.equal(res.compatibilityScore, 82.5);
    assert.equal(res.requiredSkillsMet, true);
    assert.equal(res.missingRequiredSkills.length, 0);
  });

  it('detects missing required skills when candidate has 0 or below-cutoff proficiency', () => {
    const studentSkills = [
      { skillName: 'Python', proficiency: 85 },
    ];
    const requirements = [
      { skillName: 'Java', isRequired: true, weight: 2.0, minProficiency: 50 },
      { skillName: 'Python', isRequired: false, weight: 1.0 },
    ];
    const res = service.calculateMatch(studentSkills, requirements);
    assert.equal(res.requiredSkillsMet, false);
    assert.deepEqual(res.missingRequiredSkills, ['Java']);
    assert.equal(res.requiredSkillCoverage, 0);
    assert.equal(res.preferredSkillCoverage, 100);
  });

  it('handles case-insensitivity and whitespace in skill names', () => {
    const studentSkills = [
      { skillName: '  c++  ', proficiency: 95 },
      { skillName: 'REACT.JS', proficiency: 88 },
    ];
    const requirements = [
      { skillName: 'C++', isRequired: true, weight: 1.0 },
      { skillName: 'react.js', isRequired: true, weight: 1.0 },
    ];
    const res = service.calculateMatch(studentSkills, requirements);
    assert.equal(res.requiredSkillsMet, true);
    assert.equal(res.compatibilityScore, 91.5);
  });
});
