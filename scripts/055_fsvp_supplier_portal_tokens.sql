-- FSVP Supplier Portal Access Tokens
-- Enables secure, token-based access for suppliers to upload documents
-- Addresses the critical gap: supplier drop-off when leaving context to authenticate

-- =====================================================
-- Table: fsvp_supplier_portal_tokens
-- Secure tokens for supplier access to document requests
-- =====================================================
CREATE TABLE IF NOT EXISTS fsvp_supplier_portal_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Token for URL (cryptographically secure)
  token VARCHAR(64) UNIQUE NOT NULL,
  
  -- Link to document request
  request_id UUID NOT NULL REFERENCES fsvp_document_requests(id) ON DELETE CASCADE,
  
  -- Supplier identification
  supplier_email VARCHAR(255) NOT NULL,
  supplier_id UUID REFERENCES fsvp_suppliers(id) ON DELETE SET NULL,
  
  -- Token metadata
  purpose VARCHAR(50) DEFAULT 'document_upload' CHECK (purpose IN (
    'document_upload',    -- Standard document request access
    'review_feedback',    -- View feedback from importer
    'quick_sign'          -- Sign documents without full auth
  )),
  
  -- Security controls
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ NOT NULL,
  max_uses INTEGER DEFAULT NULL,  -- NULL = unlimited
  use_count INTEGER DEFAULT 0,
  
  -- Access tracking
  first_accessed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  access_ip_addresses TEXT[],  -- Track IPs for security audit
  
  -- Authentication state
  -- If supplier authenticates while using token, link their user account
  linked_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  linked_at TIMESTAMPTZ,
  
  -- Created by importer
  created_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Table: fsvp_supplier_portal_sessions
-- Track anonymous/authenticated sessions for suppliers using tokens
-- =====================================================
CREATE TABLE IF NOT EXISTS fsvp_supplier_portal_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to token
  token_id UUID NOT NULL REFERENCES fsvp_supplier_portal_tokens(id) ON DELETE CASCADE,
  
  -- Session tracking
  session_id VARCHAR(64) UNIQUE NOT NULL,
  
  -- User state
  -- NULL = anonymous (using token only)
  -- Set = authenticated user
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Email verification for anonymous users
  email_verified BOOLEAN DEFAULT false,
  verification_code VARCHAR(6),
  verification_code_expires_at TIMESTAMPTZ,
  verification_attempts INTEGER DEFAULT 0,
  
  -- Session data (preserved across auth)
  session_data JSONB DEFAULT '{}',
  
  -- Activity
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- IP tracking
  ip_address VARCHAR(45),
  user_agent TEXT
);

