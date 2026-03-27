-- ============================================================================
-- FSVP Translation Tracking Migration
-- Add columns to track document translations per 21 CFR 1.510(b)(1)
-- 
-- FDA Requirement: Records must be in English or accompanied by an 
-- accurate English translation. This migration adds fields to track
-- the original language and translation status of FSVP documents.
-- ============================================================================

-- ============================================================================
-- Add translation-related columns to fsvp_documents
-- ============================================================================

-- Original language of the document
ALTER TABLE fsvp_documents 
ADD COLUMN IF NOT EXISTS original_language TEXT DEFAULT 'english';

-- Does this document have an English translation?
ALTER TABLE fsvp_documents 
ADD COLUMN IF NOT EXISTS has_english_translation BOOLEAN DEFAULT FALSE;

-- URL to the English translation file
ALTER TABLE fsvp_documents 
ADD COLUMN IF NOT EXISTS translation_file_url TEXT;

-- Translation status
ALTER TABLE fsvp_documents 
ADD COLUMN IF NOT EXISTS translation_status TEXT DEFAULT 'not_needed' 
CHECK (translation_status IN (
  'not_needed',      -- Document is in English
  'pending',         -- Translation needed but not yet uploaded
  'uploaded',        -- Translation uploaded, pending verification
  'verified',        -- Translation verified by qualified individual
  'rejected'         -- Translation rejected, needs revision
));

-- Who verified the translation
ALTER TABLE fsvp_documents 
ADD COLUMN IF NOT EXISTS translation_verified_by UUID REFERENCES auth.users(id);

-- When was the translation verified
ALTER TABLE fsvp_documents 
ADD COLUMN IF NOT EXISTS translation_verified_at TIMESTAMPTZ;

-- Translation verification notes
ALTER TABLE fsvp_documents 
ADD COLUMN IF NOT EXISTS translation_notes TEXT;

-- ============================================================================
-- Add AI classification-related columns
-- ============================================================================

-- AI-suggested document type
ALTER TABLE fsvp_documents 
ADD COLUMN IF NOT EXISTS ai_suggested_type TEXT;

-- AI classification confidence score (0.0 - 1.0)
ALTER TABLE fsvp_documents 
ADD COLUMN IF NOT EXISTS ai_confidence DECIMAL(3,2);

-- Classification method used
ALTER TABLE fsvp_documents 
ADD COLUMN IF NOT EXISTS classification_method TEXT DEFAULT 'manual'
CHECK (classification_method IN (
  'ai_vision',       -- Classified by AI Vision
  'keyword_fallback', -- Classified by keyword matching
  'manual'           -- Manually selected by user
));

-- Keywords detected by AI
ALTER TABLE fsvp_documents 
ADD COLUMN IF NOT EXISTS detected_keywords TEXT[];

-- ============================================================================
-- Add FSVP-specific columns
-- ============================================================================

-- Applicable CFR sections for this document
ALTER TABLE fsvp_documents 
ADD COLUMN IF NOT EXISTS applicable_cfr_sections TEXT[] DEFAULT '{}';

-- Is this document relevant for FSVP compliance?
ALTER TABLE fsvp_documents 
ADD COLUMN IF NOT EXISTS is_fsvp_relevant BOOLEAN DEFAULT TRUE;

-- Link to specific FSVP requirement this document satisfies
ALTER TABLE fsvp_documents 
ADD COLUMN IF NOT EXISTS fsvp_requirement_id UUID;

-- ============================================================================
-- Update document_type CHECK constraint to include new types
-- ============================================================================

-- First, drop the old constraint
ALTER TABLE fsvp_documents 
DROP CONSTRAINT IF EXISTS fsvp_documents_document_type_check;

-- Add new constraint with additional types
ALTER TABLE fsvp_documents 
ADD CONSTRAINT fsvp_documents_document_type_check 
CHECK (document_type IN (
  'certificate',
  'test_report',
  'audit_report',
  'haccp_plan',
  'food_safety_plan',
  'sop',
  'letter_of_guarantee',
  'specification_sheet',
  'coa',
  'supplier_questionnaire',
  'corrective_action',
  'verification_record',
  'import_record',
  'other'
));

-- ============================================================================
-- Create index for translation queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_fsvp_documents_language 
ON fsvp_documents(original_language);

