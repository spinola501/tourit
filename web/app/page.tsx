export const dynamic = "force-dynamic";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { createAdminClient } from "@/lib/db/supabase";

async function getFeaturedCities() {
  const db = createAdminClient();
  const { data } = await db
    .from("cities")
    .select(`
      id, slug, name, country, emoji, cover_color,
      tours(count)
    `)
    .order("created_at", { ascending: true })
    .limit(9);
  return data ?? [];
}

export default async function Home() {
  const cities = await getFeaturedCities();

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <span className="font-bold text-lg tracking-tight">TourIt</span>
        <div className="flex items-center gap-4 text-sm text-white/60">
          <Link href="/discover" className="hover:text-white transition-colors">Discover</Link>
          <Link href="/profile" className="hover:text-white transition-colors">Profile</Link>
          <Link href="/account" className="bg-white text-black px-4 py-1.5 rounded-full font-medium hover:bg-white/90 transition-colors">
            Sign in
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-20 pb-16 text-center max-w-3xl mx-auto">
        <p className="text-sm text-white/50 uppercase tracking-widest mb-4">AI Audio Tours</p>
        <h1 className="text-5xl font-bold leading-tight mb-4">
          Every place<br />
          <span className="text-white/40">has a story.</span>
        </h1>
        <p className="text-white/60 text-lg mb-10">
          Type a city. Listen as you go. Narrated history, lore and hidden detail
          — triggered automatically as you arrive at each stop.
        </p>

        <form action="/discover" className="flex gap-2 max-w-md mx-auto">
          <input
            name="q"
            type="text"
            placeholder="Search a city or landmark…"
            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-white/50 transition-colors"
          />
          <button
            type="submit"
            className="bg-white text-black px-6 py-3 rounded-xl font-semibold hover:bg-white/90 transition-colors"
          >
            Go
          </button>
        </form>
      </section>

      {/* Featured cities — live from DB */}
      <section className="px-6 pb-20 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">Featured Cities</h2>
          <Link href="/discover" className="text-sm text-white/40 hover:text-white transition-colors">See all →</Link>
        </div>

        {cities.length === 0 ? (
          <p className="text-white/30 text-sm">No cities yet — run the seed to populate.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {cities.map((city) => {
              const tourCount = (city.tours as unknown as { count: number }[])?.[0]?.count ?? 0;
              const coverColor = city.cover_color ?? "#1a3a5c";
              return (
                <Link
                  key={city.slug}
                  href={`/city/${city.slug}`}
                  className="group relative rounded-2xl p-5 border border-white/10 hover:border-white/30 transition-all hover:-translate-y-0.5"
                  style={{ background: `linear-gradient(135deg, ${coverColor}99 0%, ${coverColor}33 100%)` }}
                >
                  <div className="text-3xl mb-3">{city.emoji ?? "🏙️"}</div>
                  <div className="font-semibold text-white">{city.name}</div>
                  <div className="text-xs text-white/50 mb-2">{city.country}</div>
                  <Badge variant="secondary" className="bg-white/10 text-white/70 text-xs border-0">
                    {tourCount} {tourCount === 1 ? "tour" : "tours"}
                  </Badge>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Tier comparison */}
      <section className="px-6 pb-20 max-w-3xl mx-auto">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50 mb-8 text-center">How it works</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/10 p-6">
            <div className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">Free</div>
            <div className="font-bold text-xl mb-4">Pre-built Tours</div>
            <ul className="space-y-2 text-sm text-white/60">
              <li>✓ Curated city tours in 20+ destinations</li>
              <li>✓ GPS-triggered narration as you walk</li>
              <li>✓ History, architecture &amp; highlights</li>
              <li>✓ Group accessibility notes</li>
              <li className="text-white/30">✗ Custom stops or routes</li>
              <li className="text-white/30">✗ Offline download</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-white/30 bg-white/5 p-6">
            <div className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">Pro</div>
            <div className="font-bold text-xl mb-4">Build Your Tour</div>
            <ul className="space-y-2 text-sm text-white/60">
              <li>✓ Everything in Free</li>
              <li>✓ Choose your own stops</li>
              <li>✓ 11 content depth categories</li>
              <li>✓ Group profile (infants, seniors, wheelchair)</li>
              <li>✓ Offline download</li>
              <li>✓ Premium voices &amp; languages</li>
            </ul>
            <div className="mt-4 pt-4 border-t border-white/10 text-sm text-white/40">from €7.99 / month</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-8 text-center text-white/30 text-sm">
        TourIt — Every place has a story
      </footer>
    </div>
  );
}
