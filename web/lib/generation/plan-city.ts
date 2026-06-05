import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const PlannedStopSchema = z.object({
  name: z.string(),
  lat:  z.number(),
  lng:  z.number(),
});

const CityPlanSchema = z.object({
  cityName:   z.string(),
  country:    z.string(),
  slug:       z.string(),
  coverColor: z.string(),
  stops:      z.array(PlannedStopSchema).min(12).max(20),
});

export type CityPlan = z.infer<typeof CityPlanSchema>;

export async function planCity(cityNameRaw: string, countryRaw: string): Promise<CityPlan> {
  // Sanitize — strip newlines/control chars that could inject prompt instructions
  const cityName = cityNameRaw.replace(/[\r\n\t]/g, " ").slice(0, 100).trim();
  const country  = countryRaw.replace(/[\r\n\t]/g, " ").slice(0, 80).trim();

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",   // Sonnet for better geographic coverage
    max_tokens: 2048,
    messages: [{
      role: "user",
      content: `You are an expert travel curator with deep knowledge of every destination worldwide.

Create a city profile for: **${cityName}, ${country}**

Return ONLY a valid JSON object with this exact structure — no markdown, no explanation:
{
  "cityName": "official city name",
  "country": "country name",
  "slug": "city-name-lowercase-hyphens-only",
  "coverColor": "#hexcolor (dark, atmospheric — e.g. deep blue for Sydney, terracotta for Rome)",
  "stops": [
    {"name": "Exact Stop Name", "lat": -37.8136, "lng": 144.9631},
    ...
  ]
}

REQUIREMENTS:
- Include EXACTLY 15 stops — no fewer, no more
- Choose the 15 most iconic, tourist-worthy attractions: major landmarks, world-famous museums, scenic parks, historic sites, popular beaches or markets
- Use precise GPS coordinates (6 decimal places) for each stop
- For large cities like Melbourne, Sydney, London — include well-spread geographic coverage across the city, not just the CBD
- Slug must be lowercase with hyphens only (no spaces, no special chars)
- Cover color should feel like the city's atmosphere

Return only the JSON object.`,
    }],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text.trim() : "";
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Try to extract JSON object from response if wrapped in text
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error(`planCity: no JSON in response for ${cityName}`);
    parsed = JSON.parse(match[0]);
  }

  return CityPlanSchema.parse(parsed);
}
