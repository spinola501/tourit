export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
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

export default async function TourPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tour = await getTourById(id);
  if (!tour) notFound();

  // Fetch user favorites to pre-populate heart buttons
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  let favoriteIds = new Set<string>();
  if (user) {
    const db = createAdminClient();
    const { data: favs } = await db
      .from("user_favorites")
      .select("stop_id")
      .eq("user_id", user.id);
    favoriteIds = new Set(favs?.map((r) => r.stop_id) ?? []);
  }

  const city = tour.cities as unknown as { slug: string; name: string; country: string; emoji: string; cover_color: string } | null;
  const coverColor = tour.cover_color ?? "#1a3a5c";
  const tier = tour.tier_required as "free" | "pro";

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
            <Link href={`/city/${city.slug}`} className="text-sm text-white/40 hover:text-white transition-colors mb-6 inline-block">
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

          <div className="flex flex-wrap gap-6 text-sm text-white/50 mb-8">
            <span>🎯 {sortedTourStops.length} stops</span>
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

          <Link
            href={`/tour/${tour.id}/play`}
            className="inline-flex items-center gap-2 bg-white text-black px-8 py-3 rounded-full font-semibold hover:bg-white/90 transition-colors"
          >
            ▶ Start Tour
          </Link>
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
