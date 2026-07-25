export type Tier = 1 | 2 | 3;

export function classifyCommit(
  linesChanged: number,
  filesChanged: number,
  isDocsOnly: boolean
): Tier {
  if (linesChanged < 50 || isDocsOnly) {
    return 1;
  }
  if (linesChanged > 250 || filesChanged > 5) {
    return 3;
  }
  if (linesChanged >= 50 && linesChanged <= 250 && filesChanged < 5) {
    return 2;
  }
  // Fallback case (e.g., between 50-250 lines but exactly 5 files)
  return 3;
}


export function calculateHealthScore(
  tier1Count: number,
  tier2Count: number,
  tier3Count: number
): number {
  const total = tier1Count + tier2Count + tier3Count;
  if (total === 0) return 100;

  const tier2Ratio = tier2Count / total;
  const tier3Ratio = tier3Count / total;

  const rawScore = 100 - tier2Ratio * 40 - tier3Ratio * 70;
  return Math.round(Math.max(0, Math.min(100, rawScore)));
}