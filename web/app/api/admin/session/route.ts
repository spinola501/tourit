import { isAdminAuthorised } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

function isAuthorised(req: NextRequest) {
  return isAdminAuthorised(req);
}

export async function POST(req: NextRequest) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { tier } = await req.json().catch(() => ({ tier: "pro" }));
  const validTiers = ["free", "pro"];
  const resolvedTier = validTiers.includes(tier) ? tier : "pro";

  const cookieStore = await cookies();
  cookieStore.set("tourit_tier", resolvedTier, {
    httpOnly: false, // readable by client JS for UI state
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });

  return NextResponse.json({ ok: true, tier: resolvedTier });
}

export async function DELETE(req: NextRequest) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.delete("tourit_tier");

  return NextResponse.json({ ok: true, tier: "free" });
}

export async function GET(req: NextRequest) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const cookieStore = await cookies();
  const tier = cookieStore.get("tourit_tier")?.value ?? "free";

  return NextResponse.json({ tier });
}
