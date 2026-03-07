-- ============================================
-- 036_diagnose_and_fix_embeddings.sql
-- RUN THIS IN SUPABASE DASHBOARD > SQL EDITOR
-- ============================================

-- STEP 1: Check current state
SELECT 
  'compliance_knowledge' as table_name,
  COUNT(*) as total_records,
  COUNT(embedding) as records_with_embedding,
  COUNT(*) - COUNT(embedding) as records_without_embedding
FROM compliance_knowledge;

-- STEP 2: Check embedding dimensions (run separately)
-- This will show actual dimensions of stored embeddings
SELECT 
  vector_dims(embedding) as embedding_dimensions,
  COUNT(*) as count
FROM compliance_knowledge 
WHERE embedding IS NOT NULL
GROUP BY vector_dims(embedding)
LIMIT 10;

-- STEP 3: Check column definition
SELECT 
  column_name, 
  data_type, 
  udt_name
FROM information_schema.columns 
WHERE table_name = 'compliance_knowledge' 
  AND column_name = 'embedding';

-- ============================================
-- IF DIMENSIONS ARE WRONG (not 1536), RUN THESE:
-- ============================================

-- STEP 4: Drop dependent objects first (including view!)
DROP VIEW IF EXISTS public.active_compliance_knowledge CASCADE;
DROP INDEX IF EXISTS compliance_knowledge_embedding_idx;
DROP FUNCTION IF EXISTS match_compliance_knowledge(vector, float, int);
DROP FUNCTION IF EXISTS match_compliance_knowledge(vector(1536), float, int);
DROP FUNCTION IF EXISTS match_compliance_knowledge_deduplicated(vector, float, int);
DROP FUNCTION IF EXISTS match_compliance_knowledge_deduplicated(vector(1536), float, int);

-- STEP 5: Alter column to remove dimension constraint temporarily
ALTER TABLE compliance_knowledge 
ALTER COLUMN embedding TYPE vector;

-- STEP 6: Clear all embeddings (they're wrong anyway)
UPDATE compliance_knowledge SET embedding = NULL;

-- STEP 7: Set correct dimension constraint
ALTER TABLE compliance_knowledge 
ALTER COLUMN embedding TYPE vector(1536);

-- STEP 8: Recreate the vector search functions
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
  WHERE ck.embedding IS NOT NULL
    AND 1 - (ck.embedding <=> query_embedding) > match_threshold
  ORDER BY ck.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

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
    WHERE ck.embedding IS NOT NULL
      AND 1 - (ck.embedding <=> query_embedding) > match_threshold
    ORDER BY (ck.metadata->>'section'), (ck.embedding <=> query_embedding) ASC
  ) sub
  ORDER BY sub.similarity DESC
  LIMIT match_count;
END;
$$;

-- STEP 9: Recreate index (after embeddings are populated)
-- Run this AFTER running the re-embed script
-- CREATE INDEX compliance_knowledge_embedding_idx 
-- ON compliance_knowledge 
-- USING ivfflat (embedding vector_cosine_ops)
-- WITH (lists = 100);

-- STEP 10: Grant permissions
GRANT EXECUTE ON FUNCTION match_compliance_knowledge TO anon, authenticated;
GRANT EXECUTE ON FUNCTION match_compliance_knowledge_deduplicated TO anon, authenticated;

-- STEP 11: Recreate the view that was dropped
CREATE OR REPLACE VIEW public.active_compliance_knowledge AS
SELECT
  id, content, metadata, embedding, source, section,
  is_active, valid_from, valid_until, temporal_scope,
  CASE
    WHEN temporal_scope = 'permanent' THEN 'Permanent regulation'
    WHEN valid_until IS NULL THEN 'No expiry set'
    WHEN valid_until > CURRENT_DATE THEN 'Active until ' || valid_until::text
    ELSE 'Expired ' || valid_until::text
  END as validity_status
FROM public.compliance_knowledge
WHERE is_active = true;

-- VERIFY: Check column is now correct
SELECT 
  column_name, 
  data_type, 
  udt_name
FROM information_schema.columns 
WHERE table_name = 'compliance_knowledge' 
  AND column_name = 'embedding';
