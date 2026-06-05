import { isAdminAuthorised } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/db/supabase";

function isAuthorised(req: NextRequest) {
  return isAdminAuthorised(req);
}

export async function POST(req: NextRequest) {
  if (!isAuthorised(req)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const db = createAdminClient();
  const log: string[] = [];

  const { data: cities } = await db.from("cities").select("id, slug, name");

  for (const city of cities ?? []) {
    log.push(`\n=== ${city.name} ===`);

    // 1. Get all stops for this city
    const { data: allStops } = await db
      .from("stops")
      .select("id, name, created_at")
      .eq("city_id", city.id)
      .order("created_at", { ascending: true });

    if (!allStops) continue;

    // 2. Find duplicates — keep earliest, delete the rest
    const seen = new Map<string, string>(); // name → id to keep
    const toDelete: string[] = [];

    for (const stop of allStops) {
      const key = stop.name.toLowerCase().trim();
      if (seen.has(key)) {
        toDelete.push(stop.id);
        log.push(`  dup: ${stop.name} (${stop.id.slice(0, 8)})`);
      } else {
        seen.set(key, stop.id);
      }
    }

    if (toDelete.length > 0) {
      // cascade deletes stop_content, stop_practical via FK
      const { error } = await db.from("stops").delete().in("id", toDelete);
      if (error) {
        log.push(`  ERROR deleting dups: ${error.message}`);
      } else {
        log.push(`  Deleted ${toDelete.length} duplicate stops`);
      }
    }

    // 3. Get clean stop list after dedup
    const { data: cleanStops } = await db
      .from("stops")
      .select("id, name")
      .eq("city_id", city.id)
      .eq("is_verified", true)
      .order("created_at", { ascending: true });

    log.push(`  Clean stops: ${cleanStops?.length ?? 0}`);

    // 4. Get or create the tour for this city
    let { data: tour } = await db
      .from("tours")
      .select("id, title")
      .eq("city_id", city.id)
      .eq("type", "prebuilt")
      .single();

    if (!tour) {
      const { data: newTour } = await db
        .from("tours")
        .insert({
          city_id: city.id,
          title: `${city.name} Classic`,
          tagline: `The essential ${city.name} experience — iconic landmarks, hidden history, unforgettable stories.`,
          type: "prebuilt",
          tier: "free",
          cover_color: "#1a3a5c",
          is_official: true,
        })
        .select("id, title")
        .single();
      tour = newTour;
      log.push(`  Created tour: ${tour?.title}`);
    } else {
      log.push(`  Existing tour: ${tour.title}`);
    }

    if (!tour || !cleanStops || cleanStops.length === 0) continue;

    // 5. Delete all existing tour_stops and rebuild
    await db.from("tour_stops").delete().eq("tour_id", tour.id);

    const { error: insertErr } = await db.from("tour_stops").insert(
      cleanStops.map((s, i) => ({
        tour_id: tour!.id,
        stop_id: s.id,
        order_index: i,
      }))
    );

    if (insertErr) {
      log.push(`  ERROR rebuilding tour_stops: ${insertErr.message}`);
    } else {
      log.push(`  Rebuilt tour_stops: ${cleanStops.length} stops linked`);
    }
  }

  return NextResponse.json({ ok: true, log });
}
