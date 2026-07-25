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