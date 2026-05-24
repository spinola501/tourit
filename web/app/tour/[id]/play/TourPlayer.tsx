"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useTier } from "@/lib/hooks/useTier";
import { FavoriteButton } from "@/components/FavoriteButton";
import type { PlayerTour, PlayerStop } from "./page";

function isFreeAdmission(fee: string | null): boolean {
  if (!fee) return false;
  const t = fee.toLowerCase().trim();
  return t === "free" || t.startsWith("free") || t === "€0" || t === "$0" || t === "0";
}

function ReportButton({ stopId }: { stopId: string }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);

  const REASONS = ["Info is outdated", "Wrong location", "Factual error", "Audio issue", "Other"];

  async function report(reason: string) {
    await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stop_id: stopId, reason }),
    });
    setSent(true);
    setOpen(false);
  }

  if (sent) return <span className="text-xs text-white/25">Thanks for reporting ✓</span>;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-white/25 hover:text-white/50 transition-colors"
      >
        Report issue
      </button>
      {open && (
        <div className="absolute bottom-6 left-0 bg-[#1c1c1c] border border-white/10 rounded-xl p-2 space-y-0.5 min-w-[160px] z-20 shadow-xl">
          {REASONS.map((r) => (
            <button
              key={r}
              onClick={() => report(r)}
              className="w-full text-left text-xs text-white/60 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  history: "History",
  architecture: "Architecture",
  culture: "Art & Culture",
  fauna: "Fauna",
  flora: "Flora",
  geo: "Geology",
  lore: "Lore",
  funfacts: "Fun Facts",
  food: "Food",
  photography: "Photography",
  practical: "Practical",
};

const FREE_CATEGORIES = new Set(["history", "funfacts", "practical"]);

const VOICES = [
  { id: "bf_emma",    label: "Emma (British)"    },
  { id: "bf_isabella",label: "Isabella (British)" },
  { id: "bm_george",  label: "George (British)"  },
  { id: "bm_lewis",   label: "Lewis (British)"   },
  { id: "af_bella",   label: "Bella (American)"  },
  { id: "af_sarah",   label: "Sarah (American)"  },
  { id: "am_adam",    label: "Adam (American)"   },
  { id: "am_michael", label: "Michael (American)"},
];

// ─── Content length ───────────────────────────────────────────────────────────

type ContentLength = "short" | "medium" | "full";

function applyLength(text: string, length: ContentLength): string {
  if (length === "full") return text;
  const words = text.split(/\s+/);
  const max = length === "short" ? 120 : 300;
  if (words.length <= max) return text;
  return words.slice(0, max).join(" ") + "…";
}

// ─── Day-of-week helpers ──────────────────────────────────────────────────────

const DAY_LABELS  = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL    = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
const DAY_ABBR    = ["sun","mon","tue","wed","thu","fri","sat"];

function isLikelyClosed(openingHours: string | null, dayIndex: number): boolean {
  if (!openingHours) return false;
  const t    = openingHours.toLowerCase();
  const full = DAY_FULL[dayIndex];
  const abbr = DAY_ABBR[dayIndex];
  return [
    `closed ${full}`, `closed on ${full}`, `${full} closed`, `${full}s: closed`,
    `closed ${abbr}`, `closed on ${abbr}`, `${abbr} closed`, `${abbr}: closed`,
  ].some((p) => t.includes(p));
}

// ─── Kokoro TTS hook ──────────────────────────────────────────────────────────

type ModelState = "idle" | "loading" | "ready" | "error";

function useKokoro(voice: string) {
  const [modelState, setModelState]   = useState<ModelState>("idle");
  const [loadProgress, setLoadProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying]     = useState(false);
  const [progress, setProgress]       = useState(0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ttsRef       = useRef<any>(null);
  const audioCtxRef  = useRef<AudioContext | null>(null);
  const sourceRef    = useRef<AudioBufferSourceNode | null>(null);
  const cacheRef     = useRef(new Map<string, Float32Array>());
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const pauseOffRef  = useRef(0);
  const durationRef  = useRef(0);
  const genIdRef     = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setModelState("loading");
      try {
        const { KokoroTTS } = await import("kokoro-js");
        const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0", {
          dtype: "q8",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          progress_callback: (info: any) => {
            if (!cancelled && typeof info.progress === "number")
              setLoadProgress(info.progress / 100);
          },
        });
        if (!cancelled) { ttsRef.current = tts; setModelState("ready"); }
      } catch {
        if (!cancelled) setModelState("error");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const stopAudio = useCallback(() => {
    try { sourceRef.current?.stop(); } catch { /* already stopped */ }
    sourceRef.current = null;
    if (intervalRef.current) clearInterval(intervalRef.current);
    pauseOffRef.current = 0;
    setIsPlaying(false);
    setProgress(0);
  }, []);

  const speak = useCallback(async (text: string) => {
    if (!ttsRef.current || modelState !== "ready") return;
    const id = ++genIdRef.current;
    stopAudio();
    setIsGenerating(true);
    try {
      const key = `${voice}::${text}`;
      let audio = cacheRef.current.get(key);
      if (!audio) {
        const out = await ttsRef.current.generate(text, { voice, speed: 0.92 });
        if (genIdRef.current !== id) return;
        audio = out.audio as Float32Array;
        cacheRef.current.set(key, audio);
      }
      if (genIdRef.current !== id) return;
      setIsGenerating(false);

      if (!audioCtxRef.current || audioCtxRef.current.state === "closed")
        audioCtxRef.current = new AudioContext();
      if (audioCtxRef.current.state === "suspended")
        await audioCtxRef.current.resume();

      const buf    = audioCtxRef.current.createBuffer(1, audio.length, 24000);
      buf.getChannelData(0).set(audio);
      const source = audioCtxRef.current.createBufferSource();
      source.buffer = buf;
      source.connect(audioCtxRef.current.destination);

      durationRef.current  = buf.duration * 1000;
      startTimeRef.current = Date.now();
      pauseOffRef.current  = 0;

      source.onended = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        sourceRef.current = null;
        setIsPlaying(false);
        setProgress(1);
      };
      source.start();
      sourceRef.current = source;
      setIsPlaying(true);
      setProgress(0);
      intervalRef.current = setInterval(() => {
        setProgress(Math.min((Date.now() - startTimeRef.current) / durationRef.current, 0.99));
      }, 250);
    } catch {
      if (genIdRef.current === id) { setIsGenerating(false); setIsPlaying(false); }
    }
  }, [modelState, voice, stopAudio]);

  const pause = useCallback(async () => {
    if (audioCtxRef.current?.state === "running") {
      pauseOffRef.current = Date.now() - startTimeRef.current;
      await audioCtxRef.current.suspend();
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsPlaying(false);
    }
  }, []);

  const resumeAudio = useCallback(async () => {
    if (audioCtxRef.current?.state === "suspended") {
      await audioCtxRef.current.resume();
      startTimeRef.current = Date.now() - pauseOffRef.current;
      intervalRef.current = setInterval(() => {
        setProgress(Math.min((Date.now() - startTimeRef.current) / durationRef.current, 0.99));
      }, 250);
      setIsPlaying(true);
    }
  }, []);

  useEffect(() => () => { stopAudio(); audioCtxRef.current?.close(); }, [stopAudio]);

  return { modelState, loadProgress, isGenerating, isPlaying, progress, speak, pause, resume: resumeAudio, stop: stopAudio };
}

// ─── Model loading banner ─────────────────────────────────────────────────────

function ModelLoadingBanner({ state, progress }: { state: ModelState; progress: number }) {
  if (state === "ready") return null;
  return (
    <div className="flex-shrink-0 bg-white/[0.04] border-b border-white/10 px-5 py-2.5">
      {state === "loading" ? (
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-white/50">Loading voice engine…</p>
              <p className="text-xs text-white/30">{Math.round(progress * 100)}%</p>
            </div>
            <div className="h-0.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-white/40 rounded-full transition-all duration-300" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        </div>
      ) : state === "error" ? (
        <p className="text-xs text-red-400/70">Voice engine failed to load — check connection and reload.</p>
      ) : null}
    </div>
  );
}

// ─── Day selector ─────────────────────────────────────────────────────────────

function DaySelector({ selected, onChange }: { selected: number; onChange: (d: number) => void }) {
  return (
    <div className="px-3 py-2 border-t border-white/10">
      <p className="text-[9px] text-white/25 uppercase tracking-widest mb-1.5">Visiting day</p>
      <div className="flex gap-0.5">
        {DAY_LABELS.map((lbl, i) => (
          <button
            key={i}
            onClick={() => onChange(i)}
            className={`flex-1 text-[9px] py-1 rounded transition-colors ${
              i === selected ? "bg-white text-black font-bold" : "bg-white/10 text-white/40 hover:bg-white/20"
            }`}
          >
            {lbl[0]}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Content length picker ────────────────────────────────────────────────────

function ContentLengthPicker({ value, onChange }: { value: ContentLength; onChange: (v: ContentLength) => void }) {
  return (
    <div className="flex items-center gap-1 px-4 py-1.5 border-b border-white/[0.06] flex-shrink-0">
      <span className="text-[10px] text-white/25 mr-1">Length</span>
      {(["short", "medium", "full"] as ContentLength[]).map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`text-[10px] px-2.5 py-0.5 rounded-full capitalize transition-colors ${
            value === opt ? "bg-white/20 text-white font-semibold" : "text-white/30 hover:text-white/60"
          }`}
        >
          {opt === "short" ? "Short" : opt === "medium" ? "Medium" : "Full"}
        </button>
      ))}
    </div>
  );
}

// ─── Category tabs ────────────────────────────────────────────────────────────

function CategoryTabs({ categories, activeCategory, tier, onChange }: {
  categories: string[];
  activeCategory: string;
  tier: "free" | "pro";
  onChange: (cat: string) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto px-4 pt-2.5 pb-2 flex-shrink-0 border-b border-white/10" style={{ scrollbarWidth: "none" }}>
      {categories.map((cat) => {
        const locked = tier === "free" && !FREE_CATEGORIES.has(cat);
        const active = cat === activeCategory;
        return (
          <button
            key={cat}
            onClick={() => !locked && onChange(cat)}
            title={locked ? "Pro feature — upgrade to unlock" : undefined}
            className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 ${
              active  ? "bg-white text-black font-semibold"
              : locked ? "bg-white/5 text-white/25 cursor-default"
              : "bg-white/10 text-white/50 hover:bg-white/20"
            }`}
          >
            {locked && <span className="text-[9px]">🔒</span>}
            {CATEGORY_LABELS[cat] ?? cat}
          </button>
        );
      })}
    </div>
  );
}

// ─── Narration panel ──────────────────────────────────────────────────────────

function NarrationPanel({ stop, activeCategory, tier, contentLength, onCategoryChange, onLengthChange }: {
  stop: PlayerStop;
  activeCategory: string;
  tier: "free" | "pro";
  contentLength: ContentLength;
  onCategoryChange: (cat: string) => void;
  onLengthChange: (v: ContentLength) => void;
}) {
  const categories = Object.keys(stop.content);
  const locked     = tier === "free" && !FREE_CATEGORIES.has(activeCategory);
  const rawText    = stop.content[activeCategory] ?? "";
  const text       = applyLength(rawText, contentLength);

  return (
    <div className="flex flex-col h-full">
      <ContentLengthPicker value={contentLength} onChange={onLengthChange} />
      <CategoryTabs categories={categories} activeCategory={activeCategory} tier={tier} onChange={onCategoryChange} />

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {locked ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="text-4xl mb-4">★</div>
            <h3 className="font-bold text-lg mb-2">Pro Feature</h3>
            <p className="text-white/50 text-sm mb-6 max-w-xs">
              {CATEGORY_LABELS[activeCategory]} narration is available on the Pro plan.
            </p>
            <Link href="/account" className="bg-white text-black px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-white/90 transition-colors">
              Upgrade to Pro
            </Link>
          </div>
        ) : (
          <>
            {text.split("\n\n").map((para, i) => (
              <p key={i} className="text-white/75 leading-relaxed text-[15px]">{para}</p>
            ))}

            {stop.practical && activeCategory !== "practical" && (
              <div className="rounded-xl border border-white/10 p-4 space-y-2 mt-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">Practical Info</p>
                {stop.practical.opening_hours && (
                  <div className="flex gap-2 text-sm">
                    <span className="text-white/40">⏰</span>
                    <span className="text-white/60">{stop.practical.opening_hours}</span>
                  </div>
                )}
                {stop.practical.admission_fee && (
                  <div className="flex gap-2 text-sm items-center">
                    <span className="text-white/40">🎟</span>
                    <span className="text-white/60">{stop.practical.admission_fee}</span>
                    {isFreeAdmission(stop.practical.admission_fee) && (
                      <span className="text-xs font-semibold text-green-400">Free</span>
                    )}
                  </div>
                )}
                {stop.practical.nearest_transport && (
                  <div className="flex gap-2 text-sm">
                    <span className="text-white/40">🚇</span>
                    <span className="text-white/60">{stop.practical.nearest_transport}</span>
                  </div>
                )}
              </div>
            )}

            {stop.accessibility_note && (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 mt-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">Accessibility</p>
                <p className="text-sm text-white/50">{stop.accessibility_note}</p>
              </div>
            )}
            <div className="flex justify-end pt-2 pb-4">
              <ReportButton stopId={stop.id} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Audio controls ───────────────────────────────────────────────────────────

function AudioControls({ stop, stopIndex, totalStops, isPlaying, isGenerating, progress, onPlay, onPause, onPrev, onNext }: {
  stop: PlayerStop;
  stopIndex: number;
  totalStops: number;
  isPlaying: boolean;
  isGenerating: boolean;
  progress: number;
  onPlay: () => void;
  onPause: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex-shrink-0 border-t border-white/10 px-4 py-3 bg-[#111]">
      {/* Progress bar */}
      <div className="h-0.5 bg-white/10 rounded-full overflow-hidden mb-3">
        <div className="h-full bg-white/40 rounded-full transition-all duration-500" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="flex items-center gap-3">
        {/* Prev */}
        <button onClick={onPrev} disabled={stopIndex === 0} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 disabled:opacity-30 transition-all">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
        </button>
        {/* Play/Pause */}
        <button
          onClick={isPlaying ? onPause : onPlay}
          disabled={isGenerating}
          className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-black hover:bg-white/90 transition-all shadow-lg disabled:opacity-60 flex-shrink-0"
        >
          {isGenerating
            ? <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            : isPlaying
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6zm8-14v14h4V5z"/></svg>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 2 }}><path d="M8 5v14l11-7z"/></svg>}
        </button>
        {/* Next */}
        <button onClick={onNext} disabled={stopIndex === totalStops - 1} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 disabled:opacity-30 transition-all">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6zm8.5 0V6h2v12z"/></svg>
        </button>
        {/* Stop info */}
        <div className="flex-1 min-w-0 ml-1">
          <p className="font-semibold text-sm truncate">{stop.name}</p>
          <p className="text-xs text-white/40">{stopIndex + 1} / {totalStops} · {stop.duration_minutes} min</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main player ──────────────────────────────────────────────────────────────

export default function TourPlayer({ tour }: { tour: PlayerTour }) {
  const tier = useTier();
  const [stopIndex,      setStopIndex]      = useState(0);
  const [activeCategory, setActiveCategory] = useState("history");
  const [gpsMode,        setGpsMode]        = useState(false);
  const [voice,          setVoice]          = useState("bf_emma");
  const [sidebarOpen,    setSidebarOpen]    = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 640 : true
  );
  const [contentLength,  setContentLength]  = useState<ContentLength>("medium");
  const [selectedDay,    setSelectedDay]    = useState(() => new Date().getDay());

  const { modelState, loadProgress, isGenerating, isPlaying, progress, speak, pause, resume, stop } = useKokoro(voice);
  const [favoriteIds, setFavoriteIds] = useState(new Set<string>());

  useEffect(() => {
    fetch("/api/favorites")
      .then((r) => r.json())
      .then((ids: string[]) => setFavoriteIds(new Set(ids)))
      .catch(() => {});
  }, []);

  const currentStop = tour.stops[stopIndex];

  // Play the current (possibly truncated) text for a stop + category
  function playText(stopIdx: number, cat: string, length: ContentLength) {
    const raw = tour.stops[stopIdx]?.content[cat];
    if (!raw) return;
    if (tier === "free" && !FREE_CATEGORIES.has(cat)) return;
    speak(applyLength(raw, length));
  }

  // Navigate to a stop — no autoplay, user presses play intentionally
  function goTo(index: number) {
    stop();
    setStopIndex(index);
    const firstFree = Object.keys(tour.stops[index]?.content ?? {}).find(
      (c) => tier === "pro" || FREE_CATEGORIES.has(c)
    ) ?? "history";
    setActiveCategory(firstFree);
    // intentionally no auto-play here
  }

  function handleCategoryChange(cat: string) {
    if (tier === "free" && !FREE_CATEGORIES.has(cat)) return;
    setActiveCategory(cat);
    stop();
  }

  function handleLengthChange(v: ContentLength) {
    setContentLength(v);
    stop(); // restart so next play uses new length
  }

  function handlePlay() {
    // If AudioContext is suspended, the same audio is paused — resume it
    if (!isPlaying && progress > 0 && progress < 1) {
      resume();
    } else {
      playText(stopIndex, activeCategory, contentLength);
    }
  }

  return (
    <div className="h-screen bg-[#0d0d0d] text-white flex flex-col overflow-hidden">

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0 bg-[#111]">
        <Link href={`/tour/${tour.id}`} onClick={() => stop()} className="text-white/50 hover:text-white text-sm transition-colors">
          ← Back
        </Link>
        <div className="text-center">
          <p className="text-xs font-semibold truncate max-w-[160px]">{tour.title}</p>
          <p className="text-xs text-white/40">{tour.cityName}</p>
        </div>
        <div className="flex items-center gap-2">
          {tier === "pro" && <span className="text-xs text-yellow-400 font-semibold">★ Pro</span>}
          <button
            onClick={() => setGpsMode(!gpsMode)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-colors border ${
              gpsMode ? "bg-green-500/20 border-green-500/40 text-green-400" : "bg-white/10 border-white/20 text-white/50"
            }`}
          >
            {gpsMode ? "📍 GPS" : "👆 Manual"}
          </button>
        </div>
      </div>

      {/* Model loading banner */}
      <ModelLoadingBanner state={modelState} progress={loadProgress} />

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* Stops sidebar — retractable */}
        <div
          className="flex-shrink-0 border-r border-white/10 flex flex-col bg-[#0f0f0f] overflow-hidden transition-all duration-200"
          style={{ width: sidebarOpen ? "13rem" : "2.75rem" }}
        >
          {/* Sidebar header + toggle */}
          <div className="flex items-center justify-between px-2 pt-3 pb-2 flex-shrink-0">
            {sidebarOpen && (
              <p className="text-xs font-semibold uppercase tracking-widest text-white/30 pl-2">
                {tour.stops.length} Stops
              </p>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="ml-auto w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white/40 hover:bg-white/20 hover:text-white/70 transition-colors text-xs flex-shrink-0"
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {sidebarOpen ? "‹" : "›"}
            </button>
          </div>

          {/* Stop list */}
          <div className="flex-1 overflow-y-auto px-1.5 pb-3 space-y-1">
            {tour.stops.map((s, i) => {
              const isActive = i === stopIndex;
              const closed   = isLikelyClosed(s.practical?.opening_hours ?? null, selectedDay);
              return (
                <button
                  key={s.id}
                  onClick={() => goTo(i)}
                  title={s.name}
                  className={`w-full text-left rounded-xl transition-all ${
                    sidebarOpen ? "px-3 py-3" : "px-1.5 py-2 flex justify-center"
                  } ${
                    isActive
                      ? "bg-white/12 border border-white/20"
                      : "hover:bg-white/[0.05] border border-transparent"
                  }`}
                >
                  {sidebarOpen ? (
                    <div className="flex items-center gap-2.5">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isActive ? "bg-white text-black" : "bg-white/10 text-white/40"}`}>
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-medium leading-tight truncate ${isActive ? "text-white" : "text-white/60"}`}>
                          {s.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-[10px] text-white/30">{s.duration_minutes} min</p>
                          {closed && <span className="text-[9px] text-amber-400/70">⚠ closed</span>}
                          {isFreeAdmission(s.practical?.admission_fee ?? null) && (
                            <span className="text-[9px] text-green-400/60">Free</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${isActive ? "bg-white text-black" : "bg-white/10 text-white/40"}`}>
                        {i + 1}
                      </span>
                      {closed && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400/70" />
                      )}
                    </div>
                  )}

                  {sidebarOpen && isActive && isPlaying && (
                    <div className="flex gap-0.5 mt-2 ml-7">
                      {[1, 2, 3].map((b) => (
                        <div key={b} className="w-0.5 bg-white/50 rounded-full animate-pulse"
                          style={{ height: `${6 + b * 3}px`, animationDelay: `${b * 0.15}s` }} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sidebar footer controls */}
          {sidebarOpen && (
            <>
              <DaySelector selected={selectedDay} onChange={setSelectedDay} />
              {tier === "pro" && (
                <div className="px-3 py-2 border-t border-white/10">
                  <p className="text-[9px] text-white/25 uppercase tracking-widest mb-1.5">Voice</p>
                  <select
                    value={voice}
                    onChange={(e) => { setVoice(e.target.value); stop(); }}
                    className="w-full text-xs bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white/60 focus:outline-none focus:border-white/40"
                  >
                    {VOICES.map((v) => (
                      <option key={v.id} value={v.id} className="bg-[#1a1a1a]">{v.label}</option>
                    ))}
                  </select>
                </div>
              )}
              {gpsMode && (
                <div className="px-3 py-2 border-t border-white/10">
                  <p className="text-[10px] text-white/30 leading-relaxed">📍 Narration plays when you arrive at each stop.</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Narration area */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Stop photo */}
          {currentStop.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentStop.photo_url}
              alt={currentStop.name}
              className="w-full h-24 sm:h-36 object-cover flex-shrink-0"
            />
          )}

          {/* Stop header */}
          <div className="flex-shrink-0 px-5 pt-3 pb-2 border-b border-white/10">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-bold text-lg leading-tight flex-1 min-w-0">{currentStop.name}</h2>
              <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                <FavoriteButton
                  key={currentStop.id}
                  stopId={currentStop.id}
                  initialFavorited={favoriteIds.has(currentStop.id)}
                  size="sm"
                />
                {isLikelyClosed(currentStop.practical?.opening_hours ?? null, selectedDay) && (
                  <span className="text-xs text-amber-400/80 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full flex-shrink-0">
                    ⚠ May be closed {DAY_LABELS[selectedDay]}
                  </span>
                )}
              </div>
            </div>
            {currentStop.tags.length > 0 && (
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                {currentStop.tags.slice(0, 4).map((tag) => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/40">{tag}</span>
                ))}
              </div>
            )}
          </div>

          {/* Narration panel */}
          <div className="flex-1 overflow-hidden">
            <NarrationPanel
              stop={currentStop}
              activeCategory={activeCategory}
              tier={tier}
              contentLength={contentLength}
              onCategoryChange={handleCategoryChange}
              onLengthChange={handleLengthChange}
            />
          </div>
        </div>
      </div>

      {/* Audio controls */}
      <AudioControls
        stop={currentStop}
        stopIndex={stopIndex}
        totalStops={tour.stops.length}
        isPlaying={isPlaying}
        isGenerating={isGenerating}
        progress={progress}
        onPlay={handlePlay}
        onPause={pause}
        onPrev={() => stopIndex > 0 && goTo(stopIndex - 1)}
        onNext={() => stopIndex < tour.stops.length - 1 && goTo(stopIndex + 1)}
      />
    </div>
  );
}
