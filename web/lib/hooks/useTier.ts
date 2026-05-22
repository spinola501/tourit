"use client";

import { useState, useEffect } from "react";

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
    setTier(getCookieTier());

    // Same-tab: custom event fired by setCookieTier
    const onCustom = (e: Event) => setTier((e as CustomEvent<Tier>).detail);
    window.addEventListener("tourit_tier_changed", onCustom);

    // Cross-tab: poll cookie on visibility change (simple, no need for BroadcastChannel)
    const onVisibility = () => { if (!document.hidden) setTier(getCookieTier()); };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("tourit_tier_changed", onCustom);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return tier;
}
