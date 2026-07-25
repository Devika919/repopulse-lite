import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  { name: "repopulse-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// Tell MCP clients what tools this server offers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "analyze_repo",
        description:
          "Fetch a GitHub repository's recent commits, classify them by complexity tier, and return a health score.",
        inputSchema: {
          type: "object",
          properties: {
            repoUrl: {
              type: "string",
              description: "Full GitHub repository URL, e.g. https://github.com/owner/repo",
            },
          },
          required: ["repoUrl"],
        },
      },
    ],
  };
});

// Handle actual calls to the tool
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "analyze_repo") {
    throw new Error("Unknown tool");
  }

  const repoUrl = request.params.arguments?.repoUrl as string;
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) {
    return {
      content: [{ type: "text", text: "Error: Invalid GitHub URL" }],
    };
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
    return {
      content: [{ type: "text", text: "Error: Failed to fetch commits from GitHub." }],
    };
  }

  const commitList = await listResponse.json();

  let tier1 = 0,
    tier2 = 0,
    tier3 = 0;

  for (const commit of commitList) {
    const detailResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits/${commit.sha}`,
      { headers }
    );
    const detail = await detailResponse.json();
    const linesChanged = (detail.stats?.additions || 0) + (detail.stats?.deletions || 0);
    const filesChanged = detail.files?.length || 0;

    if (linesChanged < 50) tier1++;
    else if (linesChanged > 250 || filesChanged > 5) tier3++;
    else tier2++;
  }

  const total = tier1 + tier2 + tier3;
  const healthScore =
    total === 0
      ? 100
      : Math.round(Math.max(0, Math.min(100, 100 - (tier2 / total) * 40 - (tier3 / total) * 70)));

  return {
    content: [
      {
        type: "text",
        text: `Repository: ${owner}/${repo}\nHealth Score: ${healthScore}/100\nTier 1 (Low): ${tier1}\nTier 2 (Medium): ${tier2}\nTier 3 (High): ${tier3}`,
      },
    ],
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();