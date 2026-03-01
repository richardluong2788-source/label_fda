-- ============================================
-- 005_vector_search_function.sql
-- Matches the SQL that was successfully run in Supabase
-- Table: compliance_knowledge (id uuid, content text, metadata jsonb, embedding vector(1536), created_at)
-- metadata contains: regulation_id, title, section, source, industry, chunk_index, total_chunks
-- ============================================

CREATE EXTENSION IF NOT EXISTS vector;

-- Drop old functions
DROP FUNCTION IF EXISTS match_compliance_knowledge(vector(1536), float, int);
DROP FUNCTION IF EXISTS match_compliance_knowledge_deduplicated(vector(1536), float, int);

-- Basic function: raw results sorted by similarity
CREATE OR REPLACE FUNCTION match_compliance_knowledge(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.4,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ck.id,
    ck.content,
    (1 - (ck.embedding <=> query_embedding))::float AS similarity,
    ck.metadata
  FROM compliance_knowledge ck
  WHERE 1 - (ck.embedding <=> query_embedding) > match_threshold
  ORDER BY ck.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Deduplicated function: best chunk per metadata.section, sorted by similarity
CREATE OR REPLACE FUNCTION match_compliance_knowledge_deduplicated(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.4,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float,
  metadata jsonb,
  section_name text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sub.id,
    sub.content,
    sub.similarity,
    sub.metadata,
    sub.section_name
  FROM (
    SELECT DISTINCT ON (ck.metadata->>'section')
      ck.id,
      ck.content,
      (1 - (ck.embedding <=> query_embedding))::float AS similarity,
      ck.metadata,
      (ck.metadata->>'section')::text as section_name
    FROM compliance_knowledge ck
    WHERE 1 - (ck.embedding <=> query_embedding) > match_threshold
    ORDER BY (ck.metadata->>'section'), (ck.embedding <=> query_embedding) ASC
  ) sub
  ORDER BY sub.similarity DESC
  LIMIT match_count;
END;
$$;

-- Indexes
CREATE INDEX IF NOT EXISTS compliance_knowledge_embedding_idx 
ON compliance_knowledge 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS compliance_knowledge_content_fts_idx 
ON compliance_knowledge 
USING gin(to_tsvector('english', content));

-- Grant permissions
GRANT EXECUTE ON FUNCTION match_compliance_knowledge TO anon, authenticated;
GRANT EXECUTE ON FUNCTION match_compliance_knowledge_deduplicated TO anon, authenticated;
