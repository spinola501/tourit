import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/db/supabase";

export async function GET(req: NextRequest) {
  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  const db = createAdminClient();

  const { data: city } = await db.from("cities").select("id, slug, name").ilike("slug", slug).maybeSingle();
  if (!city) return NextResponse.json({ status: "pending", stopCount: 0 });

  const { count } = await db.from("stops").select("*", { count: "exact", head: true }).eq("city_id", city.id);
  const stopCount = count ?? 0;

  return NextResponse.json({
    status: stopCount > 0 ? "done" : "pending",
    stopCount,
    citySlug: city.slug,
    cityName: city.name,
  });
}
