import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/db/supabase";
import { generateToursForCity, matchStopName } from "@/lib/generation/generate-tours";

function auth(req: NextRequest) {
  return req.headers.get("x-admin-secret") === process.env.ADMIN_SECRET;
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { citySlug } = await req.json();
  if (!citySlug) return NextResponse.json({ error: "citySlug required" }, { status: 400 });

  const db = createAdminClient();

  // Fetch city
  const { data: city } = await db
    .from("cities")
    .select("id, name, country, cover_color")
    .eq("slug", citySlug)
    .single();

  if (!city) return NextResponse.json({ error: `City "${citySlug}" not found` }, { status: 404 });

  // Fetch all stops for this city
  const { data: rawStops } = await db
    .from("stops")
    .select("id, name, lat, lng, duration_minutes, tags")
    .eq("city_id", city.id)
    .order("name");

  const stops = (rawStops ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    lat: s.lat ?? 0,
    lng: s.lng ?? 0,
    duration_minutes: s.duration_minutes ?? 45,
    tags: (s.tags as string[]) ?? [],
  }));

  if (stops.length < 5) {
    return NextResponse.json({ error: `Only ${stops.length} stops found — run seed first` }, { status: 400 });
  }

  // Generate tour plans via Claude
  const plans = await generateToursForCity({ name: city.name, country: city.country }, stops);

  // Delete all existing prebuilt system tours for this city (replace, don't accumulate)
  await db
    .from("tours")
    .delete()
    .eq("city_id", city.id)
    .eq("type", "prebuilt")
    .eq("is_official", true);

  const created: { title: string; theme: string; stops: number; unmatched: string[] }[] = [];

  for (const plan of plans) {
    const { data: tour } = await db
      .from("tours")
      .insert({
        city_id: city.id,
        title: plan.title,
        tagline: plan.tagline,
        type: "prebuilt",
        tier_required: "free",
        cover_color: city.cover_color ?? "#1a3a5c",
        is_official: true,
      })
      .select("id")
      .single();

    if (!tour) continue;

    const unmatched: string[] = [];
    let orderIndex = 0;

    for (const stopName of plan.stop_names) {
      const matched = matchStopName(stopName, stops);
      if (!matched) {
        unmatched.push(stopName);
        continue;
      }
      await db
        .from("tour_stops")
        .insert({ tour_id: tour.id, stop_id: matched.id, order_index: orderIndex });
      orderIndex++;
    }

    created.push({ title: plan.title, theme: plan.theme, stops: orderIndex, unmatched });
  }

  return NextResponse.json({ city: city.name, tours: created });
}
