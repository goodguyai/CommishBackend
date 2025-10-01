-- Migration: Comprehensive Baseline Schema
-- Date: 2025-10-01
-- Description: Complete idempotent schema matching live Supabase database
-- Usage: Can be run multiple times safely (IF NOT EXISTS guards)

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- 2. ENUMS
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE member_role AS ENUM ('COMMISH', 'MANAGER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE document_type AS ENUM ('ORIGINAL', 'NORMALIZED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE fact_source AS ENUM ('SLEEPER', 'RULE', 'MANUAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE deadline_source AS ENUM ('RULE', 'MANUAL', 'DERIVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE event_type AS ENUM (
    'INSTALL_COMPLETED',
    'RULES_UPDATED',
    'SLEEPER_SYNCED',
    'DIGEST_DUE',
    'DIGEST_SENT',
    'DIGEST_SKIPPED',
    'DIGEST_FAILED',
    'COMMAND_EXECUTED',
    'RULES_INDEX_FAILED',
    'MISCONFIGURED',
    'ERROR_OCCURRED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 3. CORE TABLES
-- ============================================================================

-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  discord_user_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Leagues table
CREATE TABLE IF NOT EXISTS leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id),
  name TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'sleeper',
  sleeper_league_id TEXT,
  guild_id TEXT,
  channel_id TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  tone TEXT DEFAULT 'neutral',
  feature_flags JSONB DEFAULT '{"qa":true,"deadlines":true,"digest":true,"trade_helper":false,"autoMeme":false,"reminders":{"lineupLock":true,"waiver":true,"tradeDeadline":true}}'::jsonb,
  model_prefs JSONB DEFAULT '{"maxTokens":1000,"provider":"deepseek"}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Members table
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id),
  discord_user_id TEXT NOT NULL,
  role member_role NOT NULL,
  sleeper_owner_id TEXT,
  sleeper_team_name TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id),
  type document_type NOT NULL,
  url TEXT,
  content TEXT,
  version TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Rules table
CREATE TABLE IF NOT EXISTS rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id),
  document_id UUID NOT NULL REFERENCES documents(id),
  version TEXT NOT NULL,
  section_id TEXT NOT NULL,
  rule_key TEXT NOT NULL,
  text TEXT NOT NULL,
  citations JSONB DEFAULT '[]'::jsonb,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Embeddings table with pgvector
CREATE TABLE IF NOT EXISTS embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES rules(id),
  content_hash TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  provider TEXT NOT NULL DEFAULT 'openai',
  model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Facts table
CREATE TABLE IF NOT EXISTS facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id),
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  source fact_source NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Deadlines table
CREATE TABLE IF NOT EXISTS deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id),
  type TEXT NOT NULL,
  iso_time TIMESTAMP NOT NULL,
  source deadline_source NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id),
  type event_type NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  request_id TEXT,
  latency INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Discord interactions table
CREATE TABLE IF NOT EXISTS discord_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id TEXT NOT NULL UNIQUE,
  league_id UUID REFERENCES leagues(id),
  command_name TEXT,
  user_id TEXT NOT NULL,
  channel_id TEXT,
  guild_id TEXT,
  response_time INTEGER,
  tokens_used INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Pending setup table
CREATE TABLE IF NOT EXISTS pending_setup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  web_user_id UUID,
  session_id TEXT,
  selected_guild_id TEXT,
  selected_channel_id TEXT,
  sleeper_username TEXT,
  sleeper_season TEXT,
  selected_league_id TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Owner mappings table
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

-- Polls table
CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id),
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  discord_message_id TEXT,
  created_by TEXT NOT NULL,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Legacy users table (for compatibility)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL
);

-- ============================================================================
-- 4. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_embeddings_rule_id ON embeddings(rule_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_content_hash ON embeddings(content_hash);
CREATE INDEX IF NOT EXISTS idx_rules_league_id ON rules(league_id);
CREATE INDEX IF NOT EXISTS idx_rules_document_id ON rules(document_id);
CREATE INDEX IF NOT EXISTS idx_events_league_id ON events(league_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_owner_mappings_league_id ON owner_mappings(league_id);
CREATE INDEX IF NOT EXISTS idx_polls_league_id ON polls(league_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_league_id ON deadlines(league_id);
CREATE INDEX IF NOT EXISTS idx_facts_league_id ON facts(league_id);
CREATE INDEX IF NOT EXISTS idx_members_league_id ON members(league_id);
CREATE INDEX IF NOT EXISTS idx_documents_league_id ON documents(league_id);

-- ============================================================================
-- 5. CONSTRAINTS
-- ============================================================================

-- Owner mappings unique constraints
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

-- ============================================================================
-- Migration complete
-- ============================================================================
