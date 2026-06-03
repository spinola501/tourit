import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/db/supabase";

function auth(req: NextRequest) {
  return req.headers.get("x-admin-secret") === process.env.ADMIN_SECRET;
}

// Pricing constants
const COST = {
  haiku_input_per_1k:  0.00025,  // $0.25/M input tokens
  haiku_output_per_1k: 0.00125,  // $1.25/M output tokens
  tavily_per_search:   0.01,     // $0.01/search (advanced)
  avg_tokens_per_stop_in:  2000, // ~2k input tokens/stop (system + context)
  avg_tokens_per_stop_out: 800,  // ~800 output tokens/stop
  tavily_calls_per_stop: 1,
  deepl_per_char: 0.000020,      // €0.02/1k chars, ~$0.00002/char
  avg_chars_per_stop: 4000,      // ~4000 chars of content per stop
  r2_per_gb: 0.015,
  vercel_pro_monthly: 20,
  supabase_monthly: 0,           // free tier
  domain_annual: 12,
};

const PRICES = {
  trip_pass: 5.99,     // €5.99/7 days
  annual_pro: 16.99,   // €16.99/year → €1.42/month
};

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createAdminClient();

  const [
    { count: totalStops },
    { count: enStops },
    { count: nonEnContent },
    { count: totalUsers },
    { count: proUsers },
    { count: totalCities },
  ] = await Promise.all([
    db.from("stops").select("*", { count: "exact", head: true }),
    db.from("stop_content").select("*", { count: "exact", head: true }).eq("language", "en"),
    db.from("stop_content").select("*", { count: "exact", head: true }).neq("language", "en"),
    db.from("users").select("*", { count: "exact", head: true }),
    db.from("users").select("*", { count: "exact", head: true }).eq("tier", "pro"),
    db.from("cities").select("*", { count: "exact", head: true }),
  ]);

  const stops = totalStops ?? 0;
  const cities = totalCities ?? 0;
  const proCount = proUsers ?? 0;
  const nonEn = nonEnContent ?? 0;

  // ── Generation costs ──────────────────────────────────────────────────
  const haiku_cost_per_stop =
    (COST.avg_tokens_per_stop_in / 1000) * COST.haiku_input_per_1k +
    (COST.avg_tokens_per_stop_out / 1000) * COST.haiku_output_per_1k;
  const tavily_cost_per_stop = COST.tavily_per_search * COST.tavily_calls_per_stop;
  const city_planning_cost = cities * 0.005; // cheap Haiku call to plan stops

  const en_generation_cost = stops * (haiku_cost_per_stop + tavily_cost_per_stop) + city_planning_cost;
  const translation_cost = nonEn * COST.deepl_per_char * COST.avg_chars_per_stop;

  const total_generation_cost = en_generation_cost + translation_cost;

  // ── Infrastructure (monthly) ─────────────────────────────────────────
  const infra_monthly = COST.vercel_pro_monthly + COST.supabase_monthly + (COST.domain_annual / 12);

  // ── Revenue ──────────────────────────────────────────────────────────
  const pro_monthly_revenue = proCount * (PRICES.annual_pro / 12);
  // Estimate trip passes (assume 10% of pro signups bought trip pass first)
  const estimated_trip_passes = Math.round(proCount * 0.1);
  const trip_pass_revenue = estimated_trip_passes * PRICES.trip_pass;
  const total_revenue_monthly = pro_monthly_revenue; // recurring
  const total_revenue_alltime = pro_monthly_revenue * 3 + trip_pass_revenue; // rough estimate

  // ── Profitability ─────────────────────────────────────────────────────
  const monthly_costs = infra_monthly + (total_generation_cost / 3); // amortised over 3 months
  const monthly_profit = total_revenue_monthly - monthly_costs;
  const margin_pct = total_revenue_monthly > 0
    ? Math.round((monthly_profit / total_revenue_monthly) * 100)
    : null;

  return NextResponse.json({
    generation: {
      stops,
      cities,
      en_stops: enStops ?? 0,
      non_en_content_pieces: nonEn,
      en_generation_usd: +en_generation_cost.toFixed(2),
      translation_usd: +translation_cost.toFixed(2),
      total_usd: +total_generation_cost.toFixed(2),
      cost_per_stop_usd: +(haiku_cost_per_stop + tavily_cost_per_stop).toFixed(4),
    },
    infrastructure: {
      vercel_monthly_usd: COST.vercel_pro_monthly,
      supabase_monthly_usd: COST.supabase_monthly,
      domain_monthly_usd: +(COST.domain_annual / 12).toFixed(2),
      total_monthly_usd: +infra_monthly.toFixed(2),
    },
    revenue: {
      pro_users: proCount,
      total_users: totalUsers ?? 0,
      pro_conversion_pct: totalUsers ? Math.round((proCount / (totalUsers ?? 1)) * 100) : 0,
      pro_monthly_recurring_eur: +pro_monthly_revenue.toFixed(2),
      estimated_trip_passes,
      trip_pass_revenue_eur: +trip_pass_revenue.toFixed(2),
    },
    profitability: {
      monthly_revenue_eur: +total_revenue_monthly.toFixed(2),
      monthly_costs_usd: +monthly_costs.toFixed(2),
      monthly_profit_eur: +monthly_profit.toFixed(2),
      margin_pct,
      break_even_pro_users: Math.ceil(infra_monthly / (PRICES.annual_pro / 12)),
    },
  });
}
