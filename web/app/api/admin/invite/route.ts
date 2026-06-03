import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/db/supabase";

function auth(req: NextRequest) {
  return req.headers.get("x-admin-secret") === process.env.ADMIN_SECRET;
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const db = createAdminClient();

  const { data: { users }, error: listErr } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });

  const existingAuthUser = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (existingAuthUser) {
    // Upgrade existing user — mark as comped (not a paying subscriber)
    const { error } = await db
      .from("users")
      .update({ tier: "pro", comped: true })
      .eq("id", existingAuthUser.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ status: "upgraded", email });
  }

  // New user — invite with comped flag in redirect URL
  const { error: inviteErr } = await db.auth.admin.inviteUserByEmail(email, {
    data: { pending_tier: "pro", comped: true },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?upgrade=pro&comped=true`,
  });

  if (inviteErr) return NextResponse.json({ error: inviteErr.message }, { status: 500 });
  return NextResponse.json({ status: "invited", email });
}
