export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { getTourById } from "@/lib/db/queries";

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
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <Link href="/" className="font-bold text-lg tracking-tight">TourIt</Link>
        <div className="flex items-center gap-4 text-sm text-white/60">
          {city && (
            <Link href={`/city/${city.slug}`} className="hover:text-white transition-colors">
              ← {city.name}
            </Link>
          )}
        </div>
      </nav>

      {/* Tour hero */}
      <div
        className="px-6 pt-12 pb-10"
        style={{ background: `linear-gradient(180deg, ${coverColor}77 0%, transparent 100%)` }}
      >
        <div className="max-w-3xl mx-auto">
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

      {/* Stops list */}
      {sortedTourStops.length > 0 && (
        <div className="px-6 pb-20 max-w-3xl mx-auto">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40 mb-6 mt-8">
            Stops on this tour
          </h2>
          <div className="space-y-3">
            {sortedTourStops.map((ts, i) => {
              const stop = ts.stops;
              if (!stop) return null;
              const historyContent = stop.stop_content?.find((c) => c.category === "history");
              const summary = historyContent?.text?.slice(0, 120) ?? "";

              return (
                <div
                  key={stop.id}
                  className="flex gap-4 rounded-2xl border border-white/10 p-5 bg-white/[0.02]"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/60">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold">{stop.name}</h3>
                      <span className="text-xs text-white/40 flex-shrink-0">⏱ {stop.duration_minutes} min</span>
                    </div>
                    {summary && (
                      <p className="text-sm text-white/50 mb-2">{summary}…</p>
                    )}
                    {stop.tags && stop.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {stop.tags.map((tag: string) => (
                          <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {stop.accessibility_note && (
                      <p className="text-xs text-white/30 mt-2 italic">
                        ♿ {stop.accessibility_note.slice(0, 100)}…
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
