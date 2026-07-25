import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const repoUrl = searchParams.get("repo");

  if (!repoUrl) {
    return NextResponse.json(
      { error: "Missing repo URL" },
      { status: 400 }
    );
  }

  // Extract "owner/repo" from the full GitHub URL
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) {
    return NextResponse.json(
      { error: "Invalid GitHub URL" },
      { status: 400 }
    );
  }
  const owner = match[1];
  const repo = match[2];

  // Call GitHub's API to get the last 20 commits
  const githubResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits?per_page=20`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  if (!githubResponse.ok) {
    return NextResponse.json(
      { error: "Failed to fetch commits from GitHub" },
      { status: githubResponse.status }
    );
  }

  const commits = await githubResponse.json();

  return NextResponse.json({ owner, repo, commitCount: commits.length, commits });
}