# TourIt — Roadmap

## Vision
An AI-powered audio tour app that researches and narrates the story of any place, playing automatically as you travel. A pre-generated library of stops worldwide means zero per-user AI cost. Free tier offers pre-built city tours; Pro unlocks full content depth, custom tour building, offline download and a contextual Q&A agent.

---

## Architecture Principles

- **Stops are the atomic unit** — a tour is just an ordered list of stops. Each stop is generated once and reused across any number of tours.
- **Generate text upfront, audio lazily** — all 11 category texts generated at batch time (~$0.01/stop). Audio generated on first play and cached forever in R2.
- **Language split** — top 6 languages (EN, ES, FR, DE, PT, IT) generated with Claude. Others translated lazily via DeepL and cached.
- **Practical info is separate** — `stop_practical` updated by cron job independently from narration which rarely changes.
- **Offline-first** — design assuming connectivity is unreliable. Cache aggressively, queue writes, sync when online.
- **Edge-cached** — Cloudflare Workers + KV in front of all stop/tour API responses. Audio on R2 (globally distributed by default).
- **UUID primary keys everywhere** — safe to expose in URLs, work across environments, don't leak catalogue size.

---

## Phase 1 — Foundation (Local MVP) ✅ Complete
**Goal:** Working web app with mock data, core UI flows proven.

- [x] Project scaffold (Next.js 16, TypeScript, Tailwind, shadcn/ui)
- [x] Home page: city search + featured tours grid + tier comparison
- [x] Discover page: city browse
- [x] City page: tours list per destination
- [x] Tour detail page: stops list, categories, Start Tour button
- [x] Player page: side panel stop navigation, category tabs, narration text
- [x] Web Speech API: real browser TTS audio playback
- [x] GPS / Manual mode toggle
- [x] Mock data: London Classic One Day (5 stops, full narration)

---

## Phase 2 — Stops Library & AI Pipeline ✅ Complete
**Goal:** Real AI-generated stop content stored in Supabase. Batch seed script to pre-generate worldwide catalogue.

- [x] Supabase project setup
- [x] Database schema: cities, stops, stop_content, stop_practical, tours, tour_stops, stop_plays, stop_reports, stop_transitions
- [x] Environment config: `.env.local` with all service keys
- [x] Tavily web search integration — research per stop
- [x] Claude API integration — generate all 11 categories per stop with prompt caching
- [x] Zod schema validation on generation output
- [x] Batch seed script with rate limiting + resumability (skips already-generated stops)
- [x] Connect player to real Supabase data (replace mock)
- [x] Pre-generate AU cities: London ✓, Sydney ✓, Darwin ✓, Melbourne ✓ (98 stops, tours regenerated with 10-stop cap)
- [ ] ElevenLabs/cloud TTS integration — lazy audio, stored in Cloudflare R2 (deferred; Kokoro covers this for now)
- [ ] Stop engagement analytics logging (`stop_plays` table) — table exists, logging not yet wired
- [ ] Pre-generate Tier 1 cities: Paris, Rome, NYC, Tokyo, Barcelona (pending)

---

## Phase 2.5 — Player UX ✅ Complete
**Goal:** Production-ready player with real audio, UI refinements and usability features.

- [x] Kokoro TTS (browser WebAssembly, $0 cost, works offline) replacing Web Speech API
- [x] Voice model download progress bar (one-time ~80MB, cached forever)
- [x] Audio cache — generated narration cached in-memory, instant replay
- [x] Voice selector for Pro users (8 voices: British + American, M/F)
- [x] Retractable stops sidebar (‹/› toggle, collapses to numbered icon strip)
- [x] Stop info preview without autoplay — click stop to read, play button to listen
- [x] Content length toggle: Short (120w) / Medium (300w) / Full — applied to both text and audio
- [x] Day-of-week selector + closed-stop warnings (badge in sidebar, banner in stop header)
- [x] Expandable stop cards on tour detail page — full narration preview before starting tour
- [x] Practical info card: SVG icons, `last_verified_at` timestamp displayed

---

## Phase 2.6 — Tour Catalogue & Admin Workstation ✅ Complete (2026-05-30)
**Goal:** Curated day tours per city, proper admin dashboard.

- [x] Claude-powered tour generator — designs 2–3 thematic day tours per city from stop list (`lib/generation/generate-tours.ts`)
- [x] Auto-generates tours at end of seed run; "🗺 Gen Tours" button in admin for on-demand regeneration
- [x] 9 curated tours across 3 cities (Darwin, Sydney, London) — all thematic with proper taglines
- [x] City photos: `photo_url` on `cities` table, Wikipedia backfill endpoint, admin "🏙 City Photos" button
- [x] Admin workstation rewrite: 5-section sidebar (Overview, Users, Content, Reports, Tools)
- [x] Admin API: `/api/admin/stats`, `/api/admin/users` (+ tier toggle), `/api/admin/reports` (+ resolve/delete), `/api/admin/content-health`

