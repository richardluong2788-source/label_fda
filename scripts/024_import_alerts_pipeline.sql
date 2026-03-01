-- ================================================================
-- Migration 024: FDA Import Alerts Pipeline
-- Tạo bảng pending_import_alerts để lưu Import Alerts từ FDA
-- Thu thập bằng HTML Scraping (không có official API)
-- Layer 4 trong RAG: BORDER ENFORCEMENT (không dùng cho Citations)
-- ================================================================

-- ----------------------------------------------------------------
-- 1. Bảng pending_import_alerts: staging area trước khi dùng
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pending_import_alerts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Định danh
  alert_number          TEXT NOT NULL,                -- VD: "66-40", "99-33"
  alert_title           TEXT NOT NULL,                -- Tên đầy đủ của alert
  industry_type         TEXT NOT NULL,                -- 'food' | 'dietary-supplement' | 'cosmetic' | 'drug' | 'device'

  -- Nội dung cốt lõi
  reason_for_alert      TEXT NOT NULL,                -- Lý do bị alert (CGMP, undeclared, filth, ...)
  action_type           TEXT NOT NULL DEFAULT 'DWPE', -- 'DWPE' | 'Physical Examination' | 'Sampling & Analysis'

  -- Danh sách entities bị alert (JSONB array)
  -- Mỗi entry: { name, fei_number, country, address, date_added, date_removed, is_active }
  red_list_entities     JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Thông tin thời gian
  effective_date        DATE,
  last_updated_date     DATE,

  -- Nội dung đã extract để matching (không cần embedding — dùng text search + metadata filter)
  extracted_content     TEXT,

  -- Liên kết gốc
  source_url            TEXT,

  -- Pipeline status
  status                TEXT NOT NULL DEFAULT 'pending_review'
                          CHECK (status IN ('pending_review', 'approved', 'rejected', 'failed')),
  fetch_method          TEXT DEFAULT 'html_scraping',
  fetch_error           TEXT,

  -- Review
  review_notes          TEXT,
  reviewed_at           TIMESTAMPTZ,

  -- Timestamps
  fetched_at            TIMESTAMPTZ DEFAULT NOW(),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: dedup theo alert_number
CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_import_alerts_number
  ON pending_import_alerts (alert_number);

-- Indexes cho queries phổ biến
CREATE INDEX IF NOT EXISTS idx_pending_import_alerts_status
  ON pending_import_alerts (status);

CREATE INDEX IF NOT EXISTS idx_pending_import_alerts_industry
  ON pending_import_alerts (industry_type);

CREATE INDEX IF NOT EXISTS idx_pending_import_alerts_action_type
  ON pending_import_alerts (action_type);

-- GIN index cho JSONB red_list_entities (entity matching nhanh)
CREATE INDEX IF NOT EXISTS idx_pending_import_alerts_red_list
  ON pending_import_alerts USING GIN (red_list_entities);

CREATE INDEX IF NOT EXISTS idx_pending_import_alerts_created_at
  ON pending_import_alerts (created_at DESC);

-- ----------------------------------------------------------------
-- 2. Bảng fda_import_alert_fetch_log: log mỗi lần scrape
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fda_import_alert_fetch_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at          TIMESTAMPTZ DEFAULT NOW(),
  alerts_found    INT DEFAULT 0,
  alerts_new      INT DEFAULT 0,
  alerts_updated  INT DEFAULT 0,
  alerts_failed   INT DEFAULT 0,
  fetch_source    TEXT DEFAULT 'fda_import_alerts_scraper',
  duration_ms     INT,
  error           TEXT,
  details         JSONB
);

-- ----------------------------------------------------------------
-- 3. RLS: chỉ admin mới đọc/ghi được
-- ----------------------------------------------------------------
ALTER TABLE pending_import_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fda_import_alert_fetch_log ENABLE ROW LEVEL SECURITY;

-- Service role bypass (dùng cho admin client + pipeline)
CREATE POLICY "Service role bypass import_alerts"
  ON pending_import_alerts FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role bypass import_alert_logs"
  ON fda_import_alert_fetch_log FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Authenticated admin users xem được
CREATE POLICY "Admin read pending_import_alerts"
  ON pending_import_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin', 'expert')
    )
  );

