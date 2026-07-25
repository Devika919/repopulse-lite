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

  async function handleAnalyze() {
    setError("");
    setReport(null);
    setLoading(true);

    try {
      const response = await fetch(`/api/github?repo=${encodeURIComponent(repoUrl)}`);
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
        {/* Header */}
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

        {/* Input row */}
        <div className="flex gap-2 mb-10">
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

        {/* Error */}
        {error && (
          <div className="bg-rose-950/40 border border-rose-900 text-rose-300 px-4 py-3 rounded-lg mb-8 font-mono text-sm">
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            <div className="h-28 bg-slate-900 rounded-lg animate-pulse"></div>
            <div className="h-16 bg-slate-900 rounded-lg animate-pulse"></div>
            <div className="h-32 bg-slate-900 rounded-lg animate-pulse"></div>
          </div>
        )}

        {/* Report */}
        {report && (
          <div className="space-y-6">
            {/* Health score card */}
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

            {/* Tier breakdown */}
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

            {/* Executive summary */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-xs uppercase tracking-widest text-slate-500 font-mono mb-4">
                AI Executive Summary
              </h3>
              <ul className="space-y-3">
                {report.executiveSummary.map((point, i) => (
                  <li key={i} className="text-slate-300 leading-relaxed pl-4 border-l-2 border-amber-400/30">
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