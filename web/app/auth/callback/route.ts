import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/db/supabase";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const upgrade = searchParams.get("upgrade");
  const next = searchParams.get("next") ?? "/en/profile";

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // Auto-upgrade to Pro if invited with upgrade=pro
      if (upgrade === "pro") {
        const db = createAdminClient();
        await db.from("users").upsert({ id: data.user.id, tier: "pro" }, { onConflict: "id" });
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/en/auth/login?error=auth_failed`);
}
