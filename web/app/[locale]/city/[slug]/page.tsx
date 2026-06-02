export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { getCityBySlug, getToursByCity, getStopsByCity } from "@/lib/db/queries";
import { FEATURED_CITIES } from "@/lib/mock-data";
import { NavBar } from "@/components/NavBar";
import { createServerSupabaseClient } from "@/lib/db/supabase";

const COVER_COLORS: Record<string, string> = {
  london: "#1a3a5c",
  paris: "#4a1a2c",
  rome: "#5c2a1a",
};

function isFreeAdmission(fee: string | null | undefined): boolean {
  if (!fee) return false;
  const t = fee.toLowerCase().trim();
  return t === "free" || t.startsWith("free") || t === "€0" || t === "$0" || t === "0";
}

export default async function CityPage({ params }: { params: Promise<{ slug: string; locale: string }> }) {
  const { slug, locale } = await params;

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
  const dbStops = dbCity ? await getStopsByCity(dbCity.id) : [];

  // Get current user's tier for gating
  let userTier: "free" | "pro" = "free";
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { createAdminClient } = await import("@/lib/db/supabase");
      const db = createAdminClient();
      const { data: profile } = await db.from("users").select("tier").eq("id", user.id).single();
      if (profile?.tier === "pro") userTier = "pro";
    }
  } catch { /* ignore */ }

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      <NavBar />

      {/* City hero */}
      <div
        className="px-6 pt-16 pb-12"
        style={{ background: `linear-gradient(180deg, ${city.coverColor}66 0%, transparent 100%)` }}
      >
        <div className="max-w-4xl mx-auto">
          <Link href={`/${locale}/discover`} className="text-sm text-white/40 hover:text-white transition-colors mb-6 inline-block">
            ← All cities
          </Link>
          <h1 className="text-4xl font-bold mb-1">{city.name}</h1>
          <p className="text-white/50">{city.country}</p>
        </div>
      </div>

      <div className="px-6 pb-20 max-w-4xl mx-auto space-y-16">

        {/* ── Pre-made tours ── */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40 mb-2">
            Pre-made Tours
          </h2>
          <p className="text-xs text-white/30 mb-6">Curated routes you can start immediately.</p>

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
                const locked = tier === "pro" && userTier === "free";

                return (
                  <Link
                    key={tour.id}
                    href={`/${locale}/tour/${tour.id}`}
                    className="group rounded-2xl border border-white/10 hover:border-white/30 p-6 transition-all hover:-translate-y-0.5 block relative overflow-hidden"
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
                    <h3 className="font-bold text-lg mb-1 group-hover:text-white transition-colors">{tour.title}</h3>
                    {tour.tagline && <p className="text-sm text-white/50">{tour.tagline}</p>}
                    {locked && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-2xl">
                        <span className="text-xs bg-white text-black px-3 py-1.5 rounded-full font-semibold">★ Pro only</span>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Individual stops ── */}
        {dbStops.length > 0 && (
          <section>
            <div className="flex items-end justify-between mb-2">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40">
                  All Stops in {city.name}
                </h2>
                <p className="text-xs text-white/30 mt-1">
                  {dbStops.length} stops · {userTier === "pro"
                    ? "Pro users can build custom tours from any stop."
                    : "Free users can follow pre-made tours. Upgrade to Pro to build custom tours."}
                </p>
              </div>
              {userTier === "free" && (
                <Link href={`/${locale}/account`} className="text-xs text-white/50 hover:text-white border border-white/20 hover:border-white/40 px-3 py-1.5 rounded-full transition-colors flex-shrink-0">
                  ★ Go Pro
                </Link>
              )}
            </div>

            <div className="mt-6 grid sm:grid-cols-2 gap-3">
              {dbStops.map((stop) => {
                const s = stop as unknown as {
                  id: string;
                  name: string;
                  duration_minutes: number;
                  tags: string[];
                  photo_url: string | null;
                  stop_practical: { admission_fee: string | null } | null;
                };
                const free = isFreeAdmission(s.stop_practical?.admission_fee);

                return (
                  <div
                    key={s.id}
                    className={`rounded-xl border border-white/10 p-4 flex gap-3 items-start transition-all ${
                      userTier === "pro"
                        ? "hover:border-white/30 hover:-translate-y-0.5 cursor-default"
                        : "opacity-80"
                    }`}
                  >
                    {/* Photo or placeholder */}
                    <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-white/5 flex items-center justify-center text-white/20 text-xs font-bold">
                      {s.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.photo_url} alt={s.name} loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg" style={{ color: city.coverColor }}>{s.name[0]}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="font-semibold text-sm truncate">{s.name}</p>
                        {free && (
                          <span className="text-[9px] text-green-400 bg-green-400/10 border border-green-400/20 px-1.5 py-0.5 rounded-full flex-shrink-0">Free</span>
                        )}
                      </div>
                      <p className="text-xs text-white/40">{s.duration_minutes} min</p>
                      {s.tags?.length > 0 && (
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {s.tags.slice(0, 3).map((tag: string) => (
                            <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-white/30">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    {userTier === "free" && (
                      <div className="flex-shrink-0 text-white/20">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {userTier === "free" && (
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center">
                <p className="font-semibold mb-1">Build your own tour</p>
                <p className="text-sm text-white/50 mb-4">Pro users can select any stops and create a custom tour that others can follow.</p>
                <Link href={`/${locale}/account`} className="inline-flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-white/90 transition-colors">
                  ★ Upgrade to Pro
                </Link>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
