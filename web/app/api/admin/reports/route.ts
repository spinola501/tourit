import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/db/supabase";

function auth(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  return secret && secret === process.env.ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createAdminClient();
  const { data, error } = await db
    .from("stop_reports")
    .select(`
      id, field, note, resolved, created_at,
      stops(id, name, cities(name))
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const reports = (data ?? []).map((r) => {
    const stop = Array.isArray(r.stops) ? r.stops[0] : r.stops;
    const city = stop && !Array.isArray(stop.cities) ? stop.cities : null;
    return {
      id: r.id,
      field: r.field,
      note: r.note ?? null,
      resolved: r.resolved ?? false,
      created_at: r.created_at,
      stop_name: stop?.name ?? "Unknown stop",
      stop_id: stop?.id ?? null,
      city_name: (city as { name: string } | null)?.name ?? "Unknown city",
    };
  });

  return NextResponse.json({ reports });
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { report_id, action } = await req.json();
  if (!report_id) return NextResponse.json({ error: "missing report_id" }, { status: 400 });

  const db = createAdminClient();

  if (action === "delete") {
    const { error } = await db.from("stop_reports").delete().eq("id", report_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, action: "deleted" });
  }

  const { error } = await db
    .from("stop_reports")
    .update({ resolved: true })
    .eq("id", report_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, action: "resolved" });
}
