"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";

export function FavoriteButton({
  stopId,
  initialFavorited = false,
  size = "md",
}: {
  stopId: string;
  initialFavorited?: boolean;
  size?: "sm" | "md";
}) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [error, setError] = useState(false);
  const locale = useLocale();

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (limitReached) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stop_id: stopId }),
      });
      const data = await res.json();
      if (res.status === 403 && data.error === "limit_reached") {
        setLimitReached(true);
      } else if (res.ok) {
        setFavorited(data.favorited);
        setLimitReached(false);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const base = size === "sm" ? "text-sm" : "text-base";

  if (limitReached) {
    return (
      <Link
        href={`/${locale}/account`}
        onClick={(e) => e.stopPropagation()}
        aria-label="Upgrade to Pro to save more stops"
        className="text-xs text-white/40 hover:text-white/70 border border-white/15 hover:border-white/30 px-2.5 py-1 rounded-full transition-colors flex-shrink-0"
      >
        Pro →
      </Link>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label={favorited ? "Remove from saved stops" : "Save this stop"}
      title={favorited ? "Remove from saved" : "Save stop"}
      className={`${base} w-7 h-7 flex items-center justify-center rounded-full transition-all disabled:opacity-50 flex-shrink-0 ${
        error
          ? "text-red-400/50"
          : favorited
          ? "text-red-400 bg-red-400/10 hover:bg-red-400/20"
          : "text-white/25 hover:text-white/60 hover:bg-white/10"
      }`}
    >
      {favorited ? "♥" : "♡"}
    </button>
  );
}
