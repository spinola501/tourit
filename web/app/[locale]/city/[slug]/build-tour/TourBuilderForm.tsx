"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { locales, type Locale } from "@/i18n/routing";

// ── Types ─────────────────────────────────────────────────────────────────────

type Stop = {
  id: string;
  name: string;
  duration_minutes: number;
  tags: string[];
  photo_url: string | null;
  admission_fee: string | null;
  opening_hours: string | null;
};

type City = { id: string; name: string; slug: string; coverColor: string };

type Prefs = {
  group: "solo" | "couple" | "small" | "large";
  needs: Set<"wheelchair" | "pram" | "elderly">;
  day: number; // 0=Mon … 6=Sun
  duration: number; // hours
  theme: "standard" | "architecture" | "history" | "gastronomy" | "photography" | "family" | "nature" | "nightlife";
  narration: "short" | "medium" | "full";
  budget: "free" | "budget" | "mid" | "any";
  language: Locale;
  pace: "leisurely" | "moderate" | "fast";
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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

// ── Pill selector ─────────────────────────────────────────────────────────────

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

// ── Section wrapper ───────────────────────────────────────────────────────────

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

// ── Stop preview card ─────────────────────────────────────────────────────────

function StopPreview({ stop, index, color }: { stop: Stop; index: number; color: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
        style={{ background: `${color}44`, color }}
      >
        {index + 1}
      </div>
      <div className="flex-shrink-0 w-9 h-9 rounded-lg overflow-hidden bg-white/5">
        {stop.photo_url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={stop.photo_url} alt={stop.name} loading="lazy" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-white/20 text-xs font-bold" style={{ color }}>{stop.name[0]}</div>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{stop.name}</p>
        <p className="text-xs text-white/35">{stop.duration_minutes} min</p>
      </div>
      {stop.admission_fee && stop.admission_fee.toLowerCase() !== "free" && (
        <span className="text-[10px] text-white/30 flex-shrink-0">{stop.admission_fee}</span>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function TourBuilderForm({ city, stops, locale }: { city: City; stops: Stop[]; locale: string }) {
  const router = useRouter();
  const today = new Date().getDay(); // 0=Sun
  const todayMon = today === 0 ? 6 : today - 1; // convert to Mon=0

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
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState("");

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

  // Filter stops based on prefs
  const filteredStops = useMemo(() => {
    let pool = [...stops];

    // Budget filter
    if (prefs.budget === "free") {
      pool = pool.filter((s) => {
        const fee = s.admission_fee?.toLowerCase() ?? "";
        return !fee || fee === "free" || fee.startsWith("free") || fee === "€0" || fee === "$0";
      });
    }

    // Wheelchair: filter out stops with "stairs" or "no wheelchair" in tags/hours
    if (prefs.needs.has("wheelchair")) {
      pool = pool.filter((s) => !s.tags.some((t) => t.toLowerCase().includes("stairs")));
    }

    // Day filter: check opening hours for "closed [day]"
    const dayNames = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    const selectedDay = dayNames[prefs.day];
    pool = pool.filter((s) => {
      if (!s.opening_hours) return true;
      const oh = s.opening_hours.toLowerCase();
      return !oh.includes(`closed ${selectedDay}`) && !oh.includes(`closed on ${selectedDay}`);
    });

    // Theme: score stops by tag match
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

    // Duration: calculate how many stops fit
    const minutesAvailable = prefs.duration * 60;
    const avgTravel = prefs.pace === "leisurely" ? 20 : prefs.pace === "moderate" ? 12 : 8;
    let used = 0;
    const selected: Stop[] = [];
    for (const s of pool) {
      const cost = s.duration_minutes + (selected.length > 0 ? avgTravel : 0);
      if (used + cost > minutesAvailable) break;
      selected.push(s);
      used += cost;
    }
    return selected;
  }, [stops, prefs]);

  const totalMinutes = filteredStops.reduce((sum, s) => sum + s.duration_minutes, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  async function buildTour() {
    if (filteredStops.length < 2) {
      setError("Not enough stops match your criteria. Try relaxing some filters.");
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
          stopIds: filteredStops.map((s) => s.id),
          theme: prefs.theme,
          narration: prefs.narration,
          language: prefs.language,
          coverColor: city.coverColor,
          title: `${city.name} — ${THEMES.find((t) => t.id === prefs.theme)?.label ?? "Custom"} Tour`,
          tagline: `${prefs.duration}h · ${THEMES.find((t) => t.id === prefs.theme)?.desc ?? "Personalised route"}`,
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
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-10">
        <Link href={`/${locale}/city/${city.slug}`} className="text-sm text-white/40 hover:text-white transition-colors inline-flex items-center gap-1.5 mb-6">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Back to {city.name}
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2.5 py-1 rounded-full">Pro</span>
          <h1 className="text-3xl font-black">Build Your Tour</h1>
        </div>
        <p className="text-white/50">Personalise every detail. We&apos;ll pick the best stops from {stops.length} options in {city.name}.</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-8">

        {/* ── Left: Options ── */}
        <div className="space-y-10">

          {/* Group */}
          <Section title="Group">
            <div className="flex flex-wrap gap-2">
              {([["solo", "Solo"], ["couple", "Couple"], ["small", "Small group (3–6)"], ["large", "Large group (7+)"]] as const).map(([v, l]) => (
                <Pill key={v} active={prefs.group === v} onClick={() => toggle("group", v)}>{l}</Pill>
              ))}
            </div>
          </Section>

          {/* Special needs */}
          <Section title="Accessibility" sub="Filters out stops that don't meet these requirements">
            <div className="flex flex-wrap gap-2">
              {([["wheelchair", "Wheelchair accessible"], ["pram", "Pram / stroller"], ["elderly", "Elderly-friendly"]] as const).map(([v, l]) => (
                <Pill key={v} active={prefs.needs.has(v)} onClick={() => toggleNeed(v)}>{l}</Pill>
              ))}
            </div>
          </Section>

          {/* Day */}
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

          {/* Duration */}
          <Section title="Tour duration">
            <div className="flex flex-wrap gap-2">
              {([2, 3, 4, 6, 8] as const).map((h) => (
                <Pill key={h} active={prefs.duration === h} onClick={() => toggle("duration", h)}>
                  {h === 8 ? "Full day (8h)" : `${h}h`}
                </Pill>
              ))}
            </div>
          </Section>

          {/* Theme */}
          <Section title="Tour specialisation">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => toggle("theme", t.id)}
                  className={`rounded-xl border px-3 py-3 text-left transition-all ${
                    prefs.theme === t.id
                      ? "border-white/50 bg-white/10"
                      : "border-white/10 hover:border-white/25 hover:bg-white/5"
                  }`}
                >
                  <p className="text-lg mb-1">{t.icon}</p>
                  <p className={`text-sm font-semibold ${prefs.theme === t.id ? "text-white" : "text-white/70"}`}>{t.label}</p>
                  <p className="text-[10px] text-white/30 mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </Section>

          {/* Narration */}
          <Section title="Narration detail" sub="All lengths draw from the same rich content — just different depth">
            <div className="grid grid-cols-3 gap-2">
              {([
                ["short",  "Short",    "~1 min/stop", "Key highlights"],
                ["medium", "Standard", "~2 min/stop", "Balanced depth"],
                ["full",   "Long",     "~4 min/stop", "Full detail"],
              ] as const).map(([v, label, time, desc]) => (
                <button
                  key={v}
                  onClick={() => toggle("narration", v)}
                  className={`rounded-xl border px-3 py-3 text-left transition-all ${
                    prefs.narration === v
                      ? "border-white/50 bg-white/10"
                      : "border-white/10 hover:border-white/25 hover:bg-white/5"
                  }`}
                >
                  <p className={`text-sm font-semibold mb-1 ${prefs.narration === v ? "text-white" : "text-white/60"}`}>{label}</p>
                  <p className="text-[10px] text-white/50">{time}</p>
                  <p className="text-[10px] text-white/30">{desc}</p>
                </button>
              ))}
            </div>
          </Section>

          {/* Budget */}
          <Section title="Budget" sub="Filters stops by entrance fee">
            <div className="flex flex-wrap gap-2">
              {([
                ["free",   "Free only"],
                ["budget", "Budget (under €15)"],
                ["mid",    "Mid-range (under €40)"],
                ["any",    "No limit"],
              ] as const).map(([v, l]) => (
                <Pill key={v} active={prefs.budget === v} onClick={() => toggle("budget", v)}>{l}</Pill>
              ))}
            </div>
          </Section>

          {/* Language */}
          <Section title="Narration language">
            <div className="flex flex-wrap gap-2">
              {locales.map((l) => (
                <Pill key={l} active={prefs.language === l} onClick={() => toggle("language", l as Locale)}>
                  {LANG_LABELS[l as Locale]}
                </Pill>
              ))}
            </div>
          </Section>

          {/* Pace */}
          <Section title="Walking pace" sub="Affects travel time between stops">
            <div className="flex flex-wrap gap-2">
              {([
                ["leisurely", "Leisurely (slow)"],
                ["moderate",  "Moderate"],
                ["fast",      "Fast-paced"],
              ] as const).map(([v, l]) => (
                <Pill key={v} active={prefs.pace === v} onClick={() => toggle("pace", v)}>{l}</Pill>
              ))}
            </div>
          </Section>
        </div>

        {/* ── Right: Live preview ── */}
        <div className="lg:sticky lg:top-6 self-start">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
            {/* Preview header */}
            <div
              className="px-5 py-4 border-b border-white/10"
              style={{ background: `linear-gradient(135deg, ${city.coverColor}55 0%, transparent 100%)` }}
            >
              <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Your tour</p>
              <p className="font-bold text-white">{city.name} — {THEMES.find((t) => t.id === prefs.theme)?.label}</p>
              <div className="flex gap-3 mt-2 text-xs text-white/40">
                <span>{filteredStops.length} stops</span>
                <span>{totalHours}h walking</span>
                <span className="capitalize">{prefs.narration} narration</span>
              </div>
            </div>

            {/* Stop list */}
            <div className="px-5 py-3 max-h-[400px] overflow-y-auto">
              {filteredStops.length === 0 ? (
                <p className="text-white/30 text-sm py-4 text-center">No stops match. Try relaxing some filters.</p>
              ) : (
                filteredStops.map((stop, i) => (
                  <StopPreview key={stop.id} stop={stop} index={i} color={city.coverColor} />
                ))
              )}
            </div>

            {/* Build button */}
            <div className="px-5 py-4 border-t border-white/10">
              {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
              <button
                onClick={buildTour}
                disabled={building || filteredStops.length < 2}
                className="w-full bg-yellow-400 text-black font-bold py-3.5 rounded-xl hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {building ? "Creating tour…" : `Start tour (${filteredStops.length} stops)`}
              </button>
              <p className="text-[10px] text-white/25 text-center mt-2">
                Tour is saved to your profile and accessible any time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
