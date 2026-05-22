import { z } from "zod";

export const CATEGORIES = [
  "history",
  "architecture",
  "culture",
  "fauna",
  "flora",
  "geo",
  "lore",
  "funfacts",
  "food",
  "photography",
  "practical",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const StopContentSchema = z.object({
  history: z.string().min(100).describe("Rich historical narrative, 300-500 words"),
  architecture: z.string().min(100).describe("Architectural style, materials, design details, 300-500 words"),
  culture: z.string().min(100).describe("Art, traditions, festivals, local identity, 300-500 words"),
  fauna: z.string().min(100).describe("Wildlife in and around the area, 300-500 words"),
  flora: z.string().min(100).describe("Vegetation, notable trees, ecosystems, 300-500 words"),
  geo: z.string().min(100).describe("Geography, geology, how the landscape formed, 300-500 words"),
  lore: z.string().min(100).describe("Myths, ghost stories, legends, folk tales, 300-500 words"),
  funfacts: z.string().min(100).describe("Surprising, counterintuitive or little-known facts, 300-500 words"),
  food: z.string().min(100).describe("What to eat nearby, local dishes, market stalls, 300-500 words"),
  photography: z.string().min(100).describe("Best angles, lighting times, hidden spots for photos, 300-500 words"),
  practical: z.string().min(50).describe("Opening hours, admission prices, transport, booking tips"),
});

export const StopPracticalSchema = z.object({
  opening_hours: z.string().nullable(),
  admission_fee: z.string().nullable(),
  nearest_transport: z.string().nullable(),
  website_url: z.string().url().nullable().optional(),
});

export const GeneratedStopSchema = z.object({
  name: z.string(),
  summary: z.string().describe("One sentence description of the stop"),
  duration_minutes: z.number().int().min(10).max(240),
  tags: z.array(z.string()).min(1).max(10),
  accessibility_note: z.string().describe("Accessibility information for seniors, wheelchair users, stroller"),
  content: StopContentSchema,
  practical: StopPracticalSchema,
});

export type GeneratedStop = z.infer<typeof GeneratedStopSchema>;
