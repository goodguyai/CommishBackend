-- Migration: Phase 3 - Engagement Engine Features
-- Date: 2025-10-03
-- Description: Add tables for weekly highlights, rivalries tracking, and content queue
-- Usage: Idempotent - can be run multiple times safely (IF NOT EXISTS guards)

BEGIN;

-- ============================================================================
-- 1. ENUM TYPES
-- ============================================================================

-- Create content_status ENUM type for content_queue table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_status') THEN
    CREATE TYPE content_status AS ENUM ('queued', 'posted', 'skipped');
  END IF;
END $$;

-- ============================================================================
-- 2. HIGHLIGHTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  week INT NOT NULL,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_highlights_league_week 
  ON public.highlights(league_id, week);

-- ============================================================================
-- 3. RIVALRIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rivalries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  team_a TEXT NOT NULL,
  team_b TEXT NOT NULL,
  a_wins INT NOT NULL DEFAULT 0,
  b_wins INT NOT NULL DEFAULT 0,
  last_meeting_week INT,
  meta JSONB,
  CONSTRAINT uniq_rivalry UNIQUE (league_id, team_a, team_b)
);

-- ============================================================================
-- 4. CONTENT QUEUE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.content_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  template TEXT NOT NULL,
  payload JSONB NOT NULL,
  status content_status NOT NULL DEFAULT 'queued',
  posted_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_scheduled 
  ON public.content_queue(league_id, scheduled_at, status);

-- ============================================================================
-- Migration complete
-- ============================================================================

COMMIT;
