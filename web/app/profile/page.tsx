export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/db/supabase";
import { createAdminClient } from "@/lib/db/supabase";
import ProfileClient from "./ProfileClient";

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Fetch extended profile from public.users
  const db = createAdminClient();
  const { data: profile } = await db
    .from("users")
    .select("name, avatar_url, tier, home_city, interests")
    .eq("id", user.id)
    .single();

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
