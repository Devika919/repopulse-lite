type LLMConfig = {
  provider: "groq" | "custom";
  baseUrl?: string;
  apiKey?: string;
  model?: string;
};

export async function generateExecutiveSummary(
  owner: string,
  repo: string,
  healthScore: number,
  tierBreakdown: { tier1: number; tier2: number; tier3: number },
  commitMessages: string[],
  llmConfig: LLMConfig
): Promise<string[]> {
  const prompt = `You are analyzing the GitHub repository ${owner}/${repo}.

Health Score: ${healthScore}/100
Commit Tier Breakdown: ${tierBreakdown.tier1} low-complexity, ${tierBreakdown.tier2} medium-complexity, ${tierBreakdown.tier3} high-complexity (out of last 20 commits)

Recent commit messages:
${commitMessages.slice(0, 10).join("\n")}

Write exactly 3 concise bullet points for an engineering leadership executive summary, covering:
1. Development momentum
2. Operational risks
3. Commit hygiene (are messages clear and well-written, or vague/messy?)

Respond with ONLY the 3 bullet points, each starting with "- ", no extra text.`;

  let url: string;
  let apiKey: string | undefined;
  let model: string;

  if (llmConfig.provider === "custom") {
    if (!llmConfig.baseUrl || !llmConfig.apiKey || !llmConfig.model) {
      throw new Error("Missing custom provider configuration");
    }
    url = llmConfig.baseUrl;
    apiKey = llmConfig.apiKey;
    model = llmConfig.model;
  } else {
    url = "https://api.groq.com/openai/v1/chat/completions";
    apiKey = process.env.GROQ_API_KEY;
    model = "openai/gpt-oss-20b";
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error("LLM request failed");
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";

  return text
    .split("\n")
    .map((line: string) => line.trim())
    .filter((line: string) => line.startsWith("-"));
}