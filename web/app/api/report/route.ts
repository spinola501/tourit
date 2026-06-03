import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/db/supabase";

export async function POST(req: NextRequest) {
  // Require authentication — prevents spam/DoS
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { stop_id, reason } = body;

  if (!stop_id || typeof stop_id !== "string" || !reason || typeof reason !== "string") {
    return NextResponse.json({ error: "stop_id and reason required" }, { status: 400 });
  }
  if (reason.length > 2000) {
    return NextResponse.json({ error: "reason too long" }, { status: 400 });
  }

  const db = createAdminClient();

  // Rate limit: max 5 reports per user per hour
  const { count } = await db
    .from("stop_reports")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", new Date(Date.now() - 3_600_000).toISOString());

  if ((count ?? 0) >= 5) {
    return NextResponse.json({ error: "Rate limited. Try again later." }, { status: 429 });
  }

  await db.from("stop_reports").insert({
    stop_id,
    user_id: user.id,
    field: "other",
    note: reason.slice(0, 2000),
  });

  return NextResponse.json({ ok: true });
}
