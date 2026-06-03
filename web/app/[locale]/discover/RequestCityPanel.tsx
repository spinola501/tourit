"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { locales, type Locale } from "@/i18n/routing";

const LANG_LABELS: Record<Locale, string> = {
  en: "English", es: "Español", fr: "Français", de: "Deutsch",
  pt: "Português", it: "Italiano", ja: "日本語", zh: "中文", eo: "Esperanto",
};

type Phase = "idle" | "starting" | "generating" | "done" | "error";

export function RequestCityPanel() {
  const locale = useLocale() as Locale;
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState<Locale>(locale);
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");
  const [citySlug, setCitySlug] = useState<string | null>(null);
  const [dots, setDots] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dotsRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  function stopPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    if (dotsRef.current) clearInterval(dotsRef.current);
  }

  async function startPolling(slug: string) {
    setPhase("generating");
    setDots(0);
    dotsRef.current = setInterval(() => setDots((d) => (d + 1) % 4), 600);

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/generate-city/status?slug=${encodeURIComponent(slug)}`);
        const data = await res.json();
        if (data.status === "done") {
          stopPolling();
          setCitySlug(data.citySlug);
          setPhase("done");
          setMessage(`${data.cityName} is ready — ${data.stopCount} stops generated.`);
        }
      } catch { /* retry next tick */ }
    }, 5000);
  }

  async function generate() {
    if (!city.trim() || !country.trim() || phase !== "idle") return;
    setPhase("starting");
    setMessage("");

    try {
      const res = await fetch("/api/generate-city", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cityName: city.trim(), country: country.trim(), language }),
      });
      const data = await res.json();

      if (!res.ok) {
        setPhase("error");
        setMessage(data.error ?? "Generation failed. Please try again.");
        return;
      }

      if (data.status === "exists") {
        setCitySlug(data.citySlug);
        setPhase("done");
        setMessage("This city is already in the library!");
        return;
      }

      // Started background generation — begin polling
      setMessage(data.message ?? "Generating in the background…");
      await startPolling(data.citySlug);
    } catch (err) {
      setPhase("error");
      setMessage(String(err));
    }
  }

  function reset() {
    stopPolling();
    setPhase("idle");
    setMessage("");
    setCitySlug(null);
    setCity("");
    setCountry("");
  }

  const running = phase === "starting" || phase === "generating";
  const dotStr = ".".repeat(dots + 1);

  return (
    <div className="mt-16 border-t border-white/10 pt-10">
      <div className="max-w-xl">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-yellow-400">Pro</span>
          <h2 className="text-lg font-semibold text-white">Request a City</h2>
        </div>
        <p className="text-white/50 text-sm mb-5">
          Don&apos;t see your destination? Generate a full audio tour library for any city.
          Generation runs in the background — you&apos;ll get an email when it&apos;s ready.
        </p>

        {phase === "idle" || phase === "starting" ? (
          <>
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
              {phase === "starting" ? "Starting…" : "Generate Tour"}
            </button>
            {language !== locale && (
              <p className="text-xs text-white/30 mt-2">
                Content will be generated in {LANG_LABELS[language]}. App UI stays in {LANG_LABELS[locale]}.
              </p>
            )}
          </>
        ) : phase === "generating" ? (
          <div className="rounded-xl border border-white/10 bg-white/3 p-5 space-y-4">
            {/* Pulse animation */}
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
              <p className="text-sm text-white/70">Generating <strong className="text-white">{city}</strong> in the background{dotStr}</p>
            </div>

            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-400/60 rounded-full animate-pulse" style={{ width: "60%" }} />
            </div>

            <div className="text-xs text-white/40 space-y-1">
              <p>• Researching stops with AI + web search</p>
              <p>• Generating narration for each stop</p>
              <p>• Designing curated tour routes</p>
            </div>

            <div className="rounded-lg bg-yellow-400/10 border border-yellow-400/20 px-4 py-3">
              <p className="text-sm text-yellow-300 font-medium">You can close this page</p>
              <p className="text-xs text-yellow-400/60 mt-0.5">Generation continues in the background. We&apos;ll email you when it&apos;s ready.</p>
            </div>

            <button onClick={reset} className="text-xs text-white/30 hover:text-white/60 transition-colors">
              Cancel monitoring
            </button>
          </div>
        ) : phase === "done" ? (
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full" />
              <p className="text-sm text-green-300 font-medium">{message}</p>
            </div>
            <div className="flex gap-3">
              {citySlug && (
                <button
                  onClick={() => router.push(`/${locale}/city/${citySlug}`)}
                  className="flex-1 bg-white text-black font-semibold py-2.5 rounded-xl hover:bg-white/90 transition-colors text-sm"
                >
                  Open {city} tours →
                </button>
              )}
              <button onClick={reset} className="px-4 py-2.5 border border-white/15 rounded-xl text-sm text-white/50 hover:text-white hover:border-white/30 transition-colors">
                New city
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-3">
            <p className="text-sm text-red-400">{message}</p>
            <button onClick={reset} className="text-xs text-white/50 hover:text-white transition-colors">
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
