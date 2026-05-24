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
- [x] `/api/generate/stop` route — takes stop name + city + coords → returns structured content (`/api/admin/seed` covers this inline)
- [ ] `/api/generate/tour` route — takes city + tour type → assembles stops + generates transitions
- [ ] Cities seed list — 250 cities with coordinates, emoji, cover colour
- [ ] Stops seed list — 5,000 stops across 200 cities (name, coords, city)
- [x] Batch seed script with rate limiting + resumability (skips already-generated stops)
- [ ] ElevenLabs TTS integration — lazy audio generation on first play, stored in Cloudflare R2
- [x] Connect player to real Supabase data (replace mock)
- [ ] Stop engagement analytics logging (`stop_plays` table)
- [ ] Pre-generate Tier 1 cities: London, Paris, Rome, NYC, Tokyo, Barcelona (test run) — London ✓, Sydney ✓, Darwin ✓ (AU testing); Paris, Rome, NYC pending

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
- [x] Day-of-week selector + closed-stop warnings (⚠ badge in sidebar, banner in stop header)
- [x] Expandable stop cards on tour detail page — full narration preview before starting tour

---

## Phase 3 — Auth, Profiles & Freshness ✦ Current
**Goal:** Users can sign in, set preferences, save tours. Practical info stays fresh automatically.

- [x] Supabase Auth (email + Google OAuth)
- [x] User profile: name, home city, interest tags, tier display
- [x] Interest tags on profile (10 categories) — stored in public.users.interests[]
- [x] Free activities filter — badge "Free" on stops in player sidebar + practical info card
- [x] Free tier category gating — History/Fun Facts/Practical free; all 11 for Pro
- [x] User report button in player ("Report issue" → 5-option dropdown → POST /api/report)
- [x] Save / favourite stops and tours (user_favorites table + heart button in player + tour detail)
- [ ] Personalised recommendations on home page based on profile interests
- [ ] Group profile: mobility (full/seniors/wheelchair/stroller), ages, pace
- [ ] Free tier limits: max 3 saved tours enforced
- [ ] `last_verified_at` shown on practical info in player
- [ ] Google Places API cron job — weekly re-fetch of practical info for all stops
- [ ] Wikipedia change detection — flag stops whose articles changed for narration review
- [ ] Admin dashboard: review flagged stops, one-click regenerate, resolve reports
- [ ] next-intl setup — URL locale routing (`/en/`, `/es/`)
- [ ] UI translation files: EN, ES, FR (Phase 3 launch languages)

---

## Phase 4 — Pro Tier: Builder, Q&A Agent & Multilingual
**Goal:** Full Pro feature set. Custom tour building, contextual AI agent, all languages.

- [ ] Stripe subscriptions — Trip Pass (€5.99/7 days) + Annual Pro (€16.99/year)
- [ ] On-demand city generation — Pro users request any city; async job generates stops + tour via Tavily + Haiku; push/email notification when ready (~5 min). Top 200 pre-warmed at launch (see CITIES_SEED.md).
- [ ] Tour builder UI: browse stops by city, add/remove/reorder, name + save tour
- [ ] Walking vs driving mode — toggle swaps duration estimates + filters car-inaccessible stops
- [ ] Content category selector per tour (all 11 categories for Pro)
- [ ] Group profile per tour → adapted accessibility notes surfaced in player
- [ ] Shareable tour links — short UUID link, preview for free users + paywall upsell
- [ ] Favourites — save stops and tours to a personal list
- [ ] Stop Q&A agent — contextual chat per stop, RAG on `stop_content`, prompt-cached, Pro only
- [ ] Q&A agent answers in user's language regardless of content language
- [ ] DeepL lazy translation — non-primary languages translated on first request, cached
- [ ] Generate content in ES, FR, DE, PT, IT (batch run for Tier 1 cities)
- [ ] Tour templates: "Photography Walk", "Kid-Friendly", "Foodie", "Senior Accessible"
- [ ] Background prefetching — silently fetch next 2 stops while user listens to current
- [ ] Framer Motion animations: stop transitions, audio waveform, Q&A panel slide-up
- [ ] Full responsive breakpoints on player (mobile portrait/landscape, tablet, desktop)
- [ ] Time-aware warnings — alert user if upcoming stop closes within 2 hours
- [ ] `created_by` on stops + tours (creator marketplace foundation, no UI yet)

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
