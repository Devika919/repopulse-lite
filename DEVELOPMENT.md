# RepoPulse Lite — Development Documentation

## Live Links
- **Live App:** https://repopulse-lite.vercel.app/
- **GitHub Repo:** https://github.com/Devika919/repopulse-lite

---

## 1. Development Methodology

This project was built incrementally over a 2-day sprint, following a working-backend-first approach:

1. **Project setup** — Initialized Next.js (App Router, TypeScript, Tailwind CSS) and Git, with atomic commits from the start.
2. **GitHub API integration** — Built the `/api/github` route to fetch the last 20 commits of any public repository, including per-commit stats (lines changed, files changed).
3. **Tiering engine** — Implemented a deterministic, rule-based classifier (`lib/tiering.ts`) that sorts each commit into Tier 1 (low), Tier 2 (medium), or Tier 3 (high) complexity, based on lines/files changed.
4. **Health score** — Built a ratio-based scoring formula that converts tier counts into a 0–100 health score, weighting Tier 3 commits most heavily.
5. **AI integration** — Connected to Groq's OpenAI-compatible chat API (`lib/llm.ts`) to generate a 3-bullet executive summary (momentum, risks, commit hygiene) from the commit and tier data.
6. **Frontend dashboard** — Built a responsive React UI (`app/page.tsx`) with a dark, developer-tool-inspired design, loading skeletons, and error states.
7. **Defensive engineering** — Added URL validation, GitHub rate-limit detection, private/invalid repo handling, and LLM failure fallbacks.
8. **Custom LLM provider support** — Added a UI toggle letting users supply their own Base URL/API Key/Model instead of the default Groq integration, satisfying the "Custom Provider Tier" requirement.
9. **MCP server** — Built a standalone local MCP server (`mcp-server/server.ts`) exposing an `analyze_repo` tool, tested and confirmed working with Claude Desktop.
10. **Deployment** — Deployed to Vercel with environment variables configured for production.

---

## 2. Tooling & AI Agents Audit

This project was built using **Claude** (Anthropic) as an AI coding assistant throughout the entire development process, via conversational guidance in the Claude chat interface.

- **Usage pattern:** Claude was used to scaffold each feature incrementally — one small piece at a time (e.g., "fetch commits," then "add tiering," then "add health score") rather than generating the whole app in one step.
- **Review process:** Each code change was reviewed, tested locally (`npm run dev`), and manually verified in the browser before committing.
- **Debugging:** Claude was used to diagnose and fix real issues encountered during development, including a OneDrive-related npm permission error, an incorrect relative import path, a top-level `await` syntax error in the MCP server, and TypeScript linting warnings.
- **Commit workflow:** Claude guided the use of Conventional Commit messages (`feat:`, `fix:`) after each working feature increment.

---

## 3. MCP & Custom Skills Log

A local MCP (Model Context Protocol) server is included in this repository at `mcp-server/server.ts`.

**Tool exposed:** `analyze_repo`
- **Input:** `repoUrl` (string) — a public GitHub repository URL
- **Output:** A text summary containing the repository's health score and Tier 1/2/3 commit breakdown
- **Logic:** Re-implements the same GitHub-fetch and tiering logic as the main web app, runnable independently of the browser, directly from an MCP-compatible AI client.

**How to run it locally:**
```bash
npm install
npx tsx mcp-server/server.ts


**How to connect it to Claude Desktop:
Add the following to your Claude Desktop config file (%APPDATA%\Claude\claude_desktop_config.json on Windows):**
{
  "mcpServers": {
    "repopulse": {
      "command": "npx",
      "args": ["tsx", "PATH_TO_PROJECT\\mcp-server\\server.ts"],
      "env": {
        "GITHUB_TOKEN": "your_github_token_here"
      }
    }
  }
}

**Restart Claude Desktop, **then check Settings → Developer → Local MCP Servers to confirm it shows as "running." This was tested and confirmed working — Claude Desktop successfully called analyze_repo and returned a live health score for a public repository.**


**4. Heuristic Logic Specification
**Commit complexity is classified using a deterministic (non-AI) rule-based system in lib/tiering.ts:
Tier                                                  Criteria
Tier 1 (Low)                       Fewer than 50 total lines changed, OR the commit is documentation-only
Tier 2 (Medium)                     50–250 lines changed AND fewer than 5 files touched
Tier 3 (High)                       More than 250 lines changed, OR more than 5 files touched

**Health Score formula (calculateHealthScore):**

tier2Ratio = tier2Count / totalCommits
tier3Ratio = tier3Count / totalCommits
healthScore = 100 - (tier2Ratio × 40) - (tier3Ratio × 70)

**The score is clamped between 0–100. This ratio-based approach (rather than flat penalties per commit) ensures the score scales fairly regardless of repository activity level, avoiding unfairly penalizing large, active projects that naturally have bigger commits**



**5. Environment Setup Guide
**Prerequisites
Node.js v18+
**A GitHub account and Personal Access Token (scope: public_repo)
A free Groq API key
**Installation**
git clone https://github.com/Devika919/repopulse-lite.git
cd repopulse-lite
npm install

**Environment Variables
**Create a .env.local file in the project root:**
GITHUB_TOKEN=your_github_personal_access_token
GROQ_API_KEY=your_groq_api_key


**Running locally**
npm run dev
Visit http://localhost:3000.


**Deployment
**This project is deployed on Vercel. To deploy your own copy:
**Import the repository into Vercel
**Add GITHUB_TOKEN and GROQ_API_KEY as Environment Variables in the Vercel project settings
**Deploy
Save the file. Tell me once done, then we'll commit it and do a final review before submission.

