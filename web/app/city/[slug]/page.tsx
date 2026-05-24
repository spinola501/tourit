export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { getCityBySlug, getToursByCity } from "@/lib/db/queries";
import { FEATURED_CITIES } from "@/lib/mock-data";
import { NavBar } from "@/components/NavBar";

const COVER_COLORS: Record<string, string> = {
  london: "#1a3a5c",
  paris: "#4a1a2c",
  rome: "#5c2a1a",
};

export default async function CityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Try real DB first, fall back to mock for display metadata
  const dbCity = await getCityBySlug(slug);
  const mockCity = FEATURED_CITIES.find((c) => c.slug === slug);

  if (!dbCity && !mockCity) notFound();

  const city = {
    slug,
    name: dbCity?.name ?? mockCity!.name,
    country: dbCity?.country ?? mockCity!.country,
    emoji: dbCity?.emoji ?? mockCity!.emoji ?? "🏙️",
    coverColor: dbCity?.cover_color ?? mockCity!.coverColor ?? COVER_COLORS[slug] ?? "#1a3a5c",
  };

  const dbTours = dbCity ? await getToursByCity(dbCity.id) : [];

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      <NavBar />

      {/* City hero */}
      <div
        className="px-6 pt-16 pb-12"
        style={{ background: `linear-gradient(180deg, ${city.coverColor}66 0%, transparent 100%)` }}
      >
        <div className="max-w-4xl mx-auto">
          <Link href="/discover" className="text-sm text-white/40 hover:text-white transition-colors mb-6 inline-block">
            ← All cities
          </Link>
          <div className="text-5xl mb-3">{city.emoji}</div>
          <h1 className="text-4xl font-bold mb-1">{city.name}</h1>
          <p className="text-white/50">{city.country}</p>
        </div>
      </div>

      {/* Tours grid */}
      <div className="px-6 pb-20 max-w-4xl mx-auto">
        <p className="text-sm text-white/40 uppercase tracking-widest mb-6">
          {dbTours.length} {dbTours.length === 1 ? "tour" : "tours"} available
        </p>

        {dbTours.length === 0 ? (
          <div className="rounded-2xl border border-white/10 p-10 text-center text-white/40">
            <p className="text-lg mb-2">Tours coming soon</p>
            <p className="text-sm">We&apos;re generating content for {city.name} right now.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {dbTours.map((tour) => {
              const stopCount = (tour.tour_stops as unknown as { count: number }[])?.[0]?.count ?? 0;
              const coverColor = tour.cover_color ?? COVER_COLORS[slug] ?? "#1a3a5c";
              const tier = tour.tier_required as "free" | "pro";

              return (
                <Link
                  key={tour.id}
                  href={`/tour/${tour.id}`}
                  className="group rounded-2xl border border-white/10 hover:border-white/30 p-6 transition-all hover:-translate-y-0.5 block"
                  style={{ background: `linear-gradient(135deg, ${coverColor}44 0%, transparent 100%)` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <Badge
                      variant={tier === "pro" ? "default" : "secondary"}
                      className={tier === "pro"
                        ? "bg-white text-black text-xs"
                        : "bg-white/10 text-white/60 text-xs border-0"}
                    >
                      {tier === "pro" ? "Pro" : "Free"}
                    </Badge>
                    {stopCount > 0 && (
                      <span className="text-xs text-white/40">{stopCount} stops</span>
                    )}
                  </div>
                  <h2 className="font-bold text-lg mb-1 group-hover:text-white transition-colors">{tour.title}</h2>
                  {tour.tagline && <p className="text-sm text-white/50">{tour.tagline}</p>}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
