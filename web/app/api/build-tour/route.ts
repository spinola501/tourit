import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/db/supabase";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const db = createAdminClient();
  const { data: profile } = await db.from("users").select("tier").eq("id", user.id).single();
  if (profile?.tier !== "pro") return NextResponse.json({ error: "Pro required" }, { status: 403 });

  const { cityId, stopIds, theme, narration, language, coverColor, title, tagline } = await req.json();
  if (!cityId || !stopIds?.length) return NextResponse.json({ error: "cityId and stopIds required" }, { status: 400 });

  // Insert tour — only columns that actually exist in the schema
  const { data: tour, error } = await db.from("tours").insert({
    city_id: cityId,
    title: title ?? "Custom Tour",
    tagline: tagline ?? null,
    cover_color: coverColor ?? "#1a3a5c",
    tier_required: "pro",
    type: "custom",
  }).select("id").single();

  if (error || !tour) return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });

  await db.from("tour_stops").insert(
    (stopIds as string[]).map((stopId: string, idx: number) => ({
      tour_id: tour.id,
      stop_id: stopId,
      order_index: idx,
    }))
  );

  return NextResponse.json({ tourId: tour.id, narration, language });
}
