import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/db/supabase";

function safeRedirectPath(next: string | null, fallback: string): string {
  // Only allow relative paths — prevent open redirect to external URLs
  if (!next) return fallback;
  const isRelative = next.startsWith("/") && !next.startsWith("//") && !next.includes("://");
  return isRelative ? next : fallback;
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const upgrade = searchParams.get("upgrade");
  const referer = req.headers.get("referer") ?? "";
  const localeMatch = referer.match(/\/([a-z]{2})(\/|$)/);
  const locale = localeMatch ? localeMatch[1] : "en";
  const next = safeRedirectPath(searchParams.get("next"), `/${locale}/profile`);

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // Only set pro tier when upgrade=pro is explicitly in the invite link
      // comped flag is always true for invite-flow upgrades (not user-controlled)
      if (upgrade === "pro") {
        const db = createAdminClient();
        await db.from("users").upsert(
          { id: data.user.id, tier: "pro", comped: true },
          { onConflict: "id" }
        );
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/${locale}/auth/login?error=auth_failed`);
}
