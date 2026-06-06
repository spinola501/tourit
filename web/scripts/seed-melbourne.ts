/**
 * Standalone script to seed Melbourne stops + tours.
 * Run from web/ directory:
 *   npx tsx --env-file=.env.local scripts/seed-melbourne.ts
 *
 * Uses the real Anthropic, Tavily, and Supabase credentials from .env.local.
 * Safe to re-run — skips stops/content that already exist.
 */

import { createClient } from "@supabase/supabase-js";
import { generateStop } from "../lib/generation/generate-stop";
import { generateToursForCity, matchStopName } from "../lib/generation/generate-tours";
import { fetchWikipediaPhoto } from "../lib/photos/wikipedia";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing Supabase env vars. Run with --env-file=.env.local");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const CITY = {
  slug: "melbourne",
  name: "Melbourne",
  country: "Australia",
  coverColor: "#1a2a4a",
  stops: [
    { name: "Federation Square", lat: -37.8179, lng: 144.9691 },
    { name: "Flinders Street Station", lat: -37.8182, lng: 144.9671 },
    { name: "St Paul's Cathedral Melbourne", lat: -37.8170, lng: 144.9676 },
    { name: "Queen Victoria Market", lat: -37.8067, lng: 144.9565 },
    { name: "National Gallery of Victoria", lat: -37.8225, lng: 144.9683 },
    { name: "Melbourne Museum", lat: -37.8031, lng: 144.9717 },
    { name: "Royal Exhibition Building & Carlton Gardens", lat: -37.8051, lng: 144.9716 },
    { name: "ACMI – Australian Centre for the Moving Image", lat: -37.8180, lng: 144.9695 },
    { name: "Royal Botanic Gardens Melbourne", lat: -37.8302, lng: 144.9796 },
    { name: "Fitzroy Gardens & Captain Cook's Cottage", lat: -37.8148, lng: 144.9803 },
    { name: "Eureka Skydeck", lat: -37.8218, lng: 144.9682 },
    { name: "Shrine of Remembrance", lat: -37.8306, lng: 144.9736 },
    { name: "Melbourne Cricket Ground", lat: -37.8199, lng: 144.9840 },
    { name: "Luna Park St Kilda", lat: -37.8671, lng: 144.9789 },
    { name: "Hosier Lane", lat: -37.8185, lng: 144.9673 },
    { name: "Fitzroy & Collingwood Street Art Precinct", lat: -37.8003, lng: 144.9797 },
  ],
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run(language: string) {
  console.log(`\n=== Seeding Melbourne (${language.toUpperCase()}) ===\n`);

  // Get or create city record
  let { data: cityRecord } = await db.from("cities").select("id").eq("slug", CITY.slug).maybeSingle();

  if (!cityRecord) {
    const cityPhotoUrl = await fetchWikipediaPhoto("Melbourne", "Melbourne, Australia").catch(() => null);
    const { data: newCity, error } = await db.from("cities").insert({
      slug: CITY.slug,
      name: CITY.name,
      country: CITY.country,
      cover_color: CITY.coverColor,
      lat: CITY.stops[0].lat,
      lng: CITY.stops[0].lng,
      photo_url: cityPhotoUrl,
    }).select("id").single();
    if (error || !newCity) { console.error("City insert failed:", error?.message); process.exit(1); }
    cityRecord = newCity;
    console.log("✓ City record created");
  } else {
    console.log("✓ City record exists");
  }

  const generatedStopIds: string[] = [];

  for (const stop of CITY.stops) {
    const { data: existing } = await db.from("stops").select("id")
      .eq("city_id", cityRecord.id).ilike("name", stop.name).maybeSingle();

    if (existing) {
      generatedStopIds.push(existing.id);

      // Check if content in this language already exists
      const { count } = await db.from("stop_content").select("id", { count: "exact", head: true })
        .eq("stop_id", existing.id).eq("language", language);

      if ((count ?? 0) > 0) {
        console.log(`  skip  ${stop.name} (${language} content exists)`);
        continue;
      }

      // Generate content in new language for existing stop
      try {
        const generated = await generateStop({
          stopName: stop.name, cityName: CITY.name, country: CITY.country,
          lat: stop.lat, lng: stop.lng, language,
        });
        await db.from("stop_content").insert(
          Object.entries(generated.content).map(([category, text]) => ({
            stop_id: existing.id, category, language,
            text, word_count: (text as string).split(/\s+/).length,
          }))
        );
        console.log(`  ✓ ${stop.name} (${language} content generated)`);
      } catch (e) {
        console.error(`  ✗ ${stop.name} (${language}):`, (e as Error).message);
      }
      await sleep(3000);
      continue;
    }

    // New stop
    try {
      const generated = await generateStop({
        stopName: stop.name, cityName: CITY.name, country: CITY.country,
        lat: stop.lat, lng: stop.lng, language,
      });
      const photoUrl = await fetchWikipediaPhoto(stop.name, `${stop.name} Melbourne`).catch(() => null);

      const { data: newStop, error: stopErr } = await db.from("stops").insert({
        city_id: cityRecord.id,
        name: generated.name,
        lat: stop.lat, lng: stop.lng,
        duration_minutes: generated.duration_minutes,
        tags: generated.tags,
        accessibility_note: generated.accessibility_note,
        photo_url: photoUrl,
        last_generated_at: new Date().toISOString(),
      }).select("id").single();

      if (stopErr || !newStop) throw new Error(stopErr?.message ?? "Insert failed");

      await db.from("stop_practical").insert({
        stop_id: newStop.id,
        opening_hours: generated.practical.opening_hours,
        admission_fee: generated.practical.admission_fee,
        nearest_transport: generated.practical.nearest_transport,
      });

      await db.from("stop_content").insert(
        Object.entries(generated.content).map(([category, text]) => ({
          stop_id: newStop.id, category, language,
          text, word_count: (text as string).split(/\s+/).length,
        }))
      );

      generatedStopIds.push(newStop.id);
      console.log(`  ✓ ${stop.name}`);
    } catch (e) {
      console.error(`  ✗ ${stop.name}:`, (e as Error).message);
    }
    await sleep(3000);
  }

  // Generate tours (only on EN pass, or if no tours exist yet)
  if (language === "en") {
    const { count: existingTours } = await db.from("tours").select("id", { count: "exact", head: true })
      .eq("city_id", cityRecord.id).eq("type", "prebuilt");

    if ((existingTours ?? 0) === 0) {
      console.log("\n=== Generating tours ===");
      const { data: allStops } = await db.from("stops").select("id, name, lat, lng, duration_minutes, tags")
        .eq("city_id", cityRecord.id);

      const stopsForTour = (allStops ?? []).map((s) => ({
        id: s.id, name: s.name,
        lat: s.lat ?? 0, lng: s.lng ?? 0,
        duration_minutes: s.duration_minutes ?? 45,
        tags: (s.tags as string[]) ?? [],
      }));

      if (stopsForTour.length >= 5) {
        const plans = await generateToursForCity({ name: CITY.name, country: CITY.country }, stopsForTour);
        for (const plan of plans) {
          const { data: tour, error: tourErr } = await db.from("tours").insert({
            city_id: cityRecord.id,
            title: plan.title, tagline: plan.tagline,
            type: "prebuilt", tier_required: "free",
            cover_color: CITY.coverColor, is_official: true,
          }).select("id").single();

          if (tourErr || !tour) {
            console.error(`  ✗ Tour insert failed: "${plan.title}" —`, tourErr?.message ?? "no data");
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
          console.log(`  ✓ Tour: "${plan.title}" (${orderIdx} stops)`);
        }
      }
    } else {
      console.log(`\nTours already exist (${existingTours}), skipping.`);
    }
  }

  console.log("\n=== Done ===\n");
}

const lang = process.argv[2] ?? "en";
run(lang).catch((e) => { console.error(e); process.exit(1); });
