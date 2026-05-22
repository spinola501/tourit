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

export async function generateStop(input: GenerateStopInput): Promise<GeneratedStop> {
  const language = input.language ?? "en";

  // 1. Research the stop with web search
  const query = `${input.stopName} ${input.cityName} history facts visit information`;
  const researchResults = await searchWeb(query);

  // 2. Generate with Claude — system prompt is cached (large, stable)
  const userPrompt = buildUserPrompt({
    ...input,
    language,
    researchResults,
  });

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",  // Haiku for batch generation
    max_tokens: 8192,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" }, // Cache the large system prompt
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });

  const rawText = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  // 3. Parse and validate JSON output
  let parsed: unknown;
  try {
    // Strip any accidental markdown code fences
    const cleaned = rawText.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Claude returned invalid JSON:\n${rawText.slice(0, 500)}`);
  }

  const result = GeneratedStopSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Generated stop failed validation:\n${JSON.stringify(result.error.flatten(), null, 2)}`);
  }

  return result.data;
}
