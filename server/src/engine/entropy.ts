/**
 * Mathematical Shannon Entropy & Code Complexity Analyzer
 * 
 * Computes information entropy:
 *   H(S) = - ∑ (p_i * log2(p_i))
 * 
 * Used to detect sudden non-human code insertions, minified external blocks,
 * or encrypted/obfuscated snippets in coding assessment telemetry.
 */

export interface EntropyAnalysisResult {
  entropy: number;             // bits per character (0.0 to 8.0)
  totalLength: number;
  uniqueCharacters: number;
  classification: 'abnormally_low' | 'normal_human_typing' | 'elevated_entropy' | 'high_entropy_injection';
  riskScore: number;           // 0 to 100 risk contribution
  characterDistribution: { char: string; frequency: number; probability: number }[];
  isAnomalous: boolean;
  explanation: string;
}

export function calculateShannonEntropy(text: string): EntropyAnalysisResult {
  if (!text || text.length === 0) {
    return {
      entropy: 0,
      totalLength: 0,
      uniqueCharacters: 0,
      classification: 'normal_human_typing',
      riskScore: 0,
      characterDistribution: [],
      isAnomalous: false,
      explanation: 'Empty snippet evaluated.',
    };
  }

  const length = text.length;
  const frequencies: Map<string, number> = new Map();

  for (let i = 0; i < length; i++) {
    const char = text[i];
    frequencies.set(char, (frequencies.get(char) || 0) + 1);
  }

  let entropy = 0;
  const distribution: { char: string; frequency: number; probability: number }[] = [];

  for (const [char, count] of frequencies.entries()) {
    const probability = count / length;
    entropy -= probability * Math.log2(probability);
    distribution.push({
      char: char === ' ' ? '␣' : char === '\n' ? '↵' : char === '\t' ? '⇥' : char,
      frequency: count,
      probability: Number(probability.toFixed(4)),
    });
  }

  // Sort distribution by frequency descending
  distribution.sort((a, b) => b.frequency - a.frequency);

  const roundedEntropy = Number(entropy.toFixed(3));
  let classification: EntropyAnalysisResult['classification'] = 'normal_human_typing';
  let riskScore = 0;
  let isAnomalous = false;
  let explanation = '';

  // Typical human coding entropy in TypeScript/Python/Java is ~3.4 to 4.85 bits/char
  if (length > 100 && roundedEntropy > 5.15) {
    classification = 'high_entropy_injection';
    riskScore = Math.min(100, Math.round((roundedEntropy - 4.8) * 45));
    isAnomalous = true;
    explanation = `High Shannon entropy (${roundedEntropy} bits/char) detected on ${length}-character insertion. Indicates dense minified syntax or copied external library structure.`;
  } else if (length > 150 && roundedEntropy > 4.9) {
    classification = 'elevated_entropy';
    riskScore = 20;
    isAnomalous = false;
    explanation = `Elevated entropy (${roundedEntropy} bits/char) observed; consistent with complex algorithmic syntax.`;
  } else if (length >= 80 && roundedEntropy < 2.3) {
    classification = 'abnormally_low';
    riskScore = 30;
    isAnomalous = true;
    explanation = `Abnormally low entropy (${roundedEntropy} bits/char) detected; indicates repetitive character flooding or boilerplate.`;
  } else {
    classification = 'normal_human_typing';
    riskScore = 0;
    isAnomalous = false;
    explanation = `Normal human coding entropy (${roundedEntropy} bits/char) verified across ${frequencies.size} unique glyphs.`;
  }

  return {
    entropy: roundedEntropy,
    totalLength: length,
    uniqueCharacters: frequencies.size,
    classification,
    riskScore,
    characterDistribution: distribution.slice(0, 10), // top 10 characters
    isAnomalous,
    explanation,
  };
}
