import { isAdminAuthorised } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";
import { generateStop } from "@/lib/generation/generate-stop";
import { createAdminClient } from "@/lib/db/supabase";
import { fetchWikipediaPhoto } from "@/lib/photos/wikipedia";
import { generateToursForCity, matchStopName } from "@/lib/generation/generate-tours";

const SEED_STOPS = [
  {
    citySlug: "london",
    cityName: "London",
    country: "United Kingdom",
    emoji: "🇬🇧",
    coverColor: "#1a3a5c",
    stops: [
      // Core landmarks
      { name: "Tower of London", lat: 51.5081, lng: -0.0759 },
      { name: "Tower Bridge", lat: 51.5055, lng: -0.0754 },
      { name: "St Paul's Cathedral", lat: 51.5138, lng: -0.0984 },
      { name: "Trafalgar Square", lat: 51.508, lng: -0.1281 },
      { name: "Hyde Park", lat: 51.5073, lng: -0.1657 },
      { name: "Buckingham Palace", lat: 51.5014, lng: -0.1419 },
      { name: "Westminster Abbey", lat: 51.4994, lng: -0.1273 },
      { name: "British Museum", lat: 51.5194, lng: -0.1269 },
      // South Bank & East
      { name: "Tate Modern", lat: 51.5076, lng: -0.0994 },
      { name: "Shakespeare's Globe Theatre", lat: 51.5081, lng: -0.0971 },
      { name: "Borough Market", lat: 51.5055, lng: -0.0910 },
      { name: "The Shard", lat: 51.5045, lng: -0.0865 },
      { name: "Southwark Cathedral", lat: 51.5057, lng: -0.0906 },
      // Museums & Galleries
      { name: "Natural History Museum", lat: 51.4967, lng: -0.1764 },
      { name: "Victoria and Albert Museum", lat: 51.4966, lng: -0.1722 },
      { name: "National Gallery", lat: 51.5089, lng: -0.1283 },
      { name: "Science Museum London", lat: 51.4978, lng: -0.1745 },
      { name: "Wallace Collection", lat: 51.5155, lng: -0.1498 },
      { name: "Churchill War Rooms", lat: 51.5022, lng: -0.1296 },
      // Royal & Parks
      { name: "Kensington Palace", lat: 51.5051, lng: -0.1876 },
      { name: "Hampton Court Palace", lat: 51.4036, lng: -0.3376 },
      { name: "Kew Gardens", lat: 51.4787, lng: -0.2956 },
      { name: "St James's Park", lat: 51.5024, lng: -0.1343 },
      { name: "Regent's Park", lat: 51.5313, lng: -0.1570 },
      // Neighbourhoods & Markets
      { name: "Covent Garden", lat: 51.5117, lng: -0.1240 },
      { name: "Camden Market", lat: 51.5416, lng: -0.1464 },
      { name: "Portobello Road Market, Notting Hill", lat: 51.5152, lng: -0.2040 },
      { name: "Leadenhall Market", lat: 51.5130, lng: -0.0834 },
      // Greenwich & East
      { name: "National Maritime Museum, Greenwich", lat: 51.4814, lng: -0.0064 },
      { name: "Royal Observatory Greenwich", lat: 51.4769, lng: -0.0005 },
      { name: "Cutty Sark", lat: 51.4831, lng: -0.0094 },
      // City & Finance
      { name: "St Katharine Docks", lat: 51.5049, lng: -0.0700 },
      { name: "Canary Wharf", lat: 51.5054, lng: -0.0235 },
      { name: "Bank of England Museum", lat: 51.5142, lng: -0.0881 },
    ],
  },
  {
    citySlug: "paris",
    cityName: "Paris",
    country: "France",
    emoji: "🇫🇷",
    coverColor: "#4a1a2c",
    stops: [
      { name: "Eiffel Tower", lat: 48.8584, lng: 2.2945 },
      { name: "Louvre Museum", lat: 48.8606, lng: 2.3376 },
      { name: "Notre-Dame Cathedral", lat: 48.853, lng: 2.3499 },
      { name: "Montmartre & Sacré-Cœur Basilica", lat: 48.8867, lng: 2.3431 },
      { name: "Musée d'Orsay", lat: 48.86, lng: 2.3266 },
      { name: "Palace of Versailles", lat: 48.8049, lng: 2.1204 },
      { name: "Centre Pompidou", lat: 48.8606, lng: 2.3522 },
      { name: "Sainte-Chapelle", lat: 48.8554, lng: 2.3450 },
      { name: "Musée de l'Orangerie", lat: 48.8638, lng: 2.3224 },
      { name: "Arc de Triomphe", lat: 48.8738, lng: 2.2950 },
      { name: "Palais Royal Gardens", lat: 48.8638, lng: 2.3370 },
      { name: "Le Marais & Place des Vosges", lat: 48.8556, lng: 2.3656 },
      { name: "Catacombs of Paris", lat: 48.8339, lng: 2.3320 },
      { name: "Moulin Rouge, Pigalle", lat: 48.8841, lng: 2.3323 },
    ],
  },
  {
    citySlug: "rome",
    cityName: "Rome",
    country: "Italy",
    emoji: "🇮🇹",
    coverColor: "#5c2a1a",
    stops: [
      { name: "Colosseum", lat: 41.8902, lng: 12.4922 },
      { name: "Roman Forum & Palatine Hill", lat: 41.8925, lng: 12.4853 },
      { name: "Vatican Museums & Sistine Chapel", lat: 41.9065, lng: 12.4536 },
      { name: "Trevi Fountain", lat: 41.9009, lng: 12.4833 },
      { name: "Pantheon", lat: 41.8986, lng: 12.4769 },
      { name: "Borghese Gallery", lat: 41.9141, lng: 12.4922 },
      { name: "St Peter's Basilica & Square", lat: 41.9022, lng: 12.4539 },
      { name: "Castel Sant'Angelo", lat: 41.9031, lng: 12.4663 },
      { name: "Piazza Navona", lat: 41.8992, lng: 12.4731 },
      { name: "Campo de' Fiori", lat: 41.8958, lng: 12.4722 },
      { name: "Trastevere", lat: 41.8896, lng: 12.4684 },
      { name: "Spanish Steps & Trinità dei Monti", lat: 41.9060, lng: 12.4833 },
      { name: "Appian Way & Catacombs", lat: 41.8469, lng: 12.5294 },
    ],
  },
  {
    citySlug: "sydney",
    cityName: "Sydney",
    country: "Australia",
    emoji: "🦘",
    coverColor: "#1a4a3a",
    stops: [
      // Harbour & City Centre
      { name: "Sydney Opera House", lat: -33.8568, lng: 151.2153 },
      { name: "Sydney Harbour Bridge", lat: -33.8523, lng: 151.2108 },
      { name: "The Rocks", lat: -33.8597, lng: 151.2090 },
      { name: "Circular Quay", lat: -33.8617, lng: 151.2111 },
      { name: "Royal Botanic Garden Sydney", lat: -33.8642, lng: 151.2166 },
      { name: "Mrs Macquarie's Chair", lat: -33.8593, lng: 151.2225 },
      // CBD & Shopping
      { name: "Queen Victoria Building", lat: -33.8731, lng: 151.2069 },
      { name: "Sydney Tower Eye", lat: -33.8707, lng: 151.2086 },
      { name: "Hyde Park Sydney", lat: -33.8731, lng: 151.2108 },
      { name: "St Mary's Cathedral Sydney", lat: -33.8729, lng: 151.2136 },
      // Museums
      { name: "Australian Museum", lat: -33.8745, lng: 151.2143 },
      { name: "Art Gallery of NSW", lat: -33.8688, lng: 151.2175 },
      { name: "Museum of Contemporary Art Australia", lat: -33.8599, lng: 151.2087 },
      { name: "Powerhouse Museum", lat: -33.8797, lng: 151.2003 },
      // Waterfront & Entertainment
      { name: "Darling Harbour", lat: -33.8737, lng: 151.1990 },
      { name: "Barangaroo Reserve", lat: -33.8617, lng: 151.2019 },
      { name: "Luna Park Sydney", lat: -33.8476, lng: 151.2099 },
      { name: "Taronga Zoo", lat: -33.8433, lng: 151.2415 },
      // Beaches
      { name: "Bondi Beach", lat: -33.8908, lng: 151.2743 },
      { name: "Manly Beach", lat: -33.7972, lng: 151.2876 },
      { name: "Coogee Beach & Coastal Walk", lat: -33.9208, lng: 151.2577 },
      // Neighbourhoods
      { name: "Newtown & King Street", lat: -33.8981, lng: 151.1788 },
      { name: "Paddington & Oxford Street", lat: -33.8851, lng: 151.2264 },
      { name: "Chinatown & Haymarket", lat: -33.8796, lng: 151.2024 },
      { name: "Sydney Fish Market", lat: -33.8712, lng: 151.1983 },
      // Day trips
      { name: "Blue Mountains & Three Sisters, Katoomba", lat: -33.7219, lng: 150.3113 },
      { name: "Watsons Bay", lat: -33.8445, lng: 151.2811 },
    ],
  },
  {
    citySlug: "melbourne",
    cityName: "Melbourne",
    country: "Australia",
    emoji: "🦘",
    coverColor: "#1a2a4a",
    stops: [
      // City centre icons
      { name: "Federation Square", lat: -37.8179, lng: 144.9691 },
      { name: "Flinders Street Station", lat: -37.8182, lng: 144.9671 },
      { name: "St Paul's Cathedral Melbourne", lat: -37.8170, lng: 144.9676 },
      { name: "Queen Victoria Market", lat: -37.8067, lng: 144.9565 },
      // Art, culture & museums
      { name: "National Gallery of Victoria", lat: -37.8225, lng: 144.9683 },
      { name: "Melbourne Museum", lat: -37.8031, lng: 144.9717 },
      { name: "Royal Exhibition Building & Carlton Gardens", lat: -37.8051, lng: 144.9716 },
      { name: "ACMI – Australian Centre for the Moving Image", lat: -37.8180, lng: 144.9695 },
      // Parks & nature
      { name: "Royal Botanic Gardens Melbourne", lat: -37.8302, lng: 144.9796 },
      { name: "Fitzroy Gardens & Captain Cook's Cottage", lat: -37.8148, lng: 144.9803 },
      // Viewpoints & architecture
      { name: "Eureka Skydeck", lat: -37.8218, lng: 144.9682 },
      { name: "Shrine of Remembrance", lat: -37.8306, lng: 144.9736 },
      // Sport & entertainment
      { name: "Melbourne Cricket Ground", lat: -37.8199, lng: 144.9840 },
      { name: "Luna Park St Kilda", lat: -37.8671, lng: 144.9789 },
      // Street art & neighbourhoods
      { name: "Hosier Lane", lat: -37.8185, lng: 144.9673 },
      { name: "Fitzroy & Collingwood Street Art Precinct", lat: -37.8003, lng: 144.9797 },
    ],
  },
  {
    citySlug: "darwin",
    cityName: "Darwin",
    country: "Australia",
    emoji: "🐊",
    coverColor: "#3a2a0a",
    stops: [
      // City centre
      { name: "Darwin Waterfront Precinct", lat: -12.4694, lng: 130.8426 },
      { name: "Stokes Hill Wharf", lat: -12.4741, lng: 130.8459 },
      { name: "Darwin CBD & Smith Street Mall", lat: -12.4634, lng: 130.8456 },
      { name: "Bicentennial Park & Esplanade", lat: -12.4596, lng: 130.8418 },
      // Wildlife & Nature (in town)
      { name: "Crocosaurus Cove", lat: -12.4614, lng: 130.8418 },
      { name: "George Brown Darwin Botanic Gardens", lat: -12.4397, lng: 130.8463 },
      { name: "East Point Reserve & Military Museum", lat: -12.4252, lng: 130.8271 },
      { name: "Fannie Bay Gaol Museum", lat: -12.4378, lng: 130.8424 },
      // Culture & History
      { name: "Museum and Art Gallery of the Northern Territory", lat: -12.4380, lng: 130.8356 },
      { name: "Darwin Aviation Museum", lat: -12.4272, lng: 130.8740 },
      { name: "Adelaide River War Cemetery", lat: -12.7156, lng: 131.1081 },
      // Markets
      { name: "Mindil Beach Sunset Market", lat: -12.4394, lng: 130.8378 },
      { name: "Parap Village Markets", lat: -12.4376, lng: 130.8606 },
      // Day trips & surrounds
      { name: "Litchfield National Park", lat: -13.1500, lng: 130.6500 },
      { name: "Territory Wildlife Park, Berry Springs", lat: -12.7167, lng: 130.9583 },
      { name: "Kakadu National Park", lat: -12.9000, lng: 132.5667 },
      { name: "Berry Springs Nature Park", lat: -12.6997, lng: 131.0033 },
      { name: "Howard Springs Nature Park", lat: -12.4833, lng: 131.0500 },
    ],
  },
];

