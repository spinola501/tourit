"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
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

  if (sent) return <span className="text-xs text-slate-400 dark:text-white/25">Thanks for reporting ✓</span>;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-slate-400 dark:text-white/25 hover:text-slate-600 dark:hover:text-white/50 transition-colors"
      >
        Report issue
      </button>
      {open && (
        <div className="absolute bottom-6 left-0 bg-white dark:bg-[#1c1c1c] border border-slate-200 dark:border-white/10 rounded-xl p-2 space-y-0.5 min-w-[160px] z-20 shadow-xl">
          {REASONS.map((r) => (
            <button
              key={r}
              onClick={() => report(r)}
              className="w-full text-left text-xs text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
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

// Truncate to approximate word count, snapping to the nearest sentence boundary
function applyLength(text: string, length: ContentLength): string {
  if (length === "full") return text;
  const words = text.split(/\s+/);
  const maxWords = length === "short" ? 100 : 280;
  if (words.length <= maxWords) return text;
  const rough = words.slice(0, maxWords).join(" ");
  const lastStop = Math.max(
    rough.lastIndexOf(". "),
    rough.lastIndexOf("! "),
    rough.lastIndexOf("? ")
  );
  if (lastStop >= rough.length * 0.55) return rough.slice(0, lastStop + 1);
  return rough + "…";
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

// ─── Kokoro TTS hook (with Web Speech API fallback) ───────────────────────────

type ModelState = "idle" | "loading" | "ready" | "error";

function useKokoro(voice: string) {
  const [modelState,   setModelState]   = useState<ModelState>("idle");
  const [loadProgress, setLoadProgress] = useState(0);
  const [usingFallback, setUsingFallback] = useState(false);
  const [retryCount,   setRetryCount]   = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [progress,     setProgress]     = useState(0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ttsRef       = useRef<any>(null);
  const fallbackRef  = useRef(false);
  const audioCtxRef  = useRef<AudioContext | null>(null);
  const sourceRef    = useRef<AudioBufferSourceNode | null>(null);
  const cacheRef     = useRef(new Map<string, Float32Array>());
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const pauseOffRef  = useRef(0);
  const durationRef  = useRef(0);
  const genIdRef     = useRef(0);

  // On mobile, skip Kokoro (WASM unreliable on Android Chrome) and use Web Speech API immediately.
  // On desktop, try Kokoro and fall back to Web Speech API on failure.
  useEffect(() => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile || fallbackRef.current) {
      if ("speechSynthesis" in window) {
        fallbackRef.current = true;
        setUsingFallback(true);
        setModelState("ready");
      } else {
        setModelState("error");
      }
      return;
    }

    let cancelled = false;
    ttsRef.current = null;
    setModelState("loading");
    setLoadProgress(0);
    (async () => {
      try {
        const { KokoroTTS } = await import("kokoro-js");
        const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0", {
          dtype: "q4",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          progress_callback: (info: any) => {
            if (!cancelled && typeof info.progress === "number")
              setLoadProgress(info.progress / 100);
          },
        });
        if (!cancelled) { ttsRef.current = tts; setModelState("ready"); }
      } catch (err) {
        console.error("[Kokoro]", err);
        if (!cancelled && "speechSynthesis" in window) {
          fallbackRef.current = true;
          setUsingFallback(true);
          setModelState("ready");
        } else if (!cancelled) {
          setModelState("error");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [retryCount]);

  // ── Kokoro audio helpers ──
  const stopKokoro = useCallback(() => {
    try { sourceRef.current?.stop(); } catch { /* already stopped */ }
    sourceRef.current = null;
    if (intervalRef.current) clearInterval(intervalRef.current);
    pauseOffRef.current = 0;
    setIsPlaying(false);
    setProgress(0);
  }, []);

  // ── Web Speech API helpers ──
  const stopFallback = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setProgress(0);
  }, []);

  const stopAudio = useCallback(() => {
    if (fallbackRef.current) stopFallback(); else stopKokoro();
  }, [stopFallback, stopKokoro]);

  const speak = useCallback(async (text: string) => {
    if (modelState !== "ready") return;

    // ── Web Speech API path ──
    if (fallbackRef.current) {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = "en-GB";
      utt.rate = 0.88;
      utt.onstart  = () => { setIsPlaying(true); setProgress(0); };
      utt.onend    = () => { setIsPlaying(false); setProgress(1); };
      utt.onerror  = () => { setIsPlaying(false); };
      window.speechSynthesis.speak(utt);
      return;
    }

    // ── Kokoro path ──
    if (!ttsRef.current) return;
    const id = ++genIdRef.current;
    stopKokoro();
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

      const buf = audioCtxRef.current.createBuffer(1, audio.length, 24000);
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
  }, [modelState, voice, stopKokoro]);

  const pause = useCallback(async () => {
    if (fallbackRef.current) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
      return;
    }
    if (audioCtxRef.current?.state === "running") {
      pauseOffRef.current = Date.now() - startTimeRef.current;
      await audioCtxRef.current.suspend();
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsPlaying(false);
    }
  }, []);

  const resumeAudio = useCallback(async () => {
    if (fallbackRef.current) {
      window.speechSynthesis.resume();
      setIsPlaying(true);
      return;
    }
    if (audioCtxRef.current?.state === "suspended") {
      await audioCtxRef.current.resume();
      startTimeRef.current = Date.now() - pauseOffRef.current;
      intervalRef.current = setInterval(() => {
        setProgress(Math.min((Date.now() - startTimeRef.current) / durationRef.current, 0.99));
      }, 250);
      setIsPlaying(true);
    }
  }, []);

  const retry = useCallback(() => {
    fallbackRef.current = false;
    setUsingFallback(false);
    setRetryCount((c) => c + 1);
  }, []);

  useEffect(() => () => { stopKokoro(); audioCtxRef.current?.close(); }, [stopKokoro]);

  return { modelState, loadProgress, usingFallback, isGenerating, isPlaying, progress, speak, pause, resume: resumeAudio, stop: stopAudio, retry };
}

// ─── Model loading banner ─────────────────────────────────────────────────────

function ModelLoadingBanner({ state, progress, usingFallback, onRetry }: {
  state: ModelState; progress: number; usingFallback: boolean; onRetry: () => void;
}) {
  if (state === "ready" && !usingFallback) return null;
  if (state === "ready" && usingFallback) return (
    <div className="flex-shrink-0 border-b border-amber-500/20 px-5 py-2 bg-amber-500/5 flex items-center justify-between gap-4">
      <p className="text-xs text-amber-600 dark:text-amber-400/70">Using browser voice — tap Retry to load premium audio.</p>
      <button onClick={onRetry} className="text-xs text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white px-3 py-1 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors flex-shrink-0">
        Retry
      </button>
    </div>
  );
  return (
    <div className="flex-shrink-0 border-b border-slate-200 dark:border-white/10 px-5 py-2.5 bg-slate-50 dark:bg-white/[0.04]">
      {state === "loading" ? (
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-slate-500 dark:text-white/50">Loading voice engine… (~40 MB, one-time)</p>
              <p className="text-xs text-slate-400 dark:text-white/30">{Math.round(progress * 100)}%</p>
            </div>
            <div className="h-0.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-slate-500 dark:bg-white/40 rounded-full transition-all duration-300" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        </div>
      ) : state === "error" ? (
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-red-500 dark:text-red-400/70">Voice engine unavailable — no audio supported on this browser.</p>
        </div>
      ) : null}
    </div>
  );
}

// ─── Day selector ─────────────────────────────────────────────────────────────

function DaySelector({ selected, onChange }: { selected: number; onChange: (d: number) => void }) {
  return (
    <div className="px-3 py-2 border-t border-slate-200 dark:border-white/10">
      <p className="text-[9px] text-slate-400 dark:text-white/25 uppercase tracking-widest mb-1.5">Visiting day</p>
      <div className="flex gap-0.5">
        {DAY_LABELS.map((lbl, i) => (
          <button
            key={i}
            onClick={() => onChange(i)}
            className={`flex-1 text-[9px] py-1 rounded transition-colors ${
              i === selected
                ? "bg-slate-800 dark:bg-white text-white dark:text-black font-bold"
                : "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/40 hover:bg-slate-200 dark:hover:bg-white/20"
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
    <div className="flex items-center gap-1 px-4 py-1.5 border-b border-slate-100 dark:border-white/[0.06] flex-shrink-0">
      <span className="text-[10px] text-slate-400 dark:text-white/25 mr-1">Length</span>
      {(["short", "medium", "full"] as ContentLength[]).map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`text-[10px] px-2.5 py-0.5 rounded-full capitalize transition-colors ${
            value === opt
              ? "bg-slate-200 dark:bg-white/20 text-slate-900 dark:text-white font-semibold"
              : "text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/60"
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
    <div className="flex gap-1.5 overflow-x-auto px-4 pt-2.5 pb-2 flex-shrink-0 border-b border-slate-200 dark:border-white/10" style={{ scrollbarWidth: "none" }}>
      {categories.map((cat) => {
        const locked = tier === "free" && !FREE_CATEGORIES.has(cat);
        const active = cat === activeCategory;
        return (
          <button
            key={cat}
            onClick={() => !locked && onChange(cat)}
            title={locked ? "Pro feature — upgrade to unlock" : undefined}
            className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 ${
              active
                ? "bg-slate-800 dark:bg-white text-white dark:text-black font-semibold"
                : locked
                ? "bg-slate-100 dark:bg-white/5 text-slate-300 dark:text-white/25 cursor-default"
                : "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/50 hover:bg-slate-200 dark:hover:bg-white/20"
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

// Only show categories that have at least 40 words of content
const MIN_WORDS_TO_SHOW = 40;

function NarrationPanel({ stop, activeCategory, tier, contentLength, coverColor, onCategoryChange, onLengthChange }: {
  stop: PlayerStop;
  activeCategory: string;
  tier: "free" | "pro";
  contentLength: ContentLength;
  coverColor: string;
  onCategoryChange: (cat: string) => void;
  onLengthChange: (v: ContentLength) => void;
}) {
  const categories = Object.keys(stop.content).filter(
    (cat) => (stop.content[cat]?.trim().split(/\s+/).length ?? 0) >= MIN_WORDS_TO_SHOW
  );
  const locked  = tier === "free" && !FREE_CATEGORIES.has(activeCategory);
  const rawText = stop.content[activeCategory] ?? "";
  const text    = applyLength(rawText, contentLength);

  return (
    <div className="flex flex-col h-full">
      <ContentLengthPicker value={contentLength} onChange={onLengthChange} />
      <CategoryTabs categories={categories} activeCategory={activeCategory} tier={tier} onChange={onCategoryChange} />

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {locked ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="text-4xl mb-4" style={{ color: coverColor }}>★</div>
            <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">Pro Feature</h3>
            <p className="text-slate-500 dark:text-white/50 text-sm mb-6 max-w-xs">
              {CATEGORY_LABELS[activeCategory]} narration is available on the Pro plan.
            </p>
            <Link href="/account" className="bg-slate-900 dark:bg-white text-white dark:text-black px-6 py-2.5 rounded-full font-semibold text-sm hover:opacity-90 transition-opacity">
              Upgrade to Pro
            </Link>
          </div>
        ) : (
          <>
            {text ? text.split("\n\n").map((para, i) => (
              <p key={i} className="text-slate-700 dark:text-white/75 leading-relaxed text-[15px]">{para}</p>
            )) : (
              <p className="text-slate-400 dark:text-white/30 text-sm italic">No content available for this category.</p>
            )}

            {stop.practical && activeCategory !== "practical" && (
              <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4 space-y-2.5 mt-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-white/40">Practical Info</p>
                  {stop.practical.last_verified_at && (
                    <p className="text-[10px] text-slate-400 dark:text-white/25">
                      Verified {new Date(stop.practical.last_verified_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                    </p>
                  )}
                </div>
                {stop.practical.opening_hours && (
                  <div className="flex gap-3 text-sm">
                    <svg className="w-4 h-4 text-slate-400 dark:text-white/30 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    <span className="text-slate-600 dark:text-white/60">{stop.practical.opening_hours}</span>
                  </div>
                )}
                {stop.practical.admission_fee && (
                  <div className="flex gap-3 text-sm items-start">
                    <svg className="w-4 h-4 text-slate-400 dark:text-white/30 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M15 5H9a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"/><path d="M9 10h6M9 14h4"/></svg>
                    <span className="text-slate-600 dark:text-white/60">{stop.practical.admission_fee}</span>
                    {isFreeAdmission(stop.practical.admission_fee) && (
                      <span className="text-xs font-semibold text-green-600 dark:text-green-400 ml-1">Free entry</span>
                    )}
                  </div>
                )}
                {stop.practical.nearest_transport && (
                  <div className="flex gap-3 text-sm">
                    <svg className="w-4 h-4 text-slate-400 dark:text-white/30 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="4" width="16" height="12" rx="2"/><path d="M4 12h16M8 18l-2 2M16 18l2 2M12 16v4"/></svg>
                    <span className="text-slate-600 dark:text-white/60">{stop.practical.nearest_transport}</span>
                  </div>
                )}
              </div>
            )}

            {stop.accessibility_note && (
              <div className="rounded-xl border border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-4 mt-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-white/40 mb-2">Accessibility</p>
                <p className="text-sm text-slate-500 dark:text-white/50">{stop.accessibility_note}</p>
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
    <div className="flex-shrink-0 border-t border-slate-200 dark:border-white/10 px-4 py-3 bg-white dark:bg-[#111]">
      {/* Progress bar */}
      <div className="h-0.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden mb-3">
        <div className="h-full bg-slate-600 dark:bg-white/40 rounded-full transition-all duration-500" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="flex items-center gap-3">
        {/* Prev */}
        <button onClick={onPrev} disabled={stopIndex === 0} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/20 disabled:opacity-30 transition-all">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
        </button>
        {/* Play/Pause */}
        <button
          onClick={isPlaying ? onPause : onPlay}
          disabled={isGenerating}
          className="w-14 h-14 rounded-full bg-slate-900 dark:bg-white flex items-center justify-center text-white dark:text-black hover:opacity-90 transition-all shadow-lg disabled:opacity-60 flex-shrink-0"
        >
          {isGenerating
            ? <span className="w-4 h-4 border-2 border-white/30 dark:border-black/30 border-t-white dark:border-t-black rounded-full animate-spin" />
            : isPlaying
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6zm8-14v14h4V5z"/></svg>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 2 }}><path d="M8 5v14l11-7z"/></svg>}
        </button>
        {/* Next */}
        <button onClick={onNext} disabled={stopIndex === totalStops - 1} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/20 disabled:opacity-30 transition-all">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6zm8.5 0V6h2v12z"/></svg>
        </button>
        {/* Stop info */}
        <div className="flex-1 min-w-0 ml-1">
          <p className="font-semibold text-sm truncate text-slate-900 dark:text-white">{stop.name}</p>
          <p className="text-xs text-slate-400 dark:text-white/40">{stopIndex + 1} / {totalStops} · {stop.duration_minutes} min</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main player ──────────────────────────────────────────────────────────────

export default function TourPlayer({ tour, initialLength = "medium" }: { tour: PlayerTour; initialLength?: "short" | "medium" | "full" }) {
  const tier = useTier();
  const locale = useLocale();
  const [stopIndex,      setStopIndex]      = useState(0);
  const [activeCategory, setActiveCategory] = useState("history");
  const [gpsMode,        setGpsMode]        = useState(false);
  const [voice,          setVoice]          = useState("bf_emma");
  const [sidebarOpen,    setSidebarOpen]    = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 640 : true
  );
  const [contentLength,  setContentLength]  = useState<ContentLength>(initialLength);
  const [selectedDay,    setSelectedDay]    = useState(() => new Date().getDay());
  const [isDark,         setIsDark]         = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("player-theme") !== "light";
  });

  const { modelState, loadProgress, usingFallback, isGenerating, isPlaying, progress, speak, pause, resume, stop, retry } = useKokoro(voice);
  const [favoriteIds, setFavoriteIds] = useState(new Set<string>());

  useEffect(() => {
    fetch("/api/favorites")
      .then((r) => r.json())
      .then((ids: string[]) => setFavoriteIds(new Set(ids)))
      .catch(() => {});
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("player-theme", next ? "dark" : "light");
  }

  const currentStop = tour.stops[stopIndex];

  function playText(stopIdx: number, cat: string, length: ContentLength) {
    const raw = tour.stops[stopIdx]?.content[cat];
    if (!raw) return;
    if (tier === "free" && !FREE_CATEGORIES.has(cat)) return;
    speak(applyLength(raw, length));
  }

  function goTo(index: number) {
    stop();
    setStopIndex(index);
    const firstFree = Object.keys(tour.stops[index]?.content ?? {}).find(
      (c) => tier === "pro" || FREE_CATEGORIES.has(c)
    ) ?? "history";
    setActiveCategory(firstFree);
  }

  function handleCategoryChange(cat: string) {
    if (tier === "free" && !FREE_CATEGORIES.has(cat)) return;
    setActiveCategory(cat);
    stop();
  }

  function handleLengthChange(v: ContentLength) {
    setContentLength(v);
    stop();
  }

  function handlePlay() {
    if (!isPlaying && progress > 0 && progress < 1) {
      resume();
    } else {
      playText(stopIndex, activeCategory, contentLength);
    }
  }

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="h-screen bg-slate-50 dark:bg-[#0d0d0d] text-slate-900 dark:text-white flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-white/10 flex-shrink-0 bg-white dark:bg-[#111]">
          <Link href={`/${locale}/tour/${tour.id}`} onClick={() => stop()} className="text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white text-sm transition-colors">
            ← Back
          </Link>
          <div className="text-center">
            <p className="text-xs font-semibold truncate max-w-[140px] text-slate-900 dark:text-white">{tour.title}</p>
            <p className="text-xs text-slate-400 dark:text-white/40">{tour.cityName}</p>
          </div>
          <div className="flex items-center gap-2">
            {tier === "pro" && <span className="text-xs text-yellow-500 dark:text-yellow-400 font-semibold">★ Pro</span>}
            {/* Light/dark toggle */}
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/20 transition-colors text-sm"
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? "☀" : "🌙"}
            </button>
            <button
              onClick={() => setGpsMode(!gpsMode)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-colors border ${
                gpsMode
                  ? "bg-green-500/20 border-green-500/40 text-green-600 dark:text-green-400"
                  : "bg-slate-100 dark:bg-white/10 border-slate-200 dark:border-white/20 text-slate-500 dark:text-white/50"
              }`}
            >
              {gpsMode ? "📍 GPS" : "👆 Manual"}
            </button>
          </div>
        </div>

        {/* Model loading banner */}
        <ModelLoadingBanner state={modelState} progress={loadProgress} usingFallback={usingFallback} onRetry={retry} />

        {/* Main layout */}
        <div className="flex flex-1 overflow-hidden">

          {/* Stops sidebar — retractable */}
          <div
            className="flex-shrink-0 border-r border-slate-200 dark:border-white/10 flex flex-col bg-slate-100 dark:bg-[#0f0f0f] overflow-hidden transition-all duration-200"
            style={{ width: sidebarOpen ? "13rem" : "2.75rem" }}
          >
            {/* Sidebar header + toggle */}
            <div className="flex items-center justify-between px-2 pt-3 pb-2 flex-shrink-0">
              {sidebarOpen && (
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-white/30 pl-2">
                  {tour.stops.length} Stops
                </p>
              )}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="ml-auto w-7 h-7 rounded-lg bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white/40 hover:bg-slate-300 dark:hover:bg-white/20 hover:text-slate-700 dark:hover:text-white/70 transition-colors text-xs flex-shrink-0"
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
                        ? "bg-slate-200 dark:bg-white/[0.12] border border-slate-300 dark:border-white/20"
                        : "hover:bg-slate-200/60 dark:hover:bg-white/[0.05] border border-transparent"
                    }`}
                  >
                    {sidebarOpen ? (
                      <div className="flex items-center gap-2.5">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          isActive
                            ? "bg-slate-800 dark:bg-white text-white dark:text-black"
                            : "bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-white/40"
                        }`}>
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-medium leading-tight truncate ${isActive ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-white/60"}`}>
                            {s.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <p className="text-[10px] text-slate-400 dark:text-white/30">{s.duration_minutes} min</p>
                            {closed && <span className="text-[9px] text-amber-600 dark:text-amber-400/70">⚠ closed</span>}
                            {isFreeAdmission(s.practical?.admission_fee ?? null) && (
                              <span className="text-[9px] text-green-600 dark:text-green-400/60">Free</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isActive
                            ? "bg-slate-800 dark:bg-white text-white dark:text-black"
                            : "bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-white/40"
                        }`}>
                          {i + 1}
                        </span>
                        {closed && (
                          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400/70" />
                        )}
                      </div>
                    )}

                    {sidebarOpen && isActive && isPlaying && (
                      <div className="flex gap-0.5 mt-2 ml-7">
                        {[1, 2, 3].map((b) => (
                          <div key={b} className="w-0.5 bg-slate-600 dark:bg-white/50 rounded-full animate-pulse"
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
                  <div className="px-3 py-2 border-t border-slate-200 dark:border-white/10">
                    <p className="text-[9px] text-slate-400 dark:text-white/25 uppercase tracking-widest mb-1.5">Voice</p>
                    <select
                      value={voice}
                      onChange={(e) => { setVoice(e.target.value); stop(); }}
                      style={{ colorScheme: "dark" }}
                      className="w-full text-xs bg-slate-200 dark:bg-white/10 border border-slate-300 dark:border-white/20 rounded-lg px-2 py-1 text-slate-700 dark:text-white/60 focus:outline-none focus:border-slate-400 dark:focus:border-white/40"
                    >
                      {VOICES.map((v) => (
                        <option key={v.id} value={v.id} className="bg-white dark:bg-[#1a1a1a]">{v.label}</option>
                      ))}
                    </select>
                  </div>
                )}
                {gpsMode && (
                  <div className="px-3 py-2 border-t border-slate-200 dark:border-white/10">
                    <p className="text-[10px] text-slate-500 dark:text-white/30 leading-relaxed">📍 Narration plays when you arrive at each stop.</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Narration area */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-white dark:bg-[#0d0d0d]">
            {/* Stop photo or gradient placeholder */}
            {currentStop.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentStop.photo_url}
                alt={currentStop.name}
                className="w-full h-24 sm:h-36 object-cover flex-shrink-0"
              />
            ) : (
              <div
                className="w-full h-10 sm:h-16 flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${tour.coverColor}55 0%, ${tour.coverColor}11 100%)` }}
              />
            )}

            {/* Stop header */}
            <div className="flex-shrink-0 px-5 pt-3 pb-2 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-bold text-lg leading-tight flex-1 min-w-0 text-slate-900 dark:text-white">{currentStop.name}</h2>
                <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                  <FavoriteButton
                    key={currentStop.id}
                    stopId={currentStop.id}
                    initialFavorited={favoriteIds.has(currentStop.id)}
                    size="sm"
                  />
                  {isLikelyClosed(currentStop.practical?.opening_hours ?? null, selectedDay) && (
                    <span className="text-xs text-amber-600 dark:text-amber-400/80 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full flex-shrink-0">
                      ⚠ May be closed {DAY_LABELS[selectedDay]}
                    </span>
                  )}
                </div>
              </div>
              {currentStop.tags.length > 0 && (
                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                  {currentStop.tags.slice(0, 4).map((tag) => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/40">{tag}</span>
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
                coverColor={tour.coverColor}
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
    </div>
  );
}
