-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Ensure embeddings table exists with proper vector column
-- This will be handled by Drizzle schema push, but we need the extension first

-- Create similarity search index on embeddings table
-- Using cosine distance for semantic similarity
CREATE INDEX CONCURRENTLY IF NOT EXISTS embeddings_embedding_cosine_idx 
ON embeddings USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Alternative: L2 distance index (Euclidean)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS embeddings_embedding_l2_idx 
-- ON embeddings USING ivfflat (embedding vector_l2_ops) 
-- WITH (lists = 100);

-- Alternative: Inner product index (for normalized vectors)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS embeddings_embedding_ip_idx 
-- ON embeddings USING ivfflat (embedding vector_ip_ops) 
-- WITH (lists = 100);