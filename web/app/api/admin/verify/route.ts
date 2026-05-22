import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/db/supabase";

function isAuthorised(req: NextRequest) {
  return req.headers.get("x-admin-secret") === process.env.ADMIN_SECRET;
}

const EXPECTED_TABLES = [
  "cities",
  "stops",
  "stop_content",
  "stop_practical",
  "stop_transitions",
  "tours",
  "tour_stops",
  "stop_plays",
  "stop_reports",
  "shared_tours",
];

export async function GET(req: NextRequest) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const db = createAdminClient();
  const results: Record<string, { exists: boolean; rowCount?: number; error?: string }> = {};

  for (const table of EXPECTED_TABLES) {
    try {
      const { count, error } = await db
        .from(table)
        .select("*", { count: "exact", head: true });

      if (error) {
        results[table] = { exists: false, error: error.message };
      } else {
        results[table] = { exists: true, rowCount: count ?? 0 };
      }
    } catch (err) {
      results[table] = { exists: false, error: err instanceof Error ? err.message : "Unknown" };
    }
  }

  const allGood = Object.values(results).every((r) => r.exists);

  return NextResponse.json({
    ok: allGood,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    tables: results,
  });
}