-- =====================================================
-- Table: fsvp_supplier_portal_actions
-- Audit trail of actions taken via portal
-- =====================================================
CREATE TABLE IF NOT EXISTS fsvp_supplier_portal_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Session reference
  session_id UUID NOT NULL REFERENCES fsvp_supplier_portal_sessions(id) ON DELETE CASCADE,
  token_id UUID NOT NULL REFERENCES fsvp_supplier_portal_tokens(id) ON DELETE CASCADE,
  
  -- Action details
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
    'view_request',       -- Viewed the document request
    'upload_document',    -- Uploaded a document
    'delete_document',    -- Deleted own upload
    'add_note',           -- Added supplier note
    'submit_for_review',  -- Submitted for importer review
    'sign_in',            -- Authenticated
    'sign_up',            -- Created account
    'verify_email'        -- Verified email (anonymous)
  )),
  
  -- Action metadata
  action_data JSONB DEFAULT '{}',
  
  -- Reference to affected item
  affected_item_id UUID,  -- Could be document_request_item_id
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_portal_tokens_token ON fsvp_supplier_portal_tokens(token);
CREATE INDEX IF NOT EXISTS idx_portal_tokens_request ON fsvp_supplier_portal_tokens(request_id);
CREATE INDEX IF NOT EXISTS idx_portal_tokens_email ON fsvp_supplier_portal_tokens(supplier_email);
CREATE INDEX IF NOT EXISTS idx_portal_tokens_active ON fsvp_supplier_portal_tokens(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_token ON fsvp_supplier_portal_sessions(token_id);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_session ON fsvp_supplier_portal_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_user ON fsvp_supplier_portal_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_portal_actions_session ON fsvp_supplier_portal_actions(session_id);
CREATE INDEX IF NOT EXISTS idx_portal_actions_token ON fsvp_supplier_portal_actions(token_id);

-- =====================================================
-- Functions
-- =====================================================

-- Generate secure random token
CREATE OR REPLACE FUNCTION generate_portal_token()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  -- Generate 32-character alphanumeric token (no ambiguous chars like 0/O, 1/l/I)
  FOR i IN 1..32 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Generate session ID
CREATE OR REPLACE FUNCTION generate_session_id()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Validate and use token
CREATE OR REPLACE FUNCTION validate_portal_token(p_token TEXT)
RETURNS TABLE (
  is_valid BOOLEAN,
  token_id UUID,
  request_id UUID,
  supplier_email VARCHAR,
  supplier_id UUID,
  error_message TEXT
) AS $$
DECLARE
  v_token RECORD;
BEGIN
  -- Find token
  SELECT * INTO v_token
  FROM fsvp_supplier_portal_tokens
  WHERE token = p_token;
  
  -- Token not found
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false::BOOLEAN,
      NULL::UUID,
      NULL::UUID,
      NULL::VARCHAR,
      NULL::UUID,
      'Token not found or invalid'::TEXT;
    RETURN;
  END IF;
  
  -- Token inactive
  IF NOT v_token.is_active THEN
    RETURN QUERY SELECT 
      false::BOOLEAN,
      v_token.id,
      v_token.request_id,
      v_token.supplier_email,
      v_token.supplier_id,
      'This link has been deactivated'::TEXT;
    RETURN;
  END IF;
  
  -- Token expired
  IF v_token.expires_at < NOW() THEN
    RETURN QUERY SELECT 
      false::BOOLEAN,
      v_token.id,
      v_token.request_id,
      v_token.supplier_email,
      v_token.supplier_id,
      'This link has expired. Please contact the importer for a new link.'::TEXT;
    RETURN;
  END IF;
  
  -- Max uses exceeded
  IF v_token.max_uses IS NOT NULL AND v_token.use_count >= v_token.max_uses THEN
    RETURN QUERY SELECT 
      false::BOOLEAN,
      v_token.id,
      v_token.request_id,
      v_token.supplier_email,
      v_token.supplier_id,
      'This link has reached its maximum number of uses'::TEXT;
    RETURN;
  END IF;
  
  -- Token valid - increment use count and update access time
  UPDATE fsvp_supplier_portal_tokens
  SET 
    use_count = use_count + 1,
    first_accessed_at = COALESCE(first_accessed_at, NOW()),
    last_accessed_at = NOW(),
    updated_at = NOW()
  WHERE id = v_token.id;
  
  RETURN QUERY SELECT 
    true::BOOLEAN,
    v_token.id,
    v_token.request_id,
    v_token.supplier_email,
    v_token.supplier_id,
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Triggers
-- =====================================================

CREATE OR REPLACE FUNCTION update_portal_tokens_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_portal_tokens_updated ON fsvp_supplier_portal_tokens;
CREATE TRIGGER trigger_portal_tokens_updated
  BEFORE UPDATE ON fsvp_supplier_portal_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_portal_tokens_timestamp();

-- =====================================================
-- RLS Policies
-- =====================================================

ALTER TABLE fsvp_supplier_portal_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE fsvp_supplier_portal_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fsvp_supplier_portal_actions ENABLE ROW LEVEL SECURITY;

-- Importers can manage tokens they created
CREATE POLICY portal_tokens_importer_policy ON fsvp_supplier_portal_tokens
  FOR ALL USING (created_by = auth.uid());

-- Suppliers can view their own tokens (by linked user or email)
CREATE POLICY portal_tokens_supplier_policy ON fsvp_supplier_portal_tokens
  FOR SELECT USING (
    linked_user_id = auth.uid()
    OR supplier_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Sessions accessible by linked user
CREATE POLICY portal_sessions_user_policy ON fsvp_supplier_portal_sessions
  FOR ALL USING (user_id = auth.uid());

-- Actions viewable by related parties
CREATE POLICY portal_actions_policy ON fsvp_supplier_portal_actions
  FOR SELECT USING (
    token_id IN (
      SELECT id FROM fsvp_supplier_portal_tokens 
      WHERE created_by = auth.uid() 
         OR linked_user_id = auth.uid()
         OR supplier_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- =====================================================
-- Grants
-- =====================================================

GRANT ALL ON fsvp_supplier_portal_tokens TO authenticated;
GRANT ALL ON fsvp_supplier_portal_sessions TO authenticated;
GRANT ALL ON fsvp_supplier_portal_actions TO authenticated;

-- Service role needs full access for token validation (anonymous access)
GRANT ALL ON fsvp_supplier_portal_tokens TO service_role;
GRANT ALL ON fsvp_supplier_portal_sessions TO service_role;
GRANT ALL ON fsvp_supplier_portal_actions TO service_role;
