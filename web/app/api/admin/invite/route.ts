import { isAdminAuthorised } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/db/supabase";

function auth(req: NextRequest) {
  return isAdminAuthorised(req);
}

async function sendInviteEmail(email: string, actionLink: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { error: "RESEND_API_KEY not set" };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://tourit.es";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ?? "TourIt <onboarding@resend.dev>",
      to: [email],
      subject: "You've been invited to TourIt Pro",
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#0d0d0d;color:#fff;border-radius:12px">
          <h2 style="margin:0 0 8px">You're invited to TourIt Pro ★</h2>
          <p style="color:#aaa;margin:0 0 24px">
            You've been given complimentary Pro access to TourIt — AI-powered audio tours for curious travellers.
            Click below to set up your account.
          </p>
          <a href="${actionLink}" style="display:inline-block;background:#fff;color:#000;padding:12px 28px;border-radius:24px;font-weight:700;text-decoration:none;margin-bottom:24px">
            Accept invitation →
          </a>
          <p style="color:#555;font-size:12px;margin:0">
            This link expires in 24 hours. If you didn't expect this, you can ignore it.<br/>
            <a href="${appUrl}" style="color:#777">TourIt · Every place has a story</a>
          </p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { error: (err as { message?: string }).message ?? `Resend error ${res.status}` };
  }
  return { error: null };
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const db = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://tourit.es";

  // Check if user already exists in auth
  const { data: { users }, error: listErr } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });

  const existingAuthUser = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (existingAuthUser) {
    // Upgrade existing user — mark as comped
    const { error } = await db
      .from("users")
      .update({ tier: "pro", comped: true })
      .eq("id", existingAuthUser.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ status: "upgraded", email });
  }

  // New user — generate invite link via Supabase, send via Resend (no rate limits)
  const { data: linkData, error: linkErr } = await db.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      redirectTo: `${appUrl}/auth/callback?upgrade=pro&comped=true`,
      data: { pending_tier: "pro", comped: true },
    },
  });

  if (linkErr || !linkData) {
    return NextResponse.json({ error: linkErr?.message ?? "Failed to generate invite link" }, { status: 500 });
  }

  const actionLink = linkData.properties?.action_link;
  if (!actionLink) {
    return NextResponse.json({ error: "No invite link generated" }, { status: 500 });
  }

  const { error: emailError } = await sendInviteEmail(email, actionLink);
  if (emailError) {
    return NextResponse.json({ error: `Invite link generated but email failed: ${emailError}` }, { status: 500 });
  }

  return NextResponse.json({ status: "invited", email });
}
