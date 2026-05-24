"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

type City = {
  slug: string;
  name: string;
  country: string;
  emoji: string | null;
  cover_color: string | null;
  tours: unknown;
};

export function CitySearchGrid({ cities, initialQ = "" }: { cities: City[]; initialQ?: string }) {
  const [q, setQ] = useState(initialQ);

  const filtered = !q.trim()
    ? cities
    : cities.filter(
        (c) =>
          c.name.toLowerCase().includes(q.toLowerCase()) ||
          c.country.toLowerCase().includes(q.toLowerCase())
      );

  return (
    <>
      <div className="mb-10">
        <input
          type="text"
          placeholder="Search a city or country…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full max-w-md bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-white/50 transition-colors"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-white/30 text-sm mt-4">No cities match &ldquo;{q}&rdquo;.</p>
      ) : (
        <>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40 mb-5">
            {q ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""}` : "All Cities"}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filtered.map((city) => {
              const tourCount = (city.tours as { count: number }[])?.[0]?.count ?? 0;
              const coverColor = city.cover_color ?? "#1a3a5c";
              return (
                <Link
                  key={city.slug}
                  href={`/city/${city.slug}`}
                  className="group relative rounded-2xl p-5 border border-white/10 hover:border-white/30 transition-all duration-200 hover:-translate-y-0.5"
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
        </>
      )}
    </>
  );
}
