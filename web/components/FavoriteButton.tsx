"use client";

import { useState } from "react";

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

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stop_id: stopId }),
      });
      if (res.ok) {
        const data = await res.json();
        setFavorited(data.favorited);
      }
    } finally {
      setLoading(false);
    }
  }

  const base = size === "sm" ? "text-sm w-6 h-6" : "text-base w-8 h-8";

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={favorited ? "Remove from saved" : "Save stop"}
      className={`${base} flex items-center justify-center rounded-full transition-all disabled:opacity-50 ${
        favorited
          ? "text-red-400 bg-red-400/10 hover:bg-red-400/20"
          : "text-white/25 hover:text-white/60 hover:bg-white/10"
      }`}
    >
      {favorited ? "♥" : "♡"}
    </button>
  );
}
