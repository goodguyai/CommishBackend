-- Remove unique constraint on embeddings.content_hash to allow duplicate hashes for different rules
-- This enables proper caching while preserving rule-to-embedding linkage

-- Drop any existing unique constraints and indexes on content_hash
DROP INDEX IF EXISTS embeddings_content_hash_key;
DROP INDEX IF EXISTS embeddings_content_hash_unique;
ALTER TABLE embeddings DROP CONSTRAINT IF EXISTS embeddings_content_hash_unique;
ALTER TABLE embeddings DROP CONSTRAINT IF EXISTS embeddings_content_hash_key;

-- Add a non-unique index for efficient cache lookups
CREATE INDEX IF NOT EXISTS embeddings_content_hash_idx ON embeddings (content_hash);