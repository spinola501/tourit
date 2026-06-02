"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";

type Progress = {
  type: "progress" | "done" | "error";
  message: string;
  progress?: number;
  citySlug?: string;
};

export function RequestCityPanel() {
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<Progress[]>([]);
  const [done, setDone] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const router = useRouter();
  const locale = useLocale();

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
        body: JSON.stringify({ cityName: city.trim(), country: country.trim() }),
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

        <div className="flex gap-3 mb-4">
          <input
            type="text"
            placeholder="City (e.g. Barcelona)"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            disabled={running}
            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-white/50 transition-colors disabled:opacity-50"
          />
          <input
            type="text"
            placeholder="Country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            disabled={running}
            className="w-36 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-white/50 transition-colors disabled:opacity-50"
          />
          <button
            onClick={generate}
            disabled={running || !city.trim() || !country.trim()}
            className="px-5 py-3 bg-yellow-400 text-black font-semibold rounded-xl hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {running ? "Generating…" : "Generate"}
          </button>
        </div>

        {/* Progress */}
        {(running || events.length > 0) && (
          <div className="rounded-xl border border-white/10 bg-white/3 p-4 space-y-3">
            {/* Progress bar */}
            {running && (
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            )}

            {/* Event log */}
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {events.map((e, i) => (
                <p
                  key={i}
                  className={`text-xs ${
                    e.type === "error" ? "text-red-400" :
                    e.type === "done"  ? "text-green-400" :
                    "text-white/60"
                  }`}
                >
                  {e.type === "done" ? "✓ " : e.type === "error" ? "✗ " : "· "}
                  {e.message}
                </p>
              ))}
            </div>

            {/* Done CTA */}
            {done && (
              <button
                onClick={() => router.push(`/${locale}/city/${done}`)}
                className="w-full mt-2 bg-white text-black font-semibold py-2.5 rounded-xl hover:bg-white/90 transition-colors text-sm"
              >
                Open {city} tours →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
