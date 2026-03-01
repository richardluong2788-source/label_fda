-- Add version control for label revisions
-- Allows tracking multiple versions of the same label for comparison

-- Add version tracking to audit_reports
ALTER TABLE audit_reports
ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS parent_report_id UUID REFERENCES audit_reports(id),
ADD COLUMN IF NOT EXISTS is_latest_version BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS version_notes TEXT;

-- Create label_versions table for detailed version history
CREATE TABLE IF NOT EXISTS label_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_report_id UUID NOT NULL REFERENCES audit_reports(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  label_image_url TEXT NOT NULL,
  status TEXT NOT NULL,
  overall_result TEXT,
  findings JSONB DEFAULT '[]'::jsonb,
  geometry_violations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  version_notes TEXT,
  changes_summary JSONB DEFAULT '{}'::jsonb,
  
  UNIQUE(original_report_id, version_number)
);

-- Enable RLS on label_versions
ALTER TABLE label_versions ENABLE ROW LEVEL SECURITY;

-- Users can view their own label versions
CREATE POLICY "Users can view own label versions"
ON label_versions
FOR SELECT
USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM audit_reports
    WHERE audit_reports.id = label_versions.original_report_id
    AND audit_reports.user_id = auth.uid()
  )
);

-- Users can insert new versions of their labels
CREATE POLICY "Users can create label versions"
ON label_versions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM audit_reports
    WHERE audit_reports.id = label_versions.original_report_id
    AND audit_reports.user_id = auth.uid()
  )
);

-- Admins can view all versions
CREATE POLICY "Admins can view all label versions"
ON label_versions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = auth.uid()
  )
);

-- Create comparison_sessions table to track side-by-side comparisons
CREATE TABLE IF NOT EXISTS comparison_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_report_id UUID NOT NULL REFERENCES audit_reports(id) ON DELETE CASCADE,
  version_a_id UUID NOT NULL REFERENCES label_versions(id) ON DELETE CASCADE,
  version_b_id UUID NOT NULL REFERENCES label_versions(id) ON DELETE CASCADE,
  compared_by UUID REFERENCES auth.users(id),
  comparison_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on comparison_sessions
ALTER TABLE comparison_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own comparisons
CREATE POLICY "Users can view own comparisons"
ON comparison_sessions
FOR SELECT
USING (compared_by = auth.uid());

-- Users can create comparisons
CREATE POLICY "Users can create comparisons"
ON comparison_sessions
FOR INSERT
WITH CHECK (compared_by = auth.uid());

-- Create function to automatically create version on label resubmission
CREATE OR REPLACE FUNCTION create_label_version()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is an update to an existing report with a new image
  IF TG_OP = 'UPDATE' AND OLD.label_image_url <> NEW.label_image_url THEN
    -- Save old version to history
    INSERT INTO label_versions (
      original_report_id,
      version_number,
      label_image_url,
      status,
      overall_result,
      findings,
      geometry_violations,
      created_by,
      version_notes
    ) VALUES (
      OLD.id,
      OLD.version_number,
      OLD.label_image_url,
      OLD.status,
      OLD.overall_result,
      OLD.findings,
      COALESCE(OLD.geometry_violations, '[]'::jsonb),
      OLD.user_id,
      'Auto-saved version before resubmission'
    );
    
    -- Increment version number
    NEW.version_number := OLD.version_number + 1;
    NEW.is_latest_version := true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic version creation
DROP TRIGGER IF EXISTS auto_create_label_version ON audit_reports;
CREATE TRIGGER auto_create_label_version
  BEFORE UPDATE ON audit_reports
  FOR EACH ROW
  EXECUTE FUNCTION create_label_version();

-- Create index for faster version queries
CREATE INDEX IF NOT EXISTS idx_label_versions_original_report ON label_versions(original_report_id);
CREATE INDEX IF NOT EXISTS idx_label_versions_created_at ON label_versions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_reports_parent ON audit_reports(parent_report_id);

-- Add geometry_violations column to audit_reports if not exists
ALTER TABLE audit_reports
ADD COLUMN IF NOT EXISTS geometry_violations JSONB DEFAULT '[]'::jsonb;

COMMENT ON TABLE label_versions IS 'Stores historical versions of labels for comparison';
COMMENT ON TABLE comparison_sessions IS 'Tracks side-by-side label comparisons';
COMMENT ON COLUMN audit_reports.version_number IS 'Current version number of this label';
COMMENT ON COLUMN audit_reports.parent_report_id IS 'Points to previous version if this is a revision';
COMMENT ON COLUMN audit_reports.geometry_violations IS 'Visual geometry analysis results (font ratios, text areas, etc.)';
