# TourIt — Dev Log

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
