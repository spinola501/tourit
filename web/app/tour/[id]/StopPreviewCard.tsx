"use client";

import { useState } from "react";
import { FavoriteButton } from "@/components/FavoriteButton";

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

export type PreviewStop = {
  id: string;
  name: string;
  duration_minutes: number;
  tags: string[];
  accessibility_note: string | null;
  photo_url: string | null;
  content: { category: string; text: string }[];
  practical: { opening_hours: string | null; admission_fee: string | null; nearest_transport: string | null } | null;
};

export function StopPreviewCard({ stop, index, initialFavorited = false }: { stop: PreviewStop; index: number; initialFavorited?: boolean }) {
  const [open, setOpen]           = useState(false);
  const [activeCategory, setActive] = useState(stop.content[0]?.category ?? "history");

  const activeText = stop.content.find((c) => c.category === activeCategory)?.text ?? "";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden transition-all">
      {/* Header row — always visible */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex gap-4 p-5 text-left hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/60">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold">{stop.name}</h3>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-xs text-white/40">⏱ {stop.duration_minutes} min</span>
              <FavoriteButton stopId={stop.id} initialFavorited={initialFavorited} size="sm" />
              <span className="text-white/30 text-xs">{open ? "▲" : "▼"}</span>
            </div>
          </div>

          {/* Summary snippet (always visible) */}
          {!open && stop.content[0] && (
            <p className="text-sm text-white/50 line-clamp-2">
              {stop.content[0].text.slice(0, 140)}…
            </p>
          )}

          {stop.tags.length > 0 && !open && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {stop.tags.map((tag) => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="border-t border-white/10">
          {stop.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={stop.photo_url} alt={stop.name} className="w-full h-48 object-cover" />
          )}
          {/* Category tabs */}
          <div className="flex gap-1.5 overflow-x-auto px-5 pt-3 pb-2" style={{ scrollbarWidth: "none" }}>
            {stop.content.map((c) => (
              <button
                key={c.category}
                onClick={() => setActive(c.category)}
                className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full transition-colors ${
                  c.category === activeCategory
                    ? "bg-white text-black font-semibold"
                    : "bg-white/10 text-white/50 hover:bg-white/20"
                }`}
              >
                {CATEGORY_LABELS[c.category] ?? c.category}
              </button>
            ))}
          </div>

          {/* Narration text */}
          <div className="px-5 py-4 space-y-3 max-h-72 overflow-y-auto">
            {activeText.split("\n\n").map((para, i) => (
              <p key={i} className="text-sm text-white/70 leading-relaxed">{para}</p>
            ))}
          </div>

          {/* Practical + accessibility */}
          {(stop.practical || stop.accessibility_note) && (
            <div className="px-5 pb-4 space-y-3">
              {stop.practical && (
                <div className="rounded-xl border border-white/10 p-3 space-y-1.5">
                  {stop.practical.opening_hours && (
                    <div className="flex gap-2 text-xs text-white/50"><span>⏰</span><span>{stop.practical.opening_hours}</span></div>
                  )}
                  {stop.practical.admission_fee && (
                    <div className="flex gap-2 text-xs text-white/50"><span>🎟</span><span>{stop.practical.admission_fee}</span></div>
                  )}
                  {stop.practical.nearest_transport && (
                    <div className="flex gap-2 text-xs text-white/50"><span>🚇</span><span>{stop.practical.nearest_transport}</span></div>
                  )}
                </div>
              )}
              {stop.accessibility_note && (
                <p className="text-xs text-white/30 italic px-1">♿ {stop.accessibility_note}</p>
              )}
            </div>
          )}

          {/* Tags (in expanded view) */}
          {stop.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-5 pb-4">
              {stop.tags.map((tag) => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50">{tag}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
