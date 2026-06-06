import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const TourPlanSchema = z.array(
  z.object({
    title: z.string(),
    tagline: z.string(),
    theme: z.enum(["classic", "nature", "history", "culture", "beaches", "day_trip", "food", "architecture"]),
    stop_names: z.array(z.string()).min(4).max(12),
    duration_hours: z.number(),
  })
).min(2).max(4);

export type TourPlan = z.infer<typeof TourPlanSchema>[number];

// Hard cap on stops per prebuilt tour. More than this is too long for a real
// day tour and lets free users hear too much content (defeats the paywall).
export const MAX_TOUR_STOPS = 10;

export type StopForTour = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  duration_minutes: number;
  tags: string[];
};

export async function generateToursForCity(
  city: { name: string; country: string },
  stops: StopForTour[]
): Promise<TourPlan[]> {
  const client = new Anthropic();

  const stopList = stops
    .map((s, i) => `${i + 1}. ${s.name} [${s.tags.slice(0, 4).join(", ")}] (~${s.duration_minutes}min)`)
    .join("\n");

  const systemPrompt = `You are a senior travel curator designing pre-built audio tours for TourIt, a GPS-triggered audio tour app. You know every major city deeply — its geography, culture, what makes it unique, and the best ways to experience it in a day. You always prioritise logical geographic flow (don't send people back and forth across the city) and authentic, compelling tour themes over generic ones.`;

  const userPrompt = `Design 2–3 curated day tours for: ${city.name}, ${city.country}

Available stops:
${stopList}

Requirements for each tour:
• Completable in ~5–7 hours (walking + short transfers)
• 5–10 stops in logical geographic sequence (minimise backtracking)
• Distinct, non-overlapping themes — no two tours should feel the same
• Title must be specific and evocative (e.g. "Litchfield Falls & Wildlife", "South Bank to the East End" — NOT "Nature Tour" or "City Highlights")
• Tagline: one compelling sentence that makes someone want to do this tour
• Only use stop names from the list above — match them exactly

City-specific guidance: Think carefully about what makes ${city.name} genuinely unique. If there are famous natural areas nearby (national parks, coastal walks, harbour), give them their own tour. If there are distinct historical periods or neighbourhoods, honour that. Design tours a local expert would be proud of.

Return ONLY a valid JSON array, nothing else:
[
  {
    "title": "...",
    "tagline": "...",
    "theme": "classic|nature|history|culture|beaches|day_trip|food|architecture",
    "stop_names": ["exact stop name from the list above", ...],
    "duration_hours": 6
  }
]`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  // Extract JSON array from response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error(`No JSON array in Claude response: ${text.slice(0, 200)}`);

  const raw = JSON.parse(jsonMatch[0]);
  // Use safeParse per-item so one bad plan doesn't abort the whole batch
  if (!Array.isArray(raw)) throw new Error("Expected JSON array of tour plans");
  const SinglePlanSchema = TourPlanSchema.element;
  const valid = raw
    .map((item: unknown) => SinglePlanSchema.safeParse(item))
    .filter((r) => r.success)
    .map((r) => (r as { success: true; data: TourPlan }).data);
  if (valid.length < 2) throw new Error(`Only ${valid.length} valid tour plans in response (need ≥2)`);
  return valid;
}

// Resolve a tour plan's stop names to real, de-duplicated DB stop IDs,
// trimmed to the first MAX_TOUR_STOPS matches (hard cap).
export function resolveTourStopIds(
  stopNames: string[],
  stops: StopForTour[]
): string[] {
  const ids: string[] = [];
  for (const name of stopNames) {
    const matched = matchStopName(name, stops);
    if (matched && !ids.includes(matched.id)) ids.push(matched.id);
  }
  return ids.slice(0, MAX_TOUR_STOPS);
}

// Match a Claude-returned stop name to a real DB stop ID.
// Tries exact match, then substring, then word overlap as fallbacks.
export function matchStopName(claudeName: string, stops: StopForTour[]): StopForTour | null {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
  const cn = norm(claudeName);

  // 1. Exact match
  const exact = stops.find((s) => norm(s.name) === cn);
  if (exact) return exact;

  // 2. One contains the other
  const contained = stops.find(
    (s) => norm(s.name).includes(cn) || cn.includes(norm(s.name))
  );
  if (contained) return contained;

  // 3. First 3 words of name match (handles "Litchfield National Park" vs "Litchfield NP")
  const claudeWords = cn.split(/\s+/).slice(0, 3).join(" ");
  const wordMatch = stops.find((s) => norm(s.name).startsWith(claudeWords));
  if (wordMatch) return wordMatch;

  return null;
}
