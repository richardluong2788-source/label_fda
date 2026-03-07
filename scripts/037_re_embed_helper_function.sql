-- Helper function: get records without valid 1536-dim embeddings
-- Returns records where embedding IS NULL OR vector_dims(embedding) != 1536

CREATE OR REPLACE FUNCTION get_records_without_valid_embedding(batch_limit int DEFAULT 50)
RETURNS TABLE(id uuid, content text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id, content
  FROM compliance_knowledge
  WHERE embedding IS NULL
     OR vector_dims(embedding) != 1536
  ORDER BY id
  LIMIT batch_limit;
$$;

-- Helper function: count records without valid embeddings
CREATE OR REPLACE FUNCTION count_records_without_valid_embedding()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*)
  FROM compliance_knowledge
  WHERE embedding IS NULL
     OR vector_dims(embedding) != 1536;
$$;

-- Test: check current state
SELECT 
  COUNT(*) FILTER (WHERE embedding IS NULL) as null_embeddings,
  COUNT(*) FILTER (WHERE embedding IS NOT NULL AND vector_dims(embedding) != 1536) as wrong_dim_embeddings,
  COUNT(*) FILTER (WHERE embedding IS NOT NULL AND vector_dims(embedding) = 1536) as correct_embeddings,
  COUNT(*) as total
FROM compliance_knowledge;
