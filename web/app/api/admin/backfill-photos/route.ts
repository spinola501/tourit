import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/db/supabase";
import { fetchWikipediaPhoto } from "@/lib/photos/wikipedia";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();

  const { data: stops, error } = await db
    .from("stops")
    .select("id, name, cities(name, country)")
    .is("photo_url", null)
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!stops?.length) return NextResponse.json({ message: "No stops missing photos", updated: 0 });

  const results: { name: string; status: string }[] = [];

  for (const stop of stops) {
    const city = stop.cities as unknown as { name: string; country: string } | null;
    const cityName = city?.name ?? "";

    // Try multiple search terms to maximise hit rate
    const photoUrl = await fetchWikipediaPhoto(
      `${stop.name} ${cityName}`,   // most specific
      stop.name                      // bare name fallback
    ).catch(() => null);

    if (photoUrl) {
      await db.from("stops").update({ photo_url: photoUrl }).eq("id", stop.id);
      results.push({ name: stop.name, status: "updated" });
    } else {
      results.push({ name: stop.name, status: "no photo found" });
    }

    await new Promise((r) => setTimeout(r, 1100));
  }

  return NextResponse.json({ updated: results.filter((r) => r.status === "updated").length, results });
}
