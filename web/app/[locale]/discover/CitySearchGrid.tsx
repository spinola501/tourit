"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";

type City = {
  slug: string;
  name: string;
  country: string;
  emoji: string | null;
  cover_color: string | null;
  photo_url: string | null;
  tours: unknown;
};

export function CitySearchGrid({ cities, initialQ = "" }: { cities: City[]; initialQ?: string }) {
  const locale = useLocale();
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
                  href={`/${locale}/city/${city.slug}`}
                  className="group relative rounded-2xl overflow-hidden aspect-[4/3] block"
                >
                  {city.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={city.photo_url}
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
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-300" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <p className="font-semibold text-white text-base leading-tight">{city.name}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-white/60 text-xs">{city.country}</span>
                      <span className="text-white/30 text-xs">·</span>
                      <span className="text-white/50 text-xs">{tourCount} {tourCount === 1 ? "tour" : "tours"}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
