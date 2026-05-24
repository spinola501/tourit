import { createClient } from "@supabase/supabase-js";
import { createBrowserClient as ssrBrowser, createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SVC  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ── Browser client (client components) ───────────────────────────────────────
// Uses @supabase/ssr so cookies are kept in sync with the server session.
export function createBrowserClient() {
  return ssrBrowser(URL, ANON);
}

// ── Server client (server components & route handlers) ────────────────────────
// Reads/writes cookies so the auth session is available server-side.
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(URL, ANON, {
    cookies: {
      getAll: ()       => cookieStore.getAll(),
      setAll: (pairs) => pairs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
    },
  });
}

// ── Middleware helper ─────────────────────────────────────────────────────────
// Call from middleware.ts to refresh the session on every request.
export function createMiddlewareClient(req: NextRequest, res: NextResponse) {
  return createServerClient(URL, ANON, {
    cookies: {
      getAll: ()       => req.cookies.getAll(),
      setAll: (pairs) => pairs.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
    },
  });
}

// ── Admin client (API routes only — bypasses RLS) ────────────────────────────
export function createAdminClient() {
  return createClient(URL, SVC, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
