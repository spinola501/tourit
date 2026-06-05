import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/db/supabase";
import { LanguageSwitcher } from "./LanguageSwitcher";

export async function NavBar() {
  const [supabase, t, locale] = await Promise.all([
    createServerSupabaseClient(),
    getTranslations("nav"),
    getLocale(),
  ]);
  const { data: { user } } = await supabase.auth.getUser();

  let tier: "free" | "pro" = "free";
  let avatarUrl: string | null = null;
  let displayName = "";

  if (user) {
    const db = createAdminClient();
    const { data: profile } = await db
      .from("users")
      .select("tier, avatar_url, name")
      .eq("id", user.id)
      .single();
    tier        = (profile?.tier as "free" | "pro") ?? "free";
    avatarUrl   = profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null;
    displayName = profile?.name ?? user.user_metadata?.full_name ?? user.email ?? "";
  }

  const initial = displayName[0]?.toUpperCase() ?? "?";

  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
      <Link href={`/${locale}`} className="font-bold text-lg tracking-tight">TourIt</Link>
      <div className="flex items-center gap-3 text-sm text-white/60">
        <Link href={`/${locale}/discover`} className="hover:text-white transition-colors">{t("discover")}</Link>

        <LanguageSwitcher />

        {user ? (
          <div className="flex items-center gap-3">
            {tier === "pro" && (
              <span className="text-xs text-yellow-400 font-semibold">★ Pro</span>
            )}
            <Link href={`/${locale}/profile`} className="flex items-center gap-2 hover:opacity-80 transition-opacity" aria-label={`Profile: ${displayName}`}>
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={displayName} className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white" aria-hidden="true">
                  {initial}
                </div>
              )}
              <span className="text-white/70 hidden sm:block">{displayName.split(" ")[0]}</span>
            </Link>
          </div>
        ) : (
          <Link
            href={`/${locale}/auth/login`}
            className="bg-white text-black px-4 py-1.5 rounded-full font-medium hover:bg-white/90 transition-colors"
          >
            {t("signIn")}
          </Link>
        )}
      </div>
    </nav>
  );
}
