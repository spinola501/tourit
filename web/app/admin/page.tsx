"use client";

import { useState, useEffect } from "react";
import { getCookieTier, setCookieTier } from "@/lib/hooks/useTier";

type TableRow = { exists: boolean; rowCount?: number; error?: string };
type SeedResult = { stop: string; status: string; error?: string };

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [authError, setAuthError] = useState("");

  const [tier, setTier] = useState<"free" | "pro">("free");
  const [tables, setTables] = useState<Record<string, TableRow> | null>(null);
  const [seedCity, setSeedCity] = useState("darwin");
  const [seeding, setSeeding] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [seedResults, setSeedResults] = useState<SeedResult[]>([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (unlocked) {
      setTier(getCookieTier());
      refreshTables();
    }
  }, [unlocked]);

  async function tryUnlock() {
    const r = await fetch("/api/admin/verify", { headers: { "x-admin-secret": secret } });
    if (r.ok) {
      setUnlocked(true);
      setAuthError("");
    } else {
      setAuthError("Wrong secret");
    }
  }

  async function refreshTables() {
    const r = await fetch("/api/admin/verify", { headers: { "x-admin-secret": secret } });
    const d = await r.json();
    setTables(d.tables);
  }

  function setProMode(t: "free" | "pro") {
    setCookieTier(t);
    setTier(t);
    setStatus(`Tier set to ${t} — active immediately`);
  }

  async function runBackfillPhotos() {
    setBackfilling(true);
    setStatus("Fetching Wikipedia photos for stops without one (~1 per second)…");
    try {
      const r = await fetch("/api/admin/backfill-photos", { method: "POST", headers: { "x-admin-secret": secret } });
      const d = await r.json();
      const updated = d.results?.filter((r: { status: string }) => r.status === "updated").length ?? 0;
      const notFound = d.results?.filter((r: { status: string }) => r.status === "no photo found").length ?? 0;
      setStatus(`Photos done — ${updated} updated, ${notFound} not found`);
      refreshTables();
    } catch (e) {
      setStatus(`Error: ${e}`);
    }
    setBackfilling(false);
  }

  async function runRepair() {
    setStatus("Repairing — deduplicating stops and syncing all tour_stops…");
    const r = await fetch("/api/admin/repair", { method: "POST", headers: { "x-admin-secret": secret } });
    const d = await r.json();
    setStatus(d.log?.join("\n") ?? "Repair complete");
    refreshTables();
  }

  async function runSeed() {
    setSeeding(true);
    setSeedResults([]);
    setStatus(`Seeding ${seedCity}…`);
    try {
      const r = await fetch("/api/admin/seed", {
        method: "POST",
        headers: { "x-admin-secret": secret, "Content-Type": "application/json" },
        body: JSON.stringify({ citySlug: seedCity }),
      });
      const d = await r.json();
      setSeedResults(d.results ?? []);
      setStatus(`Done — ${d.results?.length ?? 0} stops processed`);
      refreshTables();
    } catch (e) {
      setStatus(`Error: ${e}`);
    }
    setSeeding(false);
  }

  const totalRows = tables
    ? Object.values(tables).reduce((sum, t) => sum + (t.rowCount ?? 0), 0)
    : 0;

  // ── Login screen ─────────────────────────────────────────────────────────────
  if (!unlocked) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] text-white flex items-center justify-center">
        <div className="w-full max-w-sm space-y-4 px-6">
          <h1 className="text-2xl font-bold text-center mb-8">TourIt Admin</h1>
          <input
            type="password"
            placeholder="Admin secret…"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && tryUnlock()}
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-white/50"
            autoFocus
          />
          {authError && <p className="text-red-400 text-sm text-center">{authError}</p>}
          <button
            onClick={tryUnlock}
            className="w-full bg-white text-black py-3 rounded-xl font-semibold hover:bg-white/90 transition-colors"
          >
            Unlock
          </button>
        </div>
      </div>
    );
  }

  // ── Admin panel ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white p-8 font-mono">
      <div className="max-w-3xl mx-auto space-y-8">

        <div>
          <h1 className="text-2xl font-bold mb-1">TourIt Admin</h1>
          <p className="text-white/40 text-sm">Dev tools — not for production</p>
        </div>

        {/* Pro Mode Toggle */}
        <section className="rounded-2xl border border-white/10 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40 mb-4">Session Tier</h2>
          <div className="flex items-center gap-3 mb-3">
            <div className={`text-lg font-bold ${tier === "pro" ? "text-yellow-400" : "text-white/60"}`}>
              {tier === "pro" ? "★ PRO MODE ACTIVE" : "Free Mode"}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setProMode("pro")}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                tier === "pro" ? "bg-yellow-400 text-black" : "border border-white/20 hover:border-white/50"
              }`}
            >
              ★ Activate Pro
            </button>
            <button
              onClick={() => setProMode("free")}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                tier === "free" ? "bg-white text-black" : "border border-white/20 hover:border-white/50"
              }`}
            >
              Reset to Free
            </button>
          </div>
          <p className="text-white/30 text-xs mt-3">
            Sets a <code>tourit_tier</code> cookie — persists 30 days across all tabs.
          </p>
        </section>

        {/* DB Status */}
        <section className="rounded-2xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40">Database</h2>
            <button
              onClick={refreshTables}
              className="text-xs text-white/40 hover:text-white border border-white/10 px-3 py-1 rounded-lg transition-colors"
            >
              Refresh
            </button>
          </div>
          {tables ? (
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(tables).map(([name, row]) => (
                <div key={name} className="flex justify-between text-sm border border-white/5 rounded-lg px-3 py-2">
                  <span className="text-white/60">{name}</span>
                  <span className={row.exists ? "text-white" : "text-red-400"}>
                    {row.exists ? row.rowCount?.toLocaleString() : "✗"}
                  </span>
                </div>
              ))}
              <div className="flex justify-between text-sm border border-white/10 rounded-lg px-3 py-2 col-span-2 font-semibold">
                <span className="text-white/60">total rows</span>
                <span>{totalRows.toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <p className="text-white/30 text-sm">Loading…</p>
          )}
        </section>

        {/* Seed & Repair */}
        <section className="rounded-2xl border border-white/10 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40 mb-4">Generate Content</h2>
          <div className="flex gap-3 mb-4">
            <select
              value={seedCity}
              onChange={(e) => setSeedCity(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white text-sm flex-1 focus:outline-none"
            >
              <option value="darwin">Darwin</option>
              <option value="sydney">Sydney</option>
              <option value="london">London</option>
              <option value="paris">Paris</option>
              <option value="rome">Rome</option>
            </select>
            <button
              onClick={runSeed}
              disabled={seeding}
              className="bg-white text-black px-6 py-2 rounded-xl text-sm font-semibold hover:bg-white/90 transition-colors disabled:opacity-40"
            >
              {seeding ? "Generating…" : "Run Seed"}
            </button>
            <button
              onClick={runRepair}
              className="border border-white/20 hover:border-white/50 px-4 py-2 rounded-xl text-sm transition-colors"
              title="Fix duplicates and re-sync all tour stops"
            >
              🔧 Repair
            </button>
            <button
              onClick={runBackfillPhotos}
              disabled={backfilling}
              className="border border-white/20 hover:border-white/50 px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-40"
              title="Fetch Wikipedia photos for all stops missing one"
            >
              {backfilling ? "Fetching…" : "📷 Photos"}
            </button>
          </div>

          {status && (
            <pre className="text-xs text-white/50 mb-3 whitespace-pre-wrap">{status}</pre>
          )}

          {seedResults.length > 0 && (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {seedResults.map((r, i) => (
                <div
                  key={i}
                  className={`flex justify-between text-xs px-3 py-1.5 rounded-lg ${
                    r.status.includes("error")
                      ? "bg-red-500/10 text-red-400"
                      : r.status.includes("skipped")
                      ? "bg-white/5 text-white/30"
                      : "bg-green-500/10 text-green-400"
                  }`}
                >
                  <span className="truncate mr-2">{r.stop}</span>
                  <span className="flex-shrink-0">{r.status}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Quick links */}
        <section className="rounded-2xl border border-white/10 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40 mb-4">Quick Links</h2>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Home", href: "/" },
              { label: "Darwin 🐊", href: "/city/darwin" },
              { label: "Sydney 🦘", href: "/city/sydney" },
              { label: "London 🇬🇧", href: "/city/london" },
              { label: "Discover", href: "/discover" },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm border border-white/20 hover:border-white/50 px-4 py-2 rounded-xl transition-colors"
              >
                {l.label} →
              </a>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
