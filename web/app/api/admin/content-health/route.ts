import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/db/supabase";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();

  const [{ data: cities }, { data: stops }, { data: categories }] = await Promise.all([
    db.from("cities").select("id, name, slug, country, photo_url").order("name"),
    db.from("stops").select("id, name, city_id, photo_url"),
    db.from("stop_content").select("stop_id, category"),
  ]);

  // Index categories per stop
  const catPerStop = new Map<string, Set<string>>();
  for (const row of categories ?? []) {
    if (!catPerStop.has(row.stop_id)) catPerStop.set(row.stop_id, new Set());
    catPerStop.get(row.stop_id)!.add(row.category);
  }

  // Aggregate per city
  const result = (cities ?? []).map((city) => {
    const cityStops = (stops ?? []).filter((s) => s.city_id === city.id);
    const withPhotos = cityStops.filter((s) => s.photo_url).length;
    const catCounts = cityStops.map((s) => catPerStop.get(s.id)?.size ?? 0);
    const avgCats = catCounts.length
      ? Math.round((catCounts.reduce((a, b) => a + b, 0) / catCounts.length) * 10) / 10
      : 0;
    const fullyGenerated = catCounts.filter((n) => n >= 11).length;

    return {
      id: city.id,
      name: city.name,
      slug: city.slug,
      country: city.country,
      has_city_photo: !!city.photo_url,
      stops: cityStops.length,
      stops_with_photos: withPhotos,
      photo_pct: cityStops.length ? Math.round((withPhotos / cityStops.length) * 100) : 0,
      avg_categories: avgCats,
      fully_generated: fullyGenerated,
    };
  });

  return NextResponse.json({ cities: result });
}
