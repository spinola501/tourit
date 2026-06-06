import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/db/supabase";

export async function GET(req: NextRequest) {
  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  const db = createAdminClient();

  const { data: city } = await db.from("cities").select("id, slug, name").ilike("slug", slug).maybeSingle();
  if (!city) return NextResponse.json({ status: "pending", stopCount: 0 });

  const [{ count: stopCount }, { count: tourCount }] = await Promise.all([
    db.from("stops").select("*", { count: "exact", head: true }).eq("city_id", city.id),
    db.from("tours").select("*", { count: "exact", head: true }).eq("city_id", city.id),
  ]);

  // Only "done" when both stops AND tours exist — matches the completion logic in the POST route
  const done = (stopCount ?? 0) > 0 && (tourCount ?? 0) > 0;

  return NextResponse.json({
    status: done ? "done" : "pending",
    stopCount: stopCount ?? 0,
    citySlug: city.slug,
    cityName: city.name,
  });
}
