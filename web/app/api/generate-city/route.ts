import { NextRequest } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/db/supabase";
import { planCity } from "@/lib/generation/plan-city";
import { generateStop } from "@/lib/generation/generate-stop";
import { generateToursForCity } from "@/lib/generation/generate-tours";
import { fetchWikipediaPhoto } from "@/lib/photos/wikipedia";

const enc = new TextEncoder();

function event(controller: ReadableStreamDefaultController, data: object) {
  controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
}

export async function POST(req: NextRequest) {
  // Auth: must be Pro
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorised" }), { status: 401 });
  }

  const db = createAdminClient();
  const { data: profile } = await db.from("users").select("tier").eq("id", user.id).single();
  if (profile?.tier !== "pro") {
    return new Response(JSON.stringify({ error: "Pro required" }), { status: 403 });
  }

  const { cityName, country, language = "en" } = await req.json();
  if (!cityName || !country) {
    return new Response(JSON.stringify({ error: "cityName and country required" }), { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Check if city already exists
        const slug = cityName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        const { data: existing } = await db.from("cities").select("id, slug").ilike("name", cityName).maybeSingle();
        if (existing) {
          event(controller, { type: "done", citySlug: existing.slug, message: "City already in library" });
          controller.close();
          return;
        }

        // Step 1: Plan city
        event(controller, { type: "progress", step: "planning", message: `Planning ${cityName} stops with AI…` });
        const plan = await planCity(cityName, country);

        // Step 2: Create city record
        const { data: cityRecord, error: cityErr } = await db.from("cities").insert({
          slug: plan.slug || slug,
          name: plan.cityName,
          country: plan.country,
          cover_color: plan.coverColor,
          lat: plan.stops[0].lat,
          lng: plan.stops[0].lng,
        }).select("id, slug").single();

        if (cityErr || !cityRecord) {
          event(controller, { type: "error", message: `Could not create city: ${cityErr?.message}` });
          controller.close();
          return;
        }

        // Step 3: Generate stops
        const total = plan.stops.length;
        const generatedStopIds: string[] = [];

        for (let i = 0; i < plan.stops.length; i++) {
          const stop = plan.stops[i];
          event(controller, {
            type: "progress",
            step: "stops",
            message: `Generating stop ${i + 1}/${total}: ${stop.name}`,
            progress: Math.round(((i + 1) / total) * 80),
          });

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
                  stop_id: newStop.id,
                  category,
                  language: "en",
                  text,
                  word_count: (text as string).split(/\s+/).length,
                }))
              );
            }
          } catch {
            // Continue on individual stop failure
          }
        }

        // Step 4: Generate tours
        event(controller, { type: "progress", step: "tours", message: "Designing curated tours…", progress: 85 });

        const { data: allStops } = await db
          .from("stops")
          .select("id, name, lat, lng, duration_minutes, tags")
          .eq("city_id", cityRecord.id);

        if (allStops && allStops.length >= 4) {
          try {
            const tourPlans = await generateToursForCity(
              { name: plan.cityName, country: plan.country },
              allStops
            );
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
                const matches = tp.stop_names
                  .map((name) => allStops.find((s) => s.name.toLowerCase().includes(name.toLowerCase().slice(0, 15))))
                  .filter(Boolean);
                if (matches.length >= 3) {
                  await db.from("tour_stops").insert(
                    matches.map((s, idx) => ({ tour_id: tour.id, stop_id: s!.id, position: idx }))
                  );
                }
              }
            }
          } catch {
            // Tours are non-critical
          }
        }

        event(controller, { type: "done", citySlug: cityRecord.slug, message: `${plan.cityName} is ready!` });
      } catch (err) {
        event(controller, { type: "error", message: String(err) });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
