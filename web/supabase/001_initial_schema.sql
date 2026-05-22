-- TourIt — Initial Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- ─── Enable UUID extension ───────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Cities ──────────────────────────────────────────────────────────────────
CREATE TABLE cities (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  country      TEXT NOT NULL,
  emoji        TEXT,
  lat          DOUBLE PRECISION NOT NULL,
  lng          DOUBLE PRECISION NOT NULL,
  cover_color  TEXT DEFAULT '#1a3a5c',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Stops (core library) ────────────────────────────────────────────────────
CREATE TABLE stops (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id           UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  lat               DOUBLE PRECISION NOT NULL,
  lng               DOUBLE PRECISION NOT NULL,
  duration_minutes  INT DEFAULT 45,
  tags              TEXT[] DEFAULT '{}',
  accessibility_note TEXT,
  -- Freshness
  needs_review      BOOLEAN DEFAULT FALSE,
  last_generated_at TIMESTAMPTZ,
  -- Creator marketplace (foundation)
  created_by        UUID,           -- NULL = system generated
  is_verified       BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX stops_city_id_idx ON stops(city_id);

-- ─── Stop content (narration per stop × category × language × season) ────────
CREATE TABLE stop_content (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stop_id          UUID NOT NULL REFERENCES stops(id) ON DELETE CASCADE,
  category         TEXT NOT NULL,  -- 'history' | 'architecture' | 'culture' | 'fauna' | 'flora' | 'geo' | 'lore' | 'funfacts' | 'food' | 'photography' | 'practical'
  language         TEXT NOT NULL DEFAULT 'en',
  season           TEXT NOT NULL DEFAULT 'any',  -- 'any' | 'spring' | 'summer' | 'autumn' | 'winter'
  text             TEXT NOT NULL,
  -- Audio (lazy — generated on first play)
  audio_url        TEXT,           -- Cloudflare R2 URL, NULL until first play
  audio_generated_at TIMESTAMPTZ,
  -- Metadata
  word_count       INT,
  generated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (stop_id, category, language, season)
);

CREATE INDEX stop_content_stop_id_idx ON stop_content(stop_id);
CREATE INDEX stop_content_language_idx ON stop_content(language);

-- ─── Stop practical info (updated frequently by cron) ────────────────────────
CREATE TABLE stop_practical (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stop_id           UUID NOT NULL REFERENCES stops(id) ON DELETE CASCADE UNIQUE,
  opening_hours     TEXT,
  admission_fee     TEXT,
  nearest_transport TEXT,
  website_url       TEXT,
  source_url        TEXT,          -- where cron re-fetches from
  last_verified_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Stop transitions (narration between stops) ───────────────────────────────
CREATE TABLE stop_transitions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_stop_id  UUID NOT NULL REFERENCES stops(id) ON DELETE CASCADE,
  to_stop_id    UUID NOT NULL REFERENCES stops(id) ON DELETE CASCADE,
  language      TEXT NOT NULL DEFAULT 'en',
  text          TEXT NOT NULL,
  audio_url     TEXT,
  generated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (from_stop_id, to_stop_id, language)
);

-- ─── Tours ───────────────────────────────────────────────────────────────────
CREATE TABLE tours (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id        UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  tagline        TEXT,
  type           TEXT NOT NULL DEFAULT 'prebuilt',   -- 'prebuilt' | 'custom'
  tier_required  TEXT NOT NULL DEFAULT 'free',       -- 'free' | 'pro'
  cover_color    TEXT DEFAULT '#1a3a5c',
  is_official    BOOLEAN DEFAULT TRUE,
  creator_id     UUID,             -- NULL = system, future: user UUID
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX tours_city_id_idx ON tours(city_id);

-- ─── Tour stops (ordered list) ───────────────────────────────────────────────
CREATE TABLE tour_stops (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id     UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  stop_id     UUID NOT NULL REFERENCES stops(id) ON DELETE CASCADE,
  order_index INT NOT NULL,
  UNIQUE (tour_id, order_index),
  UNIQUE (tour_id, stop_id)
);

CREATE INDEX tour_stops_tour_id_idx ON tour_stops(tour_id);

-- ─── Stop engagement analytics ───────────────────────────────────────────────
CREATE TABLE stop_plays (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stop_id            UUID NOT NULL REFERENCES stops(id) ON DELETE CASCADE,
  category           TEXT,
  language           TEXT,
  user_id            UUID,         -- NULL = anonymous
  completion_percent DOUBLE PRECISION,
  device_type        TEXT,         -- 'mobile' | 'tablet' | 'desktop'
  played_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX stop_plays_stop_id_idx ON stop_plays(stop_id);
CREATE INDEX stop_plays_played_at_idx ON stop_plays(played_at DESC);

-- ─── User reports ────────────────────────────────────────────────────────────
CREATE TABLE stop_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stop_id     UUID NOT NULL REFERENCES stops(id) ON DELETE CASCADE,
  field       TEXT NOT NULL,   -- 'hours' | 'price' | 'closed' | 'accessibility' | 'other'
  note        TEXT,
  user_id     UUID,
  resolved    BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Shared tours (shareable links) ──────────────────────────────────────────
CREATE TABLE shared_tours (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- used as short share token
  tour_id    UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- Public read on catalogue tables
ALTER TABLE cities       ENABLE ROW LEVEL SECURITY;
ALTER TABLE stops        ENABLE ROW LEVEL SECURITY;
ALTER TABLE stop_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE stop_practical ENABLE ROW LEVEL SECURITY;
ALTER TABLE stop_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tours        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_stops   ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE stop_plays   ENABLE ROW LEVEL SECURITY;
ALTER TABLE stop_reports ENABLE ROW LEVEL SECURITY;

-- Anyone can read catalogue
CREATE POLICY "public read cities"        ON cities        FOR SELECT USING (TRUE);
CREATE POLICY "public read stops"         ON stops         FOR SELECT USING (is_verified = TRUE);
CREATE POLICY "public read stop_content"  ON stop_content  FOR SELECT USING (TRUE);
CREATE POLICY "public read stop_practical" ON stop_practical FOR SELECT USING (TRUE);
CREATE POLICY "public read stop_transitions" ON stop_transitions FOR SELECT USING (TRUE);
CREATE POLICY "public read tours"         ON tours         FOR SELECT USING (TRUE);
CREATE POLICY "public read tour_stops"    ON tour_stops    FOR SELECT USING (TRUE);
CREATE POLICY "public read shared_tours"  ON shared_tours  FOR SELECT USING (TRUE);

-- Analytics: anyone can insert (anon plays)
CREATE POLICY "anyone can log play"       ON stop_plays    FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "anyone can report"         ON stop_reports  FOR INSERT WITH CHECK (TRUE);

-- Service role bypasses RLS for generation/admin
-- (Use SUPABASE_SERVICE_ROLE_KEY in server-side code)
