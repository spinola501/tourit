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

  // Check if user exists in auth
  const { data: { users }, error: listErr } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });

  const existingAuthUser = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (existingAuthUser) {
    // User exists — upgrade tier directly
    const { error } = await db
      .from("users")
      .update({ tier: "pro" })
      .eq("id", existingAuthUser.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ status: "upgraded", email });
  }

  // New user — send Supabase invite with pro metadata
  const { error: inviteErr } = await db.auth.admin.inviteUserByEmail(email, {
    data: { pending_tier: "pro" },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?upgrade=pro`,
  });

  if (inviteErr) return NextResponse.json({ error: inviteErr.message }, { status: 500 });
  return NextResponse.json({ status: "invited", email });
}
