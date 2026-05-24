import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/db/supabase";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([]);

  const db = createAdminClient();
  const { data } = await db
    .from("user_favorites")
    .select("stop_id")
    .eq("user_id", user.id);

  return NextResponse.json(data?.map((r) => r.stop_id) ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { stop_id } = await req.json();
  if (!stop_id) return NextResponse.json({ error: "Missing stop_id" }, { status: 400 });

  const db = createAdminClient();

  const { data: existing } = await db
    .from("user_favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("stop_id", stop_id)
    .single();

  if (existing) {
    await db.from("user_favorites").delete().eq("id", existing.id);
    return NextResponse.json({ favorited: false });
  } else {
    await db.from("user_favorites").insert({ user_id: user.id, stop_id });
    return NextResponse.json({ favorited: true });
  }
}
