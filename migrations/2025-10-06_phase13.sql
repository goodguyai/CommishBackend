-- === Phase 13: Constitution Drafts and Safety Enhancements ===

-- 1) Constitution drafts: reversible proposals from Sleeper→Constitution
CREATE TABLE IF NOT EXISTS constitution_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  source text NOT NULL,
  proposed jsonb NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  created_at timestamp DEFAULT now(),
  decided_at timestamp
);

CREATE INDEX IF NOT EXISTS constitution_drafts_league_idx ON constitution_drafts(league_id);
CREATE INDEX IF NOT EXISTS constitution_drafts_status_idx ON constitution_drafts(status);

-- 2) Ensure bot_activity has proper indexes for idempotency and ops visibility
CREATE INDEX IF NOT EXISTS bot_activity_kind_idx ON bot_activity(kind);
CREATE INDEX IF NOT EXISTS bot_activity_key_idx ON bot_activity(key);
CREATE INDEX IF NOT EXISTS bot_activity_league_idx ON bot_activity(league_id);
