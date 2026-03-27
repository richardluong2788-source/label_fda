-- ============================================
-- 012_warning_letters_support.sql
-- Add support for FDA Warning Letters in Knowledge Base
-- Enables dual-query strategy: regulations (positive) + warnings (negative)
-- ============================================

-- View to query Warning Letter violations efficiently
CREATE OR REPLACE VIEW warning_letter_violations AS
SELECT 
  id,
  content,
  metadata->>'document_type' as document_type,
  metadata->>'letter_id' as letter_id,
  metadata->>'issue_date' as issue_date,
  metadata->>'company_name' as company_name,
  metadata->>'violation_type' as violation_type,
  metadata->>'problematic_claim' as problematic_claim,
  metadata->>'why_problematic' as why_problematic,
  metadata->>'correction_required' as correction_required,
  metadata->'problematic_keywords' as keywords,
  metadata->>'regulation_violated' as regulation_violated,
  metadata->>'industry' as industry,
  metadata->>'severity' as severity,
  metadata->>'product_category' as product_category,
  created_at
FROM compliance_knowledge
WHERE metadata->>'document_type' = 'FDA Warning Letter'
  AND (metadata->>'is_example_of_violation')::boolean = true;

-- Index for fast document_type filtering
CREATE INDEX IF NOT EXISTS idx_compliance_knowledge_document_type
ON compliance_knowledge 
USING btree ((metadata->>'document_type'));

-- Index for fast violation keyword search (GIN on JSONB array)
CREATE INDEX IF NOT EXISTS idx_compliance_knowledge_problematic_keywords
ON compliance_knowledge 
USING gin ((metadata->'problematic_keywords'));

-- Index for filtering by is_example_of_violation
CREATE INDEX IF NOT EXISTS idx_compliance_knowledge_is_violation_example
ON compliance_knowledge 
USING btree ((metadata->>'is_example_of_violation'));

-- Index for industry filtering
CREATE INDEX IF NOT EXISTS idx_compliance_knowledge_industry
ON compliance_knowledge 
USING btree ((metadata->>'industry'));

-- New RPC function: vector search filtered by document_type
-- Used for dual-query strategy: query regulations and warnings separately
CREATE OR REPLACE FUNCTION match_compliance_knowledge_by_type(
  query_embedding vector(1536),
  doc_type text DEFAULT 'FDA Regulation',
  match_threshold float DEFAULT 0.35,
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
    SELECT DISTINCT ON (COALESCE(ck.metadata->>'section', ck.metadata->>'letter_id', ck.id::text))
      ck.id,
      ck.content,
      (1 - (ck.embedding <=> query_embedding))::float AS similarity,
      ck.metadata,
      COALESCE(ck.metadata->>'section', ck.metadata->>'letter_id', 'N/A')::text as section_name
    FROM compliance_knowledge ck
    WHERE 1 - (ck.embedding <=> query_embedding) > match_threshold
      AND ck.metadata->>'document_type' = doc_type
    ORDER BY COALESCE(ck.metadata->>'section', ck.metadata->>'letter_id', ck.id::text), 
             (ck.embedding <=> query_embedding) ASC
  ) sub
  ORDER BY sub.similarity DESC
  LIMIT match_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION match_compliance_knowledge_by_type TO anon, authenticated;
GRANT SELECT ON warning_letter_violations TO anon, authenticated;