function isAuthorised(req: NextRequest) {
  return isAdminAuthorised(req);
}

// Rate limit: wait between API calls to stay within quotas
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: NextRequest) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { citySlug, language = "en" } = await req.json().catch(() => ({}));
  const db = createAdminClient();

  const results: { stop: string; status: string; error?: string }[] = [];

  // Filter to requested city or run all
  const targets = citySlug
    ? SEED_STOPS.filter((c) => c.citySlug === citySlug)
    : SEED_STOPS;

  for (const city of targets) {
    // Get or create city record
    let { data: cityRecord } = await db
      .from("cities")
      .select("id")
      .eq("slug", city.citySlug)
      .single();

    if (!cityRecord) {
      const { data: newCity } = await db
        .from("cities")
        .insert({
          slug: city.citySlug,
          name: city.cityName,
          country: city.country,
          emoji: (city as { emoji?: string }).emoji ?? null,
          cover_color: (city as { coverColor?: string }).coverColor ?? "#1a3a5c",
          lat: city.stops[0].lat,
          lng: city.stops[0].lng,
        })
        .select("id")
        .single();
      cityRecord = newCity;
    }

    if (!cityRecord) {
      results.push({ stop: city.cityName, status: "error", error: "Could not create city" });
      continue;
    }

    // Track newly generated stop IDs for tour assignment after the loop
    const generatedStopIds: string[] = [];

    for (const stop of city.stops) {
      // Check if stop record already exists
      const { data: existing } = await db
        .from("stops")
        .select("id")
        .eq("city_id", cityRecord.id)
        .ilike("name", stop.name)
        .maybeSingle();

      if (existing) {
        generatedStopIds.push(existing.id);

        // Stop exists — check if content in the requested language already exists
        const { count: contentCount } = await db
          .from("stop_content")
          .select("id", { count: "exact", head: true })
          .eq("stop_id", existing.id)
          .eq("language", language);

        if ((contentCount ?? 0) > 0) {
          results.push({ stop: stop.name, status: `skipped (${language} content already exists)` });
          continue;
        }

        // Generate content in the new language for the existing stop
        try {
          const generated = await generateStop({
            stopName: stop.name,
            cityName: city.cityName,
            country: city.country,
            lat: stop.lat,
            lng: stop.lng,
            language,
          });

          await db.from("stop_content").insert(
            Object.entries(generated.content).map(([category, text]) => ({
              stop_id: existing.id,
              category,
              language,
              text,
              word_count: text.split(/\s+/).length,
            }))
          );

          results.push({ stop: stop.name, status: `${language} content generated` });
          console.log(`✓ ${stop.name} (${language} content)`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown";
          results.push({ stop: stop.name, status: "error", error: msg });
          console.error(`✗ ${stop.name} (${language}):`, msg);
        }

        await sleep(3000);
        continue;
      }

      // Stop doesn't exist — create stop record + practical + content
      try {
        const generated = await generateStop({
          stopName: stop.name,
          cityName: city.cityName,
          country: city.country,
          lat: stop.lat,
          lng: stop.lng,
          language,
        });

        // Fetch photo from Wikipedia (non-blocking — failure doesn't abort stop generation)
        const photoUrl = await fetchWikipediaPhoto(stop.name, `${stop.name}, ${city.cityName}`).catch(() => null);

        const { data: newStop, error: stopErr } = await db
          .from("stops")
          .insert({
            city_id: cityRecord.id,
            name: generated.name,
            lat: stop.lat,
            lng: stop.lng,
            duration_minutes: generated.duration_minutes,
            tags: generated.tags,
            accessibility_note: generated.accessibility_note,
            photo_url: photoUrl,
            last_generated_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (stopErr || !newStop) throw new Error(stopErr?.message ?? "Insert failed");

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
            language,
            text,
            word_count: text.split(/\s+/).length,
          }))
        );

        generatedStopIds.push(newStop.id);
        results.push({ stop: stop.name, status: "generated" });
        console.log(`✓ ${stop.name}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown";
        results.push({ stop: stop.name, status: "error", error: msg });
        console.error(`✗ ${stop.name}:`, msg);
      }

      await sleep(3000);
    }

    // ── Auto-generate curated tours now that all stops exist ──────────────────
    try {
      // Fetch full stop details for the tour designer
      const { data: allStops } = await db
        .from("stops")
        .select("id, name, lat, lng, duration_minutes, tags")
        .eq("city_id", cityRecord.id);

      const stopsForTour = (allStops ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        lat: s.lat ?? 0,
        lng: s.lng ?? 0,
        duration_minutes: s.duration_minutes ?? 45,
        tags: (s.tags as string[]) ?? [],
      }));

      if (stopsForTour.length >= 5) {
        // Replace existing prebuilt system tours
        await db
          .from("tours")
          .delete()
          .eq("city_id", cityRecord.id)
          .eq("type", "prebuilt")
          .eq("is_official", true);

        const plans = await generateToursForCity(
          { name: city.cityName, country: city.country },
          stopsForTour
        );

        for (const plan of plans) {
          const { data: tour } = await db
            .from("tours")
            .insert({
              city_id: cityRecord.id,
              title: plan.title,
              tagline: plan.tagline,
              type: "prebuilt",
              tier_required: "free",
              cover_color: (city as { coverColor?: string }).coverColor ?? "#1a3a5c",
              is_official: true,
            })
            .select("id")
            .single();

          if (!tour) continue;

          let orderIdx = 0;
          for (const stopName of plan.stop_names) {
            const matched = matchStopName(stopName, stopsForTour);
            if (matched) {
              await db.from("tour_stops")
                .insert({ tour_id: tour.id, stop_id: matched.id, order_index: orderIdx });
              orderIdx++;
            }
          }
          results.push({ stop: `📍 Tour: ${plan.title}`, status: `${orderIdx} stops` });
        }
      }
    } catch (tourErr) {
      const msg = tourErr instanceof Error ? tourErr.message : "Unknown";
      results.push({ stop: `Tour generation`, status: "error", error: msg });
    }
  }

  return NextResponse.json({ results });
}
