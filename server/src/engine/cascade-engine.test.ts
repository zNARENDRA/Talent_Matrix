import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TierCascadeEngine } from './cascade-engine.js';

describe('Tier Cascade Engine (DREAM > CORE > MASS)', () => {
  const engine = new TierCascadeEngine();

  it('correctly compares tier hierarchy levels', () => {
    assert.equal(engine.isTierUpgrade('DREAM', 'CORE'), true);
    assert.equal(engine.isTierUpgrade('CORE', 'MASS'), true);
    assert.equal(engine.isTierUpgrade('MASS', 'CORE'), false);
    assert.equal(engine.isTierUpgrade('CORE', 'CORE'), false);
    assert.equal(engine.isTierUpgrade('CORE', undefined), true);
  });

  it('executes recursive cascading when candidate upgrades from CORE to DREAM', () => {
    // Scenario:
    // Alice holds CORE (Company Y).
    // Bob holds MASS (Company Z).
    // Charlie is unallocated.
    // Google (DREAM) has 1 open position and accepts Alice.
    // Alice upgrades to DREAM -> releases Company Y (CORE).
    // Company Y (CORE) quota reopens -> next in line is Bob.
    // Bob upgrades from MASS to CORE -> releases Company Z (MASS).
    // Company Z (MASS) quota reopens -> next in line is Charlie.
    // Charlie receives MASS.

    const candidates = new Map([
      ['alice', {
        studentId: 'alice',
        studentName: 'Alice',
        currentOffer: { driveId: 'core-y', companyName: 'Company Y', tier: 'CORE', packageLpa: 15 },
        preferences: ['dream-google', 'core-y', 'mass-z'],
      }],
      ['bob', {
        studentId: 'bob',
        studentName: 'Bob',
        currentOffer: { driveId: 'mass-z', companyName: 'Company Z', tier: 'MASS', packageLpa: 6 },
        preferences: ['core-y', 'mass-z'],
      }],
      ['charlie', {
        studentId: 'charlie',
        studentName: 'Charlie',
        preferences: ['mass-z'],
      }],
    ]);

    const drives = new Map([
      ['dream-google', {
        driveId: 'dream-google',
        companyName: 'Google',
        role: 'SDE',
        tier: 'DREAM',
        quota: 1,
        packageLpa: 42,
        candidateRankings: ['alice'],
        assignedStudents: new Set<string>(),
      }],
      ['core-y', {
        driveId: 'core-y',
        companyName: 'Company Y',
        role: 'Full Stack',
        tier: 'CORE',
        quota: 1,
        packageLpa: 15,
        candidateRankings: ['alice', 'bob'],
        assignedStudents: new Set(['alice']),
      }],
      ['mass-z', {
        driveId: 'mass-z',
        companyName: 'Company Z',
        role: 'Systems Eng',
        tier: 'MASS',
        quota: 1,
        packageLpa: 6,
        candidateRankings: ['bob', 'charlie'],
        assignedStudents: new Set(['bob']),
      }],
    ]);

    const result = engine.processCascade('alice', 'dream-google', candidates, drives);

    assert.equal(result.cascadeCount, 2); // 2 cascade releases
    assert.equal(result.totalUpgrades, 3); // Alice, Bob, Charlie

    // Check final assignments
    const finalMap = result.finalAssignments;
    assert.equal(finalMap.get('alice')?.driveId, 'dream-google');
    assert.equal(finalMap.get('alice')?.tier, 'DREAM');

    assert.equal(finalMap.get('bob')?.driveId, 'core-y');
    assert.equal(finalMap.get('bob')?.tier, 'CORE');

    assert.equal(finalMap.get('charlie')?.driveId, 'mass-z');
    assert.equal(finalMap.get('charlie')?.tier, 'MASS');
  });
});
