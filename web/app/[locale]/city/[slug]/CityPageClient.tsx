"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";

// ── Types ────────────────────────────────────────────────────────────────────

export type ClientTour = {
  id: string;
  title: string;
  tagline: string | null;
  cover_color: string | null;
  tier: string | null;
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
              className={`flex-1 rounded-xl border px-3 py-2 sm:py-3 text-left transition-all ${
                active
                  ? "border-white/50 bg-white/10"
                  : "border-white/10 hover:border-white/30 hover:bg-white/5"
              }`}
            >
              <p className={`text-sm font-semibold ${active ? "text-white" : "text-white/60"}`}>
                {LENGTH_LABELS[opt].label}
              </p>
              {/* Hide verbose descriptions on mobile to keep the picker compact
                  and avoid layout shift. */}
              <p className="hidden sm:block text-[10px] text-white/35 mt-0.5">{LENGTH_LABELS[opt].desc}</p>
              <p className="hidden sm:block text-[10px] text-white/25 mt-0.5">{LENGTH_LABELS[opt].words}</p>
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
  const isProTour = tour.tier === "pro";
  const locked = isProTour && userTier === "free";

  return (
    <Link
      href={locked ? `/${locale}/account` : `/${locale}/tour/${tour.id}?length=${length}`}
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

// ── Stop content modal ────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  history: "History", architecture: "Architecture", culture: "Art & Culture",
  fauna: "Fauna", flora: "Flora", geo: "Geography", lore: "Legends & Lore",
  funfacts: "Fun Facts", food: "Food & Gastronomy", photography: "Photography Tips",
  practical: "Practical Info",
};

type StopContent = { category: string; text: string };

function StopPreviewModal({ stop, onClose, coverColor }: {
  stop: ClientStop;
  onClose: () => void;
  coverColor: string;
}) {
  const [content, setContent] = useState<StopContent[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (content !== null) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/stop?id=${stop.id}&lang=en`);
      const data = await res.json();
      setContent(data.content ?? []);
    } catch {
      setContent([]);
    } finally {
      setLoading(false);
    }
  }, [stop.id, content]);

  // Load on mount
  if (content === null && !loading) load();

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-[#111] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-start gap-3 px-5 pt-4 pb-4 border-b border-white/10">
          <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-white/5">
            {stop.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={stop.photo_url} alt={stop.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl font-bold" style={{ color: coverColor }}>
                {stop.name[0]}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white leading-tight">{stop.name}</h3>
            <p className="text-xs text-white/40 mt-0.5">{stop.duration_minutes} min visit</p>
            {stop.free_admission && (
              <span className="text-[9px] text-green-400 bg-green-400/10 border border-green-400/20 px-1.5 py-0.5 rounded-full inline-block mt-1">Free entry</span>
            )}
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1 flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {loading && (
            <div className="flex items-center gap-2 text-white/30 text-sm py-4">
              <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
              Loading content…
            </div>
          )}
          {content?.map((c) => (
            <div key={c.category}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-1.5">
                {CATEGORY_LABELS[c.category] ?? c.category}
              </p>
              <p className="text-sm text-white/70 leading-relaxed">{c.text}</p>
            </div>
          ))}
          {content?.length === 0 && !loading && (
            <p className="text-white/30 text-sm">No content available yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Stop card ─────────────────────────────────────────────────────────────────

function StopCard({ stop, coverColor, isPro, onPreview }: {
  stop: ClientStop;
  coverColor: string;
  isPro: boolean;
  onPreview: (s: ClientStop) => void;
}) {
  return (
    <div
      onClick={isPro ? () => onPreview(stop) : undefined}
      style={{ touchAction: "pan-y" }}
      className={`rounded-xl border border-white/10 p-3 flex gap-3 items-start transition-all ${
        isPro ? "cursor-pointer hover:border-white/25 hover:bg-white/[0.03]" : ""
      }`}
    >
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
      {isPro && (
        <svg className="flex-shrink-0 w-4 h-4 text-white/20 self-center" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      )}
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
  const [previewStop, setPreviewStop] = useState<ClientStop | null>(null);
  const isPro = userTier === "pro";

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
            We&apos;re generating audio tours for this destination. This usually takes 3–5 minutes.
            You&apos;ll receive an email when it&apos;s ready.
          </p>
          <div className="flex items-center justify-between">
            <div className="flex gap-4 text-xs text-white/30">
              <span>• AI stop research</span>
              <span>• Narration generation</span>
              <span>• Tour route design</span>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="text-xs text-yellow-400/70 hover:text-yellow-400 border border-yellow-400/20 hover:border-yellow-400/40 px-3 py-1.5 rounded-full transition-colors flex-shrink-0 ml-4"
            >
              Refresh
            </button>
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
              <p className="text-xs text-white/30">
                {stops.length} stops{isPro ? " · Tap any stop to preview its content" : ""}
              </p>
            </div>
            {!isPro && (
              <Link href={`/${locale}/account`} className="text-xs text-yellow-400 hover:text-yellow-300 border border-yellow-400/30 hover:border-yellow-400/60 px-3 py-1.5 rounded-full transition-colors flex-shrink-0">
                ★ Pro to build custom tour
              </Link>
            )}
          </div>

          <div className={`grid sm:grid-cols-2 gap-2 ${!isPro ? "relative" : ""}`}>
            {(!isPro ? stops.slice(0, 6) : stops).map((stop) => (
              <StopCard key={stop.id} stop={stop} coverColor={coverColor} isPro={isPro} onPreview={setPreviewStop} />
            ))}
            {!isPro && stops.length > 6 && (
              <div className="sm:col-span-2 relative">
                <div className="grid sm:grid-cols-2 gap-2 opacity-20 blur-sm pointer-events-none select-none">
                  {stops.slice(6, 10).map((stop) => (
                    <StopCard key={stop.id} stop={stop} coverColor={coverColor} isPro={false} onPreview={() => {}} />
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

      {/* ── Stop preview modal (Pro) ── */}
      {previewStop && (
        <StopPreviewModal
          stop={previewStop}
          onClose={() => setPreviewStop(null)}
          coverColor={coverColor}
        />
      )}
    </div>
  );
}
