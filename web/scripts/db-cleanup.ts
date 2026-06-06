/**
 * Full DB audit and cleanup.
 * - Deletes duplicate cities (keeps the one with the most stops)
 * - Deletes duplicate stops within a city (same normalised name, keeps the one with most content)
 * - Deletes duplicate tours within a city (same title, keeps the one with most stops)
 * - Reports what was removed
 *
 * Safe to re-run — idempotent.
 * Run: npx tsx --env-file=.env.local scripts/db-cleanup.ts
 */

import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

async function run() {
  console.log("\n=== TourIt DB Cleanup ===\n");

  // ── 1. Audit all cities ────────────────────────────────────────────────────
  const { data: cities } = await db.from("cities").select("id, slug, name, country");
  if (!cities) { console.error("Could not fetch cities"); return; }

  console.log(`Found ${cities.length} cities:\n`);
  for (const c of cities) {
    const [{ count: stops }, { count: tours }] = await Promise.all([
      db.from("stops").select("id", { count: "exact", head: true }).eq("city_id", c.id),
      db.from("tours").select("id", { count: "exact", head: true }).eq("city_id", c.id),
    ]);
    console.log(`  ${c.slug.padEnd(30)} stops=${String(stops ?? 0).padStart(3)}  tours=${tours ?? 0}`);
  }

  // ── 2. Delete duplicate cities ─────────────────────────────────────────────
  // Group by normalised name. Keep the slug that is the simplest (shortest/no country suffix).
  console.log("\n--- Deduplicating cities ---\n");

  const cityGroups = new Map<string, typeof cities>();
  for (const c of cities) {
    const key = norm(c.name);
    if (!cityGroups.has(key)) cityGroups.set(key, []);
    cityGroups.get(key)!.push(c);
  }

  for (const [, group] of cityGroups) {
    if (group.length <= 1) continue;

    // For each city in the group, count stops
    const withCounts = await Promise.all(
      group.map(async (c) => {
        const { count } = await db.from("stops").select("id", { count: "exact", head: true }).eq("city_id", c.id);
        return { ...c, stopCount: count ?? 0 };
      })
    );

    // Keep the one with the most stops; prefer shorter slug (melbourne over melbourne-australia)
    withCounts.sort((a, b) => b.stopCount - a.stopCount || a.slug.length - b.slug.length);
    const [keep, ...remove] = withCounts;

    console.log(`  Keeping  : ${keep.slug} (${keep.stopCount} stops)`);
    for (const r of remove) {
      console.log(`  Deleting : ${r.slug} (${r.stopCount} stops)`);
      // Cascade: delete tour_stops → tours → stops → city
      const { data: tourIds } = await db.from("tours").select("id").eq("city_id", r.id);
      if (tourIds?.length) {
        await db.from("tour_stops").delete().in("tour_id", tourIds.map(t => t.id));
        await db.from("tours").delete().eq("city_id", r.id);
      }
      const { data: stopIds } = await db.from("stops").select("id").eq("city_id", r.id);
      if (stopIds?.length) {
        const ids = stopIds.map(s => s.id);
        await db.from("tour_stops").delete().in("stop_id", ids);
        await db.from("stop_content").delete().in("stop_id", ids);
        await db.from("stop_practical").delete().in("stop_id", ids);
        await db.from("user_favorites").delete().in("stop_id", ids);
        await db.from("stop_plays").delete().in("stop_id", ids);
        await db.from("stop_reports").delete().in("stop_id", ids);
        await db.from("stops").delete().eq("city_id", r.id);
      }
      await db.from("cities").delete().eq("id", r.id);
      console.log(`    → deleted`);
    }
  }

  // ── 3. Deduplicate stops within each city ──────────────────────────────────
  console.log("\n--- Deduplicating stops per city ---\n");

  const { data: remainingCities } = await db.from("cities").select("id, slug");
  for (const city of remainingCities ?? []) {
    const { data: cstops } = await db.from("stops").select("id, name").eq("city_id", city.id);
    if (!cstops || cstops.length === 0) continue;

    const stopGroups = new Map<string, typeof cstops>();
    for (const s of cstops) {
      const key = norm(s.name ?? "");
      if (!stopGroups.has(key)) stopGroups.set(key, []);
      stopGroups.get(key)!.push(s);
    }

    let deduped = 0;
    for (const [name, group] of stopGroups) {
      if (group.length <= 1) continue;

      // Keep the stop with the most content rows
      const withCounts = await Promise.all(
        group.map(async (s) => {
          const { count } = await db.from("stop_content").select("id", { count: "exact", head: true }).eq("stop_id", s.id);
          return { ...s, contentCount: count ?? 0 };
        })
      );
      withCounts.sort((a, b) => b.contentCount - a.contentCount);
      const [keep, ...remove] = withCounts;

      console.log(`  ${city.slug}: "${keep.name}" — keeping ${keep.id.slice(0, 8)} (${keep.contentCount} content rows), removing ${remove.length}`);
      for (const r of remove) {
        await db.from("tour_stops").delete().eq("stop_id", r.id);
        await db.from("stop_content").delete().eq("stop_id", r.id);
        await db.from("stop_practical").delete().eq("stop_id", r.id);
        await db.from("user_favorites").delete().eq("stop_id", r.id);
        await db.from("stop_plays").delete().eq("stop_id", r.id);
        await db.from("stop_reports").delete().eq("stop_id", r.id);
        await db.from("stops").delete().eq("id", r.id);
        deduped++;
      }
    }
    if (deduped > 0) console.log(`  ${city.slug}: removed ${deduped} duplicate stop(s)`);
  }

  // ── 4. Deduplicate tours within each city ──────────────────────────────────
  console.log("\n--- Deduplicating tours per city ---\n");

  for (const city of remainingCities ?? []) {
    const { data: tours } = await db.from("tours").select("id, title, type").eq("city_id", city.id);
    if (!tours || tours.length === 0) continue;

    const tourGroups = new Map<string, typeof tours>();
    for (const t of tours) {
      const key = norm(t.title ?? "");
      if (!tourGroups.has(key)) tourGroups.set(key, []);
      tourGroups.get(key)!.push(t);
    }

    let deduped = 0;
    for (const [, group] of tourGroups) {
      if (group.length <= 1) continue;

      const withCounts = await Promise.all(
        group.map(async (t) => {
          const { count } = await db.from("tour_stops").select("id", { count: "exact", head: true }).eq("tour_id", t.id);
          return { ...t, stopCount: count ?? 0 };
        })
      );
      withCounts.sort((a, b) => b.stopCount - a.stopCount);
      const [keep, ...remove] = withCounts;

      console.log(`  ${city.slug}: tour "${keep.title}" — keeping (${keep.stopCount} stops), removing ${remove.length} dupe(s)`);
      for (const r of remove) {
        await db.from("tour_stops").delete().eq("tour_id", r.id);
        await db.from("tours").delete().eq("id", r.id);
        deduped++;
      }
    }
    if (deduped > 0) console.log(`  ${city.slug}: removed ${deduped} duplicate tour(s)`);
  }

  // ── 5. Final summary ───────────────────────────────────────────────────────
  console.log("\n=== Final state ===\n");
  const { data: finalCities } = await db.from("cities").select("id, slug, name");
  for (const c of finalCities ?? []) {
    const [{ count: s }, { count: t }] = await Promise.all([
      db.from("stops").select("id", { count: "exact", head: true }).eq("city_id", c.id),
      db.from("tours").select("id", { count: "exact", head: true }).eq("city_id", c.id),
    ]);
    console.log(`  ${c.slug.padEnd(30)} stops=${String(s ?? 0).padStart(3)}  tours=${t ?? 0}`);
  }
  console.log("\n=== Done ===\n");
}

run().catch((e) => { console.error(e); process.exit(1); });
