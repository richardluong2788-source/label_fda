-- ============================================
-- 038_match_by_document_type.sql
-- Add function to search compliance_knowledge filtered by document_type
-- Fixes issue where WL/Recall records never appear in RAG because
-- regulations (3810 records) dominate the top similarity results
-- ============================================

-- Drop existing function first (required when changing return type)
DROP FUNCTION IF EXISTS match_compliance_knowledge_by_type(vector, text, float, int);
DROP FUNCTION IF EXISTS match_compliance_knowledge_by_type(vector, text, double precision, integer);

-- Function: match compliance knowledge filtered by document_type
-- Used for targeted searches: Warning Letters, Recalls, etc.
CREATE OR REPLACE FUNCTION match_compliance_knowledge_by_type(
  query_embedding vector(1536),
  doc_type text,                    -- e.g., 'FDA Warning Letter', 'FDA Recall', or NULL for all
  match_threshold float DEFAULT 0.0,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float,
  metadata jsonb,
  is_active boolean
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ck.id,
    ck.content,
    (1 - (ck.embedding <=> query_embedding))::float AS similarity,
    ck.metadata,
    COALESCE(ck.is_active, true) AS is_active
  FROM compliance_knowledge ck
  WHERE 
    (1 - (ck.embedding <=> query_embedding)) > match_threshold
    AND (
      doc_type IS NULL 
      OR ck.metadata->>'document_type' = doc_type
    )
  ORDER BY ck.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION match_compliance_knowledge_by_type TO anon, authenticated;

-- Add index on document_type for faster filtering (if not exists)
CREATE INDEX IF NOT EXISTS idx_compliance_knowledge_doc_type 
ON compliance_knowledge ((metadata->>'document_type'));
