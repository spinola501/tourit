import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/db/supabase";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();

  const [
    { count: cities },
    { count: tours },
    { count: stops },
    { count: content },
    { count: usersTotal },
    { count: usersPro },
    { count: stopsWithPhotos },
    { count: reportsOpen },
    { count: reportsTotal },
    { count: plays },
    { count: favorites },
  ] = await Promise.all([
    db.from("cities").select("*", { count: "exact", head: true }),
    db.from("tours").select("*", { count: "exact", head: true }),
    db.from("stops").select("*", { count: "exact", head: true }),
    db.from("stop_content").select("*", { count: "exact", head: true }),
    db.from("users").select("*", { count: "exact", head: true }),
    db.from("users").select("*", { count: "exact", head: true }).eq("tier", "pro"),
    db.from("stops").select("*", { count: "exact", head: true }).not("photo_url", "is", null),
    db.from("stop_reports").select("*", { count: "exact", head: true }).eq("resolved", false),
    db.from("stop_reports").select("*", { count: "exact", head: true }),
    db.from("stop_plays").select("*", { count: "exact", head: true }),
    db.from("user_favorites").select("*", { count: "exact", head: true }),
  ]);

  // Count stops with all 11 categories (fetch all category rows, group in Node.js)
  const { data: allCategories } = await db
    .from("stop_content")
    .select("stop_id, category");

  const catPerStop = new Map<string, Set<string>>();
  for (const row of allCategories ?? []) {
    if (!catPerStop.has(row.stop_id)) catPerStop.set(row.stop_id, new Set());
    catPerStop.get(row.stop_id)!.add(row.category);
  }
  const fullyCounts = [...catPerStop.values()];
  const fullyGenerated = fullyCounts.filter((s) => s.size >= 11).length;
  const avgCategories = fullyCounts.length
    ? Math.round((fullyCounts.reduce((sum, s) => sum + s.size, 0) / fullyCounts.length) * 10) / 10
    : 0;

  const stopsN = stops ?? 0;
  const photosN = stopsWithPhotos ?? 0;

  return NextResponse.json({
    cities: cities ?? 0,
    tours: tours ?? 0,
    stops: stopsN,
    content: content ?? 0,
    users: {
      total: usersTotal ?? 0,
      pro: usersPro ?? 0,
      free: (usersTotal ?? 0) - (usersPro ?? 0),
    },
    photos: {
      with: photosN,
      without: stopsN - photosN,
      pct: stopsN ? Math.round((photosN / stopsN) * 100) : 0,
    },
    categories: {
      fully_generated: fullyGenerated,
      avg_per_stop: avgCategories,
    },
    reports: {
      open: reportsOpen ?? 0,
      total: reportsTotal ?? 0,
    },
    plays: plays ?? 0,
    favorites: favorites ?? 0,
  });
}
