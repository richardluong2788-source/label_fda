-- ============================================================
-- 034_vector_index_hnsw.sql
-- Upgrade the vector index on compliance_knowledge from
-- IVFFlat (approximate, requires prior training) to HNSW
-- (Hierarchical Navigable Small World — no training required,
-- better recall, faster queries on medium-sized tables).
--
-- Why HNSW over IVFFlat?
--   IVFFlat needs `lists` tuned to sqrt(n_rows) and requires
--   VACUUM ANALYZE after inserts to stay effective.
--   HNSW is an always-on, insert-friendly index with higher
--   recall at the same query latency for tables < 10M rows.
--
-- Parameters (defaults are safe for up to ~500K rows):
--   m        = 16   (max connections per node — trade off memory vs recall)
--   ef_construction = 64 (build-time search width — higher = better recall, slower build)
--
-- Run time: this is done CONCURRENTLY so it won't lock the table.
-- It may take a few minutes on a large compliance_knowledge table.
-- ============================================================

-- Drop the old IVFFlat index (created in 005_vector_search_function.sql)
DROP INDEX IF EXISTS compliance_knowledge_embedding_idx;

-- Create the new HNSW index.
-- NOTE: CONCURRENTLY is intentionally omitted here because most SQL runners
-- (Supabase SQL editor, psql \i, migration tools) wrap statements in an
-- implicit transaction, and PostgreSQL forbids CONCURRENTLY inside any
-- transaction block. The plain CREATE INDEX will briefly lock the table
-- for writes but is safe to run — on a small-to-medium compliance_knowledge
-- table the build typically completes in seconds.
-- If you need zero-downtime on a large table, run this line manually in a
-- dedicated psql session (outside any transaction) with CONCURRENTLY added.
CREATE INDEX IF NOT EXISTS compliance_knowledge_embedding_hnsw_idx
ON compliance_knowledge
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Optional: set ef_search at session level for higher-quality queries
-- (You can also do this inside the match_compliance_knowledge functions
--  via "SET LOCAL hnsw.ef_search = 100" if you want per-query control.)
-- ALTER DATABASE postgres SET hnsw.ef_search = 100;