---

## Phase 3 — Auth, Profiles & Freshness ✅ Complete (2026-05-30)
**Goal:** Users can sign in, set preferences, save tours. Practical info stays fresh automatically.

- [x] Supabase Auth (email + Google OAuth) — live and tested
- [x] User profile: name, home city, interest tags, tier display
- [x] Interest tags on profile (10 categories) — stored in public.users.interests[]
- [x] Free activities filter — badge "Free" on stops in player sidebar + practical info card
- [x] Free tier category gating — History/Fun Facts/Practical free; all 11 for Pro
- [x] User report button in player ("Report issue" → 5-option dropdown)
- [x] Save / favourite stops (user_favorites table + heart button in player + profile page)
- [x] Free tier limits: max 3 saved stops enforced (API + UI shows "Pro →" on limit)
- [x] Personalised recommendations — home page "Recommended for you" for signed-in users
- [x] `last_verified_at` shown on practical info card in player
- [x] Admin dashboard — full workstation with 5 sections, user/report/content management
- [x] next-intl setup — URL locale routing (`/en/`, `/es/`, `/eo/` etc.)
- [x] UI translation files: 9 languages — EN, ES, FR, DE, PT, IT, JA, ZH, **EO (Esperanto)**
- [x] Home page redesigned: hero glow, 3-step "How it works", accurate Free/Pro comparison
- [x] Emojis removed from all public UI (city initials as fallback)
- [ ] Group profile: mobility/ages/pace — deferred to Phase 5
- [ ] Google Places API cron — deferred to Phase 5
- [ ] Wikipedia change detection — deferred to Phase 5

---

## ⚠️ Pre-Phase 4 Checklist

Before starting Phase 4, confirm these are done:

- [x] **SQL**: `ALTER TABLE cities ADD COLUMN IF NOT EXISTS photo_url text;`
- [x] **Deploy**: Auto-deploying to Vercel on every push; live at https://tourit.es
- [x] **tourit.es DNS**: Domain live; Supabase Auth URLs updated
- [ ] **SQL**: `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS comped boolean DEFAULT false;` — needed for comped tracking in cost report
- [ ] **Resend domain**: Verify `tourit.es` in Resend dashboard → set `RESEND_FROM_EMAIL=TourIt <noreply@tourit.es>` in Vercel
- [ ] **City photos**: Run "🏙 City Photos" + "📷 Stop Photos" in `/admin` for all cities
- [ ] **Google OAuth**: Confirm `https://tourit.es` is in Authorized JavaScript Origins in Google Cloud Console
- [ ] **Stripe account**: Create Stripe account, note publishable + secret keys (needed for Phase 4)

---

## Phase 4 — Pro Tier: Builder, Q&A Agent & Multilingual
**Goal:** Full Pro feature set. Custom tour building, contextual AI agent, all languages.