CREATE POLICY "Admin read import_alert_fetch_log"
  ON fda_import_alert_fetch_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin', 'expert')
    )
  );

-- ----------------------------------------------------------------
-- 4. Function: match_import_alerts_by_entity
-- Tìm Import Alerts liên quan đến một tên công ty (fuzzy matching)
-- Dùng pg_trgm cho approximate string matching
-- ----------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION match_import_alerts_by_entity(
  p_company_name   TEXT,
  p_industry_type  TEXT  DEFAULT NULL,
  p_similarity     FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  id               UUID,
  alert_number     TEXT,
  alert_title      TEXT,
  industry_type    TEXT,
  reason_for_alert TEXT,
  action_type      TEXT,
  red_list_entities JSONB,
  effective_date   DATE,
  source_url       TEXT,
  match_score      FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ia.id,
    ia.alert_number,
    ia.alert_title,
    ia.industry_type,
    ia.reason_for_alert,
    ia.action_type,
    ia.red_list_entities,
    ia.effective_date,
    ia.source_url,
    -- Tính match score: similarity giữa tên công ty và tên trong red_list_entities
    COALESCE(
      (
        SELECT MAX(similarity(
          LOWER(p_company_name),
          LOWER(entity->>'name')
        ))
        FROM jsonb_array_elements(ia.red_list_entities) AS entity
        WHERE entity->>'name' IS NOT NULL
      ), 0.0
    )::FLOAT AS match_score
  FROM pending_import_alerts ia
  WHERE
    ia.status = 'approved'
    AND (p_industry_type IS NULL OR ia.industry_type = p_industry_type)
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(ia.red_list_entities) AS entity
      WHERE
        entity->>'name' IS NOT NULL
        AND similarity(LOWER(p_company_name), LOWER(entity->>'name')) >= p_similarity
    )
  ORDER BY match_score DESC;
END;
$$;

