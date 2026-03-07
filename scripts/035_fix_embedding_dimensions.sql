-- 035_fix_embedding_dimensions.sql
-- Fix: Embeddings have 19,161 dimensions but should be 1,536
-- This script:
-- 1. Sets all embeddings to NULL (they need to be re-generated anyway)
-- 2. Ensures column type is vector(1536)
-- 3. After this, run the JS script to re-generate embeddings

-- First, let's check the current state
DO $$
DECLARE
  current_count INTEGER;
  sample_dims INTEGER;
BEGIN
  -- Count records
  SELECT COUNT(*) INTO current_count FROM compliance_knowledge;
  RAISE NOTICE 'Total records in compliance_knowledge: %', current_count;
  
  -- Check embedding dimensions
  SELECT array_length(embedding::float[], 1) INTO sample_dims 
  FROM compliance_knowledge 
  WHERE embedding IS NOT NULL 
  LIMIT 1;
  RAISE NOTICE 'Current embedding dimensions: %', COALESCE(sample_dims::text, 'NULL');
END $$;

-- Step 1: Null out all embeddings (they are useless with wrong dimensions)
UPDATE compliance_knowledge SET embedding = NULL;

-- Step 2: Drop existing indexes that depend on the embedding column
DROP INDEX IF EXISTS compliance_knowledge_embedding_idx;
DROP INDEX IF EXISTS idx_compliance_knowledge_embedding_hnsw;

-- Step 3: Alter column to ensure it's vector(1536)
-- This may fail if there's data - that's why we nulled it first
ALTER TABLE compliance_knowledge 
ALTER COLUMN embedding TYPE vector(1536) 
USING NULL;

-- Step 4: Recreate the HNSW index for fast vector search
CREATE INDEX IF NOT EXISTS idx_compliance_knowledge_embedding_hnsw 
ON compliance_knowledge 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Step 5: Verify the fix
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count FROM compliance_knowledge WHERE embedding IS NULL;
  RAISE NOTICE 'Records with NULL embeddings (need re-generation): %', null_count;
  RAISE NOTICE '✅ Column type fixed to vector(1536). Now run fix-embeddings.js to regenerate embeddings.';
END $$;
