import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/db/supabase";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  // Preserve locale from referer (e.g. /es/profile → /es)
  const referer = req.headers.get("referer") ?? "";
  const localeMatch = referer.match(/\/([a-z]{2})\//);
  const locale = localeMatch ? localeMatch[1] : "en";
  return NextResponse.redirect(new URL(`/${locale}`, req.url));
}