-- ----------------------------------------------------------------
-- 5. Function: search_import_alerts_by_reason
-- Tìm Import Alerts theo reason_for_alert (full-text search)
-- Dùng cho RAG Layer 4 khi không có company name cụ thể
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION search_import_alerts_by_reason(
  p_query         TEXT,
  p_industry_type TEXT  DEFAULT NULL,
  p_limit         INT   DEFAULT 2
)
RETURNS TABLE (
  id               UUID,
  alert_number     TEXT,
  alert_title      TEXT,
  industry_type    TEXT,
  reason_for_alert TEXT,
  action_type      TEXT,
  effective_date   DATE,
  source_url       TEXT,
  ts_rank          FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ia.id,
    ia.alert_number,
    ia.alert_title,
    ia.industry_type,
    ia.reason_for_alert,
    ia.action_type,
    ia.effective_date,
    ia.source_url,
    ts_rank(
      to_tsvector('english', COALESCE(ia.reason_for_alert, '') || ' ' || COALESCE(ia.extracted_content, '')),
      plainto_tsquery('english', p_query)
    )::FLOAT AS ts_rank
  FROM pending_import_alerts ia
  WHERE
    ia.status = 'approved'
    AND (p_industry_type IS NULL OR ia.industry_type = p_industry_type)
    AND to_tsvector('english',
      COALESCE(ia.reason_for_alert, '') || ' ' || COALESCE(ia.extracted_content, '')
    ) @@ plainto_tsquery('english', p_query)
  ORDER BY ts_rank DESC
  LIMIT p_limit;
END;
$$;

-- ----------------------------------------------------------------
-- 6. Seed dữ liệu mẫu: Các Import Alerts quan trọng với VN exporters
-- ----------------------------------------------------------------
INSERT INTO pending_import_alerts (
  alert_number, alert_title, industry_type, reason_for_alert, action_type,
  red_list_entities, effective_date, source_url, status, extracted_content
) VALUES
(
  '66-40',
  'Detention Without Physical Examination of Dietary Supplements and Conventional Foods That Are Adulterated With Undeclared Drugs and/or Undeclared Ingredients',
  'dietary-supplement',
  'Products adulterated with undeclared drugs, undeclared active pharmaceutical ingredients, or undeclared substances that may render the product adulterated under section 402(a)(2)(C) of the FD&C Act.',
  'DWPE',
  '[]'::jsonb,
  '1999-01-01',
  'https://www.accessdata.fda.gov/cms_api/import_alerts/alert_num.json?alert_num=66-40',
  'approved',
  'Import Alert 66-40: Detention of dietary supplements containing undeclared drugs or active pharmaceutical ingredients. Products subject to DWPE without physical examination. Companies can be removed from red list by providing documentation of CGMP compliance and lab testing showing no undeclared ingredients.'
),
(
  '99-33',
  'Detention Without Physical Examination of All Products from Firms in Vietnam Due to CGMP and Filth Violations',
  'food',
  'Products from certain Vietnamese firms detained due to Current Good Manufacturing Practice (CGMP) violations, filth, decomposition, or adulteration under 21 CFR Part 110/117.',
  'DWPE',
  '[]'::jsonb,
  '2006-01-01',
  'https://www.accessdata.fda.gov/cms_api/import_alerts/alert_num.json?alert_num=99-33',
  'approved',
  'Import Alert 99-33: Detention of food products from Vietnamese firms with CGMP violations or filth/decomposition issues. Affects shrimp, seafood, and other food products. Removal from red list requires facility inspection and corrective action documentation.'
),
(
  '45-02',
  'Detention Without Physical Examination of Human Foods Due to Filth, Decomposition, and Pesticide Contamination',
  'food',
  'Human foods detained due to filth, decomposition, or pesticide contamination exceeding FDA tolerance levels. Includes produce, processed foods, and beverages.',
  'DWPE',
  '[]'::jsonb,
  '1991-01-01',
  'https://www.accessdata.fda.gov/cms_api/import_alerts/alert_num.json?alert_num=45-02',
  'approved',
  'Import Alert 45-02: Detention of human food products containing pesticide residues above FDA/EPA tolerance levels, filth including insect contamination, or decomposition. Exporters must demonstrate compliance through laboratory analysis and corrective CGMP measures.'
),
(
  '54-15',
  'Detention Without Physical Examination of Cosmetics Due to Adulteration — Prohibited/Restricted Ingredients',
  'cosmetic',
  'Cosmetic products detained due to presence of prohibited or restricted ingredients including mercury compounds, chloroform, methylene chloride, and other substances prohibited under 21 CFR 700.',
  'DWPE',
  '[]'::jsonb,
  '2001-01-01',
  'https://www.accessdata.fda.gov/cms_api/import_alerts/alert_num.json?alert_num=54-15',
  'approved',
  'Import Alert 54-15: Detention of cosmetic products containing prohibited ingredients such as mercury (in skin-lightening products), chloroform, bithionol, chlorofluorocarbon propellants, and other restricted substances under 21 CFR 700.11-700.35.'
),
(
  '62-08',
  'Detention Without Physical Examination of Dietary Supplements and Related Products — CGMP Non-Compliance',
  'dietary-supplement',
  'Dietary supplements detained due to Current Good Manufacturing Practice (cGMP) violations under 21 CFR Part 111, including inadequate quality control, identity testing failures, and manufacturing process deficiencies.',
  'DWPE',
  '[]'::jsonb,
  '2008-06-25',
  'https://www.accessdata.fda.gov/cms_api/import_alerts/alert_num.json?alert_num=62-08',
  'approved',
  'Import Alert 62-08: Dietary supplement firms subject to DWPE for failure to comply with 21 CFR Part 111 CGMP regulations. Violations include: failure to establish specifications, failure to conduct required testing, inadequate batch production records, and identity testing failures.'
)
ON CONFLICT (alert_number) DO NOTHING;

-- ----------------------------------------------------------------
-- Done
-- ----------------------------------------------------------------
COMMENT ON TABLE pending_import_alerts IS
  'Staging bảng cho FDA Import Alerts thu thập bằng HTML scraping. Layer 4 trong RAG — dùng làm risk context, không dùng cho citations. Admin review trước khi status = approved.';

COMMENT ON TABLE fda_import_alert_fetch_log IS
  'Log mỗi lần pipeline scrape FDA Import Alerts.';

COMMENT ON FUNCTION match_import_alerts_by_entity IS
  'Fuzzy entity matching cho Import Alerts: tìm công ty trong red_list_entities bằng pg_trgm similarity.';

COMMENT ON FUNCTION search_import_alerts_by_reason IS
  'Full-text search Import Alerts theo reason_for_alert và extracted_content — dùng khi không có company name.';
