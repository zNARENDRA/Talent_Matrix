import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateShannonEntropy } from './entropy.js';

describe('Shannon Entropy & Code Complexity Engine', () => {
  it('computes 0 entropy for empty string', () => {
    const res = calculateShannonEntropy('');
    assert.strictEqual(res.entropy, 0);
    assert.strictEqual(res.isAnomalous, false);
  });

  it('classifies normal human TypeScript code within authentic entropy range (3.2 to 4.9 bits/char)', () => {
    const naturalHumanCode = `
      function binarySearch(arr: number[], target: number): number {
        let left = 0;
        let right = arr.length - 1;
        while (left <= right) {
          const mid = Math.floor((left + right) / 2);
          if (arr[mid] === target) return mid;
          if (arr[mid] < target) left = mid + 1;
          else right = mid - 1;
        }
        return -1;
      }
    `;

    const res = calculateShannonEntropy(naturalHumanCode);
    assert(res.entropy >= 3.2 && res.entropy <= 4.9);
    assert.strictEqual(res.classification, 'normal_human_typing');
    assert.strictEqual(res.isAnomalous, false);
    assert(res.characterDistribution.length > 0);
  });

  it('detects high-entropy injection on dense minified / encoded blocks (>5.15 bits/char)', () => {
    // Highly dense randomized characters / base64 minified snippet
    const denseMinifiedPayload = 'a1B#9$xZ!qW*eR(tY)uI_oP+aS~dF`gH{jK}lZ:xC"vB<nN>mQ?1234567890'.repeat(4);
    const res = calculateShannonEntropy(denseMinifiedPayload);

    assert(res.entropy > 5.15);
    assert.strictEqual(res.classification, 'high_entropy_injection');
    assert.strictEqual(res.isAnomalous, true);
    assert(res.riskScore > 0);
  });

  it('flags abnormally low entropy on repetitive character flood', () => {
    const repetitiveFlooding = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const res = calculateShannonEntropy(repetitiveFlooding);

    assert(res.entropy < 2.0);
    assert.strictEqual(res.classification, 'abnormally_low');
    assert.strictEqual(res.isAnomalous, true);
  });
});
