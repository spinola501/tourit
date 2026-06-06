import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/db/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stopId = searchParams.get("id");
  const language = searchParams.get("lang") ?? "en";

  if (!stopId) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = createAdminClient();

  const [{ data: stop }, { data: content }] = await Promise.all([
    db.from("stops").select("id, name, duration_minutes, tags, photo_url, accessibility_note, lat, lng")
      .eq("id", stopId).single(),
    db.from("stop_content").select("category, text")
      .eq("stop_id", stopId).eq("language", language),
  ]);

  if (!stop) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({ stop, content: content ?? [] });
}
