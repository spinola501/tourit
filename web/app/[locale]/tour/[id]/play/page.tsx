export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getTourById } from "@/lib/db/queries";
import TourPlayer from "./TourPlayer";

export type PlayerStop = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  duration_minutes: number;
  tags: string[];
  accessibility_note: string | null;
  photo_url: string | null;
  content: Record<string, string>;   // category → text
  practical: {
    opening_hours: string | null;
    admission_fee: string | null;
    nearest_transport: string | null;
    last_verified_at: string | null;
  } | null;
};

export type PlayerTour = {
  id: string;
  title: string;
  cityName: string;
  citySlug: string;
  coverColor: string;
  stops: PlayerStop[];
};

export default async function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const raw = await getTourById(id);
  if (!raw) notFound();

  const city = raw.cities as unknown as { slug: string; name: string; cover_color: string } | null;

  const sortedStops = ((raw.tour_stops ?? []) as unknown as {
    order_index: number;
    stops: {
      id: string;
      name: string;
      lat: number;
      lng: number;
      duration_minutes: number;
      tags: string[];
      accessibility_note: string | null;
      photo_url: string | null;
      stop_content: { category: string; text: string }[];
      stop_practical: { opening_hours: string | null; admission_fee: string | null; nearest_transport: string | null; last_verified_at: string | null } | null;
    };
  }[])
    .sort((a, b) => a.order_index - b.order_index)
    .map((ts) => {
      const s = ts.stops;
      return {
        id: s.id,
        name: s.name,
        lat: s.lat,
        lng: s.lng,
        duration_minutes: s.duration_minutes,
        tags: s.tags ?? [],
        accessibility_note: s.accessibility_note,
        photo_url: s.photo_url ?? null,
        content: Object.fromEntries(
          (s.stop_content ?? []).map((c) => [c.category, c.text])
        ),
        practical: s.stop_practical
          ? {
              opening_hours: s.stop_practical.opening_hours,
              admission_fee: s.stop_practical.admission_fee,
              nearest_transport: s.stop_practical.nearest_transport,
              last_verified_at: s.stop_practical.last_verified_at ?? null,
            }
          : null,
      } satisfies PlayerStop;
    });

  if (sortedStops.length === 0) notFound();

  const tour: PlayerTour = {
    id: raw.id,
    title: raw.title,
    cityName: city?.name ?? "Unknown",
    citySlug: city?.slug ?? "",
    coverColor: raw.cover_color ?? "#1a3a5c",
    stops: sortedStops,
  };

  return <TourPlayer tour={tour} />;
}
