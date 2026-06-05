import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const PlannedStopSchema = z.object({
  name: z.string(),
  lat:  z.number(),
  lng:  z.number(),
});

const CityPlanSchema = z.object({
  cityName:       z.string(),
  country:        z.string(),
  slug:           z.string(),
  coverColor:     z.string(),
  locationType:   z.enum(["major_city", "city", "town", "park_reserve", "island", "region"]),
  expectedStops:  z.number().int().min(4).max(20),
  stops:          z.array(PlannedStopSchema).min(4).max(20),
});

export type CityPlan = z.infer<typeof CityPlanSchema>;

export async function planCity(cityNameRaw: string, countryRaw: string): Promise<CityPlan> {
  // Sanitize — strip newlines/control chars that could inject prompt instructions
  const cityName = cityNameRaw.replace(/[\r\n\t]/g, " ").slice(0, 100).trim();
  const country  = countryRaw.replace(/[\r\n\t]/g, " ").slice(0, 80).trim();

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{
      role: "user",
      content: `You are an expert travel curator. Create an audio tour plan for: **${cityName}, ${country}**

First, assess what kind of destination this is, then choose the RIGHT number of stops based on that assessment:

- **Major world city** (London, Paris, Tokyo, Sydney, NYC): 15–20 stops
- **Regional city / capital** (Melbourne, Barcelona, Edinburgh, Cape Town): 12–16 stops
- **Small city / town** (Bruges, Queenstown, Dubrovnik): 8–12 stops
- **National park / nature reserve** (Royal National Park, Yosemite, Dolomites): 5–10 stops
- **Small island / village**: 4–8 stops

CRITICAL RULES:
- Only include stops that GENUINELY EXIST and are well-known tourist attractions
- NEVER invent or hallucinate stops just to reach a higher number
- For nature areas, only include named landmarks (waterfalls, lookouts, beaches, visitor centres)
- For cities, spread stops geographically — don't cluster everything in the CBD
- Use precise GPS coordinates (6 decimal places)

Return ONLY this JSON (no markdown, no explanation):
{
  "cityName": "official name",
  "country": "country name",
  "slug": "lowercase-hyphens-only",
  "coverColor": "#hexcolor (dark atmospheric colour for this destination)",
  "locationType": "major_city|city|town|park_reserve|island|region",
  "expectedStops": <number you chose>,
  "stops": [
    {"name": "Exact Real Place Name", "lat": 0.000000, "lng": 0.000000},
    ...
  ]
}`,
    }],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text.trim() : "";
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error(`planCity: no JSON in response for ${cityName}`);
    parsed = JSON.parse(match[0]);
  }

  const plan = CityPlanSchema.parse(parsed);

  // Sanity check: if stop count is way off from expectedStops, log a warning
  if (Math.abs(plan.stops.length - plan.expectedStops) > 3) {
    console.warn(`[plan-city] ${cityName}: expected ${plan.expectedStops} stops, got ${plan.stops.length}`);
  }

  return plan;
}
