export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient, createAdminClient } from "@/lib/db/supabase";
import ProfileClient from "./ProfileClient";
import { FavoriteButton } from "@/components/FavoriteButton";

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Fetch extended profile from public.users
  const db = createAdminClient();
  const [profileResult, favoritesResult] = await Promise.all([
    db.from("users").select("name, avatar_url, tier, home_city, interests").eq("id", user.id).single(),
    db.from("user_favorites")
      .select("stop_id, stops(id, name, duration_minutes)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  const profile = profileResult.data;
  const savedStops = (favoritesResult.data ?? [])
    .flatMap((r) => (Array.isArray(r.stops) ? r.stops : r.stops ? [r.stops] : []))
    .filter(Boolean) as { id: string; name: string; duration_minutes: number }[];

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <Link href="/" className="font-bold text-lg tracking-tight">TourIt</Link>
        <form action="/auth/signout" method="POST">
          <button type="submit" className="text-sm text-white/50 hover:text-white transition-colors">
            Sign out
          </button>
        </form>
      </nav>

      {savedStops.length > 0 && (
        <section className="max-w-2xl mx-auto px-6 pb-2">
          <div className="rounded-2xl border border-white/10 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40 mb-4">Saved Stops</h2>
            <div className="space-y-2">
              {savedStops.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 py-1.5">
                  <div>
                    <p className="text-sm font-medium text-white">{s.name}</p>
                    <p className="text-xs text-white/40">{s.duration_minutes} min</p>
                  </div>
                  <FavoriteButton stopId={s.id} initialFavorited={true} size="sm" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <ProfileClient
        user={{
          id: user.id,
          email: user.email ?? "",
          name: profile?.name ?? user.user_metadata?.full_name ?? "",
          avatar_url: profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null,
          tier: (profile?.tier as "free" | "pro") ?? "free",
          home_city: profile?.home_city ?? "",
          interests: (profile?.interests as string[]) ?? [],
        }}
      />
    </div>
  );
}
