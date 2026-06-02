export const dynamic = "force-dynamic";

import { NavBar } from "@/components/NavBar";
import { createServerSupabaseClient, createAdminClient } from "@/lib/db/supabase";
import { CitySearchGrid } from "./CitySearchGrid";
import { RequestCityPanel } from "./RequestCityPanel";

async function getAllCities() {
  const db = createAdminClient();
  const { data } = await db
    .from("cities")
    .select("id, slug, name, country, emoji, cover_color, photo_url, tours(count)")
    .order("name");
  return data ?? [];
}

async function getUserTier(): Promise<"free" | "pro"> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return "free";
    const db = createAdminClient();
    const { data } = await db.from("users").select("tier").eq("id", user.id).single();
    return (data?.tier as "free" | "pro") ?? "free";
  } catch {
    return "free";
  }
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const [cities, tier] = await Promise.all([getAllCities(), getUserTier()]);

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      <NavBar />
      <div className="px-6 py-12 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Discover Tours</h1>
        <p className="text-white/50 mb-8">Pre-built audio tours for curious travellers.</p>
        <CitySearchGrid cities={cities} initialQ={q ?? ""} />
        {tier === "pro" && <RequestCityPanel />}
      </div>
    </div>
  );
}
