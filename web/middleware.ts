import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/db/supabase";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient(req, res);
  // Refresh session so server components always see the latest auth state
  await supabase.auth.getUser();
  return res;
}

export const config = {
  matcher: [
    // Run on all routes except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
