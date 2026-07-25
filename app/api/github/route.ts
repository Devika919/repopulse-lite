import { NextRequest, NextResponse } from "next/server";
import { classifyCommit, calculateHealthScore } from "../../lib/tiering";
import { generateExecutiveSummary } from "../../lib/llm";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const repoUrl = body.repoUrl;
  const llmConfig = body.llmConfig || { provider: "groq" };

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

  const listResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits?per_page=20`,
    { headers }
  );

  if (!listResponse.ok) {
    if (listResponse.status === 403) {
      const rateLimitRemaining = listResponse.headers.get("x-ratelimit-remaining");
      if (rateLimitRemaining === "0") {
        const resetTime = listResponse.headers.get("x-ratelimit-reset");
        const resetDate = resetTime
          ? new Date(parseInt(resetTime) * 1000).toLocaleTimeString()
          : "soon";
        return NextResponse.json(
          { error: `GitHub API rate limit exceeded. Try again after ${resetDate}.` },
          { status: 429 }
        );
      }
    }
    if (listResponse.status === 404) {
      return NextResponse.json(
        { error: "Repository not found. It may be private or doesn't exist." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch commits from GitHub." },
      { status: listResponse.status }
    );
  }

  const commitList = await listResponse.json();

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
  const tierBreakdown = { tier1: tier1Count, tier2: tier2Count, tier3: tier3Count };

  let executiveSummary: string[] = [];
  try {
    const commitMessages = detailedCommits.map((c) => c.message.split("\n")[0]);
    executiveSummary = await generateExecutiveSummary(
      owner,
      repo,
      healthScore,
      tierBreakdown,
      commitMessages,
      llmConfig
    );
  } catch (error) {
    console.error("LLM summary failed:", error);
    executiveSummary = ["AI summary unavailable at this time."];
  }

  return NextResponse.json({
    owner,
    repo,
    healthScore,
    tierBreakdown,
    executiveSummary,
    commits: detailedCommits,
  });
}