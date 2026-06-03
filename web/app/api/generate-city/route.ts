import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/db/supabase";
import { planCity } from "@/lib/generation/plan-city";
import { generateStop } from "@/lib/generation/generate-stop";
import { generateToursForCity } from "@/lib/generation/generate-tours";
import { fetchWikipediaPhoto } from "@/lib/photos/wikipedia";

async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "TourIt <noreply@tourit.es>",
      to: [to],
      subject,
      html,
    }),
  }).catch(() => {});
}

async function runGeneration(
  cityName: string,
  country: string,
  language: string,
  userEmail: string,
  appUrl: string
) {
  const db = createAdminClient();

  try {
    // Plan city
    const plan = await planCity(cityName, country);
    const slug = plan.slug || cityName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    // Check if already exists
    const { data: existing } = await db.from("cities").select("id, slug").ilike("name", cityName).maybeSingle();
    let cityRecord: { id: string; slug: string } | null = existing;

    if (!cityRecord) {
      const { data: newCity } = await db.from("cities").insert({
        slug,
        name: plan.cityName,
        country: plan.country,
        cover_color: plan.coverColor,
        lat: plan.stops[0]?.lat ?? 0,
        lng: plan.stops[0]?.lng ?? 0,
      }).select("id, slug").single();
      cityRecord = newCity;
    }

    if (!cityRecord) throw new Error("Failed to create city");

    const generatedStopIds: string[] = [];

    for (const stop of plan.stops) {
      // Skip duplicates
      const { data: dup } = await db.from("stops").select("id").eq("city_id", cityRecord.id).ilike("name", stop.name).maybeSingle();
      if (dup) { generatedStopIds.push(dup.id); continue; }

      try {
        const generated = await generateStop({
          stopName: stop.name,
          cityName: plan.cityName,
          country: plan.country,
          lat: stop.lat,
          lng: stop.lng,
          language,
        });

        const photoUrl = await fetchWikipediaPhoto(stop.name, `${stop.name}, ${plan.cityName}`).catch(() => null);

        const { data: newStop } = await db.from("stops").insert({
          city_id: cityRecord.id,
          name: generated.name,
          lat: stop.lat,
          lng: stop.lng,
          duration_minutes: generated.duration_minutes,
          tags: generated.tags,
          accessibility_note: generated.accessibility_note,
          photo_url: photoUrl,
          last_generated_at: new Date().toISOString(),
        }).select("id").single();

        if (newStop) {
          generatedStopIds.push(newStop.id);
          await db.from("stop_practical").insert({
            stop_id: newStop.id,
            opening_hours: generated.practical.opening_hours,
            admission_fee: generated.practical.admission_fee,
            nearest_transport: generated.practical.nearest_transport,
          });
          await db.from("stop_content").insert(
            Object.entries(generated.content).map(([category, text]) => ({
              stop_id: newStop.id, category, language, text,
              word_count: (text as string).split(/\s+/).length,
            }))
          );
        }
      } catch { /* continue on individual stop error */ }
    }

    // Generate tours
    const { data: allStops } = await db.from("stops").select("id, name, lat, lng, duration_minutes, tags").eq("city_id", cityRecord.id);
    if (allStops && allStops.length >= 4) {
      try {
        const tourPlans = await generateToursForCity({ name: plan.cityName, country: plan.country }, allStops);
        for (const tp of tourPlans) {
          const { data: tour } = await db.from("tours").insert({
            city_id: cityRecord.id,
            title: tp.title,
            tagline: tp.tagline,
            theme: tp.theme,
            duration_hours: tp.duration_hours,
            cover_color: plan.coverColor,
            tier: "free",
          }).select("id").single();
          if (tour) {
            const matched = tp.stop_names
              .map((n) => allStops.find((s) => s.name.toLowerCase().includes(n.toLowerCase().slice(0, 15))))
              .filter(Boolean);
            if (matched.length >= 3) {
              await db.from("tour_stops").insert(matched.map((s, i) => ({ tour_id: tour.id, stop_id: s!.id, position: i, order_index: i })));
            }
          }
        }
      } catch { /* tours are non-critical */ }
    }

    // Send completion email
    const cityUrl = `${appUrl}/en/city/${cityRecord.slug}`;
    await sendEmail(
      userEmail,
      `Your ${plan.cityName} tour is ready!`,
      `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#0d0d0d;color:#fff;border-radius:12px">
        <h2 style="margin:0 0 8px">Your tour is ready 🎉</h2>
        <p style="color:#aaa;margin:0 0 24px">${plan.cityName}, ${plan.country} — ${generatedStopIds.length} stops generated</p>
        <a href="${cityUrl}" style="display:inline-block;background:#fff;color:#000;padding:12px 28px;border-radius:24px;font-weight:700;text-decoration:none">Open tour →</a>
        <p style="color:#555;font-size:12px;margin:24px 0 0">TourIt · Every place has a story</p>
      </div>`
    );
  } catch (err) {
    // Send failure email
    await sendEmail(
      userEmail,
      `Tour generation failed for ${cityName}`,
      `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#0d0d0d;color:#fff;border-radius:12px">
        <h2 style="margin:0 0 8px">Something went wrong</h2>
        <p style="color:#aaa">We couldn't generate the tour for ${cityName}. Error: ${String(err)}</p>
        <p style="color:#aaa">Please try again from the Discover page.</p>
      </div>`
    ).catch(() => {});
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const db = createAdminClient();
  const { data: profile } = await db.from("users").select("tier").eq("id", user.id).single();
  if (profile?.tier !== "pro") return NextResponse.json({ error: "Pro required" }, { status: 403 });

  const { cityName, country, language = "en" } = await req.json();
  if (!cityName || !country) return NextResponse.json({ error: "cityName and country required" }, { status: 400 });

  // Check if already exists — return immediately
  const { data: existing } = await db.from("cities").select("id, slug").ilike("name", cityName).maybeSingle();
  if (existing) {
    const { count } = await db.from("stops").select("*", { count: "exact", head: true }).eq("city_id", existing.id);
    if ((count ?? 0) > 0) {
      return NextResponse.json({ status: "exists", citySlug: existing.slug });
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://tourit.es";

  // Start background generation — returns immediately, runs via after()
  after(async () => {
    await runGeneration(cityName, country, language, user.email ?? "", appUrl);
  });

  // Compute the slug the generation will use so client can poll
  const anticipatedSlug = cityName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return NextResponse.json({
    status: "started",
    citySlug: existing?.slug ?? anticipatedSlug,
    message: `Generating ${cityName} in the background. You'll receive an email when it's ready.`,
  });
}
