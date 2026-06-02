"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { locales, type Locale } from "@/i18n/routing";

const LANG_LABELS: Record<Locale, string> = {
  en: "English", es: "Español", fr: "Français", de: "Deutsch",
  pt: "Português", it: "Italiano", ja: "日本語", zh: "中文", eo: "Esperanto",
};

type Progress = {
  type: "progress" | "done" | "error";
  message: string;
  progress?: number;
  citySlug?: string;
};

export function RequestCityPanel() {
  const locale = useLocale() as Locale;
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState<Locale>(locale);
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<Progress[]>([]);
  const [done, setDone] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const router = useRouter();

  async function generate() {
    if (!city.trim() || !country.trim() || running) return;
    setRunning(true);
    setEvents([]);
    setDone(null);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/generate-city", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cityName: city.trim(), country: country.trim(), language }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setEvents([{ type: "error", message: err.error ?? "Generation failed" }]);
        setRunning(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const evt: Progress = JSON.parse(line.slice(6));
            setEvents((prev) => [...prev, evt]);
            if (evt.type === "done") setDone(evt.citySlug ?? null);
          } catch { /* skip malformed */ }
        }
      }
    } catch (err: unknown) {
      if ((err as Error)?.name !== "AbortError") {
        setEvents((prev) => [...prev, { type: "error", message: String(err) }]);
      }
    }
    setRunning(false);
  }

  const lastEvent = events[events.length - 1];
  const progressPct = lastEvent?.progress ?? (running ? 5 : 0);

  return (
    <div className="mt-16 border-t border-white/10 pt-10">
      <div className="max-w-xl">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-yellow-400">Pro</span>
          <h2 className="text-lg font-semibold text-white">Request a City</h2>
        </div>
        <p className="text-white/50 text-sm mb-5">
          Don&apos;t see your destination? Generate a full audio tour library for any city in minutes.
        </p>

        <div className="flex gap-3 mb-4 flex-wrap">
          <input
            type="text"
            placeholder="City (e.g. Melbourne)"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate()}
            disabled={running}
            className="flex-1 min-w-32 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-white/50 transition-colors disabled:opacity-50"
          />
          <input
            type="text"
            placeholder="Country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate()}
            disabled={running}
            className="w-32 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-white/50 transition-colors disabled:opacity-50"
          />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Locale)}
            disabled={running}
            style={{ colorScheme: "dark" }}
            className="bg-white/10 border border-white/20 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-white/50 transition-colors disabled:opacity-50"
          >
            {locales.map((l) => (
              <option key={l} value={l}>{LANG_LABELS[l]}</option>
            ))}
          </select>
        </div>

        <button
          onClick={generate}
          disabled={running || !city.trim() || !country.trim()}
          className="w-full py-3 bg-yellow-400 text-black font-semibold rounded-xl hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {running ? "Generating…" : "Generate Tour"}
        </button>

        {/* Progress */}
        {(running || events.length > 0) && (
          <div className="mt-4 rounded-xl border border-white/10 bg-white/3 p-4 space-y-3">
            {running && (
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            )}

            <div className="space-y-1 max-h-40 overflow-y-auto">
              {events.map((e, i) => (
                <p key={i} className={`text-xs ${
                  e.type === "error" ? "text-red-400" :
                  e.type === "done"  ? "text-green-400" : "text-white/60"
                }`}>
                  {e.type === "done" ? "✓ " : e.type === "error" ? "✗ " : "· "}
                  {e.message}
                </p>
              ))}
            </div>

            {done && (
              <button
                onClick={() => router.push(`/${locale}/city/${done}`)}
                className="w-full mt-1 bg-white text-black font-semibold py-2.5 rounded-xl hover:bg-white/90 transition-colors text-sm"
              >
                Open {city} tours →
              </button>
            )}
          </div>
        )}

        {language !== locale && !running && !done && (
          <p className="text-xs text-white/30 mt-2">
            Content will be generated in {LANG_LABELS[language]}. App UI stays in {LANG_LABELS[locale]}.
          </p>
        )}
      </div>
    </div>
  );
}
