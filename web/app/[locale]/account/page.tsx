export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { NavBar } from "@/components/NavBar";
import { createServerSupabaseClient, createAdminClient } from "@/lib/db/supabase";

export default async function AccountPage() {
  const [supabase, locale] = await Promise.all([createServerSupabaseClient(), getLocale()]);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/auth/login`);

  const db = createAdminClient();
  const { data: profile } = await db
    .from("users")
    .select("tier, name")
    .eq("id", user.id)
    .single();

  const tier = (profile?.tier as "free" | "pro") ?? "free";
  const name = profile?.name ?? user.user_metadata?.full_name ?? user.email ?? "";

  if (tier === "pro") redirect(`/${locale}/profile`);

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      <NavBar />

      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <p className="text-sm text-white/40 mb-3">Hi {name.split(" ")[0]} 👋</p>
        <h1 className="text-4xl font-bold mb-4">Unlock the full experience</h1>
        <p className="text-white/50 text-lg mb-12">
          Go Pro to access all 11 content categories, offline tours, premium voices and more.
        </p>

        <div className="grid sm:grid-cols-2 gap-4 text-left mb-10">
          {/* Free */}
          <div className="rounded-2xl border border-white/10 p-6">
            <div className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">Your current plan</div>
            <div className="font-bold text-xl mb-4">Free</div>
            <ul className="space-y-2 text-sm text-white/60">
              <li>✓ Pre-built tours in all cities</li>
              <li>✓ GPS-triggered narration</li>
              <li>✓ History, Fun Facts &amp; Practical info</li>
              <li className="text-white/30">✗ 8 additional content categories</li>
              <li className="text-white/30">✗ Offline download</li>
              <li className="text-white/30">✗ Premium voices</li>
            </ul>
          </div>

          {/* Pro */}
          <div className="rounded-2xl border border-white/30 bg-white/[0.03] p-6 relative overflow-hidden">
            <div className="absolute top-3 right-3 text-xs bg-white text-black font-bold px-2 py-0.5 rounded-full">PRO</div>
            <div className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">Upgrade to</div>
            <div className="font-bold text-xl mb-4">Pro <span className="text-yellow-400">★</span></div>
            <ul className="space-y-2 text-sm text-white/60">
              <li>✓ Everything in Free</li>
              <li>✓ All 11 content categories</li>
              <li>✓ Architecture, Culture, Lore, Food &amp; more</li>
              <li>✓ Offline tour download</li>
              <li>✓ 8 premium voices</li>
              <li>✓ Unlimited saved stops &amp; tours</li>
            </ul>
            <div className="mt-5 pt-4 border-t border-white/10 text-sm text-white/40">from €7.99 / month</div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-white/30 text-sm">
            Stripe billing is coming soon. <Link href={`/${locale}/profile`} className="text-white/60 underline hover:text-white transition-colors">Go to your profile →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
