-- Migration: Phase 2 - Dispute Prevention & Vibes Monitoring
-- Date: 2025-10-03
-- Description: Add tables for sentiment tracking, moderation actions, disputes, and trade evaluations
-- Usage: Idempotent - can be run multiple times safely (IF NOT EXISTS guards)

BEGIN;

-- ============================================================================
-- 1. ENUM TYPES
-- ============================================================================

-- Create dispute_status ENUM type for disputes table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dispute_status') THEN
    CREATE TYPE dispute_status AS ENUM ('open', 'under_review', 'resolved', 'dismissed');
  END IF;
END $$;

-- ============================================================================
-- 2. SENTIMENT LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sentiment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  summary TEXT,
  toxicity_score NUMERIC(4,3),
  sentiment_score NUMERIC(4,3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sentiment_league_time 
  ON public.sentiment_logs(league_id, created_at DESC);

-- ============================================================================
-- 3. MOD ACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mod_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target_channel_id TEXT,
  target_message_id TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mod_actions_league_id 
  ON public.mod_actions(league_id);

CREATE INDEX IF NOT EXISTS idx_mod_actions_created_at 
  ON public.mod_actions(created_at DESC);

-- ============================================================================
-- 4. DISPUTES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  subject_id TEXT,
  opened_by TEXT NOT NULL,
  status dispute_status NOT NULL DEFAULT 'open',
  details JSONB,
  resolution JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_disputes_league_status 
  ON public.disputes(league_id, status);

-- ============================================================================
-- 5. TRADE EVALUATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.trade_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  trade_id TEXT NOT NULL,
  fairness_score NUMERIC(5,2),
  rationale TEXT,
  inputs JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_trade_eval 
  ON public.trade_evaluations(league_id, trade_id);

-- ============================================================================
-- 6. LEAGUES TABLE ENHANCEMENT
-- ============================================================================

ALTER TABLE public.leagues 
  ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT '{}'::jsonb;

-- ============================================================================
-- Migration complete
-- ============================================================================

COMMIT;
