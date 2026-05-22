import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { FEATURED_CITIES } from "@/lib/mock-data";

export default function DiscoverPage() {
  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <Link href="/" className="font-bold text-lg tracking-tight">TourIt</Link>
        <Link href="/account" className="bg-white text-black px-4 py-1.5 rounded-full text-sm font-medium hover:bg-white/90 transition-colors">
          Sign in
        </Link>
      </nav>

      <div className="px-6 py-12 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Discover Tours</h1>
        <p className="text-white/50 mb-8">Pre-built audio tours for curious travellers.</p>

        {/* Search */}
        <div className="mb-10">
          <input
            type="text"
            placeholder="Search a city or landmark…"
            className="w-full max-w-md bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-white/50 transition-colors"
          />
        </div>

        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40 mb-5">All Cities</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {FEATURED_CITIES.map((city) => (
            <Link
              key={city.slug}
              href={`/city/${city.slug}`}
              className="group rounded-2xl p-5 border border-white/10 hover:border-white/30 transition-all hover:-translate-y-0.5"
              style={{ background: `linear-gradient(135deg, ${city.coverColor}99 0%, ${city.coverColor}33 100%)` }}
            >
              <div className="text-3xl mb-3">{city.emoji}</div>
              <div className="font-semibold">{city.name}</div>
              <div className="text-xs text-white/50 mb-2">{city.country}</div>
              <Badge variant="secondary" className="bg-white/10 text-white/70 text-xs border-0">
                {city.tourCount} tours
              </Badge>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
