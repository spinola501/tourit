/**
 * Tour database cleanup + repair.
 * Run from web/ directory:
 *   npx tsx --env-file=.env.local scripts/fix-tours-db.ts
 *
 * What it does:
 *  1. Deletes duplicate prebuilt tours (same city_id + title) — keeps the one
 *     with the most tour_stops.
 *  2. Deletes any tour whose stop count > MAX_STOPS (too long for a day tour,
 *     and oversized tours defeat the category paywall).
 *  3. London special-case: wipes ALL London prebuilt tours and regenerates fresh,
 *     with a hard cap trimming each tour to the first MAX_STOPS matched stops.
 *  4. Regenerates tours for any city left with 0 tours after cleanup (same cap).
 *  5. Prints a summary.
 */

import { createClient } from "@supabase/supabase-js";
import {
  generateToursForCity,
  matchStopName,
  type StopForTour,
} from "../lib/generation/generate-tours";

const MAX_STOPS = 10; // hard cap: tours with more matched stops are trimmed

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

type TourRow = { id: string; title: string; city_id: string };

const summary = {
  duplicatesDeleted: 0,
  oversizedDeleted: 0,
  londonWiped: 0,
  citiesRegenerated: [] as string[],
  toursCreated: 0,
};

async function stopCountFor(tourId: string): Promise<number> {
  const { count } = await db
    .from("tour_stops")
    .select("id", { count: "exact", head: true })
    .eq("tour_id", tourId);
  return count ?? 0;
}

async function deleteTour(tourId: string): Promise<void> {
  // Remove join rows first (FK safety even if cascade exists).
  await db.from("tour_stops").delete().eq("tour_id", tourId);
  await db.from("tours").delete().eq("id", tourId);
}

async function loadStopsForCity(cityId: string): Promise<StopForTour[]> {
  const { data } = await db
    .from("stops")
    .select("id, name, lat, lng, duration_minutes, tags")
    .eq("city_id", cityId);
  return (data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    lat: s.lat ?? 0,
    lng: s.lng ?? 0,
    duration_minutes: s.duration_minutes ?? 45,
    tags: (s.tags as string[]) ?? [],
  }));
}

// Generate + insert tours for a city, applying the MAX_STOPS hard cap.
async function regenerateCity(city: {
  id: string;
  slug: string;
  name: string;
  country: string;
  cover_color: string | null;
}): Promise<number> {
  const stopsForTour = await loadStopsForCity(city.id);
  if (stopsForTour.length < 5) {
    console.log(`  ⚠ ${city.slug}: only ${stopsForTour.length} stops — skipping regen`);
    return 0;
  }

  const plans = await generateToursForCity(
    { name: city.name, country: city.country },
    stopsForTour
  );
  const coverColor = CITY_COLORS[city.slug] ?? city.cover_color ?? "#1a3a5c";
  let created = 0;

  for (const plan of plans) {
    // Resolve stop names to real stop IDs first, then apply the hard cap.
    const matchedIds: string[] = [];
    for (const stopName of plan.stop_names) {
      const matched = matchStopName(stopName, stopsForTour);
      if (matched && !matchedIds.includes(matched.id)) matchedIds.push(matched.id);
    }
    const capped = matchedIds.slice(0, MAX_STOPS);
    if (capped.length < 2) {
      console.log(`    ⚠ "${plan.title}" matched only ${capped.length} stops — skipping`);
      continue;
    }

    const { data: tour, error } = await db
      .from("tours")
      .insert({
        city_id: city.id,
        title: plan.title,
        tagline: plan.tagline,
        type: "prebuilt",
        tier_required: "free",
        cover_color: coverColor,
        is_official: true,
      })
      .select("id")
      .single();

    if (error || !tour) {
      console.error(`    ✗ Insert failed: "${plan.title}" — ${error?.message}`);
      continue;
    }

    let orderIdx = 0;
    for (const stopId of capped) {
      await db.from("tour_stops").insert({
        tour_id: tour.id,
        stop_id: stopId,
        order_index: orderIdx,
      });
      orderIdx++;
    }
    const trimNote = matchedIds.length > MAX_STOPS ? ` (trimmed from ${matchedIds.length})` : "";
    console.log(`    ✓ "${plan.title}" (${capped.length} stops)${trimNote}`);
    created++;
    summary.toursCreated++;
  }
  return created;
}

