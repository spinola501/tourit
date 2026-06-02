"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getCookieTier, setCookieTier } from "@/lib/hooks/useTier";

// ── Types ─────────────────────────────────────────────────────────────────────

type Section = "overview" | "users" | "content" | "reports" | "tools";

type Stats = {
  cities: number; tours: number; stops: number; content: number;
  users: { total: number; pro: number; free: number };
  photos: { with: number; without: number; pct: number };
  categories: { fully_generated: number; avg_per_stop: number };
  reports: { open: number; total: number };
  plays: number; favorites: number;
};

type User = {
  id: string; name: string; home_city: string;
  tier: "free" | "pro"; interests: string[]; created_at: string;
};

type Report = {
  id: string; field: string; note: string | null; resolved: boolean; created_at: string;
  stop_name: string; stop_id: string | null; city_name: string;
};

type CityHealth = {
  id: string; name: string; slug: string; country: string;
  has_city_photo: boolean; stops: number; stops_with_photos: number;
  photo_pct: number; avg_categories: number; fully_generated: number;
};

type SeedResult = { stop: string; status: string };

// ── Shared helpers ─────────────────────────────────────────────────────────────

function Pct({ value, warn = 50, ok = 80 }: { value: number; warn?: number; ok?: number }) {
  const color = value >= ok ? "bg-emerald-500" : value >= warn ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-white/50 w-8 text-right">{value}%</span>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/3 p-4">
      <p className="text-xs text-white/40 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-white/40 mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {sub && <p className="text-sm text-white/40 mt-0.5">{sub}</p>}
    </div>
  );
}

function Loading() {
  return <p className="text-white/30 text-sm">Loading…</p>;
}

// ── Overview section ──────────────────────────────────────────────────────────

