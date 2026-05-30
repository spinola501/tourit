import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { createMiddlewareClient } from "@/lib/db/supabase";

const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Skip locale routing for admin, API, and auth callback/signout routes
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/auth/signout")
  ) {
    const res = NextResponse.next();
    const supabase = createMiddlewareClient(req, res);
    await supabase.auth.getUser();
    return res;
  }

  // Apply next-intl locale routing first
  const intlResponse = intlMiddleware(req);

  // Then refresh Supabase session on the response
  const supabase = createMiddlewareClient(req, intlResponse as NextResponse);
  await supabase.auth.getUser();

  return intlResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
