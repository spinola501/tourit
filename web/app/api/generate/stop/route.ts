import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateStop } from "@/lib/generation/generate-stop";
import { createAdminClient } from "@/lib/db/supabase";

const RequestSchema = z.object({
  stopName: z.string().min(2),
  cityName: z.string().min(2),
  country: z.string().min(2),
  lat: z.number(),
  lng: z.number(),
  cityId: z.string().uuid().optional(), // if provided, save to DB
  language: z.string().default("en"),
});

// Protect with admin secret — not for public use
function isAuthorised(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  return secret === process.env.ADMIN_SECRET;
}

export async function POST(req: NextRequest) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;

  try {
    const generated = await generateStop(input);

    // If cityId provided, persist to Supabase
    if (input.cityId) {
      const db = createAdminClient();

      // Insert stop
      const { data: stop, error: stopError } = await db
        .from("stops")
        .insert({
          city_id: input.cityId,
          name: generated.name,
          lat: input.lat,
          lng: input.lng,
          duration_minutes: generated.duration_minutes,
          tags: generated.tags,
          accessibility_note: generated.accessibility_note,
          last_generated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (stopError) throw new Error(`DB insert stop: ${stopError.message}`);

      // Insert practical info
      await db.from("stop_practical").insert({
        stop_id: stop.id,
        opening_hours: generated.practical.opening_hours,
        admission_fee: generated.practical.admission_fee,
        nearest_transport: generated.practical.nearest_transport,
        website_url: generated.practical.website_url ?? null,
      });

      // Insert all 11 content categories
      const contentRows = Object.entries(generated.content).map(([category, text]) => ({
        stop_id: stop.id,
        category,
        language: input.language,
        text,
        word_count: text.split(/\s+/).length,
      }));

      await db.from("stop_content").insert(contentRows);

      return NextResponse.json({ success: true, stopId: stop.id, generated });
    }

    // No cityId — just return generated content (useful for preview/testing)
    return NextResponse.json({ success: true, generated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[generate/stop]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
