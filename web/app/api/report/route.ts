import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/db/supabase";

export async function POST(req: NextRequest) {
  const { stop_id, reason } = await req.json();
  if (!stop_id || !reason) return NextResponse.json({ error: "missing fields" }, { status: 400 });

  const db = createAdminClient();
  await db.from("stop_reports").insert({ stop_id, reason });

  return NextResponse.json({ ok: true });
}
