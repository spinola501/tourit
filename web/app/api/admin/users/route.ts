import { isAdminAuthorised } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/db/supabase";

function auth(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  return secret && isAdminAuthorised(req);
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tier = searchParams.get("tier"); // "free" | "pro" | null = all

  const db = createAdminClient();
  let query = db
    .from("users")
    .select("id, name, home_city, tier, interests, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (tier === "pro" || tier === "free") {
    query = query.eq("tier", tier);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch emails from auth.users via admin API — Supabase JS admin client doesn't
  // expose auth.users directly, so we join what we have.
  return NextResponse.json({ users: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { user_id, tier } = await req.json();
  if (!user_id || !["free", "pro"].includes(tier)) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const db = createAdminClient();
  const { error } = await db.from("users").update({ tier }).eq("id", user_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
