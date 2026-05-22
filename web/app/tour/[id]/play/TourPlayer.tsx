"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useTier } from "@/lib/hooks/useTier";
import type { PlayerTour, PlayerStop } from "./page";

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

// ─── Web Speech API hook ──────────────────────────────────────────────────────

function useSpeech() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const estimatedDurationRef = useRef(0);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsPlaying(false);
    setProgress(0);
  }, []);

  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    if (intervalRef.current) clearInterval(intervalRef.current);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) =>
        v.lang.startsWith("en") &&
        (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Daniel") || v.name.includes("Samantha"))
    ) ?? voices.find((v) => v.lang.startsWith("en"));
    if (preferred) utterance.voice = preferred;

    const wordCount = text.split(/\s+/).length;
    estimatedDurationRef.current = (wordCount / 120) * 60 * 1000;
    startTimeRef.current = Date.now();

    utterance.onstart = () => {
      setIsPlaying(true);
      setProgress(0);
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        setProgress(Math.min(elapsed / estimatedDurationRef.current, 0.99));
      }, 500);
    };

    utterance.onend = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsPlaying(false);
      setProgress(1);
    };

    utterance.onerror = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsPlaying(false);
      setProgress(0);
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const pause = useCallback(() => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsPlaying(false);
    }
  }, []);

  const resume = useCallback((currentProgress: number) => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      startTimeRef.current = Date.now() - currentProgress * estimatedDurationRef.current;
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        setProgress(Math.min(elapsed / estimatedDurationRef.current, 0.99));
      }, 500);
      setIsPlaying(true);
    }
  }, []);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { isPlaying, progress, speak, pause, resume, stop };
}

// ─── Category tabs ────────────────────────────────────────────────────────────

