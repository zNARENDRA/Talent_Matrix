import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BlockingPairValidator } from './blocking-pair-validator.js';

describe('Blocking-Pair Stability Validator', () => {
  const validator = new BlockingPairValidator();

  it('certifies a stable matching as isStable=true with 0 blocking pairs', () => {
    const students = new Map([
      ['s1', { id: 's1', studentId: 'S1', name: 'Alice', preferences: ['c1', 'c2'] }],
      ['s2', { id: 's2', studentId: 'S2', name: 'Bob', preferences: ['c2', 'c1'] }],
    ]);

    const drives = new Map([
      ['c1', { id: 'c1', companyName: 'Company 1', role: 'SDE', quota: 1, candidateRankings: ['s1', 's2'] }],
      ['c2', { id: 'c2', companyName: 'Company 2', role: 'SDE', quota: 1, candidateRankings: ['s2', 's1'] }],
    ]);

    const assignments = new Map([
      ['s1', 'c1'],
      ['s2', 'c2'],
    ]);

    const res = validator.validateStability(students, drives, assignments);
    assert.equal(res.isStable, true);
    assert.equal(res.blockingPairCount, 0);
  });

  it('detects an unstable blocking pair when an unfilled quota exists at a higher-preferred company', () => {
    const students = new Map([
      ['s1', { id: 's1', studentId: 'S1', name: 'Alice', preferences: ['c1', 'c2'] }],
    ]);

    const drives = new Map([
      ['c1', { id: 'c1', companyName: 'Company 1', role: 'SDE', quota: 1, candidateRankings: ['s1'] }],
      ['c2', { id: 'c2', companyName: 'Company 2', role: 'SDE', quota: 1, candidateRankings: ['s1'] }],
    ]);

    // Alice is assigned to c2, but c1 was her 1st choice and c1 has unfilled quota
    const assignments = new Map([
      ['s1', 'c2'],
    ]);

    const res = validator.validateStability(students, drives, assignments);
    assert.equal(res.isStable, false);
    assert.equal(res.blockingPairCount, 1);
    assert.equal(res.blockingPairs[0].reason, 'UNFILLED_QUOTA');
    assert.equal(res.blockingPairs[0].driveId, 'c1');
  });

  it('detects an unstable blocking pair when a company prefers a candidate over their current assignment', () => {
    const students = new Map([
      ['s1', { id: 's1', studentId: 'S1', name: 'Alice', preferences: ['c1', 'c2'] }],
      ['s2', { id: 's2', studentId: 'S2', name: 'Bob', preferences: ['c1', 'c2'] }],
    ]);

    const drives = new Map([
      // c1 prefers s1 over s2
      ['c1', { id: 'c1', companyName: 'Company 1', role: 'SDE', quota: 1, candidateRankings: ['s1', 's2'] }],
      ['c2', { id: 'c2', companyName: 'Company 2', role: 'SDE', quota: 1, candidateRankings: ['s1', 's2'] }],
    ]);

    // Bad matching: s2 gets c1, s1 gets c2 -> (s1, c1) is a blocking pair
    const assignments = new Map([
      ['s1', 'c2'],
      ['s2', 'c1'],
    ]);

    const res = validator.validateStability(students, drives, assignments);
    assert.equal(res.isStable, false);
    assert.equal(res.blockingPairCount, 1);
    assert.equal(res.blockingPairs[0].studentId, 's1');
    assert.equal(res.blockingPairs[0].driveId, 'c1');
    assert.equal(res.blockingPairs[0].reason, 'CANDIDATE_PREFERRED_OVER_CURRENT_MATCH');
  });
});