async function run() {
  const { data: cities } = await db
    .from("cities")
    .select("id, slug, name, country, cover_color");
  if (!cities?.length) {
    console.log("No cities found.");
    return;
  }

  console.log("\n=== Tour DB cleanup ===\n");

  for (const city of cities) {
    const { data: tours } = await db
      .from("tours")
      .select("id, title, city_id")
      .eq("city_id", city.id)
      .eq("type", "prebuilt");

    const tourRows = (tours ?? []) as TourRow[];

    // ── London special-case: wipe everything and regenerate fresh ──
    if (city.slug === "london") {
      console.log(`\n[london] Wiping ${tourRows.length} prebuilt tours for fresh regen…`);
      for (const t of tourRows) {
        await deleteTour(t.id);
        summary.londonWiped++;
      }
      const created = await regenerateCity(city);
      if (created > 0) summary.citiesRegenerated.push(`${city.slug} (${created})`);
      continue;
    }

    // ── 1. De-duplicate by title (keep the one with the most stops) ──
    const byTitle = new Map<string, TourRow[]>();
    for (const t of tourRows) {
      const key = t.title.trim().toLowerCase();
      const arr = byTitle.get(key) ?? [];
      arr.push(t);
      byTitle.set(key, arr);
    }

    const survivors: TourRow[] = [];
    for (const [, group] of byTitle) {
      if (group.length === 1) {
        survivors.push(group[0]);
        continue;
      }
      // Pick the tour with the most stops as the keeper.
      const withCounts = await Promise.all(
        group.map(async (t) => ({ t, count: await stopCountFor(t.id) }))
      );
      withCounts.sort((a, b) => b.count - a.count);
      const keeper = withCounts[0].t;
      survivors.push(keeper);
      for (const { t } of withCounts.slice(1)) {
        await deleteTour(t.id);
        summary.duplicatesDeleted++;
        console.log(`  [${city.slug}] deleted duplicate "${t.title}"`);
      }
    }

    // ── 2. Delete oversized tours ──
    for (const t of survivors) {
      const count = await stopCountFor(t.id);
      if (count > MAX_STOPS) {
        await deleteTour(t.id);
        summary.oversizedDeleted++;
        console.log(`  [${city.slug}] deleted oversized "${t.title}" (${count} stops)`);
      }
    }
  }

  // ── 3. Regenerate any city now left with 0 tours ──
  console.log("\n=== Regenerating cities with no tours ===\n");
  for (const city of cities) {
    if (city.slug === "london") continue; // already handled
    const { count } = await db
      .from("tours")
      .select("id", { count: "exact", head: true })
      .eq("city_id", city.id)
      .eq("type", "prebuilt");
    if ((count ?? 0) > 0) continue;

    console.log(`[${city.slug}] 0 tours — regenerating…`);
    try {
      const created = await regenerateCity(city);
      if (created > 0) summary.citiesRegenerated.push(`${city.slug} (${created})`);
    } catch (e) {
      console.error(`  ✗ regen failed for ${city.slug}:`, (e as Error).message);
    }
  }

  // ── Summary ──
  console.log("\n=== Summary ===");
  console.log(`  Duplicate tours deleted:  ${summary.duplicatesDeleted}`);
  console.log(`  Oversized tours deleted:  ${summary.oversizedDeleted}`);
  console.log(`  London tours wiped:       ${summary.londonWiped}`);
  console.log(`  New tours created:        ${summary.toursCreated}`);
  console.log(
    `  Cities regenerated:       ${summary.citiesRegenerated.length ? summary.citiesRegenerated.join(", ") : "none"}`
  );
  console.log("\n=== Done ===\n");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
