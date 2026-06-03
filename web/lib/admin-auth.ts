import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

// Timing-safe admin secret check — prevents brute-force timing attacks
export function isAdminAuthorised(req: NextRequest): boolean {
  const provided = req.headers.get("x-admin-secret") ?? "";
  const expected = process.env.ADMIN_SECRET ?? "";
  if (!provided || !expected) return false;
  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false; // buffers of different lengths
  }
}
