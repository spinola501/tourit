export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { getCityBySlug, getToursByCity, getStopsByCity } from "@/lib/db/queries";
import { NavBar } from "@/components/NavBar";
import { createServerSupabaseClient, createAdminClient } from "@/lib/db/supabase";
import { CityPageClient, type ClientTour, type ClientStop } from "./CityPageClient";

function isFreeAdmission(fee: string | null | undefined): boolean {
  if (!fee) return false;
  const t = fee.toLowerCase().trim();
  return t === "free" || t.startsWith("free") || t === "€0" || t === "$0" || t === "0";
}

export default async function CityPage({ params }: { params: Promise<{ slug: string; locale: string }> }) {
  const { slug, locale } = await params;

  const dbCity = await getCityBySlug(slug);
  if (!dbCity) notFound();

  const coverColor = dbCity.cover_color ?? "#1a3a5c";
  const photoUrl = (dbCity as unknown as { photo_url?: string }).photo_url ?? null;

  const [dbTours, dbStops] = await Promise.all([
    getToursByCity(dbCity.id).catch(() => []),
    getStopsByCity(dbCity.id).catch(() => []),
  ]);

  // Tier check
  let userTier: "free" | "pro" = "free";
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const db = createAdminClient();
      const { data } = await db.from("users").select("tier").eq("id", user.id).single();
      if (data?.tier === "pro") userTier = "pro";
    }
  } catch { /* ignore */ }

  // Shape data for client component
  const tours: ClientTour[] = dbTours.map((t) => ({
    id: t.id,
    title: t.title,
    tagline: t.tagline ?? null,
    theme: (t as unknown as { theme?: string }).theme ?? null,
    duration_hours: (t as unknown as { duration_hours?: number }).duration_hours ?? null,
    cover_color: t.cover_color ?? null,
    tier_required: t.tier_required ?? null,
    stop_count: (t.tour_stops as unknown as { count: number }[])?.[0]?.count ?? 0,
  }));

  const stops: ClientStop[] = (dbStops as unknown as {
    id: string; name: string; duration_minutes: number; tags: string[];
    photo_url: string | null; stop_practical: { admission_fee: string | null } | null;
  }[]).map((s) => ({
    id: s.id,
    name: s.name,
    duration_minutes: s.duration_minutes,
    tags: s.tags ?? [],
    photo_url: s.photo_url,
    free_admission: isFreeAdmission(s.stop_practical?.admission_fee),
  }));

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      <NavBar />

      {/* Hero */}
      <div className="relative overflow-hidden">
        {photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={dbCity.name}
            className="absolute inset-0 w-full h-full object-cover opacity-20"
          />
        )}
        <div
          className="relative px-6 pt-16 pb-14"
          style={{ background: `linear-gradient(180deg, ${coverColor}88 0%, ${coverColor}11 60%, transparent 100%)` }}
        >
          <div className="max-w-4xl mx-auto">
            <Link href={`/${locale}/discover`} className="text-sm text-white/40 hover:text-white transition-colors mb-8 inline-flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
              All cities
            </Link>

            <div className="flex items-end gap-6 mt-2">
              {/* Color swatch */}
              <div
                className="hidden sm:block w-16 h-16 rounded-2xl flex-shrink-0 border border-white/10"
                style={{ background: `linear-gradient(135deg, ${coverColor} 0%, ${coverColor}88 100%)` }}
              />
              <div>
                <h1 className="text-5xl font-black tracking-tight mb-1">{dbCity.name}</h1>
                <p className="text-white/50 text-lg">{dbCity.country}</p>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex gap-6 mt-6 text-sm text-white/40">
              <span>{tours.length} curated tour{tours.length !== 1 ? "s" : ""}</span>
              <span>{stops.length} stops</span>
              {userTier === "pro" && (
                <span className="text-yellow-400/70">★ Pro — full access</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-24 max-w-4xl mx-auto mt-8">
        <CityPageClient
          tours={tours}
          stops={stops}
          cityName={dbCity.name}
          citySlug={slug}
          coverColor={coverColor}
          userTier={userTier}
        />
      </div>
    </div>
  );
}
