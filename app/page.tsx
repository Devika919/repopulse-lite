"use client";

import { useState } from "react";

type CommitData = {
  sha: string;
  message: string;
  author: string;
  date: string;
  linesChanged: number;
  filesChanged: number;
  tier: number;
};

type ReportData = {
  owner: string;
  repo: string;
  healthScore: number;
  tierBreakdown: { tier1: number; tier2: number; tier3: number };
  executiveSummary: string[];
  commits: CommitData[];
};

const tierStyles: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: "Low", color: "text-emerald-400", bg: "bg-emerald-400/10" },
  2: { label: "Medium", color: "text-amber-400", bg: "bg-amber-400/10" },
  3: { label: "High", color: "text-rose-400", bg: "bg-rose-400/10" },
};

export default function Home() {
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<ReportData | null>(null);

  const [provider, setProvider] = useState<"groq" | "custom">("groq");
  const [showCustomFields, setShowCustomFields] = useState(false);
  const [customBaseUrl, setCustomBaseUrl] = useState("");
  const [customApiKey, setCustomApiKey] = useState("");
  const [customModel, setCustomModel] = useState("");

  async function handleAnalyze() {
    setError("");
    setReport(null);
    setLoading(true);

    const llmConfig =
      provider === "custom"
        ? {
            provider: "custom",
            baseUrl: customBaseUrl,
            apiKey: customApiKey,
            model: customModel,
          }
        : { provider: "groq" };

    try {
      const response = await fetch("/api/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl, llmConfig }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Something went wrong.");
        setLoading(false);
        return;
      }

      setReport(data);
    } catch {
      setError("Failed to connect. Please check your internet and try again.");
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10 flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400"></span>
          </div>
          <span className="text-xs uppercase tracking-widest text-slate-500 font-mono">
            repo diagnostics
          </span>
        </div>

        <h1 className="text-5xl font-extrabold tracking-tight mb-3">
          RepoPulse <span className="text-amber-400">Lite</span>
        </h1>
        <p className="text-slate-400 text-lg mb-10 max-w-xl">
          Paste a public GitHub repository. We&apos;ll read its last 20 commits and
          hand back a health score, risk tiers, and an AI executive summary.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 font-mono text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/50"
          />
          <button
            onClick={handleAnalyze}
            disabled={loading || !repoUrl}
            className="bg-amber-400 text-slate-950 font-semibold px-6 py-3 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-300 transition-colors"
          >
            {loading ? "Analyzing…" : "Analyze"}
          </button>
        </div>

        {/* LLM provider settings */}
        <div className="mb-10">
          <button
            onClick={() => setShowCustomFields(!showCustomFields)}
            className="text-xs text-slate-500 font-mono hover:text-slate-300 transition-colors"
          >
            {showCustomFields ? "▾" : "▸"} AI provider settings
          </button>

          {showCustomFields && (
            <div className="mt-3 bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={provider === "groq"}
                    onChange={() => setProvider("groq")}
                  />
                  Groq (default, free)
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={provider === "custom"}
                    onChange={() => setProvider("custom")}
                  />
                  Custom provider
                </label>
              </div>

              {provider === "custom" && (
                <div className="space-y-2 pt-2">
                  <input
                    type="text"
                    value={customBaseUrl}
                    onChange={(e) => setCustomBaseUrl(e.target.value)}
                    placeholder="Base URL (e.g. https://api.openai.com/v1/chat/completions)"
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm font-mono"
                  />
                  <input
                    type="password"
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                    placeholder="API Key"
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm font-mono"
                  />
                  <input
                    type="text"
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    placeholder="Model name (e.g. gpt-4o-mini)"
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm font-mono"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-rose-950/40 border border-rose-900 text-rose-300 px-4 py-3 rounded-lg mb-8 font-mono text-sm">
            {error}
          </div>
        )}

        {loading && (
          <div className="space-y-4">
            <div className="h-28 bg-slate-900 rounded-lg animate-pulse"></div>
            <div className="h-16 bg-slate-900 rounded-lg animate-pulse"></div>
            <div className="h-32 bg-slate-900 rounded-lg animate-pulse"></div>
          </div>
        )}

        {report && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
              <div className="text-xs uppercase tracking-widest text-slate-500 font-mono mb-4">
                {report.owner}/{report.repo}
              </div>
              <div className="flex items-end gap-3">
                <span className="text-6xl font-extrabold text-amber-400 tabular-nums">
                  {report.healthScore}
                </span>
                <span className="text-xl text-slate-600 mb-1">/ 100</span>
              </div>
              <p className="text-slate-500 mt-2">Repository Health Score</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-xs uppercase tracking-widest text-slate-500 font-mono mb-4">
                Commit Tier Breakdown
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((tier) => {
                  const count =
                    tier === 1
                      ? report.tierBreakdown.tier1
                      : tier === 2
                      ? report.tierBreakdown.tier2
                      : report.tierBreakdown.tier3;
                  const style = tierStyles[tier];
                  return (
                    <div key={tier} className={`rounded-lg p-4 ${style.bg}`}>
                      <div className={`text-2xl font-bold font-mono ${style.color}`}>
                        {count}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{style.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-xs uppercase tracking-widest text-slate-500 font-mono mb-4">
                AI Executive Summary
              </h3>
              <ul className="space-y-3">
                {report.executiveSummary.map((point, i) => (
                  <li
                    key={i}
                    className="text-slate-300 leading-relaxed pl-4 border-l-2 border-amber-400/30"
                  >
                    {point.replace(/^-\s*/, "")}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}