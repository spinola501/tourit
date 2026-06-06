import { NextRequest, NextResponse, after } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/db/supabase";
import { planCity } from "@/lib/generation/plan-city";
import { generateStop } from "@/lib/generation/generate-stop";
import { generateToursForCity } from "@/lib/generation/generate-tours";
import { fetchWikipediaPhoto } from "@/lib/photos/wikipedia";

// Maximise Vercel function lifetime for background generation
export const maxDuration = 300;

const GENERATION_BATCH_SIZE = 5; // parallel stop generation

async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.warn("[email] RESEND_API_KEY not set"); return; }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ?? "TourIt <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  }).catch((e) => { console.error("[email] fetch failed:", e); return null; });
  if (res && !res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[email] Resend error:", res.status, body);
  }
}

async function generateStopWithPhoto(
  stop: { name: string; lat: number; lng: number },
  cityRecord: { id: string },
  cityName: string,
  country: string,
  language: string,
  db: ReturnType<typeof createAdminClient>
): Promise<string | null> {
  try {
    // Skip if already exists
    const { data: dup } = await db.from("stops").select("id")
      .eq("city_id", cityRecord.id).ilike("name", stop.name).maybeSingle();
    if (dup) return dup.id;

    const generated = await generateStop({
      stopName: stop.name, cityName, country,
      lat: stop.lat, lng: stop.lng, language,
    });

    const photoUrl = await fetchWikipediaPhoto(
      `${stop.name} ${cityName}`, stop.name
    ).catch(() => null);

    const { data: newStop } = await db.from("stops").insert({
      city_id: cityRecord.id,
      name: generated.name,
      lat: stop.lat, lng: stop.lng,
      duration_minutes: generated.duration_minutes,
      tags: generated.tags,
      accessibility_note: generated.accessibility_note,
      photo_url: photoUrl,
      last_generated_at: new Date().toISOString(),
    }).select("id").single();

    if (!newStop) return null;

    await Promise.all([
      db.from("stop_practical").insert({
        stop_id: newStop.id,
        opening_hours: generated.practical.opening_hours,
        admission_fee: generated.practical.admission_fee,
        nearest_transport: generated.practical.nearest_transport,
      }),
      db.from("stop_content").insert(
        Object.entries(generated.content).map(([category, text]) => ({
          stop_id: newStop.id, category, language, text,
          word_count: (text as string).split(/\s+/).length,
        }))
      ),
    ]);

    return newStop.id;
  } catch (err) {
    console.error(`[generate-city] stop failed: ${stop.name}`, String(err));
    return null;
  }
}