- [ ] Stripe subscriptions — Trip Pass (€5.99/7 days) + Annual Pro (€16.99/year)
- [x] On-demand city generation — Pro users request any city; background job via `after()` generates stops + tours; email notification via Resend when ready. Claude Sonnet plans stops count by location type (4–20)
- [x] Tour builder UI: group size, accessibility, day, duration, theme, budget, language, pace — live itinerary preview, saves tour and launches player
- [ ] Walking vs driving mode — toggle swaps duration estimates + filters car-inaccessible stops
- [ ] Content category selector per tour (all 11 categories for Pro)
- [x] Group profile per tour → wheelchair/pram/elderly filters applied in tour builder
- [ ] Shareable tour links — short UUID link, preview for free users + paywall upsell
- [x] Favourites — save stops and tours to a personal list (heart button, profile page)
- [ ] Stop Q&A agent — contextual chat per stop, RAG on `stop_content`, prompt-cached, Pro only
- [ ] Q&A agent answers in user's language regardless of content language
- [ ] DeepL lazy translation — non-primary languages translated on first request, cached
- [ ] Generate content in ES, FR, DE, PT, IT (batch run for Tier 1 cities)
- [ ] Tour templates: "Photography Walk", "Kid-Friendly", "Foodie", "Senior Accessible"
- [ ] Background prefetching — silently fetch next 2 stops while user listens to current
- [ ] Framer Motion animations: stop transitions, audio waveform, Q&A panel slide-up
- [ ] Full responsive breakpoints on player (mobile portrait/landscape, tablet, desktop)
- [ ] Time-aware warnings — alert user if upcoming stop closes within 2 hours
- [x] Admin Pro invitations — Grant Pro instantly or send invite email via Resend (bypasses Supabase rate limit); comped users excluded from revenue
- [x] Admin cost & revenue tracker — AI generation costs, infrastructure, USD MRR, profitability %, break-even
- [x] Narration length (Short/Standard/Long) selectable at city page level, passed to player via URL param
- [x] Security hardening — timing-safe admin auth, open redirect fix, prompt injection prevention, report rate limiting
- [x] Full app audit — 31 issues identified across links, auth, schema, UX, performance; all critical/high fixed
- [x] NavBar locale-aware links — all hrefs use getLocale(), no more hardcoded /en
- [x] Tier cookie DB sync — useTier hook syncs with Supabase on mount for immediate Pro recognition
- [x] Tour builder mobile responsive — tab bar switches Stops/Route panels; multi-stop add bug fixed
- [x] Tour builder — GPS route map (Leaflet CDN, CartoDB dark tiles, numbered markers, dashed polyline)
- [x] Tour builder — travel time estimates (Haversine + walking pace: leisurely/moderate/fast)
- [x] Tour builder — 8 specialisation themes (History, Architecture, Gastronomy, Photography, Family, Nature, Nightlife, Standard)
- [x] Tour builder — Export to Google Maps button; "Navigate to this stop" in TourPlayer
- [x] Stop content preview modal for Pro users on city page (all categories, loaded on demand)
- [x] Melbourne seeded — 21 stops, 3 EN tours, full ES content; scripts/seed-melbourne.ts for standalone seeding
- [x] Status endpoint fixed — returns "done" only when both stops AND tours exist
- [x] City page auto-heals — `after()` generates tours in background when stops exist but tours don't
- [x] Email links — `APP_URL` server-only env var prevents localhost from leaking into production emails
- [x] `tier_required` schema fix — all tour INSERTs/SELECTs corrected; was silently rejecting all tour creation
- [x] Tour quality enforcement — 10-stop hard cap, duplicate cleanup, oversized tour deletion script
- [x] Tour detail page — Google Maps walking-directions link, estimated time, "Start Audio Tour" button
- [x] Mobile scroll improvements — momentum scrolling, touch-action, lazy images, compact narration picker
- [x] `generate-stop` retry — falls back to shorter word count if Haiku token ceiling truncates output
- [x] `scripts/check-and-fix-tours.ts` — audits all cities, auto-generates missing tours
- [x] Vercel build fix — Leaflet loaded from CDN (type-only npm import); eliminates Turbopack module-not-found

---

## Phase 5 — Mobile, GPS & Offline
**Goal:** Real GPS-triggered audio on mobile. Full offline support.

- [ ] React Native / Expo app (iOS + Android)
- [ ] Kokoro model bundled as Expo asset — zero download on first launch
- [ ] Background audio playback (AVAudioSession iOS, ExoPlayer Android)
- [ ] GPS geofencing: auto-play stop narration on arrival (configurable radius per stop)
- [ ] Transition narration: short clips that play while walking between stops
- [ ] Walking vs driving route mode — Mapbox routing adapts to transport type
- [ ] Offline download (Pro): bundle tour text + map tiles + practical info
- [ ] Apple CarPlay integration — Audio template (play/pause/skip, stop title display); requires Apple entitlement application
- [ ] Android Auto integration — MediaBrowserService, no approval gate, audio controls in car UI
- [ ] Service worker (web): auto-cache recently played stops for implicit offline
- [ ] Queue-based writes: user reports, favourites, progress synced when back online
- [ ] Shared state between web and mobile (same Supabase account)
- [ ] App Store + Google Play submission

---

## Phase 6 — Edge, Scale & Creator Marketplace
**Goal:** Global performance. Creator content flywheel. Launch-ready.

- [ ] Cloudflare Workers + KV: edge-cache all stop/tour API responses globally
- [ ] Seasonal content layer: `season` column on `stop_content`, seasonal variants for key stops
- [ ] Creator marketplace: local experts publish tours, earn 30% revenue share
- [ ] Creator onboarding flow + content review queue
- [ ] Group/social tour mode: shared GPS position, audio synced across group (Supabase Realtime)
- [ ] Onboarding flow (first-time user walkthrough)
- [ ] Expand to 500 cities, 10,000 stops
- [ ] Marketing site (landing page, pricing, demo video)
- [ ] Analytics dashboard (Posthog)
- [ ] Error monitoring (Sentry)
- [x] Vercel deployment (web) — live at https://tourit-sigma.vercel.app (under spinola501, auto-deploys on push)
- [x] Custom domain registered: tourit.es (pending DNS configuration)
- [ ] EAS deployment (mobile)

