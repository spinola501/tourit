"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { locales, type Locale } from "@/i18n/routing";
import type { MapStop } from "@/components/RouteMap";

const RouteMap = dynamic(() => import("@/components/RouteMap"), { ssr: false });

// ── Types ─────────────────────────────────────────────────────────────────────

type Stop = {
  id: string;
  name: string;
  duration_minutes: number;
  tags: string[];
  lat: number;
  lng: number;
  photo_url: string | null;
  admission_fee: string | null;
  opening_hours: string | null;
};

type City = { id: string; name: string; slug: string; coverColor: string };

type Prefs = {
  group: "solo" | "couple" | "small" | "large";
  needs: Set<"wheelchair" | "pram" | "elderly">;
  day: number;
  duration: number;
  theme: "standard" | "architecture" | "history" | "gastronomy" | "photography" | "family" | "nature" | "nightlife";
  narration: "short" | "medium" | "full";
  budget: "free" | "budget" | "mid" | "any";
  language: Locale;
  pace: "leisurely" | "moderate" | "fast";
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NAMES = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const THEMES: { id: Prefs["theme"]; label: string; icon: string; desc: string }[] = [
  { id: "standard",     label: "Standard",      icon: "◈", desc: "Best of the city" },
  { id: "history",      label: "History",        icon: "⌛", desc: "Deep historical context" },
  { id: "architecture", label: "Architecture",   icon: "⬡", desc: "Buildings & design" },
  { id: "gastronomy",   label: "Gastronomy",     icon: "◍", desc: "Food & markets" },
  { id: "photography",  label: "Photography",    icon: "◎", desc: "Iconic viewpoints" },
  { id: "family",       label: "Family",         icon: "◇", desc: "Kid-friendly" },
  { id: "nature",       label: "Nature",         icon: "◈", desc: "Parks & outdoors" },
  { id: "nightlife",    label: "Nightlife",      icon: "◉", desc: "Evening & culture" },
];

const LANG_LABELS: Record<Locale, string> = {
  en: "English", es: "Español", fr: "Français", de: "Deutsch",
  pt: "Português", it: "Italiano", ja: "日本語", zh: "中文", eo: "Esperanto",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
        active
          ? "bg-white text-black border-white"
          : "border-white/15 text-white/60 hover:border-white/35 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-widest text-white/40">{title}</h3>
        {sub && <p className="text-xs text-white/25 mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function TourBuilderForm({ city, stops, locale }: { city: City; stops: Stop[]; locale: string }) {
  const router = useRouter();
  const today = new Date().getDay();
  const todayMon = today === 0 ? 6 : today - 1;

  const [prefs, setPrefs] = useState<Prefs>({
    group: "couple",
    needs: new Set(),
    day: todayMon,
    duration: 4,
    theme: "standard",
    narration: "medium",
    budget: "any",
    language: "en",
    pace: "moderate",
  });

  const [tourStops, setTourStops] = useState<Stop[]>([]);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState("");
  const [mobileTab, setMobileTab] = useState<"stops" | "route">("stops");

  function toggle<K extends keyof Prefs>(key: K, value: Prefs[K]) {
    setPrefs((p) => ({ ...p, [key]: value }));
  }

  function toggleNeed(need: "wheelchair" | "pram" | "elderly") {
    setPrefs((p) => {
      const next = new Set(p.needs);
      next.has(need) ? next.delete(need) : next.add(need);
      return { ...p, needs: next };
    });
  }

  // Filter the pool based on current preferences
  const filteredPool = useMemo(() => {
    let pool = [...stops];

    if (prefs.budget === "free") {
      pool = pool.filter((s) => {
        const fee = s.admission_fee?.toLowerCase() ?? "";
        return !fee || fee === "free" || fee.startsWith("free") || fee === "€0" || fee === "$0";
      });
    }

    if (prefs.needs.has("wheelchair")) {
      pool = pool.filter((s) => !s.tags.some((t) => t.toLowerCase().includes("stairs")));
    }

    const selectedDay = DAY_NAMES[prefs.day];
    pool = pool.filter((s) => {
      if (!s.opening_hours) return true;
      const oh = s.opening_hours.toLowerCase();
      return !oh.includes(`closed ${selectedDay}`) && !oh.includes(`closed on ${selectedDay}`);
    });

    const themeTagMap: Record<string, string[]> = {
      architecture: ["architecture", "building", "cathedral", "palace", "tower", "bridge"],
      history:      ["history", "museum", "monument", "heritage", "war", "ancient"],
      gastronomy:   ["food", "market", "gastronomy", "restaurant", "cuisine"],
      photography:  ["view", "panorama", "photography", "scenic", "skyline"],
      family:       ["family", "zoo", "park", "interactive", "kids", "playground"],
      nature:       ["nature", "park", "garden", "wildlife", "reserve", "forest"],
      nightlife:    ["nightlife", "bar", "theatre", "music", "cultural", "evening"],
      standard:     [],
    };
    const themeTags = themeTagMap[prefs.theme] ?? [];
    if (themeTags.length > 0) {
      pool.sort((a, b) => {
        const scoreA = a.tags.filter((t) => themeTags.some((tt) => t.toLowerCase().includes(tt))).length;
        const scoreB = b.tags.filter((t) => themeTags.some((tt) => t.toLowerCase().includes(tt))).length;
        return scoreB - scoreA;
      });
    }

    return pool;
  }, [stops, prefs]);

  // Available stops = filtered pool minus already-selected stops
  const availableStops = useMemo(
    () => filteredPool.filter((s) => !tourStops.find((t) => t.id === s.id)),
    [filteredPool, tourStops]
  );

  // Walking speed km/h by pace
  const speedKmh = prefs.pace === "leisurely" ? 3 : prefs.pace === "moderate" ? 4.5 : 6;

  // Travel times (minutes) between consecutive tour stops
  const travelTimes = useMemo(() => {
    if (tourStops.length < 2) return [] as number[];
    return tourStops.slice(0, -1).map((s, i) => {
      const next = tourStops[i + 1];
      const km = haversineKm(s.lat, s.lng, next.lat, next.lng);
      return Math.max(1, Math.round((km / speedKmh) * 60));
    });
  }, [tourStops, speedKmh]);

  const totalTravelMins = travelTimes.reduce((a, b) => a + b, 0);
  const totalStopMins = tourStops.reduce((sum, s) => sum + s.duration_minutes, 0);
  const totalMins = totalTravelMins + totalStopMins;

  function addToTour(stop: Stop) {
    // Append the stop. Do NOT auto-switch to the route tab on mobile — that
    // hid the stops pool and made it impossible to add more than one stop.
    setTourStops((prev) => {
      if (prev.some((s) => s.id === stop.id)) return prev; // guard double-add
      return [...prev, stop];
    });
  }

  function removeFromTour(id: string) {
    setTourStops((prev) => prev.filter((s) => s.id !== id));
  }

  function moveStop(index: number, dir: "up" | "down") {
    setTourStops((prev) => {
      const next = [...prev];
      const target = dir === "up" ? index - 1 : index + 1;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function getGoogleMapsUrl() {
    if (tourStops.length === 0) return "";
    return `https://www.google.com/maps/dir/${tourStops.map((s) => `${s.lat},${s.lng}`).join("/")}`;
  }

  const mapStops: MapStop[] = tourStops.map((s) => ({ id: s.id, name: s.name, lat: s.lat, lng: s.lng }));

  async function buildTour() {
    if (tourStops.length < 2) {
      setError("Add at least 2 stops to build a tour.");
      return;
    }
    setBuilding(true);
    setError("");
    try {
      const res = await fetch("/api/build-tour", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cityId: city.id,
          citySlug: city.slug,
          stopIds: tourStops.map((s) => s.id),
          theme: prefs.theme,
          narration: prefs.narration,
          language: prefs.language,
          coverColor: city.coverColor,
          title: `${city.name} — ${THEMES.find((t) => t.id === prefs.theme)?.label ?? "Custom"} Tour`,
          tagline: `${formatMinutes(totalMins)} · ${THEMES.find((t) => t.id === prefs.theme)?.desc ?? "Personalised route"}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create tour");
      router.push(`/${locale}/tour/${data.tourId}/play?length=${prefs.narration}`);
    } catch (e) {
      setError(String(e));
      setBuilding(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/${locale}/city/${city.slug}`}
          className="text-sm text-white/40 hover:text-white transition-colors inline-flex items-center gap-1.5 mb-6"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to {city.name}
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2.5 py-1 rounded-full">
            Pro
          </span>
          <h1 className="text-3xl font-black">Build Your Tour</h1>
        </div>
        <p className="text-white/50">
          Pick stops from {stops.length} in {city.name}, arrange them, and see your route live.
        </p>
      </div>

      {/* ── Preferences accordion ── */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] mb-6 overflow-hidden">
        <button
          onClick={() => setPrefsOpen((o) => !o)}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.03] transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">Filters &amp; Preferences</span>
            <span className="text-xs text-white/35">
              {prefs.theme !== "standard" ? THEMES.find((t) => t.id === prefs.theme)?.label : "Standard"} ·{" "}
              {prefs.duration}h · {prefs.pace}
            </span>
          </div>
          <svg
            className={`w-4 h-4 text-white/40 transition-transform ${prefsOpen ? "rotate-180" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {prefsOpen && (
          <div className="px-5 pb-6 space-y-8 border-t border-white/10 pt-5">
            <Section title="Group">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["solo", "Solo"],
                    ["couple", "Couple"],
                    ["small", "Small group (3–6)"],
                    ["large", "Large group (7+)"],
                  ] as const
                ).map(([v, l]) => (
                  <Pill key={v} active={prefs.group === v} onClick={() => toggle("group", v)}>
                    {l}
                  </Pill>
                ))}
              </div>
            </Section>

            <Section title="Accessibility" sub="Filters out stops that don't meet these requirements">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["wheelchair", "Wheelchair accessible"],
                    ["pram", "Pram / stroller"],
                    ["elderly", "Elderly-friendly"],
                  ] as const
                ).map(([v, l]) => (
                  <Pill key={v} active={prefs.needs.has(v)} onClick={() => toggleNeed(v)}>
                    {l}
                  </Pill>
                ))}
              </div>
            </Section>

            <Section title="Day of visit" sub="Filters out stops closed on this day">
              <div className="flex gap-2">
                {DAYS.map((d, i) => (
                  <Pill key={d} active={prefs.day === i} onClick={() => toggle("day", i)}>
                    <span className="hidden sm:inline">{d}</span>
                    <span className="sm:hidden">{d[0]}</span>
                  </Pill>
                ))}
              </div>
            </Section>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              <Section title="Tour specialisation">
                <div className="grid grid-cols-2 gap-2">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => toggle("theme", t.id)}
                      className={`rounded-xl border px-3 py-2.5 text-left transition-all ${
                        prefs.theme === t.id
                          ? "border-white/50 bg-white/10"
                          : "border-white/10 hover:border-white/25 hover:bg-white/5"
                      }`}
                    >
                      <p className="text-base mb-0.5">{t.icon}</p>
                      <p className={`text-xs font-semibold ${prefs.theme === t.id ? "text-white" : "text-white/70"}`}>
                        {t.label}
                      </p>
                    </button>
                  ))}
                </div>
              </Section>

              <Section title="Walking pace" sub="Affects travel time estimates">
                <div className="flex flex-col gap-2">
                  {(
                    [
                      ["leisurely", "Leisurely", "~3 km/h"],
                      ["moderate", "Moderate", "~4.5 km/h"],
                      ["fast", "Fast-paced", "~6 km/h"],
                    ] as const
                  ).map(([v, l, s]) => (
                    <Pill key={v} active={prefs.pace === v} onClick={() => toggle("pace", v)}>
                      {l}
                      <span className="text-[10px] opacity-60 ml-1.5">{s}</span>
                    </Pill>
                  ))}
                </div>
              </Section>

              <div className="space-y-8">
                <Section title="Budget">
                  <div className="flex flex-col gap-2">
                    {(
                      [
                        ["free", "Free only"],
                        ["budget", "Budget (under €15)"],
                        ["mid", "Mid-range (under €40)"],
                        ["any", "No limit"],
                      ] as const
                    ).map(([v, l]) => (
                      <Pill key={v} active={prefs.budget === v} onClick={() => toggle("budget", v)}>
                        {l}
                      </Pill>
                    ))}
                  </div>
                </Section>

                <Section title="Narration language">
                  <div className="flex flex-wrap gap-2">
                    {locales.map((l) => (
                      <Pill key={l} active={prefs.language === l} onClick={() => toggle("language", l as Locale)}>
                        {LANG_LABELS[l as Locale]}
                      </Pill>
                    ))}
                  </div>
                </Section>

                <Section title="Narration detail">
                  <div className="flex flex-col gap-2">
                    {(
                      [
                        ["short", "Short (~1 min/stop)"],
                        ["medium", "Standard (~2 min/stop)"],
                        ["full", "Full (~4 min/stop)"],
                      ] as const
                    ).map(([v, l]) => (
                      <Pill key={v} active={prefs.narration === v} onClick={() => toggle("narration", v)}>
                        {l}
                      </Pill>
                    ))}
                  </div>
                </Section>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile tab switcher ── */}
      <div className="flex lg:hidden gap-1 mb-4 bg-white/5 rounded-xl p-1">
        <button
          onClick={() => setMobileTab("stops")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            mobileTab === "stops" ? "bg-white text-black" : "text-white/50"
          }`}
        >
          Stops ({availableStops.length})
        </button>
        <button
          onClick={() => setMobileTab("route")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            mobileTab === "route" ? "bg-white text-black" : "text-white/50"
          }`}
        >
          Route ({tourStops.length})
          {tourStops.length > 0 && <span className="ml-1 text-xs opacity-60">{formatMinutes(totalMins)}</span>}
        </button>
      </div>

      {/* ── Main two-panel layout ── */}
      <div className="grid lg:grid-cols-[380px_1fr] gap-6">

        {/* ── Left: Available stops pool ── */}
        <div className={`flex flex-col gap-3 ${mobileTab === "route" ? "hidden lg:flex" : "flex"}`}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
              Available Stops
            </p>
            <span className="text-xs text-white/25">{availableStops.length} matching</span>
          </div>

          <div className="space-y-1.5 max-h-[60vh] lg:max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
            {availableStops.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-6 text-center">
                <p className="text-white/30 text-sm">
                  {tourStops.length > 0
                    ? "All matching stops are already in your route."
                    : "No stops match your current filters. Try relaxing them."}
                </p>
              </div>
            ) : (
              availableStops.map((stop) => (
                <div
                  key={stop.id}
                  className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.04] px-3 py-2.5 transition-colors group"
                >
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg overflow-hidden bg-white/5">
                    {stop.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={stop.photo_url} alt={stop.name} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-xs font-bold"
                        style={{ color: city.coverColor }}
                      >
                        {stop.name[0]}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{stop.name}</p>
                    <p className="text-xs text-white/35">{stop.duration_minutes} min</p>
                  </div>
                  {stop.admission_fee && stop.admission_fee.toLowerCase() !== "free" && (
                    <span className="text-[10px] text-white/25 flex-shrink-0 hidden group-hover:block">
                      {stop.admission_fee}
                    </span>
                  )}
                  <button
                    onClick={() => addToTour(stop)}
                    title="Add to tour"
                    className="flex-shrink-0 w-7 h-7 rounded-full border border-white/20 bg-white/5 hover:bg-white/15 hover:border-white/40 flex items-center justify-center text-white/60 hover:text-white transition-all text-lg leading-none"
                  >
                    +
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Right: Map + Route ── */}
        <div className={`flex-col gap-4 lg:sticky lg:top-6 self-start ${mobileTab === "stops" ? "hidden lg:flex" : "flex"}`}>

          {/* Map */}
          <div
            className="w-full rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03] relative"
            style={{ height: "280px" }}
          >
            {tourStops.length > 0 ? (
              <div className="absolute inset-0">
                <RouteMap stops={mapStops} color={city.coverColor} />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-white/25 text-sm">Add stops to see your route on the map</p>
              </div>
            )}
          </div>

          {/* Route list */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
            {/* Header */}
            <div
              className="px-5 py-4 border-b border-white/10"
              style={{ background: `linear-gradient(135deg, ${city.coverColor}44 0%, transparent 100%)` }}
            >
              <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Your Route</p>
              <p className="font-bold">{city.name}</p>
              <div className="flex gap-3 mt-1 text-xs text-white/40">
                <span>{tourStops.length} stop{tourStops.length !== 1 ? "s" : ""}</span>
                {totalMins > 0 && <span>{formatMinutes(totalMins)} total</span>}
                <span className="capitalize">{prefs.narration} narration</span>
              </div>
            </div>

            {/* Stops */}
            <div className="px-5 py-3 max-h-[420px] overflow-y-auto">
              {tourStops.length === 0 ? (
                <p className="text-white/25 text-sm py-6 text-center">
                  Click <span className="font-bold text-white/40">+</span> on stops to build your route.
                </p>
              ) : (
                tourStops.map((stop, i) => (
                  <div key={stop.id}>
                    {/* Stop row */}
                    <div className="flex items-center gap-3 py-2.5">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: `${city.coverColor}44`, color: city.coverColor }}
                      >
                        {i + 1}
                      </div>
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg overflow-hidden bg-white/5">
                        {stop.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={stop.photo_url} alt={stop.name} loading="lazy" className="w-full h-full object-cover" />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center text-xs font-bold"
                            style={{ color: city.coverColor }}
                          >
                            {stop.name[0]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{stop.name}</p>
                        <p className="text-xs text-white/35">{stop.duration_minutes} min at stop</p>
                      </div>
                      {/* Reorder + remove */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => moveStop(i, "up")}
                          disabled={i === 0}
                          title="Move up"
                          className="w-6 h-6 rounded flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all text-xs"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveStop(i, "down")}
                          disabled={i === tourStops.length - 1}
                          title="Move down"
                          className="w-6 h-6 rounded flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all text-xs"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => removeFromTour(stop.id)}
                          title="Remove from tour"
                          className="w-6 h-6 rounded flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all text-xs"
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    {/* Travel time connector */}
                    {i < tourStops.length - 1 && (
                      <div className="flex items-center gap-2 pl-9 py-0.5">
                        <div className="w-px h-5 bg-white/10" />
                        <div className="flex items-center gap-1.5 text-[10px] text-white/30">
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M16 3h5v5M4 20L21 3M9 21H4v-5" />
                          </svg>
                          ~{travelTimes[i]} min walk
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Totals + actions */}
            <div className="px-5 py-4 border-t border-white/10 space-y-3">
              {tourStops.length > 1 && (
                <div className="flex justify-between text-xs text-white/40 pb-1">
                  <span>
                    {totalStopMins} min at stops + {totalTravelMins} min walking
                  </span>
                  <span className="font-semibold text-white/60">{formatMinutes(totalMins)} total</span>
                </div>
              )}

              {error && <p className="text-red-400 text-xs">{error}</p>}

              {/* Export to Google Maps */}
              {tourStops.length > 1 && (
                <a
                  href={getGoogleMapsUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 border border-white/15 text-white/60 hover:border-white/35 hover:text-white py-2.5 rounded-xl text-sm transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                    <circle cx="12" cy="9" r="2.5" />
                  </svg>
                  Export to Google Maps
                  <svg className="w-3 h-3 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                  </svg>
                </a>
              )}

              <button
                onClick={buildTour}
                disabled={building || tourStops.length < 2}
                className="w-full bg-yellow-400 text-black font-bold py-3.5 rounded-xl hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {building ? "Creating tour…" : `Start tour (${tourStops.length} stop${tourStops.length !== 1 ? "s" : ""})`}
              </button>
              <p className="text-[10px] text-white/25 text-center">
                Tour is saved to your profile and accessible any time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
