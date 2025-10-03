-- Migration: Add channels and personality columns to leagues table
-- Created: 2025-10-03
-- Purpose: Make the hotfix permanent and reproducible

BEGIN;

-- Add JSONB columns if missing
ALTER TABLE public.leagues
  ADD COLUMN IF NOT EXISTS channels jsonb,
  ADD COLUMN IF NOT EXISTS personality jsonb;

-- Set minimal defaults if NULL
UPDATE public.leagues
SET channels = COALESCE(channels, '{}'::jsonb),
    personality = COALESCE(personality, jsonb_build_object('style','neutral'));

COMMIT;
