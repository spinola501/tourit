"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";

// ── Types ────────────────────────────────────────────────────────────────────

export type ClientTour = {
  id: string;
  title: string;
  tagline: string | null;
  theme: string | null;
  duration_hours: number | null;
  cover_color: string | null;
  tier_required: string | null;
  stop_count: number;
};

export type ClientStop = {
  id: string;
  name: string;
  duration_minutes: number;
  tags: string[];
  photo_url: string | null;
  free_admission: boolean;
};

type NarrationLength = "short" | "medium" | "full";

const LENGTH_LABELS: Record<NarrationLength, { label: string; desc: string; words: string }> = {
  short:  { label: "Short",    desc: "Key highlights only",      words: "~1 min per stop" },
  medium: { label: "Standard", desc: "Balanced depth",           words: "~2 min per stop" },
  full:   { label: "Long",     desc: "Full detail & categories", words: "~4 min per stop" },
};

// ── Narration length picker ───────────────────────────────────────────────────

function NarrationPicker({ value, onChange }: { value: NarrationLength; onChange: (v: NarrationLength) => void }) {
  return (
    <div>
      <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-3">Narration Length</p>
      <div className="flex gap-2">
        {(Object.keys(LENGTH_LABELS) as NarrationLength[]).map((opt) => {
          const active = value === opt;
          return (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className={`flex-1 rounded-xl border px-3 py-3 text-left transition-all ${
                active
                  ? "border-white/50 bg-white/10"
                  : "border-white/10 hover:border-white/30 hover:bg-white/5"
              }`}
            >
              <p className={`text-sm font-semibold ${active ? "text-white" : "text-white/60"}`}>
                {LENGTH_LABELS[opt].label}
              </p>
              <p className="text-[10px] text-white/35 mt-0.5">{LENGTH_LABELS[opt].desc}</p>
              <p className="text-[10px] text-white/25 mt-0.5">{LENGTH_LABELS[opt].words}</p>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-white/25 mt-2">
        Short/Standard/Long are all drawn from the same rich content — just different levels of detail.
      </p>
    </div>
  );
}

// ── Tour card ─────────────────────────────────────────────────────────────────

function TourCard({ tour, length, coverColor, userTier, locale }: {
  tour: ClientTour;
  length: NarrationLength;
  coverColor: string;
  userTier: "free" | "pro";
  locale: string;
}) {
  const color = tour.cover_color ?? coverColor;
  const isProTour = tour.tier_required === "pro";
  const locked = isProTour && userTier === "free";
  const hours = tour.duration_hours ?? 0;

  return (
    <Link
      href={locked ? `/${locale}/account` : `/${locale}/tour/${tour.id}/play?length=${length}`}
      className="group relative rounded-2xl border border-white/10 hover:border-white/30 overflow-hidden transition-all hover:-translate-y-0.5 block"
      style={{ background: `linear-gradient(135deg, ${color}55 0%, ${color}11 100%)` }}
    >
      {/* Top row */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex gap-1.5 flex-wrap">
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              isProTour ? "bg-yellow-400/20 text-yellow-300 border border-yellow-400/30" : "bg-white/10 text-white/50"
            }`}>
              {isProTour ? "★ Pro" : "Free"}
            </span>
            {tour.theme && (
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-white/35 border border-white/10">
                {tour.theme.replace("_", " ")}
              </span>
            )}
          </div>
          <span className="text-xs text-white/35 flex-shrink-0">{tour.stop_count} stops</span>
        </div>

        <h3 className="font-bold text-lg leading-snug mb-1 group-hover:text-white transition-colors">
          {tour.title}
        </h3>
        {tour.tagline && <p className="text-sm text-white/50 leading-snug">{tour.tagline}</p>}
      </div>

      {/* Footer */}
      <div className="px-5 pb-4 flex items-center justify-between border-t border-white/5 pt-3">
        <div className="flex items-center gap-3 text-xs text-white/35">
          {hours > 0 && (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
              </svg>
              {hours}h
            </span>
          )}
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
            </svg>
            {LENGTH_LABELS[length].label} narration
          </span>
        </div>
        <span className={`text-xs font-semibold transition-colors ${
          locked ? "text-white/30" : "text-white/60 group-hover:text-white"
        }`}>
          {locked ? "Pro only →" : "Start tour →"}
        </span>
      </div>

      {locked && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl backdrop-blur-sm">
          <div className="text-center">
            <p className="text-white font-semibold text-sm mb-1">Pro tour</p>
            <p className="text-white/60 text-xs">Upgrade to unlock</p>
          </div>
        </div>
      )}
    </Link>
  );
}

// ── Stop card ─────────────────────────────────────────────────────────────────

function StopCard({ stop, coverColor }: { stop: ClientStop; coverColor: string }) {
  return (
    <div className="rounded-xl border border-white/10 p-3 flex gap-3 items-start">
      <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-white/5 flex items-center justify-center">
        {stop.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={stop.photo_url} alt={stop.name} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <span className="text-base font-bold" style={{ color: coverColor }}>{stop.name[0]}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="font-medium text-sm truncate">{stop.name}</p>
          {stop.free_admission && (
            <span className="text-[9px] text-green-400 bg-green-400/10 border border-green-400/20 px-1.5 py-0.5 rounded-full flex-shrink-0">Free</span>
          )}
        </div>
        <p className="text-xs text-white/40">{stop.duration_minutes} min</p>
        {stop.tags.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {stop.tags.slice(0, 3).map((t) => (
              <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-white/30">{t}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function CityPageClient({
  tours,
  stops,
  cityName,
  citySlug,
  coverColor,
  userTier,
}: {
  tours: ClientTour[];
  stops: ClientStop[];
  cityName: string;
  citySlug: string;
  coverColor: string;
  userTier: "free" | "pro";
}) {
  const locale = useLocale();
  const [length, setLength] = useState<NarrationLength>("medium");

  return (
    <div className="space-y-16">

      {/* ── Generation in progress banner ── */}
      {tours.length === 0 && stops.length === 0 && (
        <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse flex-shrink-0" />
            <p className="font-semibold text-white">Tour generation in progress</p>
          </div>
          <p className="text-sm text-white/50 mb-4">
            We&apos;re generating audio tours for this destination right now. This usually takes 3–5 minutes.
            You&apos;ll receive an email when it&apos;s ready — feel free to close this tab.
          </p>
          <div className="flex gap-4 text-xs text-white/30">
            <span>• AI stop research</span>
            <span>• Narration generation</span>
            <span>• Tour route design</span>
          </div>
        </div>
      )}

      {/* ── Narration preference ── */}
      {(tours.length > 0 || stops.length > 0) && (
      <section>
        <NarrationPicker value={length} onChange={setLength} />
      </section>
      )}

      {/* ── Pre-made tours ── */}
      <section>
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40 mb-1">Pre-made Tours</h2>
            <p className="text-xs text-white/30">Curated day routes — up to 8 hours of guided exploration.</p>
          </div>
        </div>

        {tours.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
            <p className="text-white/30 text-sm">Tours are being generated for {cityName}. Check back soon.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {tours.map((tour) => (
              <TourCard
                key={tour.id}
                tour={tour}
                length={length}
                coverColor={coverColor}
                userTier={userTier}
                locale={locale}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Pro: Build custom tour CTA ── */}
      {userTier === "pro" && stops.length > 0 && (
        <section>
          <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-widest text-yellow-400">Pro</span>
                  <h2 className="text-lg font-bold text-white">Build a Custom Tour</h2>
                </div>
                <p className="text-sm text-white/50 mb-1">
                  Design your perfect {cityName} experience. Choose your group, pace, theme, budget and we&apos;ll build a personalised itinerary from {stops.length} stops.
                </p>
                <p className="text-xs text-white/30">Wheelchair access · Pram-friendly · Free-only · Gastronomy · Architecture · and more</p>
              </div>
              <Link
                href={`/${locale}/city/${citySlug}/build-tour`}
                className="flex-shrink-0 bg-yellow-400 text-black font-bold px-5 py-3 rounded-xl hover:bg-yellow-300 transition-colors text-sm whitespace-nowrap"
              >
                Build tour →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── All stops ── */}
      {stops.length > 0 && (
        <section>
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40 mb-1">
                All Stops in {cityName}
              </h2>
              <p className="text-xs text-white/30">{stops.length} stops</p>
            </div>
            {userTier === "free" && (
              <Link href={`/${locale}/account`} className="text-xs text-yellow-400 hover:text-yellow-300 border border-yellow-400/30 hover:border-yellow-400/60 px-3 py-1.5 rounded-full transition-colors flex-shrink-0">
                ★ Pro to build custom tour
              </Link>
            )}
          </div>

          <div className={`grid sm:grid-cols-2 gap-2 ${userTier === "free" ? "relative" : ""}`}>
            {(userTier === "free" ? stops.slice(0, 6) : stops).map((stop) => (
              <StopCard key={stop.id} stop={stop} coverColor={coverColor} />
            ))}
            {userTier === "free" && stops.length > 6 && (
              <div className="sm:col-span-2 relative">
                {/* Blurred remaining stops hint */}
                <div className="grid sm:grid-cols-2 gap-2 opacity-20 blur-sm pointer-events-none select-none">
                  {stops.slice(6, 10).map((stop) => (
                    <StopCard key={stop.id} stop={stop} coverColor={coverColor} />
                  ))}
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center bg-[#0d0d0d]/90 rounded-2xl px-6 py-4 border border-white/10">
                    <p className="text-white font-semibold text-sm mb-1">+{stops.length - 6} more stops</p>
                    <p className="text-white/50 text-xs mb-3">Upgrade to Pro to see all stops and build custom tours</p>
                    <Link href={`/${locale}/account`} className="text-xs bg-white text-black px-4 py-2 rounded-full font-semibold hover:bg-white/90 transition-colors">
                      ★ Upgrade to Pro
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
