-- Migration: 0008_modes_auth.sql - Demo vs Beta Activation Flow
-- Date: 2025-10-03
-- Description: Add user_accounts junction table, beta_invites, and account plan fields
-- Usage: Idempotent - can be run multiple times safely (IF NOT EXISTS guards)

BEGIN;

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================

create extension if not exists pgcrypto with schema public;

-- ============================================================================
-- 2. ACCOUNTS TABLE UPDATES
-- ============================================================================

-- Add missing columns to accounts table if they don't exist
alter table if exists accounts add column if not exists name text;
alter table if exists accounts add column if not exists plan text default 'beta';

-- ============================================================================
-- 3. USER_ACCOUNTS JUNCTION TABLE
-- ============================================================================

create table if not exists user_accounts (
  user_id uuid not null,
  account_id uuid not null references accounts(id) on delete cascade,
  role text not null default 'owner',
  primary key (user_id, account_id)
);

-- ============================================================================
-- 4. LEAGUES TABLE UPDATES
-- ============================================================================

-- Ensure account_id column exists (it should already exist from earlier migrations)
alter table if exists leagues add column if not exists account_id uuid;

-- ============================================================================
-- 5. BETA INVITES TABLE
-- ============================================================================

create table if not exists beta_invites (
  code text primary key,
  created_at timestamptz not null default now(),
  claimed_by uuid,
  claimed_at timestamptz
);

-- ============================================================================
-- 6. LEAGUE MODES VIEW
-- ============================================================================

create or replace view v_league_modes as
select
  l.id as league_id,
  l.guild_id,
  l.channel_id,
  l.sleeper_league_id,
  coalesce((l.feature_flags->>'demo')::boolean, false) as is_demo,
  coalesce((l.feature_flags->>'beta')::boolean, true)  as is_beta,
  l.account_id
from leagues l;

-- ============================================================================
-- Migration complete
-- ============================================================================

COMMIT;
