export const dynamic = "force-dynamic";

import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { createAdminClient, createServerSupabaseClient } from "@/lib/db/supabase";
import { NavBar } from "@/components/NavBar";

async function getFeaturedCities() {
  const db = createAdminClient();
  const { data } = await db
    .from("cities")
    .select("id, slug, name, country, cover_color, photo_url, tours(count)")
    .order("created_at", { ascending: true })
    .limit(9);
  return data ?? [];
}

async function getUserInterests(): Promise<string[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const db = createAdminClient();
    const { data } = await db.from("users").select("interests").eq("id", user.id).single();
    return (data?.interests as string[]) ?? [];
  } catch {
    return [];
  }
}

export default async function Home() {
  const [cities, t, interests, locale] = await Promise.all([
    getFeaturedCities(),
    getTranslations(),
    getUserInterests(),
    getLocale(),
  ]);

  // Simple personalised recommendation: highlight cities with tours matching user interests
  const hasInterests = interests.length > 0;

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      <NavBar />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative px-6 pt-24 pb-20 text-center max-w-3xl mx-auto overflow-hidden">
        {/* Subtle glow */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-[600px] h-[300px] rounded-full bg-indigo-600/10 blur-[120px]" />
        </div>

        <p className="relative text-xs text-white/40 uppercase tracking-[0.2em] mb-6 font-medium">
          {t("home.badge")}
        </p>
        <h1 className="relative text-6xl sm:text-7xl font-bold leading-[1.05] tracking-tight mb-6">
          {t("home.headline1")}<br />
          <span className="text-white/30">{t("home.headline2")}</span>
        </h1>
        <p className="relative text-white/50 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
          {t("home.tagline")}
        </p>

        <form action={`/${locale}/discover`} className="relative flex gap-2 max-w-md mx-auto">
          <input
            name="q"
            type="text"
            placeholder={t("home.searchPlaceholder")}
            className="flex-1 bg-white/8 border border-white/15 rounded-2xl px-5 py-3.5 text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 transition-colors text-sm"
          />
          <button
            type="submit"
            className="bg-white text-black px-6 py-3.5 rounded-2xl font-semibold hover:bg-white/90 transition-colors text-sm whitespace-nowrap"
          >
            {t("home.searchButton")}
          </button>
        </form>
      </section>

      {/* ── Featured cities ───────────────────────────────────────────── */}
      <section className="px-6 pb-24 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-white/40">
            {hasInterests ? "Recommended for you" : t("home.featuredCities")}
          </h2>
          <Link href={`/${locale}/discover`} className="text-xs text-white/30 hover:text-white/70 transition-colors">
            {t("home.seeAll")} →
          </Link>
        </div>

        {cities.length === 0 ? (
          <p className="text-white/20 text-sm">{t("home.noCities")}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {cities.map((city) => {
              const tourCount = (city.tours as unknown as { count: number }[])?.[0]?.count ?? 0;
              const coverColor = city.cover_color ?? "#1a3a5c";
              const photoUrl = (city as typeof city & { photo_url?: string | null }).photo_url;
              return (
                <Link
                  key={city.slug}
                  href={`/${locale}/city/${city.slug}`}
                  className="group relative rounded-2xl overflow-hidden aspect-[4/3] block"
                >
                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoUrl}
                      alt={city.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${coverColor}cc 0%, ${coverColor}33 100%)` }}
                    >
                      <span className="text-7xl font-black text-white/10 select-none tracking-tighter">
                        {city.name[0]}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <p className="font-semibold text-white text-sm leading-tight">{city.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-white/50 text-xs">{city.country}</span>
                      <span className="text-white/25 text-xs">·</span>
                      <span className="text-white/40 text-xs">{t("common.tours", { count: tourCount })}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ── How it works — 3 steps ────────────────────────────────────── */}
      <section className="px-6 pb-24 max-w-5xl mx-auto">
        <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-white/40 mb-10">
          {t("home.howItWorks")}
        </h2>
        <div className="grid sm:grid-cols-3 gap-px bg-white/5 rounded-2xl overflow-hidden">
          {[
            { num: t("home.step1Number"), title: t("home.step1Title"), sub: t("home.step1Sub") },
            { num: t("home.step2Number"), title: t("home.step2Title"), sub: t("home.step2Sub") },
            { num: t("home.step3Number"), title: t("home.step3Title"), sub: t("home.step3Sub") },
          ].map((step) => (
            <div key={step.num} className="bg-[#0d0d0d] p-7">
              <p className="text-3xl font-black text-white/8 mb-4 tracking-tighter">{step.num}</p>
              <p className="font-semibold text-white mb-2">{step.title}</p>
              <p className="text-sm text-white/40 leading-relaxed">{step.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Free vs Pro ───────────────────────────────────────────────── */}
      <section className="px-6 pb-24 max-w-5xl mx-auto">
        <div className="grid sm:grid-cols-2 gap-px bg-white/5 rounded-2xl overflow-hidden">
          {/* Free */}
          <div className="bg-[#0d0d0d] p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/30 mb-1">{t("home.freeBadge")}</p>
            <p className="text-xl font-bold mb-6">{t("home.freeTitle")}</p>
            <ul className="space-y-3 text-sm">
              {[t("home.freeFeat1"), t("home.freeFeat2"), t("home.freeFeat3"), t("home.freeFeat4")].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-white/60">
                  <span className="text-white/30 mt-0.5 flex-shrink-0">—</span>{f}
                </li>
              ))}
              {[t("home.freeNo1"), t("home.freeNo2")].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-white/20 line-through decoration-white/15">
                  <span className="no-underline mt-0.5 flex-shrink-0">—</span>{f}
                </li>
              ))}
            </ul>
            <div className="mt-8 pt-6 border-t border-white/8">
              <Link href={`/${locale}/auth/login`} className="text-sm text-white/40 hover:text-white transition-colors">
                Start free →
              </Link>
            </div>
          </div>

          {/* Pro */}
          <div className="bg-[#0f0f12] p-8 relative">
            <div className="absolute top-5 right-5 text-xs font-semibold bg-white text-black px-2.5 py-1 rounded-full">
              PRO
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/30 mb-1">{t("home.proBadge")}</p>
            <p className="text-xl font-bold mb-6">{t("home.proTitle")}</p>
            <ul className="space-y-3 text-sm">
              {[t("home.proFeat1"), t("home.proFeat2"), t("home.proFeat3"), t("home.proFeat4"), t("home.proFeat5"), t("home.proFeat6")].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-white/60">
                  <span className="text-white/30 mt-0.5 flex-shrink-0">—</span>{f}
                </li>
              ))}
            </ul>
            <div className="mt-8 pt-6 border-t border-white/8">
              <p className="text-sm text-white/30">{t("home.proPrice")}</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/8 px-6 py-10 text-center text-white/20 text-xs tracking-wide">
        {t("home.footer")}
      </footer>
    </div>
  );
}
