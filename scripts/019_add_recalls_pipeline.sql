-- ================================================================
-- Migration 019: FDA Recalls Pipeline
-- Thêm bảng pending_recalls để lưu FDA Enforcement Reports
-- từ openFDA API (food/drug/cosmetic/device enforcement)
-- ================================================================

-- ----------------------------------------------------------------
-- 1. Bảng pending_recalls: staging area trước khi import vào KB
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pending_recalls (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- openFDA fields
  recall_number       TEXT NOT NULL,                    -- VD: "F-0001-2026"
  product_description TEXT NOT NULL,
  recalling_firm      TEXT NOT NULL,
  reason_for_recall   TEXT NOT NULL,
  recall_initiation_date DATE,
  termination_date    DATE,
  recall_type         TEXT,                             -- 'Firm Initiated' | 'FDA Requested' | 'FDA Mandated'
  voluntary_mandated  TEXT,                             -- 'Voluntary: Firm Initiated' | ...

  -- Phân loại
  classification      TEXT,                             -- 'Class I' | 'Class II' | 'Class III'
  product_type        TEXT NOT NULL,                    -- 'food' | 'drug' | 'device' | 'cosmetic'
  product_quantity    TEXT,
  distribution_pattern TEXT,
  state               TEXT,
  country             TEXT DEFAULT 'US',
  openfda_url         TEXT,

  -- Nội dung đã extract để embedding
  extracted_content   TEXT,
  content_length      INT GENERATED ALWAYS AS (COALESCE(LENGTH(extracted_content), 0)) STORED,

  -- Pipeline status
  status              TEXT NOT NULL DEFAULT 'pending_review'
                        CHECK (status IN ('pending_review','approved','processing','imported','rejected','failed')),
  fetch_method        TEXT DEFAULT 'openfda_api',
  fetch_error         TEXT,

  -- Review
  review_notes        TEXT,
  reviewed_at         TIMESTAMPTZ,

  -- Import result
  violations_count    INT DEFAULT 0,
  import_result       JSONB,
  imported_at         TIMESTAMPTZ,

  -- Timestamps
  fetched_at          TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint để dedup theo recall_number + product_type
CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_recalls_recall_number
  ON pending_recalls (recall_number, product_type);

-- Index cho queries phổ biến
CREATE INDEX IF NOT EXISTS idx_pending_recalls_status
  ON pending_recalls (status);
CREATE INDEX IF NOT EXISTS idx_pending_recalls_product_type
  ON pending_recalls (product_type);
CREATE INDEX IF NOT EXISTS idx_pending_recalls_classification
  ON pending_recalls (classification);
CREATE INDEX IF NOT EXISTS idx_pending_recalls_created_at
  ON pending_recalls (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pending_recalls_initiation_date
  ON pending_recalls (recall_initiation_date DESC);

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION update_pending_recalls_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pending_recalls_updated_at ON pending_recalls;
CREATE TRIGGER trg_pending_recalls_updated_at
  BEFORE UPDATE ON pending_recalls
  FOR EACH ROW EXECUTE FUNCTION update_pending_recalls_updated_at();

-- ----------------------------------------------------------------
-- 2. Bảng fda_recall_fetch_log: log mỗi lần fetch openFDA API
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fda_recall_fetch_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at          TIMESTAMPTZ DEFAULT NOW(),
  product_type    TEXT,                         -- 'food' | 'drug' | 'all'
  recalls_found   INT DEFAULT 0,
  recalls_new     INT DEFAULT 0,
  recalls_skipped INT DEFAULT 0,
  recalls_failed  INT DEFAULT 0,
  fetch_source    TEXT DEFAULT 'openfda_api',
  duration_ms     INT,
  error           TEXT,
  details         JSONB
);

-- ----------------------------------------------------------------
-- 3. RLS: chỉ admin mới đọc/ghi được
-- ----------------------------------------------------------------
ALTER TABLE pending_recalls ENABLE ROW LEVEL SECURITY;
ALTER TABLE fda_recall_fetch_log ENABLE ROW LEVEL SECURITY;

-- Policy: service_role bypass (dùng cho admin client)
CREATE POLICY "Service role bypass recalls"
  ON pending_recalls FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role bypass recall logs"
  ON fda_recall_fetch_log FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Policy: authenticated admin users xem được
CREATE POLICY "Admin read pending_recalls"
  ON pending_recalls FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin', 'expert')
    )
  );

CREATE POLICY "Admin read recall fetch log"
  ON fda_recall_fetch_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin', 'expert')
    )
  );

-- ----------------------------------------------------------------
-- 4. Thêm metadata field cho compliance_knowledge để tag Recall
-- compliance_knowledge dùng JSONB metadata nên không cần ALTER TABLE.
-- Chỉ cần đảm bảo index trên metadata->>'document_type' tồn tại.
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_compliance_knowledge_doc_type
  ON compliance_knowledge ((metadata->>'document_type'));

CREATE INDEX IF NOT EXISTS idx_compliance_knowledge_recall_number
  ON compliance_knowledge ((metadata->>'recall_number'))
  WHERE metadata->>'recall_number' IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_compliance_knowledge_recall_class
  ON compliance_knowledge ((metadata->>'recall_classification'))
  WHERE metadata->>'recall_classification' IS NOT NULL;

-- ----------------------------------------------------------------
-- Done
-- ----------------------------------------------------------------
COMMENT ON TABLE pending_recalls IS
  'Staging bảng cho FDA Enforcement Recalls từ openFDA API. Admin review trước khi import vào compliance_knowledge vector DB.';

COMMENT ON TABLE fda_recall_fetch_log IS
  'Log mỗi lần pipeline fetch openFDA Enforcement Reports.';
