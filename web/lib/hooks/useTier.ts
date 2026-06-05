"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@/lib/db/supabase";

export type Tier = "free" | "pro";

export function getCookieTier(): Tier {
  if (typeof document === "undefined") return "free";
  const match = document.cookie.match(/(?:^|;\s*)tourit_tier=([^;]*)/);
  return (match?.[1] as Tier) ?? "free";
}

export function setCookieTier(tier: Tier) {
  const maxAge = 60 * 60 * 24 * 30; // 30 days
  document.cookie = `tourit_tier=${tier}; path=/; max-age=${maxAge}; samesite=lax`;
  window.dispatchEvent(new CustomEvent("tourit_tier_changed", { detail: tier }));
}

export function useTier(): Tier {
  const [tier, setTier] = useState<Tier>("free");

  useEffect(() => {
    // Start with cookie for instant render
    setTier(getCookieTier());

    // Sync with DB on mount — catches tier changes made server-side (e.g. admin invite)
    const supabase = createBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("users").select("tier").eq("id", user.id).single()
        .then(({ data }) => {
          if (data?.tier && data.tier !== getCookieTier()) {
            setCookieTier(data.tier as Tier);
            setTier(data.tier as Tier);
          }
        });
    });

    // Same-tab: custom event fired by setCookieTier
    const onCustom = (e: Event) => setTier((e as CustomEvent<Tier>).detail);
    window.addEventListener("tourit_tier_changed", onCustom);

    // Cross-tab: poll cookie on visibility change
    const onVisibility = () => { if (!document.hidden) setTier(getCookieTier()); };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("tourit_tier_changed", onCustom);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return tier;
}
