export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { getCityBySlug, getToursByCity, getStopsByCity } from "@/lib/db/queries";
import { NavBar } from "@/components/NavBar";
import { createServerSupabaseClient, createAdminClient } from "@/lib/db/supabase";
import { CityPageClient, type ClientTour, type ClientStop } from "./CityPageClient";
import { generateToursForCity, matchStopName } from "@/lib/generation/generate-tours";

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
    cover_color: t.cover_color ?? null,
    tier: (t as unknown as { tier?: string }).tier ?? null,
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

  // Auto-generate tours in the background when stops exist but tours don't yet
  if (dbTours.length === 0 && dbStops.length >= 5) {
    after(async () => {
      try {
        const db = createAdminClient();
        // Re-check so concurrent page loads don't double-generate
        const { count } = await db.from("tours").select("*", { count: "exact", head: true })
          .eq("city_id", dbCity.id).eq("type", "prebuilt");
        if ((count ?? 0) > 0) return;

        const stopsForTour = (dbStops as unknown as {
          id: string; name: string; lat: number | null; lng: number | null;
          duration_minutes: number; tags: string[];
        }[]).map((s) => ({
          id: s.id, name: s.name,
          lat: s.lat ?? 0, lng: s.lng ?? 0,
          duration_minutes: s.duration_minutes ?? 45,
          tags: (s.tags as string[]) ?? [],
        }));

        const plans = await generateToursForCity(
          { name: dbCity.name, country: dbCity.country },
          stopsForTour
        );

        for (const plan of plans) {
          const { data: tour } = await db.from("tours").insert({
            city_id: dbCity.id,
            title: plan.title,
            tagline: plan.tagline,
            type: "prebuilt",
            tier: "free",
            cover_color: dbCity.cover_color ?? "#1a3a5c",
            is_official: true,
          }).select("id").single();
          if (!tour) continue;

          let orderIdx = 0;
          for (const stopName of plan.stop_names) {
            const matched = matchStopName(stopName, stopsForTour);
            if (matched) {
              await db.from("tour_stops").insert({ tour_id: tour.id, stop_id: matched.id, order_index: orderIdx });
              orderIdx++;
            }
          }
        }
        console.log(`[city-page] auto-generated ${plans.length} tours for ${dbCity.name}`);
      } catch (err) {
        console.error("[city-page] auto tour generation failed:", err);
      }
    });
  }

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
            loading="eager"
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