async function runGeneration(
  cityName: string,
  country: string,
  language: string,
  userEmail: string,
  appUrl: string
) {
  const db = createAdminClient();
  let cityRecord: { id: string; slug: string } | null = null;
  let planCityName = cityName;
  let planCountry = country;
  let planCoverColor = "#1a3a5c";

  try {
    console.log(`[generate-city] starting: ${cityName}, ${country}`);

    // Plan the city — use Claude Sonnet for better stop coverage
    const plan = await planCity(cityName, country);
    planCityName = plan.cityName;
    planCountry = plan.country;
    planCoverColor = plan.coverColor;
    console.log(`[generate-city] plan ready: ${plan.stops.length} stops planned (${plan.locationType}, expected ${plan.expectedStops})`);

    const slug = plan.slug || cityName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    // Get or create city record
    const { data: existing } = await db.from("cities").select("id, slug, photo_url")
      .ilike("name", cityName).maybeSingle();

    if (existing) {
      cityRecord = existing;
      console.log(`[generate-city] city exists: ${existing.slug}`);
    } else {
      const cityPhotoUrl = await fetchWikipediaPhoto(
        `${plan.cityName}, ${plan.country}`, plan.cityName
      ).catch(() => null);

      const { data: newCity, error: cityErr } = await db.from("cities").insert({
        slug, name: plan.cityName, country: plan.country,
        cover_color: plan.coverColor,
        lat: plan.stops[0]?.lat ?? 0,
        lng: plan.stops[0]?.lng ?? 0,
        photo_url: cityPhotoUrl,
      }).select("id, slug, photo_url").single();

      if (cityErr || !newCity) throw new Error(`City insert failed: ${cityErr?.message}`);
      cityRecord = newCity;
      console.log(`[generate-city] city created: ${newCity.slug}`);
    }

    // Generate stops in parallel batches
    const generatedIds: string[] = [];
    const stopsToGenerate = plan.stops;

    for (let i = 0; i < stopsToGenerate.length; i += GENERATION_BATCH_SIZE) {
      const batch = stopsToGenerate.slice(i, i + GENERATION_BATCH_SIZE);
      console.log(`[generate-city] batch ${Math.floor(i / GENERATION_BATCH_SIZE) + 1}: generating ${batch.map(s => s.name).join(", ")}`);

      const results = await Promise.all(
        batch.map((stop) => generateStopWithPhoto(stop, cityRecord!, planCityName, planCountry, language, db))
      );
      generatedIds.push(...results.filter((id): id is string => id !== null));
      console.log(`[generate-city] batch done: ${results.filter(Boolean).length}/${batch.length} succeeded`);
    }

    // Backfill city photo from first stop if still missing
    if (cityRecord) {
      const { data: cityCheck } = await db.from("cities").select("photo_url").eq("id", cityRecord.id).single();
      if (!cityCheck?.photo_url) {
        const { data: firstStop } = await db.from("stops").select("photo_url")
          .eq("city_id", cityRecord.id).not("photo_url", "is", null).limit(1).maybeSingle();
        if (firstStop?.photo_url) {
          await db.from("cities").update({ photo_url: firstStop.photo_url }).eq("id", cityRecord.id);
        }
      }
    }

    // Generate tours
    const { data: allStops } = await db.from("stops")
      .select("id, name, lat, lng, duration_minutes, tags").eq("city_id", cityRecord!.id);

    console.log(`[generate-city] ${allStops?.length ?? 0} stops in DB, generating tours`);

    if (allStops && allStops.length >= 4) {
      try {
        const tourPlans = await generateToursForCity({ name: planCityName, country: planCountry }, allStops);
        for (const tp of tourPlans) {
          const { data: tour } = await db.from("tours").insert({
            city_id: cityRecord!.id,
            title: tp.title, tagline: tp.tagline,
            theme: tp.theme, duration_hours: tp.duration_hours,
            cover_color: planCoverColor, tier: "free",
          }).select("id").single();

          if (tour) {
            const matched = tp.stop_names
              .map((n) => allStops.find((s) => s.name.toLowerCase().includes(n.toLowerCase().slice(0, 15))))
              .filter(Boolean);
            if (matched.length >= 3) {
              await db.from("tour_stops").insert(
                matched.map((s, i) => ({ tour_id: tour.id, stop_id: s!.id, order_index: i }))
              );
              console.log(`[generate-city] tour created: "${tp.title}" (${matched.length} stops)`);
            }
          }
        }
      } catch (e) { console.error("[generate-city] tour generation failed:", e); }
    }

    console.log(`[generate-city] complete: ${generatedIds.length} stops, sending email to ${userEmail}`);

    const cityUrl = `${appUrl}/${language}/city/${cityRecord!.slug}`;
    await sendEmail(userEmail, `Your ${planCityName} tour is ready!`, `
      <div style="font-family:sans-serif;max-width:520px;margin:40px auto;padding:40px;background:#0d0d0d;color:#fff;border-radius:16px">
        <p style="margin:0 0 4px;font-size:12px;color:#666;letter-spacing:2px;text-transform:uppercase">TourIt</p>
        <h1 style="margin:0 0 8px;font-size:28px;font-weight:900">${planCityName} is ready</h1>
        <p style="margin:0 0 28px;color:#aaa;font-size:15px">${planCountry} · ${generatedIds.length} stops · Audio narration included</p>
        <a href="${cityUrl}" style="display:inline-block;background:#fff;color:#000;padding:14px 32px;border-radius:50px;font-weight:700;text-decoration:none;font-size:15px">Open tour →</a>
        <p style="margin:28px 0 0;color:#444;font-size:12px">Every place has a story · <a href="${appUrl}" style="color:#666">tourit.es</a></p>
      </div>
    `);

  } catch (err) {
    console.error("[generate-city] generation failed:", { cityName, err: String(err) });
    await sendEmail(userEmail, `Could not generate tour for ${cityName}`, `
      <div style="font-family:sans-serif;max-width:520px;margin:40px auto;padding:40px;background:#0d0d0d;color:#fff;border-radius:16px">
        <h1 style="margin:0 0 8px;font-size:24px">Something went wrong</h1>
        <p style="color:#aaa">We couldn't generate the tour for <strong>${cityName}</strong>. Please try again from the Discover page.</p>
        <p style="margin:24px 0 0;color:#444;font-size:12px">TourIt · <a href="${appUrl}" style="color:#666">tourit.es</a></p>
      </div>
    `).catch(() => {});
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const db = createAdminClient();
  const { data: profile } = await db.from("users").select("tier").eq("id", user.id).single();
  if (profile?.tier !== "pro") return NextResponse.json({ error: "Pro required" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const cityName = String(body.cityName ?? "").replace(/[\r\n\t]/g, " ").slice(0, 100).trim();
  const country  = String(body.country  ?? "").replace(/[\r\n\t]/g, " ").slice(0, 80).trim();
  const language = ["en","es","fr","de","pt","it","ja","zh","eo"].includes(body.language) ? body.language : "en";
  if (!cityName || !country) return NextResponse.json({ error: "cityName and country required" }, { status: 400 });

  // Check if city already exists AND is fully generated.
  // A city is "done" when it has stops AND tours — tours are only created at the
  // end of generation, so their presence means the full pipeline completed.
  // This handles small locations (parks with 6 stops) and large cities equally.
  const { data: existing } = await db.from("cities").select("id, slug").ilike("name", cityName).maybeSingle();
  if (existing) {
    const [{ count: stopCount }, { count: tourCount }] = await Promise.all([
      db.from("stops").select("*", { count: "exact", head: true }).eq("city_id", existing.id),
      db.from("tours").select("*", { count: "exact", head: true }).eq("city_id", existing.id),
    ]);
    if ((stopCount ?? 0) > 0 && (tourCount ?? 0) > 0) {
      // Fully generated — return immediately
      return NextResponse.json({ status: "exists", citySlug: existing.slug });
    }
    // Has stops but no tours (incomplete run), or neither — regenerate
  }

  // Use APP_URL (server-only) so localhost dev value never leaks into emails.
  // Falls back to Vercel's auto-set deployment URL, then the hardcoded production domain.
  const appUrl = process.env.APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    ?? "https://tourit.es";

  after(async () => {
    await runGeneration(cityName, country, language, user.email ?? "", appUrl);
  });

  const anticipatedSlug = existing?.slug ?? cityName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return NextResponse.json({
    status: "started",
    citySlug: anticipatedSlug,
    message: `Generating ${cityName} in the background. You'll receive an email when it's ready.`,
  });
}
