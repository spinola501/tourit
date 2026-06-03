import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/db/supabase";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const upgrade = searchParams.get("upgrade");
  // Preserve locale from next param or referer, fall back to "en"
  const nextParam = searchParams.get("next");
  const referer = req.headers.get("referer") ?? "";
  const localeMatch = referer.match(/\/([a-z]{2})(\/|$)/);
  const locale = localeMatch ? localeMatch[1] : "en";
  const next = nextParam ?? `/${locale}/profile`;

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      if (upgrade === "pro") {
        const comped = searchParams.get("comped") === "true";
        const db = createAdminClient();
        await db.from("users").upsert({ id: data.user.id, tier: "pro", comped }, { onConflict: "id" });
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/${locale}/auth/login?error=auth_failed`);
}
