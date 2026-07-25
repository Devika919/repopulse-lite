import { NextRequest, NextResponse } from "next/server";
import { classifyCommit, calculateHealthScore } from "../../lib/tiering";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const repoUrl = searchParams.get("repo");

  if (!repoUrl) {
    return NextResponse.json({ error: "Missing repo URL" }, { status: 400 });
  }

  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) {
    return NextResponse.json({ error: "Invalid GitHub URL" }, { status: 400 });
  }
  const owner = match[1];
  const repo = match[2].replace(/\.git$/, "");

  const headers = {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
  };

  // Step 1: Get the list of last 20 commits (basic info)
  const listResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits?per_page=20`,
    { headers }
  );

  if (!listResponse.ok) {
    return NextResponse.json(
      { error: "Failed to fetch commits. Check the repo URL or if it's private." },
      { status: listResponse.status }
    );
  }

  const commitList = await listResponse.json();

  // Step 2: For each commit, fetch its detailed stats (lines/files changed)
  const detailedCommits = await Promise.all(
    commitList.map(
      async (commit: {
        sha: string;
        commit: { message: string; author: { name: string; date: string } };
      }) => {
        const detailResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/commits/${commit.sha}`,
          { headers }
        );
        const detail = await detailResponse.json();

        const linesChanged =
          (detail.stats?.additions || 0) + (detail.stats?.deletions || 0);
        const filesChanged = detail.files?.length || 0;
        const tier = classifyCommit(linesChanged, filesChanged, false);

        return {
          sha: commit.sha,
          message: commit.commit.message,
          author: commit.commit.author.name,
          date: commit.commit.author.date,
          linesChanged,
          filesChanged,
          tier,
        };
      }
    )
  );

  const tier1Count = detailedCommits.filter((c) => c.tier === 1).length;
  const tier2Count = detailedCommits.filter((c) => c.tier === 2).length;
  const tier3Count = detailedCommits.filter((c) => c.tier === 3).length;

  const healthScore = calculateHealthScore(tier1Count, tier2Count, tier3Count);

  return NextResponse.json({
    owner,
    repo,
    healthScore,
    tierBreakdown: { tier1: tier1Count, tier2: tier2Count, tier3: tier3Count },
    commits: detailedCommits,
  });
}