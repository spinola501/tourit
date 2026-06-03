import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/db/supabase";

function auth(req: NextRequest) {
  return req.headers.get("x-admin-secret") === process.env.ADMIN_SECRET;
}

// All monetary values in USD
const EUR_TO_USD = 1.09;

const COST = {
  haiku_input_per_1k:   0.00025,  // $0.25/M input tokens
  haiku_output_per_1k:  0.00125,  // $1.25/M output tokens
  tavily_per_search:    0.01,
  avg_tokens_per_stop_in:  2000,
  avg_tokens_per_stop_out: 800,
  tavily_calls_per_stop:   1,
  deepl_per_char:       0.000020,
  avg_chars_per_stop:   4000,
  vercel_pro_monthly:   20,
  supabase_monthly:     0,
  domain_annual:        12,       // USD
};

// Prices in EUR → converted to USD
const PRICE_ANNUAL_PRO_USD  = 16.99 * EUR_TO_USD;  // $18.52/yr → $1.54/mo
const PRICE_TRIP_PASS_USD   =  5.99 * EUR_TO_USD;  // $6.53

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createAdminClient();

  // Paying Pro = Pro users who were NOT comped/invited by admin
  // Falls back to total Pro count if comped column doesn't exist yet
  const payingProQuery = await db
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("tier", "pro")
    .or("comped.is.null,comped.eq.false")
    .then((r) => r, () => ({ count: null } as { count: number | null }));

  const [
    { count: totalStops },
    { count: enStops },
    { count: nonEnContent },
    { count: totalUsers },
    { count: allProUsers },
    { count: compedUsers },
    { count: totalCities },
  ] = await Promise.all([
    db.from("stops").select("*", { count: "exact", head: true }),
    db.from("stop_content").select("*", { count: "exact", head: true }).eq("language", "en"),
    db.from("stop_content").select("*", { count: "exact", head: true }).neq("language", "en"),
    db.from("users").select("*", { count: "exact", head: true }),
    db.from("users").select("*", { count: "exact", head: true }).eq("tier", "pro"),
    db.from("users").select("*", { count: "exact", head: true }).eq("tier", "pro").eq("comped", true)
      .then((r) => r, () => ({ count: 0 } as { count: number | null })),
    db.from("cities").select("*", { count: "exact", head: true }),
  ]);

  const stops   = totalStops ?? 0;
  const cities  = totalCities ?? 0;
  const nonEn   = nonEnContent ?? 0;
  const totalPro = allProUsers ?? 0;
  const comped  = compedUsers ?? 0;
  const payingPro = payingProQuery.count ?? (totalPro - comped);

  // ── Generation costs ──────────────────────────────────────────────────
  const haiku_per_stop =
    (COST.avg_tokens_per_stop_in  / 1000) * COST.haiku_input_per_1k +
    (COST.avg_tokens_per_stop_out / 1000) * COST.haiku_output_per_1k;
  const tavily_per_stop  = COST.tavily_per_search * COST.tavily_calls_per_stop;
  const cost_per_stop    = haiku_per_stop + tavily_per_stop;
  const city_plan_cost   = cities * 0.005;
  const en_cost          = stops * cost_per_stop + city_plan_cost;
  const translation_cost = nonEn * COST.deepl_per_char * COST.avg_chars_per_stop;
  const total_gen_cost   = en_cost + translation_cost;

  // ── Infrastructure (monthly, USD) ─────────────────────────────────────
  const infra_monthly = COST.vercel_pro_monthly + COST.supabase_monthly + (COST.domain_annual / 12);

  // ── Revenue (USD) ─────────────────────────────────────────────────────
  const pro_mrr          = payingPro * (PRICE_ANNUAL_PRO_USD / 12);
  const est_trip_passes  = Math.round(payingPro * 0.1);
  const trip_pass_rev    = est_trip_passes * PRICE_TRIP_PASS_USD;

  // ── Profitability ─────────────────────────────────────────────────────
  const monthly_costs  = infra_monthly + (total_gen_cost / 3);  // amortise gen over 3 months
  const monthly_profit = pro_mrr - monthly_costs;
  const margin_pct     = pro_mrr > 0 ? Math.round((monthly_profit / pro_mrr) * 100) : null;
  const break_even     = Math.ceil(infra_monthly / (PRICE_ANNUAL_PRO_USD / 12));

  return NextResponse.json({
    eur_to_usd: EUR_TO_USD,
    generation: {
      stops,
      cities,
      en_stops:              enStops ?? 0,
      non_en_content_pieces: nonEn,
      en_generation_usd:     +en_cost.toFixed(2),
      translation_usd:       +translation_cost.toFixed(2),
      total_usd:             +total_gen_cost.toFixed(2),
      cost_per_stop_usd:     +cost_per_stop.toFixed(4),
    },
    infrastructure: {
      vercel_monthly_usd:  COST.vercel_pro_monthly,
      supabase_monthly_usd: COST.supabase_monthly,
      domain_monthly_usd:  +(COST.domain_annual / 12).toFixed(2),
      total_monthly_usd:   +infra_monthly.toFixed(2),
    },
    revenue: {
      total_users:          totalUsers ?? 0,
      total_pro_users:      totalPro,
      comped_users:         comped,
      paying_pro_users:     payingPro,
      pro_conversion_pct:   totalUsers ? Math.round((payingPro / (totalUsers ?? 1)) * 100) : 0,
      pro_mrr_usd:          +pro_mrr.toFixed(2),
      estimated_trip_passes: est_trip_passes,
      trip_pass_revenue_usd: +trip_pass_rev.toFixed(2),
      annual_pro_price_usd: +PRICE_ANNUAL_PRO_USD.toFixed(2),
      trip_pass_price_usd:  +PRICE_TRIP_PASS_USD.toFixed(2),
    },
    profitability: {
      monthly_revenue_usd: +pro_mrr.toFixed(2),
      monthly_costs_usd:   +monthly_costs.toFixed(2),
      monthly_profit_usd:  +monthly_profit.toFixed(2),
      margin_pct,
      break_even_pro_users: break_even,
    },
  });
}
