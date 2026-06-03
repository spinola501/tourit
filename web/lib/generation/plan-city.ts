import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const PlannedStopSchema = z.object({
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
});

const CityPlanSchema = z.object({
  cityName: z.string(),
  country: z.string(),
  slug: z.string(),
  coverColor: z.string(),
  stops: z.array(PlannedStopSchema).min(10).max(20),
});

export type CityPlan = z.infer<typeof CityPlanSchema>;

export async function planCity(cityNameRaw: string, countryRaw: string): Promise<CityPlan> {
  // Sanitize inputs — strip newlines/control chars that could inject prompt instructions
  const cityName = cityNameRaw.replace(/[\r\n\t]/g, " ").slice(0, 100).trim();
  const country  = countryRaw.replace(/[\r\n\t]/g, " ").slice(0, 80).trim();

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    messages: [{
      role: "user",
      content: `You are a travel expert. Return a JSON city profile for: ${cityName}, ${country}

Use this exact JSON structure (no markdown, no extra text):
{
  "cityName": "official city name",
  "country": "country name",
  "slug": "city-name-lowercase-hyphenated",
  "coverColor": "#hexcolor (dark atmospheric color representing this city)",
  "stops": [
    {"name": "Stop Name", "lat": 0.000000, "lng": 0.000000},
    ...
  ]
}

Include 15-18 iconic tourist stops with accurate GPS coordinates. Only return the JSON object.`,
    }],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text.trim() : "";
  const cleaned = raw.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
  return CityPlanSchema.parse(JSON.parse(cleaned));
}
