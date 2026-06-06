/**
 * Check tour counts for all seeded cities, then generate missing tours.
 * Run: npx tsx --env-file=.env.local scripts/check-and-fix-tours.ts
 */

import { createClient } from "@supabase/supabase-js";
import { generateToursForCity, matchStopName } from "../lib/generation/generate-tours";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const CITY_COLORS: Record<string, string> = {
  london: "#1a3a5c",
  paris: "#4a1a2c",
  rome: "#5c2a1a",
  sydney: "#1a4a3a",
  melbourne: "#1a2a4a",
  darwin: "#3a2a0a",
};

async function run() {
  const { data: cities } = await db.from("cities").select("id, slug, name, country, cover_color");
  if (!cities?.length) { console.log("No cities found."); return; }

  console.log("\n=== City / tour audit ===\n");

  for (const city of cities) {
    const [{ count: stopCount }, { count: tourCount }] = await Promise.all([
      db.from("stops").select("id", { count: "exact", head: true }).eq("city_id", city.id),
      db.from("tours").select("id", { count: "exact", head: true }).eq("city_id", city.id),
    ]);

    const stops = stopCount ?? 0;
    const tours = tourCount ?? 0;
    const status = tours > 0 ? "✓" : stops >= 5 ? "⚠ NO TOURS" : "✗ insufficient stops";
    console.log(`${status.padEnd(20)} ${city.slug.padEnd(15)} stops=${stops}  tours=${tours}`);

    if (tours === 0 && stops >= 5) {
      console.log(`  → Generating tours for ${city.name}...`);
      try {
        const { data: allStops } = await db.from("stops")
          .select("id, name, lat, lng, duration_minutes, tags")
          .eq("city_id", city.id);

        const stopsForTour = (allStops ?? []).map((s) => ({
          id: s.id, name: s.name,
          lat: s.lat ?? 0, lng: s.lng ?? 0,
          duration_minutes: s.duration_minutes ?? 45,
          tags: (s.tags as string[]) ?? [],
        }));

        const plans = await generateToursForCity({ name: city.name, country: city.country }, stopsForTour);
        const coverColor = CITY_COLORS[city.slug] ?? city.cover_color ?? "#1a3a5c";

        for (const plan of plans) {
          const { data: tour, error } = await db.from("tours").insert({
            city_id: city.id,
            title: plan.title,
            tagline: plan.tagline,
            type: "prebuilt",
            tier_required: "free",
            cover_color: coverColor,
            is_official: true,
          }).select("id").single();

          if (error || !tour) {
            console.error(`    ✗ Insert failed: "${plan.title}" — ${error?.message}`);
            continue;
          }

          let orderIdx = 0;
          for (const stopName of plan.stop_names) {
            const matched = matchStopName(stopName, stopsForTour);
            if (matched) {
              await db.from("tour_stops").insert({ tour_id: tour.id, stop_id: matched.id, order_index: orderIdx });
              orderIdx++;
            }
          }
          console.log(`    ✓ "${plan.title}" (${orderIdx} stops)`);
        }
      } catch (e) {
        console.error(`  ✗ Tour generation failed:`, (e as Error).message);
      }
    }
  }

  console.log("\n=== Done ===\n");
}

run().catch((e) => { console.error(e); process.exit(1); });
