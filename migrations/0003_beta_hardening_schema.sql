-- Migration: Beta Hardening Schema Changes
-- Date: 2025-10-01
-- Description: Add tone settings, owner mappings, enhanced event types, and feature flags

-- 1. Add new event types to enum
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'DIGEST_SENT';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'DIGEST_SKIPPED';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'DIGEST_FAILED';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'RULES_INDEX_FAILED';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'MISCONFIGURED';

-- 2. Add tone column to leagues
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS tone TEXT DEFAULT 'neutral';

-- 3. Update feature_flags default to include autoMeme and reminders
ALTER TABLE leagues ALTER COLUMN feature_flags SET DEFAULT '{"qa":true,"deadlines":true,"digest":true,"trade_helper":false,"autoMeme":false,"reminders":{"lineupLock":true,"waiver":true,"tradeDeadline":true}}'::jsonb;

-- 4. Backfill existing leagues with new feature flags (if any exist)
UPDATE leagues 
SET feature_flags = coalesce(feature_flags,'{}'::jsonb) || '{"autoMeme":false,"reminders":{"lineupLock":true,"waiver":true,"tradeDeadline":true}}'::jsonb 
WHERE NOT (feature_flags ? 'autoMeme') OR NOT (feature_flags ? 'reminders');

-- 5. Add Sleeper owner fields to members table
ALTER TABLE members ADD COLUMN IF NOT EXISTS sleeper_owner_id TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS sleeper_team_name TEXT;

-- 6. Create owner_mappings table for Discord-Sleeper user mapping
CREATE TABLE IF NOT EXISTS owner_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id),
  sleeper_owner_id TEXT NOT NULL,
  sleeper_team_name TEXT,
  discord_user_id TEXT NOT NULL,
  discord_username TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. Add constraints and indexes to owner_mappings
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_owner_map_league_sleeper') THEN
    ALTER TABLE owner_mappings ADD CONSTRAINT uq_owner_map_league_sleeper UNIQUE (league_id, sleeper_owner_id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_owner_map_league_discord') THEN
    ALTER TABLE owner_mappings ADD CONSTRAINT uq_owner_map_league_discord UNIQUE (league_id, discord_user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_owner_mappings_league_id ON owner_mappings(league_id);

-- Migration complete
