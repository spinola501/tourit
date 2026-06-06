import { isAdminAuthorised } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/db/supabase";

function isAuthorised(req: NextRequest) {
  return isAdminAuthorised(req);
}

export async function GET(req: NextRequest) {
  if (!isAuthorised(req)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const db = createAdminClient();

  const { data: cities } = await db.from("cities").select("id, slug, name");
  const report: Record<string, unknown> = {};

  for (const city of cities ?? []) {
    const { data: stops } = await db
      .from("stops")
      .select("id, name")
      .eq("city_id", city.id)
      .order("created_at", { ascending: true });

    const { data: tours } = await db
      .from("tours")
      .select("id, title, tier")
      .eq("city_id", city.id);

    const tourDetails = [];
    for (const tour of tours ?? []) {
      const { data: tourStops } = await db
        .from("tour_stops")
        .select("order_index, stops(name)")
        .eq("tour_id", tour.id)
        .order("order_index", { ascending: true });
      tourDetails.push({ ...tour, stopCount: tourStops?.length ?? 0, stops: tourStops?.map((ts) => (ts.stops as unknown as { name: string })?.name) });
    }

    report[city.slug] = {
      totalStops: stops?.length ?? 0,
      stopNames: stops?.map((s) => s.name),
      tours: tourDetails,
    };
  }

  return NextResponse.json(report, { status: 200 });
}