function OverviewSection({ secret }: { secret: string }) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats", { headers: { "x-admin-secret": secret } })
      .then((r) => r.json())
      .then(setStats);
  }, [secret]);

  if (!stats) return <Loading />;

  return (
    <div className="space-y-8">
      <SectionHeader title="Overview" sub="Live snapshot of your TourIt catalogue and users." />

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi label="Cities" value={stats.cities} />
        <Kpi label="Tours" value={stats.tours} />
        <Kpi label="Stops" value={stats.stops} />
        <Kpi label="Content pieces" value={stats.content.toLocaleString()} />
        <Kpi label="Total users" value={stats.users.total} sub={`${stats.users.pro} Pro · ${stats.users.free} Free`} />
        <Kpi label="Open reports" value={stats.reports.open} sub={`${stats.reports.total} total`} />
        <Kpi label="Total plays" value={stats.plays.toLocaleString()} />
        <Kpi label="Saved stops" value={stats.favorites.toLocaleString()} />
      </div>

      {/* Coverage */}
      <div className="rounded-xl border border-white/10 p-5 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-white/40">Content Coverage</h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs text-white/50 mb-1.5">
              <span>Stop photos</span>
              <span>{stats.photos.with} / {stats.stops} stops</span>
            </div>
            <Pct value={stats.photos.pct} />
          </div>
          <div>
            <div className="flex justify-between text-xs text-white/50 mb-1.5">
              <span>Fully generated (11 categories)</span>
              <span>{stats.categories.fully_generated} / {stats.stops} stops</span>
            </div>
            <Pct value={stats.stops ? Math.round((stats.categories.fully_generated / stats.stops) * 100) : 0} />
          </div>
          <div className="pt-1 text-xs text-white/30">
            Avg {stats.categories.avg_per_stop} categories per stop
            · {stats.photos.without} stops missing photos
          </div>
        </div>
      </div>

      {/* User split */}
      <div className="rounded-xl border border-white/10 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-white/40 mb-4">User split</h3>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-xs text-white/50 mb-1.5">
              <span>Pro users</span>
              <span>{stats.users.pro} / {stats.users.total}</span>
            </div>
            <Pct value={stats.users.total ? Math.round((stats.users.pro / stats.users.total) * 100) : 0} warn={10} ok={30} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Users section ─────────────────────────────────────────────────────────────

function UsersSection({ secret }: { secret: string }) {
  const [users, setUsers] = useState<User[] | null>(null);
  const [filter, setFilter] = useState<"all" | "free" | "pro">("all");
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(() => {
    const qs = filter !== "all" ? `?tier=${filter}` : "";
    fetch(`/api/admin/users${qs}`, { headers: { "x-admin-secret": secret } })
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []));
  }, [secret, filter]);

  useEffect(() => { load(); }, [load]);

  async function setTier(userId: string, tier: "free" | "pro") {
    setUpdating(userId);
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "x-admin-secret": secret, "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, tier }),
    });
    setUpdating(null);
    load();
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Users" sub="Manage accounts and tier assignments." />

      <div className="flex gap-2">
        {(["all", "free", "pro"] as const).map((t) => (
          <button key={t} onClick={() => setFilter(t)}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
              filter === t ? "bg-white text-black font-semibold" : "border border-white/20 text-white/50 hover:text-white"
            }`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <span className="ml-auto text-xs text-white/30 self-center">
          {users ? `${users.length} users` : ""}
        </span>
      </div>

      {!users ? <Loading /> : users.length === 0 ? (
        <p className="text-white/30 text-sm">No users found.</p>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/3">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-white/40">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-white/40">Home</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-white/40">Interests</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-white/40">Joined</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-white/40">Tier</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} className={`border-b border-white/5 ${i % 2 === 0 ? "" : "bg-white/2"}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {(u.name || "?"[0])?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-white">{u.name || <span className="text-white/30 italic">no name</span>}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/50">{u.home_city || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(u.interests ?? []).slice(0, 3).map((tag) => (
                        <span key={tag} className="text-xs bg-white/10 text-white/50 px-2 py-0.5 rounded-full">{tag}</span>
                      ))}
                      {(u.interests ?? []).length > 3 && (
                        <span className="text-xs text-white/30">+{u.interests.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/40 text-xs">
                    {new Date(u.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      u.tier === "pro" ? "bg-yellow-400/15 text-yellow-400" : "bg-white/10 text-white/40"
                    }`}>
                      {u.tier === "pro" ? "★ Pro" : "Free"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setTier(u.id, u.tier === "pro" ? "free" : "pro")}
                      disabled={updating === u.id}
                      className="text-xs border border-white/15 hover:border-white/40 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                    >
                      {updating === u.id ? "…" : u.tier === "pro" ? "→ Free" : "→ Pro"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Content section ───────────────────────────────────────────────────────────

function ContentSection({ secret }: { secret: string }) {
  const [cities, setCities] = useState<CityHealth[] | null>(null);

  useEffect(() => {
    fetch("/api/admin/content-health", { headers: { "x-admin-secret": secret } })
      .then((r) => r.json())
      .then((d) => setCities(d.cities ?? []));
  }, [secret]);

  const ALL_CATS = 11;

  return (
    <div className="space-y-6">
      <SectionHeader title="Content Health" sub="Per-city breakdown of photos, categories and generation coverage." />

      {!cities ? <Loading /> : cities.length === 0 ? (
        <p className="text-white/30 text-sm">No cities found. Run the seed first.</p>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/3">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-white/40">City</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-white/40">Stops</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-white/40 w-40">Photos</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-white/40 w-40">Avg cats</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-white/40">Full ({ALL_CATS})</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-white/40">City photo</th>
              </tr>
            </thead>
            <tbody>
              {cities.map((c, i) => (
                <tr key={c.id} className={`border-b border-white/5 ${i % 2 === 0 ? "" : "bg-white/2"}`}>
                  <td className="px-4 py-3">
                    <Link href={`/city/${c.slug}`} target="_blank" className="font-medium text-white hover:underline">
                      {c.name}
                    </Link>
                    <p className="text-xs text-white/30">{c.country}</p>
                  </td>
                  <td className="px-4 py-3 text-white/60">{c.stops}</td>
                  <td className="px-4 py-3">
                    <Pct value={c.photo_pct} />
                    <p className="text-xs text-white/30 mt-1">{c.stops_with_photos}/{c.stops}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Pct value={Math.round((c.avg_categories / ALL_CATS) * 100)} />
                    <p className="text-xs text-white/30 mt-1">{c.avg_categories} avg</p>
                  </td>
                  <td className="px-4 py-3 text-white/60">
                    {c.fully_generated}/{c.stops}
                  </td>
                  <td className="px-4 py-3">
                    {c.has_city_photo ? (
                      <span className="text-emerald-400 text-xs">✓</span>
                    ) : (
                      <span className="text-red-400 text-xs">✗ missing</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Reports section ───────────────────────────────────────────────────────────

function ReportsSection({ secret }: { secret: string }) {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/reports", { headers: { "x-admin-secret": secret } })
      .then((r) => r.json())
      .then((d) => setReports(d.reports ?? []));
  }, [secret]);

  useEffect(() => { load(); }, [load]);

  async function act(id: string, action: "resolve" | "delete") {
    setActing(id);
    await fetch("/api/admin/reports", {
      method: "POST",
      headers: { "x-admin-secret": secret, "Content-Type": "application/json" },
      body: JSON.stringify({ report_id: id, action: action === "delete" ? "delete" : "resolve" }),
    });
    setActing(null);
    load();
  }

  const visible = (reports ?? []).filter((r) =>
    filter === "open" ? !r.resolved : true
  );

  return (
    <div className="space-y-6">
      <SectionHeader title="Reports" sub="User-submitted issues on stop content. Resolve or dismiss." />

      <div className="flex gap-2 items-center">
        {(["open", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
              filter === f ? "bg-white text-black font-semibold" : "border border-white/20 text-white/50 hover:text-white"
            }`}>
            {f === "open" ? "Open" : "All"}
          </button>
        ))}
        <span className="ml-auto text-xs text-white/30">
          {reports ? `${visible.length} shown` : ""}
        </span>
      </div>

      {!reports ? <Loading /> : visible.length === 0 ? (
        <div className="rounded-xl border border-white/10 p-8 text-center">
          <p className="text-white/30 text-sm">No open reports.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/3">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-white/40">Stop</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-white/40">City</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-white/40">Reason</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-white/40">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-white/40">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r, i) => (
                <tr key={r.id} className={`border-b border-white/5 ${i % 2 === 0 ? "" : "bg-white/2"}`}>
                  <td className="px-4 py-3">
                    {r.stop_id ? (
                      <span className="font-medium text-white">{r.stop_name}</span>
                    ) : (
                      <span className="text-white/40 italic">{r.stop_name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/50">{r.city_name}</td>
                  <td className="px-4 py-3 text-white/70 max-w-xs" title={r.note ?? r.field}>
                    <span className="text-white/40 text-xs">[{r.field}]</span>{" "}
                    <span className="truncate">{r.note ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3 text-white/40 text-xs">
                    {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </td>
                  <td className="px-4 py-3">
                    {r.resolved ? (
                      <span className="text-xs text-emerald-400">Resolved</span>
                    ) : (
                      <span className="text-xs text-amber-400">Open</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      {!r.resolved && (
                        <button onClick={() => act(r.id, "resolve")} disabled={acting === r.id}
                          className="text-xs border border-emerald-500/30 text-emerald-400 hover:border-emerald-500/70 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40">
                          {acting === r.id ? "…" : "Resolve"}
                        </button>
                      )}
                      <button onClick={() => act(r.id, "delete")} disabled={acting === r.id}
                        className="text-xs border border-red-500/30 text-red-400 hover:border-red-500/70 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40">
                        {acting === r.id ? "…" : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Tools section ─────────────────────────────────────────────────────────────

function ToolsSection({ secret }: { secret: string }) {
  const [tier, setTier] = useState<"free" | "pro">("free");
  const [seedCity, setSeedCity] = useState("darwin");
  const [seeding, setSeeding] = useState(false);
  const [generatingTours, setGeneratingTours] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillingCities, setBackfillingCities] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [seedResults, setSeedResults] = useState<SeedResult[]>([]);
  const [status, setStatus] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteLog, setInviteLog] = useState<{ email: string; result: string }[]>([]);

  useEffect(() => { setTier(getCookieTier()); }, []);

  function setProMode(t: "free" | "pro") {
    setCookieTier(t);
    setTier(t);
    setStatus(`Session tier set to ${t}.`);
  }

  async function runGenerateTours() {
    setGeneratingTours(true);
    setStatus(`Designing curated tours for ${seedCity} via Claude…`);
    try {
      const r = await fetch("/api/admin/generate-tours", {
        method: "POST",
        headers: { "x-admin-secret": secret, "Content-Type": "application/json" },
        body: JSON.stringify({ citySlug: seedCity }),
      });
      const d = await r.json();
      if (d.error) {
        setStatus(`Error: ${d.error}`);
      } else {
        const summary = (d.tours ?? [])
          .map((t: { title: string; stops: number; unmatched: string[] }) =>
            `"${t.title}" — ${t.stops} stops${t.unmatched.length ? ` (${t.unmatched.length} unmatched)` : ""}`
          )
          .join("\n");
        setStatus(`Tours created for ${d.city}:\n${summary}`);
      }
    } catch (e) {
      setStatus(`Error: ${e}`);
    }
    setGeneratingTours(false);
  }

  async function runSeed() {
    setSeeding(true); setSeedResults([]); setStatus(`Seeding ${seedCity}…`);
    const r = await fetch("/api/admin/seed", {
      method: "POST",
      headers: { "x-admin-secret": secret, "Content-Type": "application/json" },
      body: JSON.stringify({ citySlug: seedCity }),
    });
    const d = await r.json();
    setSeedResults(d.results ?? []);
    setStatus(`Done — ${d.results?.length ?? 0} stops processed`);
    setSeeding(false);
  }

  async function runRepair() {
    setRepairing(true); setStatus("Repairing duplicates and syncing tour_stops…");
    const r = await fetch("/api/admin/repair", { method: "POST", headers: { "x-admin-secret": secret } });
    const d = await r.json();
    setStatus(d.log?.join("\n") ?? "Repair complete.");
    setRepairing(false);
  }

  async function sendInvite() {
    if (!inviteEmail.trim() || inviting) return;
    setInviting(true);
    try {
      const r = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "x-admin-secret": secret, "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const d = await r.json();
      if (d.error) {
        setInviteLog((prev) => [{ email: inviteEmail, result: `Error: ${d.error}` }, ...prev]);
      } else {
        const label = d.status === "upgraded"
          ? `Upgraded to Pro`
          : `Invite sent`;
        setInviteLog((prev) => [{ email: inviteEmail, result: label }, ...prev]);
        setInviteEmail("");
      }
    } catch (e) {
      setInviteLog((prev) => [{ email: inviteEmail, result: `Error: ${e}` }, ...prev]);
    }
    setInviting(false);
  }

  async function runBackfillPhotos(endpoint: string, label: string) {
    if (endpoint === "stops") setBackfilling(true);
    else setBackfillingCities(true);
    setStatus(`Fetching ${label} photos from Wikipedia…`);
    const r = await fetch(`/api/admin/${endpoint === "stops" ? "backfill-photos" : "backfill-city-photos"}`, {
      method: "POST", headers: { "x-admin-secret": secret },
    });
    const d = await r.json();
    setStatus(`${label} photos: ${d.updated ?? 0} updated.`);
    if (endpoint === "stops") setBackfilling(false);
    else setBackfillingCities(false);
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Tools" sub="Content generation, data repair and session utilities." />

      {/* Session tier */}
      <div className="rounded-xl border border-white/10 p-5">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3">Session Tier (Testing)</h3>
        <div className="flex items-center gap-3">
          <button onClick={() => setProMode("pro")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              tier === "pro" ? "bg-yellow-400 text-black" : "border border-white/20 hover:border-white/50"
            }`}>
            ★ Pro
          </button>
          <button onClick={() => setProMode("free")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              tier === "free" ? "bg-white text-black" : "border border-white/20 hover:border-white/50"
            }`}>
            Free
          </button>
          <span className="text-xs text-white/30">Sets <code className="text-white/50">tourit_tier</code> cookie (30 days)</span>
        </div>
      </div>

      {/* Seed */}
      <div className="rounded-xl border border-white/10 p-5">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3">Generate Content</h3>
        <div className="flex gap-3 mb-4 flex-wrap">
          <select value={seedCity} onChange={(e) => setSeedCity(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white text-sm focus:outline-none">
            {["darwin", "sydney", "london", "paris", "rome", "nyc", "tokyo", "barcelona"].map((c) => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
          <button onClick={runSeed} disabled={seeding}
            className="bg-white text-black px-5 py-2 rounded-xl text-sm font-semibold hover:bg-white/90 transition-colors disabled:opacity-40">
            {seeding ? "Generating…" : "Run Seed"}
          </button>
          <button onClick={runGenerateTours} disabled={generatingTours}
            className="border border-indigo-400/40 text-indigo-300 hover:border-indigo-400/70 px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-40"
            title="Design 2-3 curated day tours for this city using Claude">
            {generatingTours ? "Designing…" : "🗺 Gen Tours"}
          </button>
          <button onClick={runRepair} disabled={repairing}
            className="border border-white/20 hover:border-white/50 px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-40">
            {repairing ? "Repairing…" : "🔧 Repair DB"}
          </button>
        </div>

        {seedResults.length > 0 && (
          <div className="space-y-1 max-h-48 overflow-y-auto rounded-lg border border-white/10 p-2">
            {seedResults.map((r, i) => (
              <div key={i} className={`flex justify-between text-xs px-3 py-1.5 rounded-lg ${
                r.status.includes("error") ? "bg-red-500/10 text-red-400" :
                r.status.includes("skipped") ? "text-white/25" : "bg-emerald-500/10 text-emerald-400"
              }`}>
                <span className="truncate mr-2">{r.stop}</span>
                <span className="flex-shrink-0">{r.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Photo backfill */}
      <div className="rounded-xl border border-white/10 p-5">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3">Photo Backfill (Wikipedia)</h3>
        <div className="flex gap-3 flex-wrap">
          <button onClick={() => runBackfillPhotos("stops", "Stop")} disabled={backfilling}
            className="border border-white/20 hover:border-white/50 px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-40">
            {backfilling ? "Fetching…" : "📷 Stop Photos (100/batch)"}
          </button>
          <button onClick={() => runBackfillPhotos("cities", "City")} disabled={backfillingCities}
            className="border border-white/20 hover:border-white/50 px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-40">
            {backfillingCities ? "Fetching…" : "🏙 City Photos"}
          </button>
        </div>
        <p className="text-xs text-white/25 mt-3">~1 request/second per Wikipedia rate limit. Keep this tab open.</p>
      </div>

      {/* Pro Invitations */}
      <div className="rounded-xl border border-white/10 p-5">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-1">Pro Invitations</h3>
        <p className="text-xs text-white/30 mb-4">Upgrade an existing user instantly, or send a Pro invite to a new email.</p>
        <div className="flex gap-3 mb-3">
          <input
            type="email"
            placeholder="user@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendInvite()}
            disabled={inviting}
            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/50 transition-colors disabled:opacity-50"
          />
          <button
            onClick={sendInvite}
            disabled={inviting || !inviteEmail.trim()}
            className="bg-yellow-400 text-black px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-yellow-300 transition-colors disabled:opacity-40 whitespace-nowrap"
          >
            {inviting ? "Sending…" : "Grant Pro"}
          </button>
        </div>
        {inviteLog.length > 0 && (
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {inviteLog.map((l, i) => (
              <div key={i} className={`flex justify-between text-xs px-3 py-1.5 rounded-lg ${
                l.result.startsWith("Error") ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"
              }`}>
                <span className="truncate mr-2">{l.email}</span>
                <span className="flex-shrink-0">{l.result}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status output */}
      {status && (
        <div className="rounded-xl border border-white/10 bg-white/3 p-4">
          <pre className="text-xs text-white/50 whitespace-pre-wrap font-mono">{status}</pre>
        </div>
      )}

      {/* Quick links */}
      <div className="rounded-xl border border-white/10 p-5">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3">Quick Links</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Home", href: "/en" },
            { label: "Discover", href: "/en/discover" },
            { label: "London", href: "/en/city/london" },
            { label: "Sydney", href: "/en/city/sydney" },
            { label: "Darwin", href: "/en/city/darwin" },
            { label: "Profile", href: "/en/profile" },
            { label: "Login", href: "/en/auth/login" },
          ].map((l) => (
            <Link key={l.href} href={l.href} target="_blank"
              className="text-xs border border-white/15 hover:border-white/40 px-4 py-2 rounded-xl transition-colors text-white/50 hover:text-white">
              {l.label} ↗
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Nav item ──────────────────────────────────────────────────────────────────

const NAV: { id: Section; label: string; icon: string }[] = [
  { id: "overview",  label: "Overview",  icon: "◈" },
  { id: "users",     label: "Users",     icon: "◎" },
  { id: "content",   label: "Content",   icon: "▦" },
  { id: "reports",   label: "Reports",   icon: "⚑" },
  { id: "tools",     label: "Tools",     icon: "⚙" },
];

// ── Main export ───────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [authError, setAuthError] = useState("");
  const [section, setSection] = useState<Section>("overview");

  async function tryUnlock() {
    const r = await fetch("/api/admin/verify", { headers: { "x-admin-secret": secret } });
    if (r.ok) { setUnlocked(true); setAuthError(""); }
    else setAuthError("Wrong secret");
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="w-full max-w-sm space-y-4 px-6">
          <div className="text-center mb-8">
            <p className="text-2xl font-bold">TourIt Admin</p>
            <p className="text-white/30 text-sm mt-1">Internal workstation</p>
          </div>
          <input
            type="password"
            placeholder="Admin secret…"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && tryUnlock()}
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-white/50"
            autoFocus
          />
          {authError && <p className="text-red-400 text-sm text-center">{authError}</p>}
          <button onClick={tryUnlock}
            className="w-full bg-white text-black py-3 rounded-xl font-semibold hover:bg-white/90 transition-colors">
            Unlock
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-bold tracking-tight">TourIt</span>
          <span className="text-white/20 text-sm">|</span>
          <span className="text-white/40 text-sm">Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" target="_blank" className="text-xs text-white/30 hover:text-white/60 transition-colors">
            ↗ Open app
          </Link>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-48 border-r border-white/10 flex flex-col py-4 px-3 gap-0.5 flex-shrink-0">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-left ${
                section === item.id
                  ? "bg-white/10 text-white font-medium"
                  : "text-white/40 hover:text-white/70 hover:bg-white/5"
              }`}
            >
              <span className="text-base w-5 text-center leading-none">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto p-8">
          {section === "overview" && <OverviewSection secret={secret} />}
          {section === "users"    && <UsersSection    secret={secret} />}
          {section === "content"  && <ContentSection  secret={secret} />}
          {section === "reports"  && <ReportsSection  secret={secret} />}
          {section === "tools"    && <ToolsSection    secret={secret} />}
        </main>
      </div>
    </div>
  );
}