---

## Content Categories

| ID | Label | Free | Pro |
|---|---|---|---|
| `history` | History | ✓ | ✓ |
| `funfacts` | Fun Facts | ✓ | ✓ |
| `architecture` | Architecture | — | ✓ |
| `culture` | Art & Culture | — | ✓ |
| `fauna` | Fauna | — | ✓ |
| `flora` | Flora | — | ✓ |
| `geo` | Geography & Geology | — | ✓ |
| `lore` | Legends & Lore | — | ✓ |
| `food` | Food & Gastronomy | — | ✓ |
| `photography` | Photography Tips | — | ✓ |
| `practical` | Practical Info | ✓ | ✓ |

---

## Pricing

| Plan | Price | Target user |
|---|---|---|
| **Free** | €0 | Casual tourists, try-before-you-buy |
| **Trip Pass** | €5.99 / 7 days | Traveller on a specific trip, impulse buy |
| **Annual Pro** | €16.99 / year (€1.42/mo) | Frequent traveller, 3+ trips/year |

**Rationale:** Monthly subscriptions churn immediately after a trip. Trip pass captures the high-intent moment ("I'm going to Rome next week"). Annual at €1.42/month is below cancel-consideration threshold. Competitors (GPSmyCity, Action Tour Guide) charge €24.99/year — we're 30% cheaper at launch.

**On-demand city generation:** Any city not in the library can be requested by Pro users. The system generates stops + a tour automatically via Tavily research + Claude Haiku. Cost: ~$0.15–0.25/city — negligible against €5.99+ revenue. Generated cities are cached and serve all future users for free. UX: async notification (Option A) for unknown cities; top 200 pre-warmed at launch (Option C). See CITIES_SEED.md for the full plan.

---

## Tier Comparison

| Feature | Free | Pro |
|---|---|---|
| Pre-built tours | ✓ (all cities) | ✓ |
| Content categories | History + Fun Facts + Practical | All 11 |
| On-demand city generation | — | ✓ (any city, notified when ready) |
| Custom tour builder | — | ✓ |
| Stop Q&A agent | — | ✓ |
| Offline download | — | ✓ |
| GPS auto-play (mobile) | ✓ | ✓ |
| Transition narration | ✓ | ✓ |
| Multilingual | ✓ | ✓ (all languages) |
| Shareable tours | — | ✓ |
| Saved tours | 3 max | Unlimited |
| Premium voices | — | ✓ |

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Web | Next.js 16, App Router, TypeScript | |
| Mobile | React Native / Expo | Phase 5 |
| Styling | Tailwind CSS + shadcn/ui | |
| Animation | Framer Motion | Phase 4 |
| i18n | next-intl | Phase 3 |
| AI generation | Claude API (claude-haiku-4-5 batch, claude-sonnet-4-6 Pro Q&A) | |
| Web research | Tavily API | |
| Translation | DeepL API | Lazy, Phase 4 |
| TTS | ElevenLabs | Lazy audio generation |
| Maps | Mapbox | Phase 5 |
| Database + Auth | Supabase (PostgreSQL) | |
| Audio + asset storage | Cloudflare R2 | Free egress |
| Edge cache | Cloudflare Workers + KV | Phase 6 |
| Payments | Stripe | Phase 4 |
| Analytics | Posthog | Phase 6 |
| Errors | Sentry | Phase 6 |
| Deployment | Vercel (web) + EAS (mobile) | Phase 6 |

---

## Cost Model

| Item | Cost | Frequency |
|---|---|---|
| Stop text generation (Haiku, all 11 cats) | ~$0.01/stop | One-time |
| Stop text — top 6 languages | ~$0.06/stop | One-time |
| DeepL translation (other languages) | ~$0.15/stop/language | Lazy |
| ElevenLabs audio | ~$0.60/audio file | Lazy, cached forever |
| Google Places API (freshness) | ~$44/month (5k stops weekly) | Recurring |
| Cloudflare R2 storage | ~$0.015/GB/month | Recurring |
| Supabase (DB + auth) | Free → $25/month at scale | Recurring |
| **5,000 stops, EN only (text)** | **~$50 one-time** | |
| **5,000 stops, 6 languages (text)** | **~$300 one-time** | |
