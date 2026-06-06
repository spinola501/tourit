import Anthropic from "@anthropic-ai/sdk";
import { GeneratedStopSchema, type GeneratedStop } from "./schemas";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function searchWeb(query: string): Promise<string> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      search_depth: "advanced",
      max_results: 8,
      include_answer: true,
    }),
  });

  if (!res.ok) throw new Error(`Tavily error: ${res.status}`);

  const data = await res.json();

  // Combine answer + top result snippets into research text
  const parts: string[] = [];
  if (data.answer) parts.push(`Summary: ${data.answer}`);
  for (const result of data.results ?? []) {
    if (result.content) {
      parts.push(`Source (${result.url}):\n${result.content.slice(0, 800)}`);
    }
  }
  return parts.join("\n\n---\n\n");
}

export type GenerateStopInput = {
  stopName: string;
  cityName: string;
  country: string;
  lat: number;
  lng: number;
  language?: string;
};

async function callClaude(userPrompt: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8192,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });
  return response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");
}

export async function generateStop(input: GenerateStopInput): Promise<GeneratedStop> {
  const language = input.language ?? "en";

  // 1. Research the stop with web search
  const query = `${input.stopName} ${input.cityName} history facts visit information`;
  const researchResults = await searchWeb(query);

  // 2. Generate with Claude — retry with shorter word limit if first attempt is truncated
  const attempts: Array<{ wordHint: string }> = [
    { wordHint: "300-500" },
    { wordHint: "150-250" }, // shorter fallback if output exceeds Haiku's token ceiling
  ];

  for (let i = 0; i < attempts.length; i++) {
    const userPrompt = buildUserPrompt({
      ...input,
      language,
      researchResults,
      wordHint: attempts[i].wordHint,
    });

    const rawText = await callClaude(userPrompt);
    const cleaned = rawText.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      if (i < attempts.length - 1) {
        console.warn(`[generateStop] JSON parse failed (attempt ${i + 1}), retrying with shorter output...`);
        continue;
      }
      throw new Error(`Claude returned invalid JSON:\n${rawText.slice(0, 500)}`);
    }

    const result = GeneratedStopSchema.safeParse(parsed);
    if (!result.success) {
      if (i < attempts.length - 1) {
        console.warn(`[generateStop] Schema validation failed (attempt ${i + 1}), retrying...`);
        continue;
      }
      throw new Error(`Generated stop failed validation:\n${JSON.stringify(result.error.flatten(), null, 2)}`);
    }

    return result.data;
  }

  throw new Error("All generation attempts failed");
}
