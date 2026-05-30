import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/db/supabase";
import { fetchWikipediaPhoto } from "@/lib/photos/wikipedia";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  const { data: cities, error } = await db
    .from("cities")
    .select("id, name, slug")
    .is("photo_url", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!cities?.length) return NextResponse.json({ message: "All cities already have photos", updated: 0 });

  const results: { name: string; status: string }[] = [];

  for (const city of cities) {
    // Use "City, Country" disambiguation to avoid e.g. "Darwin" returning the scientist
    const { data: cityRow } = await db.from("cities").select("country").eq("id", city.id).single();
    const country = cityRow?.country ?? "";
    const photoUrl = await fetchWikipediaPhoto(
      `${city.name}, ${country}`,
      `${city.name} city`
    ).catch(() => null);
    if (photoUrl) {
      await db.from("cities").update({ photo_url: photoUrl }).eq("id", city.id);
      results.push({ name: city.name, status: "updated" });
    } else {
      results.push({ name: city.name, status: "no photo found" });
    }
    await new Promise((r) => setTimeout(r, 1100));
  }

  return NextResponse.json({
    updated: results.filter((r) => r.status === "updated").length,
    results,
  });
}
