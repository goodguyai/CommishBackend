-- Migration: Phase 1 - Co-Commissioner Features
-- Date: 2025-10-03
-- Description: Add tables and columns for owner mapping, reminders, polls/votes, sentiment tracking, and trade insights
-- Usage: Idempotent - can be run multiple times safely (IF NOT EXISTS guards)

BEGIN;

-- ============================================================================
-- 1. EXTENSIONS (ensure pgvector is available)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 2. UPDATE MEMBERS TABLE FOR OWNER MAPPING
-- ============================================================================

-- Add discord_username column for better display
ALTER TABLE public.members 
  ADD COLUMN IF NOT EXISTS discord_username TEXT;

-- Make role nullable with default for owner mappings
-- Note: Existing members keep their role; new owner mappings default to MANAGER
DO $$ 
BEGIN
  ALTER TABLE public.members 
    ALTER COLUMN role DROP NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER TABLE public.members 
    ALTER COLUMN role SET DEFAULT 'MANAGER'::member_role;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Add unique constraints for owner mapping
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_members_league_sleeper') THEN
    ALTER TABLE public.members 
      ADD CONSTRAINT uq_members_league_sleeper UNIQUE (league_id, sleeper_owner_id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_members_league_discord') THEN
    ALTER TABLE public.members 
      ADD CONSTRAINT uq_members_league_discord UNIQUE (league_id, discord_user_id);
  END IF;
END $$;

-- ============================================================================
-- 3. REMINDERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'lineup_lock' | 'waivers' | 'trade_deadline' | 'bye_week' | 'custom'
  cron TEXT NOT NULL, -- Cron expression for scheduling
  timezone TEXT NOT NULL DEFAULT 'UTC',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_fired TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb, -- Extra config per reminder type
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_league_id ON public.reminders(league_id);
CREATE INDEX IF NOT EXISTS idx_reminders_enabled ON public.reminders(enabled) WHERE enabled = true;

-- ============================================================================
-- 4. ENHANCE POLLS TABLE
-- ============================================================================

-- Add missing columns for blind/anonymous polls
ALTER TABLE public.polls 
  ADD COLUMN IF NOT EXISTS anonymous BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.polls 
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open'; -- 'open' | 'closed'

-- Add index for active polls
CREATE INDEX IF NOT EXISTS idx_polls_status ON public.polls(status) WHERE status = 'open';

-- ============================================================================
-- 5. VOTES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  voter_id TEXT NOT NULL, -- Discord user ID
  choice TEXT NOT NULL, -- Selected option from poll.options
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (poll_id, voter_id) -- One vote per user per poll
);

CREATE INDEX IF NOT EXISTS idx_votes_poll_id ON public.votes(poll_id);

-- ============================================================================
-- 6. SENTIMENT LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sentiment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL,
  score NUMERIC NOT NULL, -- -1.0 to 1.0 sentiment score
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  sample_size INT NOT NULL DEFAULT 0, -- Number of messages analyzed
  metadata JSONB DEFAULT '{}'::jsonb, -- Optional: top toxic phrases, spike triggers, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sentiment_league_id ON public.sentiment_logs(league_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_channel_id ON public.sentiment_logs(channel_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_window_end ON public.sentiment_logs(window_end DESC);

-- ============================================================================
-- 7. TRADE INSIGHTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.trade_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  payload JSONB NOT NULL, -- Full trade details: teams, players, context
  fairness NUMERIC, -- 0-100 fairness score
  rationale TEXT, -- Human-readable explanation
  projection_delta TEXT, -- e.g., "+3.4 pts to Team A"
  recommendation TEXT, -- e.g., "Fair but atypical"
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trade_insights_league_id ON public.trade_insights(league_id);
CREATE INDEX IF NOT EXISTS idx_trade_insights_created_at ON public.trade_insights(created_at DESC);

-- ============================================================================
-- 8. MIGRATE OWNER_MAPPINGS DATA TO MEMBERS (if any exists)
-- ============================================================================

-- Safely migrate any existing owner_mappings into members
INSERT INTO public.members (league_id, discord_user_id, discord_username, sleeper_owner_id, sleeper_team_name, role, created_at)
SELECT 
  om.league_id,
  om.discord_user_id,
  om.discord_username,
  om.sleeper_owner_id,
  om.sleeper_team_name,
  'MANAGER'::member_role,
  om.created_at
FROM public.owner_mappings om
ON CONFLICT (league_id, discord_user_id) DO NOTHING; -- Skip if already exists

-- ============================================================================
-- 9. REPLACE OWNER_MAPPINGS TABLE WITH COMPATIBILITY VIEW
-- ============================================================================

-- Drop table OR view (idempotent)
DO $$ 
BEGIN
  DROP TABLE IF EXISTS public.owner_mappings CASCADE;
EXCEPTION
  WHEN wrong_object_type THEN
    DROP VIEW IF EXISTS public.owner_mappings CASCADE;
END $$;

-- Create view for backward compatibility
CREATE OR REPLACE VIEW public.owner_mappings AS
SELECT 
  id,
  league_id,
  sleeper_owner_id,
  sleeper_team_name,
  discord_user_id,
  discord_username,
  created_at,
  created_at AS updated_at -- Use created_at for updated_at in view
FROM public.members
WHERE sleeper_owner_id IS NOT NULL; -- Only show members who are mapped to Sleeper

-- ============================================================================
-- Migration complete
-- ============================================================================

COMMIT;