function CategoryTabs({
  categories,
  activeCategory,
  tier,
  onChange,
}: {
  categories: string[];
  activeCategory: string;
  tier: "free" | "pro";
  onChange: (cat: string) => void;
}) {
  return (
    <div
      className="flex gap-1.5 overflow-x-auto px-4 pt-3 pb-2 flex-shrink-0 border-b border-white/10"
      style={{ scrollbarWidth: "none" }}
    >
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
                ? "bg-white text-black font-semibold"
                : locked
                ? "bg-white/5 text-white/25 cursor-default"
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

function NarrationPanel({
  stop,
  activeCategory,
  tier,
  onCategoryChange,
}: {
  stop: PlayerStop;
  activeCategory: string;
  tier: "free" | "pro";
  onCategoryChange: (cat: string) => void;
}) {
  const categories = Object.keys(stop.content);
  const locked = tier === "free" && !FREE_CATEGORIES.has(activeCategory);
  const text = stop.content[activeCategory] ?? "";

  return (
    <div className="flex flex-col h-full">
      <CategoryTabs
        categories={categories}
        activeCategory={activeCategory}
        tier={tier}
        onChange={onCategoryChange}
      />

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {locked ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="text-4xl mb-4">★</div>
            <h3 className="font-bold text-lg mb-2">Pro Feature</h3>
            <p className="text-white/50 text-sm mb-6 max-w-xs">
              {CATEGORY_LABELS[activeCategory]} narration is available on the Pro plan.
              Unlock all 11 content categories.
            </p>
            <Link
              href="/admin"
              className="bg-white text-black px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-white/90 transition-colors"
            >
              Upgrade to Pro
            </Link>
          </div>
        ) : (
          <>
            {text.split("\n\n").map((para, i) => (
              <p key={i} className="text-white/75 leading-relaxed text-[15px]">
                {para}
              </p>
            ))}

            {stop.practical && (
              <div className="rounded-xl border border-white/10 p-4 space-y-2 mt-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">
                  Practical Info
                </p>
                {stop.practical.opening_hours && (
                  <div className="flex gap-2 text-sm">
                    <span className="text-white/40">⏰</span>
                    <span className="text-white/60">{stop.practical.opening_hours}</span>
                  </div>
                )}
                {stop.practical.admission_fee && (
                  <div className="flex gap-2 text-sm">
                    <span className="text-white/40">🎟</span>
                    <span className="text-white/60">{stop.practical.admission_fee}</span>
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

            <div className="h-4" />
          </>
        )}
      </div>
    </div>
  );
}

// ─── Audio controls ───────────────────────────────────────────────────────────

function AudioControls({
  stop,
  stopIndex,
  totalStops,
  isPlaying,
  progress,
  onPlay,
  onPause,
  onPrev,
  onNext,
}: {
  stop: PlayerStop;
  stopIndex: number;
  totalStops: number;
  isPlaying: boolean;
  progress: number;
  onPlay: () => void;
  onPause: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex-shrink-0 border-t border-white/10 px-5 py-4 bg-[#111]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-semibold text-sm">{stop.name}</p>
          <p className="text-xs text-white/40">
            Stop {stopIndex + 1} of {totalStops} · {stop.duration_minutes} min
          </p>
        </div>
        <span className="text-xs text-white/30">{Math.round(progress * 100)}%</span>
      </div>

      <div className="h-1 bg-white/10 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-white/50 rounded-full transition-all duration-500"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <div className="flex items-center justify-center gap-6">
        <button
          onClick={onPrev}
          disabled={stopIndex === 0}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 disabled:opacity-30 transition-all text-lg"
        >
          ⏮
        </button>
        <button
          onClick={isPlaying ? onPause : onPlay}
          className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-black text-2xl hover:bg-white/90 transition-all shadow-lg"
        >
          {isPlaying ? "⏸" : "▶"}
        </button>
        <button
          onClick={onNext}
          disabled={stopIndex === totalStops - 1}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 disabled:opacity-30 transition-all text-lg"
        >
          ⏭
        </button>
      </div>
    </div>
  );
}

// ─── Main player ──────────────────────────────────────────────────────────────

export default function TourPlayer({ tour }: { tour: PlayerTour }) {
  const tier = useTier();
  const [stopIndex, setStopIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState("history");
  const [gpsMode, setGpsMode] = useState(false);
  const { isPlaying, progress, speak, pause, resume, stop } = useSpeech();

  const currentStop = tour.stops[stopIndex];

  function playText(stopIdx: number, cat: string) {
    const text = tour.stops[stopIdx]?.content[cat];
    if (text && !(tier === "free" && !FREE_CATEGORIES.has(cat))) {
      speak(text);
    }
  }

  function goTo(index: number) {
    stop();
    setStopIndex(index);
    const firstFree = Object.keys(tour.stops[index]?.content ?? {}).find(
      (c) => tier === "pro" || FREE_CATEGORIES.has(c)
    ) ?? "history";
    setActiveCategory(firstFree);
    setTimeout(() => playText(index, firstFree), 100);
  }

  function handleCategoryChange(cat: string) {
    if (tier === "free" && !FREE_CATEGORIES.has(cat)) return;
    setActiveCategory(cat);
    stop();
  }

  function handlePlay() {
    if (window.speechSynthesis.paused) {
      resume(progress);
    } else {
      playText(stopIndex, activeCategory);
    }
  }

  return (
    <div className="h-screen bg-[#0d0d0d] text-white flex flex-col overflow-hidden">

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0 bg-[#111]">
        <Link
          href={`/tour/${tour.id}`}
          onClick={() => stop()}
          className="text-white/50 hover:text-white text-sm transition-colors"
        >
          ← Back
        </Link>

        <div className="text-center">
          <p className="text-xs font-semibold truncate max-w-[160px]">{tour.title}</p>
          <p className="text-xs text-white/40">{tour.cityName}</p>
        </div>

        <div className="flex items-center gap-2">
          {tier === "pro" && (
            <span className="text-xs text-yellow-400 font-semibold">★ Pro</span>
          )}
          <button
            onClick={() => setGpsMode(!gpsMode)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-colors border ${
              gpsMode
                ? "bg-green-500/20 border-green-500/40 text-green-400"
                : "bg-white/10 border-white/20 text-white/50"
            }`}
          >
            {gpsMode ? "📍 GPS" : "👆 Manual"}
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* Stops sidebar */}
        <div className="w-52 flex-shrink-0 border-r border-white/10 flex flex-col bg-[#0f0f0f] overflow-hidden">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/30 px-4 pt-4 pb-2 flex-shrink-0">
            {tour.stops.length} Stops
          </p>
          <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
            {tour.stops.map((s, i) => {
              const isActive = i === stopIndex;
              return (
                <button
                  key={s.id}
                  onClick={() => goTo(i)}
                  className={`w-full text-left rounded-xl px-3 py-3 transition-all ${
                    isActive
                      ? "bg-white/12 border border-white/20"
                      : "hover:bg-white/[0.05] border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        isActive ? "bg-white text-black" : "bg-white/10 text-white/40"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className={`text-xs font-medium leading-tight truncate ${isActive ? "text-white" : "text-white/60"}`}>
                        {s.name}
                      </p>
                      <p className="text-[10px] text-white/30 mt-0.5">{s.duration_minutes} min</p>
                    </div>
                  </div>
                  {isActive && isPlaying && (
                    <div className="flex gap-0.5 mt-2 ml-7">
                      {[1, 2, 3].map((b) => (
                        <div
                          key={b}
                          className="w-0.5 bg-white/50 rounded-full animate-pulse"
                          style={{ height: `${6 + b * 3}px`, animationDelay: `${b * 0.15}s` }}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          {gpsMode && (
            <div className="flex-shrink-0 px-3 py-3 border-t border-white/10">
              <p className="text-[10px] text-white/30 leading-relaxed">
                📍 Narration plays automatically when you arrive at each stop.
              </p>
            </div>
          )}
        </div>

        {/* Narration area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-shrink-0 px-5 pt-4 pb-2 border-b border-white/10">
            <h2 className="font-bold text-lg leading-tight">{currentStop.name}</h2>
            {currentStop.tags.length > 0 && (
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                {currentStop.tags.slice(0, 4).map((tag) => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/40">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <NarrationPanel
              stop={currentStop}
              activeCategory={activeCategory}
              tier={tier}
              onCategoryChange={handleCategoryChange}
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
        progress={progress}
        onPlay={handlePlay}
        onPause={pause}
        onPrev={() => stopIndex > 0 && goTo(stopIndex - 1)}
        onNext={() => stopIndex < tour.stops.length - 1 && goTo(stopIndex + 1)}
      />
    </div>
  );
}
