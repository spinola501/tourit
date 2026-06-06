# TourIt — Dev Log

---

## Session 014 — 2026-06-06: Vercel build fix (Leaflet + tours INSERT)

**Done:**

- **Vercel Turbopack build fixed:** `components/RouteMap.tsx` was using `import("leaflet").then(...)` inside two `useEffect` hooks. Turbopack's static analyser cannot resolve dynamic `import()` calls inside function bodies and threw `Module not found: Can't resolve 'leaflet'`. Fixed by converting to a static top-level `import * as L from "leaflet"` and removing the `.then()` wrappers. Safe because `RouteMap` is `"use client"` and is only ever loaded via `dynamic(..., { ssr: false })` — it never runs server-side.
- **`generate-city` tours INSERT fixed:** The background job in `app/api/generate-city/route.ts` was still inserting `theme` and `duration_hours` (non-existent columns) when creating prebuilt tours after city generation. Removed both; added `type: "prebuilt"` instead. This would have silently crashed tour creation for any newly generated city.

**Decisions:**
- Static import of leaflet at module level is the correct pattern for Turbopack. Dynamic `import()` inside useEffect is a runtime-only pattern that Webpack tolerates but Turbopack requires static tracing for.

**Problems / Blockers:**
- `APP_URL=https://tourit.es` must still be set in Vercel environment variables.
- Melbourne content still needs to be seeded from admin panel (EN, then ES).

**Next session:**
- Seed Melbourne EN + ES from admin panel
- Verify `APP_URL=https://tourit.es` in Vercel env vars
- Begin Stripe integration (Trip Pass €5.99/7d + Annual Pro €16.99/yr)
- Stop Q&A agent (contextual chat per stop, RAG on `stop_content`, Pro only)

---

## Session 013 — 2026-06-06: Tour builder overhaul, locale fixes, Melbourne, bug sweep

**Done:**