CREATE INDEX IF NOT EXISTS idx_fsvp_documents_translation_status 
ON fsvp_documents(translation_status) 
WHERE translation_status != 'not_needed';

CREATE INDEX IF NOT EXISTS idx_fsvp_documents_fsvp_relevant 
ON fsvp_documents(is_fsvp_relevant) 
WHERE is_fsvp_relevant = TRUE;

-- ============================================================================
-- Function: Auto-set translation_status based on language
-- ============================================================================

CREATE OR REPLACE FUNCTION set_translation_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If language is English, no translation needed
  IF NEW.original_language = 'english' THEN
    NEW.translation_status = 'not_needed';
    NEW.has_english_translation = TRUE;  -- English IS the English version
  -- If language changed to non-English and no translation uploaded
  ELSIF NEW.original_language != 'english' AND NEW.translation_file_url IS NULL THEN
    NEW.translation_status = 'pending';
    NEW.has_english_translation = FALSE;
  END IF;
  
  -- If translation uploaded, update status
  IF NEW.translation_file_url IS NOT NULL AND NEW.original_language != 'english' THEN
    -- Don't override if already verified
    IF NEW.translation_status NOT IN ('verified', 'rejected') THEN
      NEW.translation_status = 'uploaded';
    END IF;
    NEW.has_english_translation = TRUE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_fsvp_documents_translation ON fsvp_documents;

-- Create trigger
CREATE TRIGGER trigger_fsvp_documents_translation
  BEFORE INSERT OR UPDATE OF original_language, translation_file_url
  ON fsvp_documents
  FOR EACH ROW
  EXECUTE FUNCTION set_translation_status();

-- ============================================================================
-- Create translation history table for audit trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS fsvp_document_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES fsvp_documents(id) ON DELETE CASCADE,
  
  -- Translation file info
  translation_file_url TEXT NOT NULL,
  translator_name TEXT,
  translation_date TIMESTAMPTZ,
  
  -- Verification
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'verified',
    'rejected'
  )),
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,
  
  -- Audit trail
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_fsvp_translations_document 
ON fsvp_document_translations(document_id);

-- Enable RLS
ALTER TABLE fsvp_document_translations ENABLE ROW LEVEL SECURITY;

-- RLS Policies (inherit from parent document)
CREATE POLICY "Users can view own translations" ON fsvp_document_translations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM fsvp_documents 
      WHERE id = document_id AND importer_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own translations" ON fsvp_document_translations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM fsvp_documents 
      WHERE id = document_id AND importer_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own translations" ON fsvp_document_translations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM fsvp_documents 
      WHERE id = document_id AND importer_user_id = auth.uid()
    )
  );

-- ============================================================================
-- View: Documents needing translation
-- ============================================================================

CREATE OR REPLACE VIEW fsvp_documents_needing_translation AS
SELECT 
  d.id,
  d.document_name,
  d.document_type,
  d.original_language,
  d.translation_status,
  d.supplier_id,
  s.supplier_name AS supplier_name,
  d.upload_date,
  d.expiry_date,
  d.importer_user_id
FROM fsvp_documents d
LEFT JOIN fsvp_suppliers s ON d.supplier_id = s.id
WHERE d.original_language != 'english'
  AND d.translation_status IN ('pending', 'rejected')
ORDER BY d.upload_date DESC;

-- ============================================================================
-- Comment on columns for documentation
-- ============================================================================

COMMENT ON COLUMN fsvp_documents.original_language IS 
'Original language of the document. Per 21 CFR 1.510(b)(1), non-English documents must have English translations.';

COMMENT ON COLUMN fsvp_documents.has_english_translation IS 
'Indicates if an English translation is available for this document.';

COMMENT ON COLUMN fsvp_documents.translation_status IS 
'Status of the English translation: not_needed (English original), pending (needs translation), uploaded (translation available), verified (checked by QI), rejected (needs revision).';

COMMENT ON COLUMN fsvp_documents.ai_suggested_type IS 
'Document type suggested by AI classification system. May differ from final document_type if user overrode.';

COMMENT ON COLUMN fsvp_documents.ai_confidence IS 
'Confidence score from AI classification (0.0 to 1.0). Higher = more certain.';

COMMENT ON COLUMN fsvp_documents.applicable_cfr_sections IS 
'CFR sections that this document is relevant to (e.g., ["§1.505", "§1.506"]).';
