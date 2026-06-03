export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { getCityBySlug, getStopsByCity } from "@/lib/db/queries";
import { createServerSupabaseClient, createAdminClient } from "@/lib/db/supabase";
import { NavBar } from "@/components/NavBar";
import { TourBuilderForm } from "./TourBuilderForm";

export default async function BuildTourPage({ params }: { params: Promise<{ slug: string; locale: string }> }) {
  const { slug, locale } = await params;

  // Must be Pro
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/${locale}/auth/login`);
    const db = createAdminClient();
    const { data } = await db.from("users").select("tier").eq("id", user.id).single();
    if (data?.tier !== "pro") redirect(`/${locale}/account`);
  } catch {
    redirect(`/${locale}/auth/login`);
  }

  const dbCity = await getCityBySlug(slug);
  if (!dbCity) notFound();

  const rawStops = await getStopsByCity(dbCity.id);
  const stops = (rawStops as unknown as {
    id: string; name: string; duration_minutes: number; tags: string[];
    photo_url: string | null;
    stop_practical: { admission_fee: string | null; opening_hours: string | null } | null;
  }[]).map((s) => ({
    id: s.id,
    name: s.name,
    duration_minutes: s.duration_minutes,
    tags: s.tags ?? [],
    photo_url: s.photo_url,
    admission_fee: s.stop_practical?.admission_fee ?? null,
    opening_hours: s.stop_practical?.opening_hours ?? null,
  }));

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      <NavBar />
      <TourBuilderForm
        city={{ id: dbCity.id, name: dbCity.name, slug, coverColor: dbCity.cover_color ?? "#1a3a5c" }}
        stops={stops}
        locale={locale}
      />
    </div>
  );
}