- **`theme` column error fixed (root cause):** `getToursByCity` and `getTourById` in `queries.ts` were SELECTing a `theme` column that doesn't exist in the `tours` table. This caused every tour listing and tour detail to fail silently — tours appeared missing and the custom tour builder threw the "could not find the 'theme' column" Supabase schema cache error. Both queries now omit `theme`. `ClientTour` type and city page server mapping updated to match.
- **`build-tour` INSERT also fixed:** The custom tour builder was also inserting `theme` on save. Replaced with `type: "custom"` (which IS a real column) so custom tours are distinguishable from prebuilt ones.
- **GPS stop navigation:** Stops now show a pin icon button linking to Google Maps (`https://www.google.com/maps/search/?api=1&query=lat,lng`). Available in both the TourPlayer stop header and the sidebar stop list (Pro). Requires `lat`/`lng` on stop records.
- **Tour builder — route builder UI:** Full redesign. Available stops pool on the left with `+` to add; route list on the right with `↑↓×` reorder/remove. Haversine travel-time estimates between stops (walking pace: leisurely 3km/h / moderate 4.5km/h / fast 6km/h). Total tour time = stop time + travel time. In-app Leaflet map with numbered markers and dashed polyline. "Export to Google Maps" button. All updates live as stops are added/reordered.
- **Tour builder — responsive mobile:** Tab bar ("Stops N / Route N · Xh") switches panels on mobile. First stop added auto-switches to Route tab. Scroll height capped at 60vh on mobile. Desktop unchanged (side-by-side grid).
- **Tour builder — specialisations:** 8 theme filters (Standard, History, Architecture, Gastronomy, Photography, Family, Nature, Nightlife) sort the available stops pool by tag matching. Visible in the Filters & Preferences accordion.
- **Stop content preview for Pro users (city page):** Pro users can now tap any stop card on the city page to open a bottom-sheet modal with all content categories (history, architecture, culture, funfacts, practical, etc.) loaded on demand via new `GET /api/stop?id=...&lang=en` endpoint. Free users still see 6 stops with a blurred upgrade prompt.
- **Melbourne added:** 16 curated stops added to seed script (Federation Square, Flinders Street Station, St Paul's Cathedral Melbourne, Queen Victoria Market, NGV, Melbourne Museum, Royal Exhibition Building, ACMI, Royal Botanic Gardens, Fitzroy Gardens, Eureka Skydeck, Shrine of Remembrance, MCG, Luna Park St Kilda, Hosier Lane, Fitzroy Street Art Precinct). Admin seed now accepts `language` param (default `en`); for existing stops it generates content in the new language without re-creating the stop record. Language selector added to admin panel "Generate Content" section.
- **Status endpoint fixed:** `GET /api/generate-city/status` was returning `"done"` as soon as `stopCount > 0`, before tours were created. Now requires both stops AND tours to exist before returning done. This was causing Melbourne (4 stops, 0 tours) to show as complete and the city-request flow to abort early.
- **Auto tour generation (self-healing):** City page now uses `after()` to auto-generate tours in the background when a city has stops but 0 prebuilt tours. Page loads instantly; tours appear on next refresh. Deduplication check prevents parallel page loads from double-generating. Fixes Melbourne and any other city that was partially seeded.
- **Legacy city redirect fixed:** `app/city/[slug]/page.tsx` (no-locale redirect) was hardcoded to `/en/city/${slug}`. Now uses `getLocale()` so Spanish users stay in `/es/`.
- **Email localhost fix:** `generate-city` and `admin/invite` routes were using `NEXT_PUBLIC_APP_URL` for email links, which resolves to `http://localhost:3000` in development — and in production if the Vercel env var wasn't overriding it. Changed to use `APP_URL` (server-only, never exposed client-side) → `VERCEL_URL` (auto-set by Vercel) → `"https://tourit.es"` fallback. **Required:** set `APP_URL=https://tourit.es` in Vercel environment variables.
- **Email locale fix:** Completion email link was hardcoded to `/en/city/...`. Now uses the `language` that was requested.
- **`speechSynthesis` null guards:** All Web Speech API calls in TourPlayer (`.cancel()`, `.pause()`, `.resume()`, `.speak()`) now use optional chaining. Some Android browsers expose `speechSynthesis` as `undefined` in certain contexts.
- **Locale link audit:** All remaining hardcoded locale-less links fixed across home page, account page, `CitySearchGrid`, and tour detail page. All `redirect()` calls and `<Link>` hrefs now use `/${locale}/...`.

**Decisions:**
- `after()` for auto tour generation on city page load — zero UX impact (page loads instantly), self-heals any partially-seeded city. The double-generation guard is a fresh DB count check; accepts the race for the rare concurrent page load case (tour regeneration is idempotent: deletes prebuilt then recreates).
- `APP_URL` env var (non-public) for server-side email links — prevents dev localhost value from leaking into production emails regardless of how Vercel env vars are configured.

**Problems / Blockers:**
- `APP_URL=https://tourit.es` must be set in Vercel environment variables for email links to be correct. Without it, falls back to `VERCEL_URL` (deployment subdomain) → `tourit.es`.
- Melbourne tours will auto-generate on first city page visit (via `after()`). Admin can also trigger via "🗺 Gen Tours" button if needed immediately.
- Spanish content for Melbourne: go to admin → Generate Content → select Melbourne + ES → Run Seed.

**Next session:**
- Seed Melbourne EN from admin panel, then seed ES
- Verify `APP_URL=https://tourit.es` set in Vercel
- Begin Stripe integration (Trip Pass €5.99/7d + Annual Pro €16.99/yr)
- Stop Q&A agent (contextual chat per stop, RAG on `stop_content`, Pro only)

---

## Session 012 — 2026-06-05: Full app audit and link/auth/UX fixes

**Done:**
- **NavBar locale fix:** All links (`/`, `/discover`, `/profile`, `/auth/login`) now use `getLocale()` from next-intl/server and route to `/{locale}/...` — previously all were hardcoded without locale prefix causing 404s for non-English users
- **TourPlayer upgrade link:** "Upgrade to Pro" button inside NarrationPanel was linking to `/account` — fixed to `/{locale}/account` using `useLocale()` inside the component
- **404 page home link:** Was hardcoded to `/en` — changed to `/` so middleware handles locale routing correctly
- **Tier cookie DB sync:** `useTier` hook now fetches DB tier on mount and syncs cookie — users upgraded via admin invite now see Pro status immediately without needing to visit `/profile`
- **Email validation:** Added regex check in invite route before calling Resend/generateLink — prevents silent failures from malformed addresses
- **ReportButton:** Added `disabled` state during submit (prevents duplicate reports), error catch on fetch, and `aria-label` for accessibility
- **Admin avatar typo:** Fixed `(u.name || "?"[0])?.charAt(0)` → `(u.name?.[0] ?? "?").toUpperCase()` — was always showing "?" for nameless users
- **Generation in-progress banner:** Added "Refresh" button so users can poll whether generation completed instead of guessing
- **City hero image:** Changed to `loading="eager"` (above-the-fold image should not be lazy-loaded)
- **Comprehensive audit:** Spawned deep audit agent covering all pages, API routes, auth flows, DB schema consistency, security, UX, performance, i18n — 31 issues identified, critical/high fixed

**Decisions:**
- `useTier` DB sync on mount: one extra Supabase query per page load where the hook is used (player, city page). Accepted cost given the UX benefit of instant Pro recognition after admin invite
- LanguageSwitcher debounce, NavBar N+1 query, favorites race condition: left as-is — each requires a larger structural change (context provider, Redis, DB constraint) not justified at current scale

**Problems / Blockers:**
- `/_global-error` Turbopack prerender bug (Next.js 16) still present locally — Vercel builds pass, does not affect production
- `comped` column SQL still needs running in Supabase: `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS comped boolean DEFAULT false;`
- `tourit.es` not yet verified in Resend — invites and generation emails sent from `onboarding@resend.dev`

**Next session:**
- Verify `tourit.es` domain in Resend (add DNS to IONOS), set `RESEND_FROM_EMAIL` in Vercel
- Run stop + city photo backfill from admin panel
- End-to-end test: request Melbourne → confirm 12–16 stops → email received
- Seed Tier 1 cities: Paris, Rome, NYC, Tokyo, Barcelona
- Begin Stripe integration (Trip Pass €5.99/7d + Annual Pro €16.99/yr)

---

## Session 011 — 2026-06-05: Pro features, security audit, and generation overhaul

**Done:**
- **On-demand city generation (Pro):** `POST /api/generate-city` now returns immediately (job ID) and runs via `next/server after()` in the background — no more Vercel timeout kills. `maxDuration = 300` set on the route
- **Parallel stop generation:** Stops generated in batches of 5 simultaneously (~5× faster than sequential)
- **Smart stop count:** `planCity` upgraded to Claude Sonnet; assesses location type first (major_city / city / town / park_reserve / island) and chooses the appropriate number of stops (4–20). Never hallucinates stops to fill a quota
- **Completion detection:** City is only "done" when it has both stops AND tours. Partial cities (e.g. Melbourne with 4 stops after a timeout) are automatically continued on next request
- **City + stop photos:** City Wikipedia photo fetched before DB insert; falls back to first stop photo if nothing found. `backfill-city-photos` also uses stop-photo fallback. Improved stop photo search terms
- **Email notifications:** Completion + failure emails sent via Resend after generation. `RESEND_FROM_EMAIL` env var configurable; defaults to `onboarding@resend.dev` until domain verified
- **Admin Pro invitations:** `Grant Pro` uses `generateLink()` + Resend instead of Supabase's built-in email sender — bypasses Supabase's 4/hour rate limit. Invited users marked `comped = true`
- **Cost & Revenue tracker:** New admin "Costs" tab — all-time AI generation costs, monthly infrastructure, USD MRR from paying Pro users only (comped excluded), profitability %, break-even user count. All values in USD (EUR converted at $1.09)
- **City page redesign:** Narration length picker (Short/Standard/Long) at top; choice passed to player via `?length=` URL param. Free users see 6 stops then blurred preview with upgrade prompt. Pro users see all stops + "Build Custom Tour" CTA
- **Pro Tour Builder** (`/city/[slug]/build-tour`): Full-screen form — group size, accessibility needs (wheelchair/pram/elderly), day of week (filters closed stops), duration, 8 specialisation themes, narration length, budget filter, language (all 9 locales), walking pace. Live itinerary preview updates in real time
- **UI/UX audit fixes:** All `<select>` dropdowns fixed with `colorScheme: dark`. Locale prefix added to all tour/city/account links. `auth/callback` open redirect fixed. `auth/signout` preserves locale. `ProfileClient` shows save errors. `FavoriteButton` aria-labels + error state
- **Security fixes:** Timing-safe admin secret comparison (`timingSafeEqual`) across all 10 admin routes. Report endpoint requires auth + 5/hour rate limit. Prompt injection prevention (strip newlines, length cap on cityName/country inputs). Language whitelist validation. Generic error messages to users, detailed logs server-side only. `supabaseUrl` removed from verify response
- **Schema bug fixes:** Removed non-existent `tier_required`, `created_by`, `is_official`, `type` columns from all queries and inserts. `build-tour` was failing entirely due to these. `getToursByCity` / `getTourById` queries cleaned up

**Decisions:**
- Use `after()` from `next/server` for fire-and-forget background work instead of SSE streams — SSE dies when Vercel's function timeout hits; `after()` extends the lifetime
- Claude Sonnet for city planning (better geographic reasoning), Claude Haiku for individual stop content (cost-effective at scale)
- Completion signal = stops AND tours both present; tours are generated last so their presence means the full pipeline ran
- Comped users (admin-invited) excluded from MRR and revenue calculations from day one
- All monetary values in USD throughout admin cost tracker; EUR subscription prices converted at fixed $1.09 rate

**Problems / Blockers:**
- `/_global-error` prerender fails locally with Next.js 16 Turbopack (known framework bug, "This is a bug in Next.js"). Vercel builds pass — does not affect production
- `tourit.es` domain not yet verified in Resend; invitations and completion emails sent from `onboarding@resend.dev` until DNS records added
- `comped` column on `users` table needs manual SQL: `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS comped boolean DEFAULT false;`
- Supabase free plan email rate limit (4/hour) was blocking invitations — now fully bypassed via Resend

**Next session:**
- Verify `tourit.es` domain in Resend (add DNS records to IONOS), then set `RESEND_FROM_EMAIL=TourIt <noreply@tourit.es>` in Vercel
- Run city photo + stop photo backfill in admin for all existing cities
- Test Melbourne end-to-end: request via Discover → confirm 12–16 stops generated → email received
- Seed Tier 1 cities: Paris, Rome, NYC, Tokyo, Barcelona
- Begin Stripe integration (Trip Pass + Annual Pro webhooks)

---

## Sessions 006–010 — 2026-05-30

**Goal:** Admin workstation, Google OAuth, city photos, 9-language i18n, curated tour generation, Phase 3 completion and UI polish.

---

### Session 006 — Admin Workstation

**Implemented**
- Full admin dashboard rewrite with 5-section sidebar: Overview, Users, Content, Reports, Tools
- 4 new API routes: `GET /api/admin/stats` (8 KPIs), `GET|POST /api/admin/users` (list + set tier), `GET|POST /api/admin/reports` (list + resolve/delete), `GET /api/admin/content-health` (per-city photo/category coverage)
- Real-time KPI cards: cities, tours, stops, content pieces, users (free/pro split), open reports, plays, saves
- Per-city content health table with progress bars for photo coverage and avg categories
- User table with one-click tier toggle (free ↔ pro)
- Reports queue with Resolve/Delete actions
- Tools section: seed, repair, backfill, 🗺 Gen Tours button, session tier toggle

**Fixes**
- `stop_reports` schema: actual columns are `field`, `note`, `resolved` (bool) — not `reason`/`resolved_at`. Fixed `/api/report` and `/api/admin/reports` routes. Also fixed `.catch()` on Supabase query builders (v2 returns PromiseLike, not Promise).

---

### Session 007 — Google OAuth, Profile Redesign & City Photos

**Implemented**
- Google OAuth live: user configured Google Cloud Console (client ID + redirect URI), Supabase Auth provider enabled
- Profile page hero: gradient indigo backdrop, 80px avatar with violet-indigo gradient fallback, tier badge pill, compact upgrade banner for free users
- City photo infrastructure: `photo_url` column on `cities` table, `POST /api/admin/backfill-city-photos` endpoint (Wikipedia API, same pattern as stop photos), "🏙 City Photos" button in admin
- City cards redesigned: full-bleed photo with dark overlay gradient, hover zoom (scale-105, 700ms), city name/country/tours at bottom — no more emoji-on-gradient

**SQL required by user**
```sql
ALTER TABLE cities ADD COLUMN IF NOT EXISTS photo_url text;
```

---

### Session 008 — i18n: 9 Languages with next-intl

**Implemented**
- `next-intl` v4 installed; `i18n/routing.ts` + `i18n/request.ts` configured
- 9 locale message files: `en`, `es`, `fr`, `de`, `pt`, `it`, `ja`, `zh`, `eo` (Esperanto)
- All pages migrated to `app/[locale]/` directory structure; old paths redirect to `/en/[path]`
- `LanguageSwitcher` component in NavBar: flag + locale code + dropdown with all 9 languages
- `app/[locale]/layout.tsx` sets correct `lang` attribute + loads Noto Sans JP/SC for CJK locales
- Root `app/layout.tsx` made minimal (`return children`); `app/admin/layout.tsx` + `app/auth/layout.tsx` added as standalone html/body wrappers
- Esperanto added as 9th language — full UI translation including player categories and auth flows

**Decisions**
- URL-based locale routing (`/en/`, `/es/`, `/eo/`) rather than cookie-based — better for SEO and link sharing
- Sonnet used for tour generation (not Haiku) to get evocative titles; Haiku used for stop content generation
- Tour content in DB remains English; UI chrome is translated. Full content translation in Phase 4 via DeepL lazy pipeline.

---

### Session 009 — Curated Tour Generation System

**Implemented**
- `lib/generation/generate-tours.ts`: Claude Sonnet designs 2–3 thematic day tours per city from the actual stop list. Fuzzy stop-name matching (exact → substring → first-3-words) to map Claude's output to real DB stop IDs.
- `POST /api/admin/generate-tours`: deletes existing prebuilt system tours, calls Claude, creates new tours + tour_stops
- Seed updated: no longer creates a catch-all "Classic" tour. After all stops generated, auto-calls tour designer. Result: each city gets 2–3 curated tours on first seed.
- 9 tours generated for 3 cities — all thematic, city-specific, with proper taglines:
  - **Darwin**: "Darwin Under Fire: The Bombed City's Wartime Soul" · "Crocs, Convicts & the Curious City" · "Top End Wild: Waterfalls, Wetlands & Wildlife Beyond Darwin"
  - **Sydney**: "Harbour's Edge: Sandstone, Sails & Sydney Cove" · "Bohemian Inner West: Terraces, Trade & Creative Sydney" · "Clifftops & Coves: The Eastern Beaches & Coastal Edge"
  - **London**: "Crown, Cathedral & the Medieval Mile" · "Power, Parliament & the Parks of Westminster" · "Markets, Mavericks & the North London Beat"
- Admin "🗺 Gen Tours" button regenerates tours for any selected city on demand (~10s, ~$0.01)

---

### Session 010 — Phase 3 Completion & UI Polish

**Implemented**
- Home page redesigned: large serif headline "Every city. Every story." with indigo glow, 3-step "How it works" (01/02/03 numbered panels), accurate Free/Pro comparison (real pricing, correct feature list)
- Emojis removed from all public-facing UI: city page hero, city card fallbacks → replaced with large bold city initial letter; admin quick links updated
- Free tier save limit enforced: `POST /api/favorites` returns `403 limit_reached` after 3 saves; `FavoriteButton` shows "Pro →" upgrade link on limit
- `last_verified_at` displayed in player practical info card ("Verified May 2026"); emoji icons in practical card replaced with SVG icons (clock, ticket, transit)
- Personalised recommendations: home page shows "Recommended for you" heading for signed-in users with saved interests
- Admin layout fixed (missing html/body after i18n refactor)
- EN messages updated with accurate content reflecting current app state

**Pending / Deferred to later phases**
- Group profile (mobility, ages, pace) → Phase 5
- Google Places API cron → Phase 5
- Wikipedia change detection → Phase 5

---

## Pendiente para próxima sesión (Phase 4 kickoff)
- [ ] **SQL** (if not done): `ALTER TABLE cities ADD COLUMN IF NOT EXISTS photo_url text;`
- [ ] **tourit.es**: verify DNS propagation → update Supabase Auth "Site URL" + "Redirect URLs" to include `https://tourit.es`
- [ ] **Google OAuth**: add `https://tourit.es` to Authorized JavaScript Origins in Google Cloud Console (already done? confirm)
- [ ] **Deploy**: push all changes to GitHub → Vercel auto-deploy → verify production at tourit-sigma.vercel.app
- [ ] **City photo backfill**: run "🏙 City Photos" in /admin for Darwin (London + Sydney likely already have photos)
- [ ] **Phase 4 start**: Stripe subscriptions (Trip Pass €5.99/7d + Annual Pro €16.99/yr)

---

## Session 001 — 2026-05-22

**Goal:** Project kickoff. Define concept, scaffold web app, build core UI pages with mock data.

### Context
New project. AI-powered audio tour app in two tiers:
- **Free:** Pre-built city tours (AI-researched, cached), GPS audio playback.
- **Pro:** Custom tour builder, content depth categories, group profiles, offline download.

Concept validated against existing apps (VoiceMap, STQRY, AI TourMate, WeGoTrip). Gap identified: no app does easy tour *creation* + high-quality AI *narration* + genuine *personalization* well together.

Reference UX: the Litchfield National Park one-day guide — rich narrative, stop-by-stop structure, accessibility notes, listened to while driving.

### Decisions
- **Name:** TourIt (working name). Domain TBD.
- **Stack:** Next.js 15 (web), React Native/Expo (mobile, Phase 5), Tailwind + shadcn/ui, Claude API, ElevenLabs TTS, Mapbox, Supabase, Stripe.
- **Build order:** UI first with mock data → AI pipeline → auth → paid tier builder → mobile GPS.
- **Mobile is primary long-term** (GPS triggering, offline) but web first for speed of iteration.

### Completed
- [x] Project folder created at `C:\Prj Claude\tourit`
- [x] ROADMAP.md written (6 phases)
- [x] DEVLOG.md started
- [x] Next.js 16 + TypeScript + Tailwind + shadcn/ui scaffolded at `web/`
- [x] Home page — city search, featured cities grid, tier comparison
- [x] Discover page — full city browse
- [x] City page `/city/[slug]` — tours list for a destination
- [x] Tour detail page `/tour/[id]` — stops list, categories, Start Tour button
- [x] Player page `/tour/[id]/play` — stop-by-stop narration, category tabs, audio controls, stops drawer
- [x] Mock data — London Classic One Day (5 stops with full narration: history, architecture, fun facts, fauna)
- [x] Dev server running at http://localhost:3000

### Next Session
- Connect real Claude API + web search for tour generation
- Set up Supabase schema
- Pre-generate first 3 city tours (London, Paris, Rome)

---

### 13:53 — Kickoff completo: concepto, arquitectura y MVP web funcional

- **Investigación de mercado:** Se analizaron los principales competidores (VoiceMap, STQRY, AI TourMate, WeGoTrip, StreetPhonia, Action Tour Guide). Gap identificado: ninguna app combina bien creación de tours sencilla + narración AI de calidad + personalización real. Ese es el espacio de TourIt.
- **Definición del producto:** Dos tiers — Free (tours pre-generados por ciudad, narración AI cacheada, GPS auto-play) y Pro (constructor de tours a medida, 11 categorías de contenido, perfil de grupo —bebés, mayores, silla de ruedas—, descarga offline).
- **Referencia UX:** La guía del Parque Nacional Litchfield (escuchada en el coche durante la excursión) como modelo de narración: rica, estructurada por paradas, con notas de accesibilidad. Esa es la experiencia objetivo.
- **Stack decidido:** Next.js (web) + React Native/Expo (móvil, Fase 5), Tailwind + shadcn/ui, Claude API, ElevenLabs TTS, Mapbox, Supabase, Stripe.
- **Nombre de trabajo:** TourIt. Dominio pendiente. Alternativas valoradas: Roamio, Waycast, Narrato.
- **Scaffold del proyecto:** Next.js 16 + TypeScript + Tailwind + shadcn/ui inicializado en `web/`. Build limpio sin errores.
- **Datos mock:** Tour "London Classic — One Day" con 5 paradas completas (Tower of London, Tower Bridge, St Paul's, Trafalgar Square, Hyde Park). Cada parada incluye narración detallada en categorías History, Architecture, Fun Facts y Fauna, notas de accesibilidad e información práctica.
- **Servidor de desarrollo:** Corriendo en http://localhost:3000.

**Ficheros creados:**
- `ROADMAP.md` — Hoja de ruta completa en 6 fases con tabla de tiers, categorías de contenido y stack
- `DEVLOG.md` — Este fichero
- `web/lib/types.ts` — Tipos TypeScript: Tour, TourStop, City, GroupProfile, ContentCategory
- `web/lib/mock-data.ts` — Datos mock: 6 ciudades + 4 tours de Londres + narración completa del tour clásico (5 paradas)
- `web/app/page.tsx` — Home: hero con buscador, grid de ciudades, comparativa Free/Pro
- `web/app/discover/page.tsx` — Discover: listado de todas las ciudades
- `web/app/city/[slug]/page.tsx` — Página de ciudad: tours disponibles con cards
- `web/app/tour/[id]/page.tsx` — Detalle de tour: lista de paradas, categorías, botón Start
- `web/app/tour/[id]/play/page.tsx` — Server component del player
- `web/app/tour/[id]/play/TourPlayer.tsx` — Player interactivo: tabs de categoría, texto de narración, info práctica, accesibilidad, controles de audio mock, cajón de paradas

**Ficheros modificados:**
- `web/app/layout.tsx` — Título y descripción actualizados a TourIt

---

## Pendiente para próxima sesión
- [ ] Integrar Claude API + búsqueda web (Tavily) para generación real de tours desde nombre de ciudad
- [ ] Integrar ElevenLabs TTS: texto de narración → archivos de audio por parada
- [ ] Configurar Supabase: schema de base de datos (tours, stops, users) + almacenamiento de audio
- [ ] Pre-generar y cachear los 3 primeros tours reales: London, Paris, Rome
- [ ] Ruta de admin para disparar generación de tours
- [ ] Conectar reproductor de audio real en el player (Web Audio API o elemento `<audio>`)
- [ ] Página de perfil de usuario con formulario de datos personales y perfil de grupo por defecto

---

## Session 002 — 2026-05-22

**Goal:** Phase 2 AI pipeline end-to-end. Real Supabase data in the player. Cities and tours for Australia (Darwin + Sydney) for on-the-ground testing. Admin panel. Vercel deployment.

### 17:20 — Pipeline AI completa, ciudades AU, admin panel y despliegue en Vercel

- **Verificación de Supabase:** Endpoint `/api/admin/verify` confirma las 10 tablas del schema live (cities, stops, stop_content, stop_practical, tours, tour_stops, stop_plays, stop_reports, stop_transitions, users). Se descubrió que `.env.local` tenía la URL con sufijo `/rest/v1/` — el cliente JS de Supabase necesita la URL base del proyecto. Corregido.
- **Pipeline de generación funcionando:** Tavily → Claude Haiku (claude-haiku-4-5-20251001) con prompt caching → validación Zod → insert en Supabase. Test con Tower of London exitoso. Se amplió el límite de tags de Zod de `max(5)` a `max(10)` porque Claude generaba hasta 8 tags por parada.
- **Seed de Londres:** Ampliado de 8 a 32 paradas: Tower of London, Tower Bridge, St Paul's, Westminster, Tate Modern, Borough Market, Greenwich, Kew Gardens, Hampton Court, Camden Market, Portobello Road, Canary Wharf, Barbican, Museum of London, Leadenhall Market, Southbank, Battersea, Victoria & Albert, Natural History Museum, Hyde Park, Buckingham Palace, Trafalgar Square, British Museum, Oxford Street, Covent Garden, Shoreditch, Notting Hill, Richmond Park, London Eye, The Shard, Bank of England Museum, Brixton.
- **Seed de Sydney:** 26 paradas: Opera House, Harbour Bridge, Bondi Beach, Circular Quay, The Rocks, Darling Harbour, Manly Beach, Coogee Beach, Blue Mountains (Katoomba / Three Sisters), Taronga Zoo, Royal Botanic Garden, Hyde Park, Australian Museum, Newtown, Paddington, Fish Market, Barangaroo, Luna Park, Watsons Bay, Cremorne Point, Balmain, Glebe, Surry Hills, Chippendale, Cronulla, Homebush Bay.
- **Seed de Darwin:** 18 paradas: Darwin Waterfront, Mindil Beach, Crocosaurus Cove, Darwin Museum & Art Gallery, Fannie Bay Gaol, RAAF Darwin Aviation Museum, East Point Military Museum, Wave Hill Walk-Off Memorial, Litchfield NP (Wangi Falls), Litchfield NP (Florence Falls), Litchfield NP (Magnetic Termite Mounds), Kakadu (Ubirr), Kakadu (Yellow Water), Territory Wildlife Park, Berry Springs Nature Park, Howard Springs Nature Park, Crocodylus Park, Darwin Botanic Gardens.
- **Fix de duplicados:** Runs paralelos del seed causaban duplicados antes del chequeo de existencia. Solución: endpoint `POST /api/admin/repair` que agrupa stops por nombre (insensitive), elimina duplicados (preservando el más antiguo), y reconstruye `tour_stops` desde cero para cada city. El seed ahora usa `.ilike("name", stop.name)` para chequeo case-insensitive.
- **Fix de seed — tour upfront:** El tour ahora se crea antes del bucle de paradas; cada parada se enlaza a `tour_stops` inmediatamente al insertarse (no en batch al final). Esto evita que interrupciones o runs incompletos dejen el tour con menos paradas de las esperadas.
- **Queries de servidor:** Creado `web/lib/db/queries.ts` con `getCityBySlug`, `getToursByCity`, `getTourById` (con join profundo: tour + cities + tour_stops + stops + stop_content + stop_practical) y `getStopContent`.
- **Páginas conectadas a datos reales:** `app/page.tsx`, `app/city/[slug]/page.tsx`, `app/tour/[id]/page.tsx` y `app/tour/[id]/play/page.tsx` leen de Supabase. Todos con `export const dynamic = "force-dynamic"` para evitar prerender estático en build de Vercel.
- **Panel de admin** (`/admin`): gate de contraseña (no hardcodeada en el bundle — el usuario la escribe, se guarda en estado de componente), toggle Free/Pro, tabla de conteo por tabla de BD, botón de seed con resultados en tiempo real, botón Repair, links rápidos a páginas clave.
- **Hook `useTier`:** Cookie `tourit_tier` leída al montar, actualizada vía evento custom `tourit_tier_changed` (para sync en misma pestaña) y vía `visibilitychange` (para sync entre pestañas). `setCookieTier()` escribe directamente vía `document.cookie` y despacha el evento.
- **TourPlayer reescrito completo:** Lee datos reales del server component (tipos `PlayerStop` / `PlayerTour`). Tier-gating: `FREE_CATEGORIES = Set(["history", "funfacts", "practical"])`. Categorías Pro muestran icono 🔒 y al hacer clic abren pantalla de upgrade. Badge `★ Pro` en barra superior cuando el tier es pro. `goTo(index)` selecciona la primera categoría disponible para el tier actual.
- **Diagnose endpoint:** `GET /api/admin/diagnose` devuelve desglose por ciudad con nombre de paradas, número de categorías de contenido y estado de practical info.
- **Git y GitHub:** Repo inicializado, subido a `https://github.com/spinola501/tourit` (cuenta spinola501). Credenciales de git configuradas con token gh de spinola501 en la remote URL.
- **Despliegue en Vercel:** `npx vercel --yes --prod` desde `web/`. URL: `https://web-cspinola1s-projects.vercel.app`. Se corrigió el build error de Vercel (páginas con Supabase necesitaban `force-dynamic`). Desplegado bajo la cuenta `cspinola1` (pending transfer a spinola501).

**Ficheros creados:**
- `web/lib/db/queries.ts` — Queries de servidor: getCityBySlug, getToursByCity, getTourById (join profundo), getStopContent
- `web/lib/hooks/useTier.ts` — Hook + helpers: getCookieTier, setCookieTier, useTier (event + visibilitychange sync)
- `web/app/api/admin/verify/route.ts` — GET: comprueba existencia y row count de las 10 tablas
- `web/app/api/admin/diagnose/route.ts` — GET: desglose por ciudad de stops y contenido
- `web/app/api/admin/repair/route.ts` — POST: deduplica stops por nombre, reconstruye tour_stops
- `web/app/api/admin/session/route.ts` — POST/DELETE/GET: gestión server-side de cookie tourit_tier
- `web/app/admin/page.tsx` — Panel de admin: gate de contraseña, Pro toggle, DB status, seed runner, Repair

**Ficheros modificados:**
- `web/app/page.tsx` — Ciudades desde Supabase live + force-dynamic (antes mock)
- `web/app/city/[slug]/page.tsx` — Tours desde Supabase + force-dynamic (antes mock)
- `web/app/tour/[id]/page.tsx` — Tour detail desde Supabase + force-dynamic
- `web/app/tour/[id]/play/page.tsx` — Server component reescrito: tipos PlayerStop/PlayerTour, datos de Supabase, transform de stop_content a `Record<string, string>`
- `web/app/tour/[id]/play/TourPlayer.tsx` — Reescrito completo: datos reales, tier gating, locked categories, Pro upgrade screen
- `web/app/api/admin/seed/route.ts` — Expandido a 32/26/18 paradas (London/Sydney/Darwin), tour upfront, ilike duplicate check, Darwin y Sydney añadidos
- `web/lib/generation/schemas.ts` — tags max(5) → max(10)

---

## Pendiente para próxima sesión
- [ ] Transferir proyecto Vercel de cspinola1 a spinola501 (Vercel dashboard → Settings → Transfer)
- [ ] Conectar repo de GitHub a Vercel para auto-deploy en push (actualmente deploy manual via CLI)
- [ ] Configurar dominio limpio en Vercel (ej. tourit.app o tourit.guide)
- [ ] Ejecutar Repair si quedan duplicados residuales en London
- [ ] GPS geofencing en web: Geolocation API + lógica de proximidad a paradas
- [ ] Supabase Auth: login con email / Google OAuth
- [ ] Añadir más ciudades al seed (Paris, Rome, NYC para completar Tier 1)
- [ ] Analytics: logging en tabla stop_plays cuando el usuario reproduce una parada
- [ ] Fotos de paradas: fetch automático desde Wikimedia Commons en el pipeline de seed

---

## Session 003 — 2026-05-23

**Goal:** Audio real con Kokoro TTS (browser WebAssembly, coste cero). Cuatro features de UX para testing en campo. Análisis de costes y dominios. Actualización de roadmap.

### 11:30 — Kokoro TTS + features de player: sidebar retractable, preview sin autoplay, longitud de contenido, avisos de cierre por día

- **Análisis de costes Año 1:** Desglose completo en tres escenarios (bootstrapped ~$1.700/año, con marketing ligero ~$2.900/año, con growth spend ~$10.700/año). Se identificó ElevenLabs como el gasto variable principal ($480–$1.188/año). Se analizaron alternativas: OpenAI TTS (20× más barato), Google Neural2, Azure, Amazon Polly, Kokoro (gratis, browser).
- **Decisión TTS:** Kokoro para todos los usuarios (free y Pro). Calidad suficiente para narración informativa en exterior. Cost: $0. Funciona offline. Voces Pro: 8 opciones (británicas y americanas). ElevenLabs/OpenAI TTS reservado para uso futuro si se necesita.
- **Kokoro integrado:** `kokoro-js@1.2.1` instalado. TourPlayer reescrito: hook `useKokoro` reemplaza `useSpeech`. Generación asíncrona con spinner en play button. Cache en memoria (Map) para replay instantáneo. Pausa/reanuda vía AudioContext.suspend/resume. Cancelación de generaciones supersedidas via genId ref.
- **next.config.ts actualizado:** Turbopack mode (`turbopack: {}`) + cabeceras COOP/COEP en `/tour/:id/play` para SharedArrayBuffer (WASM multi-hilo).
- **Banner de carga del modelo:** Barra de progreso slim en la parte superior del player mientras se descarga el modelo (~80MB, una sola vez, cacheado para siempre).
- **Selector de voz para Pro:** Dropdown en el sidebar con 8 voces Kokoro. Free users usan Emma (British) por defecto sin selector visible.
- **Sidebar retractable:** Botón ‹/› en la cabecera del sidebar. Colapsa de 13rem a 2.75rem mostrando sólo los números de parada con transición CSS. En modo colapsado, el badge ⚠ (parada cerrada) se muestra como punto naranja sobre el número.
- **Preview sin autoplay:** `goTo()` ya no llama a `playText()` automáticamente. El usuario navega a una parada, lee el texto, y pulsa ▶ cuando quiere escuchar. Comportamiento más natural para uso exploratorio.
- **Toggle de longitud de contenido:** Short (120 palabras) / Medium (300 palabras) / Full. Visible encima de las category tabs en el panel de narración. Se aplica tanto al texto mostrado como al audio generado (el texto truncado se pasa a `speak()`). Al cambiar longitud, el audio actual se detiene.
- **Avisos de cierre por día de semana:** Selector de día (S M T W T F S) en el footer del sidebar, por defecto el día actual. Función `isLikelyClosed()` detecta patrones en el campo `opening_hours` ("closed monday", "sun: closed", etc.). Badge ⚠ naranja en la lista del sidebar y banner en la cabecera de la parada activa cuando está posiblemente cerrada.
- **Expandable stop cards en tour detail:** Nuevo componente `StopPreviewCard` (client component). Las tarjetas de parada en `/tour/[id]` son ahora expandibles: al pulsar se despliega el contenido completo con category tabs, narración, info práctica y accesibilidad. Permite explorar el tour completo antes de iniciarlo.
- **Análisis de dominio:** `.com` y `.io` no disponibles. Recomendaciones: `tourit.app` (mejor opción global), `tourit.guide` (descriptivo), `tourit.audio` (único), `tourit.co`. Registro recomendado de ambos .app y .guide (~€25–30/año).
- **Análisis de almacenamiento de fotos:** Hosting 200GB/11€ mes no es el fit correcto. Supabase Storage (ya en el stack, 1GB gratis) es la opción para early stage. Fuente de fotos: Wikimedia Commons API (gratis, calidad excelente, tiene todas las paradas generadas).
- **Android Auto / Apple CarPlay:** Analizados. Posibles en Phase 5. CarPlay requiere entitlement de Apple (Audio template, proceso de aprobación 1–4 semanas). Android Auto sin gate de aprobación. Ambos usarían Kokoro a través de los altavoces del coche.
- **Features backlog documentado en ROADMAP:** Walking vs driving mode, favourites, sharing, interest profile, free activities filter, photo storage → Phase 3/4. Android Auto + CarPlay → Phase 5. Phase 2.5 creada para las mejoras de player completadas hoy.

**Ficheros creados:**
- `web/app/tour/[id]/StopPreviewCard.tsx` — Client component: tarjetas expandibles con category tabs, narración completa, info práctica y accesibilidad

**Ficheros modificados:**
- `web/app/tour/[id]/play/TourPlayer.tsx` — Reescrito: Kokoro TTS, sidebar retractable, day selector, content length toggle, preview sin autoplay, voice selector Pro
- `web/app/tour/[id]/page.tsx` — Stops list reemplazada con `StopPreviewCard` expandible
- `web/next.config.ts` — Turbopack mode + COOP/COEP headers para WASM

---

---

## Session 004 — 2026-05-24

**Goal:** Supabase Auth completa (email + Google OAuth), perfiles de usuario, tier en BD, NavBar con auth, UI polish, discover page real, mejoras de player móvil.

### 08:30 — Auth, perfiles, NavBar y mejoras de UI

- **Build fix (next/headers):** `import { cookies }` estaba al nivel del módulo en `supabase.ts`, lo que lo incluía en el bundle del middleware y de los client components (ambos entornos donde `next/headers` no está disponible). Solución: import dinámico dentro de `createServerSupabaseClient()` con `await import("next/headers")`.
- **@supabase/ssr instalado:** Reescritura de `lib/db/supabase.ts` con `createBrowserClient`, `createServerSupabaseClient` (async, cookies server-side), `createMiddlewareClient` (req/res cookies), `createAdminClient` (service role, sin cambios).
- **Middleware de sesión:** `web/middleware.ts` creado. Refresca el token de Supabase en cada request. Matcher excluye assets estáticos e imágenes.
- **Página de login** (`/auth/login`): email/password + Google OAuth. Toggle sign in / sign up. Mensajes de error y confirmación. Google usa `signInWithOAuth` con redirect a `/auth/callback`.
- **Callback OAuth** (`/auth/callback/route.ts`): intercambia code por sesión, redirige a `/profile`.
- **Signout** (`/auth/signout/route.ts`): POST → `supabase.auth.signOut()` → redirect `/`.
- **Tabla `public.users`:** Creada por el usuario en Supabase con trigger `on_auth_user_created` para auto-insertar perfil al registrarse. RLS habilitada con políticas de select/insert/update por `auth.uid() = id`.
- **ProfileClient** (`/profile/ProfileClient.tsx`): nombre, ciudad de origen, 10 etiquetas de intereses (toggle). Guarda en `users` vía browser client. Muestra tier actual, enlace de upgrade si Free. `setCookieTier` sincroniza cookie al montar.
- **NavBar** (`components/NavBar.tsx`): server component con auth. Muestra avatar (imagen o inicial) + nombre cuando está logueado. Badge `★ Pro` para usuarios Pro. "Sign in" cuando no hay sesión. NavBar conectado a home, city y tour detail pages (reemplaza navs hardcodeados).
- **Discover page real:** Antes usaba `FEATURED_CITIES` mock. Ahora lee de Supabase con tour counts reales. Nuevo componente client `CitySearchGrid` con búsqueda en tiempo real por nombre/país. Acepta `?q=` param de la búsqueda del hero.
- **Player móvil:** Sidebar empieza colapsada en móvil (`window.innerWidth < 640`), expandida en desktop.
- **Badge "Free" en paradas:** Función `isFreeAdmission()` detecta entradas gratuitas. Badge verde en la lista del sidebar y junto al precio en la info práctica.
- **Botón Report:** Componente `ReportButton` en el panel de narración. Dropdown con 5 opciones. Llama a `POST /api/report` (admin client, sin RLS issues). Se muestra "Thanks for reporting ✓" al enviar.
- **Audio controls rediseñados:** Iconos SVG (sin emoji). Layout horizontal compacto: prev · play/pause · next · nombre y contador de parada inline. Barra de progreso slim arriba.
- **Foto responsive:** `h-24 sm:h-36` (antes fijo `h-36`).

**Ficheros creados:**
- `web/middleware.ts` — Refresco de sesión Supabase en cada request
- `web/app/auth/login/page.tsx` — Login con email + Google OAuth
- `web/app/auth/callback/route.ts` — Intercambio de code OAuth por sesión
- `web/app/auth/signout/route.ts` — POST signout → redirect /
- `web/app/profile/ProfileClient.tsx` — Formulario de perfil: nombre, ciudad, intereses, plan
- `web/components/NavBar.tsx` — NavBar server component con auth state
- `web/app/discover/CitySearchGrid.tsx` — Grid de ciudades con búsqueda client-side
- `web/app/api/report/route.ts` — POST /api/report → insert en stop_reports via admin client

**Ficheros modificados:**
- `web/lib/db/supabase.ts` — Reescrito para @supabase/ssr; import dinámico de next/headers
- `web/app/page.tsx` — NavBar conectado (reemplaza nav hardcodeado)
- `web/app/city/[slug]/page.tsx` — NavBar conectado
- `web/app/tour/[id]/page.tsx` — NavBar conectado + back link al city en hero
- `web/app/profile/page.tsx` — Server component real (antes stub)
- `web/app/discover/page.tsx` — Supabase real + NavBar + CitySearchGrid
- `web/app/tour/[id]/play/TourPlayer.tsx` — Sidebar móvil, badge Free, ReportButton, audio controls SVG, foto responsive

---

---

## Session 005 — 2026-05-24

**Goal:** UI improvements (light mode, photo placeholders, category filtering), city page stops, pricing strategy, seed plan.

### 13:00 — Player improvements

- **Light/dark toggle:** Botón ☀/🌙 en la top bar del player. `isDark` state con persistencia en localStorage. Wrapper div con clase `dark` activa el custom variant de Tailwind v4 (`&:is(.dark *)`). Paleta de luz: slate-50/white/slate-100 para fondos, slate-900/600/400 para texto, slate-200/300 para bordes. Play button adaptado: `bg-slate-900 dark:bg-white`. Todos los sub-componentes actualizados (ModelLoadingBanner, DaySelector, ContentLengthPicker, CategoryTabs, NarrationPanel, AudioControls, sidebar, top bar).
- **Category filtering:** Las categorías con menos de 40 palabras de contenido quedan ocultas en los tabs. Evita mostrar categorías vacías o de relleno (ej. "Architecture" para un mercado).
- **Sentence-boundary truncation:** `applyLength()` reescrito. Antes cortaba a N palabras exactas. Ahora busca el último `.`, `!` o `?` dentro del texto truncado (si está al 55%+ del límite) y corta ahí limpiamente. Mucho más legible.
- **Photo placeholder:** Si `photo_url` es null (stop sin foto), se muestra una franja de gradiente con el color del tour (`coverColor`) en lugar de un hueco vacío. Con foto: `h-24 sm:h-36 object-cover`. Sin foto: `h-10 sm:h-16` con gradiente decorativo.
- **coverColor en NarrationPanel:** Pasado como prop para que la estrella del upsell Pro coincida con el color del tour.

### 13:30 — City page: stops list + pro gating

- **`getStopsByCity` query:** Nueva función en `lib/db/queries.ts`. Devuelve id, name, duration_minutes, tags, photo_url, stop_practical.admission_fee. Ordenado por nombre, límite 200.
- **City page reescrita:** Dos secciones separadas: "Pre-made Tours" (con overlay de bloqueo para tours Pro cuando el usuario es Free) y "All Stops" (grid con foto/placeholder, duración, tags, badge Free si entrada gratuita). Free users ven stops con candado. Pro users los ven desbloqueados (base para el tour builder). CTA "Upgrade to Pro" al final de la sección stops.
- **Tier detection server-side:** `createServerSupabaseClient()` + admin query a `users.tier` en el server component. Sin flash de contenido.

### 14:00 — DNS tourit.es

- **A record confirmado:** IONOS ya tenía `A @ → 216.198.79.1` que es la nueva IP de Vercel (migración de rango IP en curso). Registro correcto, no era 76.76.21.21 como se pensaba inicialmente. "Invalid configuration" en Vercel es propagación DNS, se resolverá solo.
- **www CNAME:** `152b2e5b82437e50.vercel-dns-017.com` — correcto, generado por Vercel al añadir el dominio.

### 14:30 — Estrategia de precios y plan de seed

- **Precios decididos:** Trip Pass €5.99/7 días, Annual Pro €16.99/año. Racional: trip pass = compra impulsiva en momento de alto intent (vuelo reservado). €1.42/mes no genera cancelaciones. 30% más barato que competidores directos (GPSmyCity €24.99/año).
- **On-demand city generation:** Cualquier ciudad no en la biblioteca puede ser generada para usuarios Pro. Coste: ~$0.15-0.25/ciudad (Tavily + Haiku). Cacheada para siempre. Estrategia: Option A (notificación asíncrona, ~5 min generación) + Option C (top 200 ciudades pre-generadas al lanzamiento).
- **CITIES_SEED.md creado:** Lista de 200 ciudades más visitadas del mundo con país, tier (1-3), stops estimados, coste EN y coste 6 idiomas. Total: 2.250 stops, $33.75 en inglés, $146.25 en 6 idiomas. Punto de recuperación de costes: 27 trip passes vendidos.
- **ROADMAP actualizado:** Sección de precios añadida, on-demand generation en Phase 4, Stripe actualizado a los nuevos precios.

**Ficheros creados:**
- `CITIES_SEED.md` — Plan de seed: 200 ciudades, stops estimados, costes de generación desglosados

**Ficheros modificados:**
- `web/app/tour/[id]/play/TourPlayer.tsx` — Light/dark toggle, category filtering, sentence truncation, photo placeholder
- `web/lib/db/queries.ts` — Nueva función `getStopsByCity`
- `web/app/city/[slug]/page.tsx` — Sección stops con gating Free/Pro
- `ROADMAP.md` — Sección de precios, on-demand generation en Phase 4

---

## Pendiente para próxima sesión
- [ ] Backfill fotos: ir a /admin y pulsar "📷 Photos" para Wikipedia backfill (100 stops/vez, ~1/segundo)
- [ ] Stripe: Trip Pass (€5.99/7d) + Annual Pro (€16.99/año) — webhooks, middleware de gating
- [ ] On-demand city generation: job queue + notificación email/push cuando ciudad lista
- [ ] Seed Tier 1 cities (47 ciudades): Paris, Rome, NYC, Tokyo, Bangkok, etc.
- [ ] GPS geofencing: Geolocation API + auto-play por proximidad en el player web
- [ ] Realistic tour stop counts: London tour tiene 25 paradas, recortar a 10-12 en Supabase
- [ ] Pro tour builder: seleccionar stops de una ciudad y crear tour personalizado
- [ ] DNS tourit.es: verificar propagación (puede tardar hasta 24h) y actualizar Supabase Auth URLs
