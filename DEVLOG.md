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
