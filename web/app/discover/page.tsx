export const dynamic = "force-dynamic";

import { NavBar } from "@/components/NavBar";
import { createAdminClient } from "@/lib/db/supabase";
import { CitySearchGrid } from "./CitySearchGrid";

async function getAllCities() {
  const db = createAdminClient();
  const { data } = await db
    .from("cities")
    .select("id, slug, name, country, emoji, cover_color, tours(count)")
    .order("name");
  return data ?? [];
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const cities = await getAllCities();

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      <NavBar />
      <div className="px-6 py-12 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Discover Tours</h1>
        <p className="text-white/50 mb-8">Pre-built audio tours for curious travellers.</p>
        <CitySearchGrid cities={cities} initialQ={q ?? ""} />
      </div>
    </div>
  );
}
