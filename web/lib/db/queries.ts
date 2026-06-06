import { createAdminClient } from "./supabase";

export async function getCityBySlug(slug: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("cities")
    .select("id, slug, name, country, emoji, cover_color, lat, lng")
    .eq("slug", slug)
    .single();
  return data;
}

export async function getToursByCity(cityId: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("tours")
    .select(`
      id, title, tagline, tier, cover_color,
      tour_stops(count)
    `)
    .eq("city_id", cityId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function getTourById(tourId: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("tours")
    .select(`
      id, title, tagline, tier, cover_color,
      cities(slug, name, country, cover_color),
      tour_stops(
        order_index,
        stops(
          id, name, lat, lng, duration_minutes, tags, accessibility_note, photo_url,
          stop_content(category, language, text),
          stop_practical(opening_hours, admission_fee, nearest_transport, last_verified_at)
        )
      )
    `)
    .eq("id", tourId)
    .single();
  return data;
}

export async function getStopsByCity(cityId: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("stops")
    .select(`
      id, name, lat, lng, duration_minutes, tags, photo_url,
      stop_practical(admission_fee, opening_hours)
    `)
    .eq("city_id", cityId)
    .order("name", { ascending: true })
    .limit(200);
  return data ?? [];
}

export async function getStopContent(stopId: string, language = "en") {
  const db = createAdminClient();
  const { data } = await db
    .from("stop_content")
    .select("category, text, audio_url")
    .eq("stop_id", stopId)
    .eq("language", language);
  return data ?? [];
}
