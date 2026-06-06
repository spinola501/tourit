export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { getTourById } from "@/lib/db/queries";
import { StopPreviewCard } from "./StopPreviewCard";
import { NavBar } from "@/components/NavBar";
import { createServerSupabaseClient, createAdminClient } from "@/lib/db/supabase";

const CATEGORY_LABELS: Record<string, string> = {
  history: "History",
  architecture: "Architecture",
  culture: "Art & Culture",
  fauna: "Fauna",
  flora: "Flora",
  geo: "Geography & Geology",
  lore: "Legends & Lore",
  funfacts: "Fun Facts",
  food: "Food & Gastronomy",
  photography: "Photography Tips",
  practical: "Practical Info",
};

// Builds a Google Maps directions URL with the tour stops as waypoints.
// Google Maps supports up to 10 waypoints (origin + destination + up to 8 mid).
function buildGoogleMapsUrl(points: { lat: number; lng: number }[]): string | null {
  const valid = points.filter((p) => p.lat && p.lng);
  if (valid.length < 2) return null;
  const origin = valid[0];
  const destination = valid[valid.length - 1];
  const mid = valid.slice(1, -1).slice(0, 8); // cap intermediate waypoints at 8
  const params = new URLSearchParams({
    api: "1",
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    travelmode: "walking",
  });
  if (mid.length > 0) {
    params.set("waypoints", mid.map((p) => `${p.lat},${p.lng}`).join("|"));
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m} min`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default async function TourPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ length?: string }>;
}) {
  const [{ id }, { length }, locale] = await Promise.all([params, searchParams, getLocale()]);
  const tour = await getTourById(id);
  if (!tour) notFound();

  // Fetch user favorites to pre-populate heart buttons
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  let favoriteIds = new Set<string>();
  if (user) {
    try {
      const db = createAdminClient();
      const { data: favs } = await db
        .from("user_favorites")
        .select("stop_id")
        .eq("user_id", user.id);
      favoriteIds = new Set(favs?.map((r) => r.stop_id) ?? []);
    } catch { /* table may not exist yet */ }
  }

  const city = tour.cities as unknown as { slug: string; name: string; country: string; emoji: string; cover_color: string } | null;
  const coverColor = tour.cover_color ?? "#1a3a5c";
  const tier = (tour as unknown as { tier?: string }).tier as "free" | "pro" ?? "free";

  // Sort stops by order_index
  const sortedTourStops = ((tour.tour_stops ?? []) as unknown as {
    order_index: number;
    stops: {
      id: string;
      name: string;
      lat: number;
      lng: number;
      duration_minutes: number;
      tags: string[];
      accessibility_note: string | null;
      stop_content: { category: string; language: string; text: string }[];
      stop_practical: { opening_hours: string | null; admission_fee: string | null; nearest_transport: string | null } | null;
    };
  }[]).sort((a, b) => a.order_index - b.order_index);

  // Collect all unique categories across stops
  const allCategories = Array.from(
    new Set(sortedTourStops.flatMap((ts) => ts.stops?.stop_content?.map((c) => c.category) ?? []))
  );

  const validStops = sortedTourStops.map((ts) => ts.stops).filter(Boolean);
  const stopCount = validStops.length;

  // Estimated time: sum of stop durations + ~15 min travel per gap between stops.
  const stopMinutes = validStops.reduce((sum, s) => sum + (s.duration_minutes ?? 45), 0);
  const travelMinutes = Math.max(0, stopCount - 1) * 15;
  const estimatedMinutes = stopMinutes + travelMinutes;

  const mapsUrl = buildGoogleMapsUrl(validStops.map((s) => ({ lat: s.lat, lng: s.lng })));

  // Preserve narration length preference when continuing to the player.
  const lengthQuery = length ? `?length=${encodeURIComponent(length)}` : "";

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      <NavBar />

      {/* Tour hero */}
      <div
        className="px-6 pt-12 pb-10"
        style={{ background: `linear-gradient(180deg, ${coverColor}77 0%, transparent 100%)` }}
      >
        <div className="max-w-3xl mx-auto">
          {city && (
            <Link href={`/${locale}/city/${city.slug}`} className="text-sm text-white/40 hover:text-white transition-colors mb-6 inline-block">
              ← {city.name}
            </Link>
          )}
          <div className="flex items-center gap-2 mb-4">
            <Badge
              variant={tier === "pro" ? "default" : "secondary"}
              className={tier === "pro"
                ? "bg-white text-black text-xs"
                : "bg-white/10 text-white/60 text-xs border-0"}
            >
              {tier === "pro" ? "Pro" : "Free"}
            </Badge>
            {city && <span className="text-white/40 text-sm">{city.name}</span>}
          </div>

          <h1 className="text-3xl font-bold mb-2">{tour.title}</h1>
          {tour.tagline && <p className="text-white/60 mb-6">{tour.tagline}</p>}

          {/* Tour summary */}
          <div
            className="rounded-2xl border border-white/10 p-5 mb-8"
            style={{ background: `linear-gradient(135deg, ${coverColor}44 0%, ${coverColor}11 100%)` }}
          >
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2.5">
                <span
                  className="w-1 h-9 rounded-full flex-shrink-0"
                  style={{ background: coverColor }}
                  aria-hidden
                />
                <div>
                  <p className="text-2xl font-bold leading-none">{stopCount}</p>
                  <p className="text-xs text-white/50 mt-1">stop{stopCount !== 1 ? "s" : ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span
                  className="w-1 h-9 rounded-full flex-shrink-0"
                  style={{ background: coverColor }}
                  aria-hidden
                />
                <div>
                  <p className="text-2xl font-bold leading-none">{formatDuration(estimatedMinutes)}</p>
                  <p className="text-xs text-white/50 mt-1">estimated time</p>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-white/30 mt-3">
              Includes ~15 min walking between stops. Plan around opening hours.
            </p>
          </div>

          {allCategories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {allCategories.map((cat) => (
                <span key={cat} className="text-xs px-3 py-1 rounded-full bg-white/10 text-white/60">
                  {CATEGORY_LABELS[cat] ?? cat}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/${locale}/tour/${tour.id}/play${lengthQuery}`}
              className="inline-flex items-center gap-2 bg-white text-black px-8 py-3 rounded-full font-semibold hover:bg-white/90 transition-colors"
            >
              ▶ Start Audio Tour →
            </Link>
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-white/20 text-white/70 hover:text-white hover:border-white/40 px-6 py-3 rounded-full font-medium transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
                Navigate in Google Maps
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Stops list — expandable preview cards */}
      {sortedTourStops.length > 0 && (
        <div className="px-6 pb-20 max-w-3xl mx-auto">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40 mb-6 mt-8">
            Stops on this tour
          </h2>
          <p className="text-xs text-white/30 mb-4 -mt-3">Tap any stop to preview its narration before starting.</p>
          <div className="space-y-3">
            {sortedTourStops.map((ts, i) => {
              const stop = ts.stops;
              if (!stop) return null;
              return (
                <StopPreviewCard
                  key={stop.id}
                  index={i}
                  initialFavorited={favoriteIds.has(stop.id)}
                  stop={{
                    id: stop.id,
                    name: stop.name,
                    duration_minutes: stop.duration_minutes,
                    tags: stop.tags ?? [],
                    accessibility_note: stop.accessibility_note,
                    photo_url: (stop as unknown as { photo_url?: string | null }).photo_url ?? null,
                    content: stop.stop_content ?? [],
                    practical: stop.stop_practical ?? null,
                  }}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
