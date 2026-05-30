import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/db/supabase";

export async function POST(req: NextRequest) {
  const { stop_id, reason } = await req.json();
  if (!stop_id || !reason) return NextResponse.json({ error: "missing fields" }, { status: 400 });

  const db = createAdminClient();
  // Schema: field (category), note (free text). Map incoming reason → note; field = "other".
  await db.from("stop_reports").insert({ stop_id, field: "other", note: reason });

  return NextResponse.json({ ok: true });
}
