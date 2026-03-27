-- ============================================================================
-- FSVP Seed Data for Testing
-- Run this after creating the FSVP tables (039_fsvp_integration.sql, 040_fsvp_documents.sql)
-- ============================================================================

-- NOTE: Replace 'YOUR_USER_ID' with your actual user ID from auth.users
-- You can get your user ID by running: SELECT id FROM auth.users LIMIT 1;

-- For testing without authentication, you can temporarily disable RLS:
-- ALTER TABLE fsvp_suppliers DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE fsvp_hazard_analyses DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE fsvp_verification_activities DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE fsvp_documents DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Insert Test Suppliers
-- ============================================================================
DO $$
DECLARE
  v_user_id UUID;
  v_supplier_1_id UUID;
  v_supplier_2_id UUID;
  v_supplier_3_id UUID;
  v_supplier_4_id UUID;
BEGIN
  -- Get the first user ID (for testing)
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No user found. Please create a user first or insert with a specific user_id.';
    RETURN;
  END IF;

  RAISE NOTICE 'Using user_id: %', v_user_id;

  -- Supplier 1: Vietnam Seafood (SAHCODHA risk)
  INSERT INTO fsvp_suppliers (
    id,
    importer_user_id,
    supplier_name,
    supplier_country,
    supplier_address,
    supplier_fei,
    supplier_duns,
    supplier_contact_name,
    supplier_contact_email,
    supplier_contact_phone,
    product_categories,
    primary_products,
    status,
    approval_date,
    last_verification_date,
    next_verification_due,
    is_sahcodha_risk,
    sahcodha_hazards,
    sahcodha_assessment_date,
    requires_annual_audit,
    last_onsite_audit_date,
    next_onsite_audit_due,
    created_by
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    'Vietnam Seafood Export Co., Ltd',
    'Vietnam',
    '123 Industrial Zone, Binh Duong Province, Vietnam',
    'VN-12345',
    '123456789',
    'Nguyen Van A',
    'contact@vn-seafood.com',
    '+84-28-1234-5678',
    ARRAY['seafood'],
    ARRAY['Frozen Shrimp', 'Pangasius Fillet', 'Squid'],
    'approved',
    NOW() - INTERVAL '6 months',
    NOW() - INTERVAL '2 months',
    NOW() + INTERVAL '4 months',
    TRUE,
    ARRAY['Vibrio', 'Histamine', 'Shellfish Allergen'],
    NOW() - INTERVAL '3 months',
    TRUE,
    NOW() - INTERVAL '8 months',
    NOW() + INTERVAL '4 months',
    v_user_id
  ) RETURNING id INTO v_supplier_1_id;

  -- Supplier 2: Thai Produce (approved)
  INSERT INTO fsvp_suppliers (
    id,
    importer_user_id,
    supplier_name,
    supplier_country,
    supplier_address,
    supplier_fei,
    supplier_duns,
    supplier_contact_name,
    supplier_contact_email,
    supplier_contact_phone,
    product_categories,
    primary_products,
    status,
    approval_date,
    last_verification_date,
    next_verification_due,
    is_sahcodha_risk,
    created_by
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    'Thai Fresh Produce Ltd',
    'Thailand',
    '456 Export Zone, Bangkok, Thailand',
    'TH-67890',
    '987654321',
    'Somchai Patel',
    'export@thaifresh.co.th',
    '+66-2-987-6543',
    ARRAY['produce', 'fruits'],
    ARRAY['Mango', 'Durian', 'Coconut', 'Lychee'],
    'approved',
    NOW() - INTERVAL '1 year',
    NOW() - INTERVAL '1 month',
    NOW() + INTERVAL '11 months',
    FALSE,
    v_user_id
  ) RETURNING id INTO v_supplier_2_id;

  -- Supplier 3: India Spices (pending review)
  INSERT INTO fsvp_suppliers (
    id,
    importer_user_id,
    supplier_name,
    supplier_country,
    supplier_address,
    supplier_fei,
    supplier_contact_name,
    supplier_contact_email,
    product_categories,
    primary_products,
    status,
    is_sahcodha_risk,
    created_by
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    'Kerala Spice Exporters',
    'India',
    '789 Spice Road, Kochi, Kerala, India',
    'IN-11111',
    'Ravi Kumar',
    'sales@keralaspice.in',
    ARRAY['spices', 'herbs'],
    ARRAY['Black Pepper', 'Cardamom', 'Turmeric', 'Cinnamon'],
    'pending_review',
    FALSE,
    v_user_id
  ) RETURNING id INTO v_supplier_3_id;

  -- Supplier 4: Mexico Dairy (conditionally approved)
  INSERT INTO fsvp_suppliers (
    id,
    importer_user_id,
    supplier_name,
    supplier_country,
    supplier_address,
    supplier_fei,
    supplier_duns,
    supplier_contact_name,
    supplier_contact_email,
    product_categories,
    primary_products,
    status,
    approval_date,
    last_verification_date,
    next_verification_due,
    is_sahcodha_risk,
    sahcodha_hazards,
    requires_annual_audit,
    created_by
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    'Lacteos del Norte S.A.',
    'Mexico',
    '321 Dairy Park, Monterrey, NL, Mexico',
    'MX-22222',
    '555444333',
    'Maria Garcia',
    'export@lacteosdn.mx',
    ARRAY['dairy'],
    ARRAY['Queso Fresco', 'Crema', 'Queso Oaxaca'],
    'conditionally_approved',
    NOW() - INTERVAL '3 months',
    NOW() - INTERVAL '1 month',
    NOW() + INTERVAL '5 months',
    TRUE,
    ARRAY['Listeria monocytogenes', 'Salmonella'],
    TRUE,
    v_user_id
  ) RETURNING id INTO v_supplier_4_id;

  -- ============================================================================
  -- Insert Hazard Analyses
  -- ============================================================================
  
  -- Hazard Analysis for Frozen Shrimp
  INSERT INTO fsvp_hazard_analyses (
    supplier_id,
    importer_user_id,
    product_name,
    product_category,
    product_description,
    known_hazards,
    biological_hazards,
    chemical_hazards,
    physical_hazards,
    is_sahcodha_product,
    sahcodha_justification,
    control_measures,
    supplier_controls,
    analysis_date,
    analyzed_by,
    qualified_individual_credentials,
    status
  ) VALUES (
    v_supplier_1_id,
    v_user_id,
    'Frozen Shrimp',
    'Seafood',
    'Raw, head-on, shell-on frozen shrimp from aquaculture farms',
    '[{"name": "Shellfish Allergen", "type": "allergen", "severity": "high"}]'::JSONB,
    '[
      {"name": "Vibrio parahaemolyticus", "severity": "high", "likelihood": "medium", "control": "Cooking to 145°F"},
      {"name": "Vibrio vulnificus", "severity": "high", "likelihood": "low", "control": "Cold chain maintenance"},
      {"name": "Salmonella", "severity": "high", "likelihood": "low", "control": "Supplier controls, testing"}
    ]'::JSONB,
    '[
      {"name": "Sulfite residues", "severity": "medium", "likelihood": "low", "control": "Supplier testing, label declaration"},
      {"name": "Antibiotic residues", "severity": "medium", "likelihood": "low", "control": "Testing program"}
    ]'::JSONB,
    '[
      {"name": "Metal fragments", "severity": "high", "likelihood": "low", "control": "Metal detection"}
    ]'::JSONB,
    TRUE,
    'Product requires cooking to eliminate biological hazards; contains major allergen (shellfish)',
    '[
      {"measure": "Cold chain management", "frequency": "Continuous", "responsible": "Logistics"},
      {"measure": "Metal detection", "frequency": "Each batch", "responsible": "QC"},
      {"measure": "Microbiological testing", "frequency": "Monthly", "responsible": "Lab"}
    ]'::JSONB,
    '{"haccp_plan": true, "fssc_22000": true, "third_party_audited": true}'::JSONB,
    NOW() - INTERVAL '3 months',
    'Dr. John Smith',
    'PhD Food Science, PCQI Certified, SQF Practitioner',
    'active'
  );

  -- Hazard Analysis for Mango
  INSERT INTO fsvp_hazard_analyses (
    supplier_id,
    importer_user_id,
    product_name,
    product_category,
    product_description,
    biological_hazards,
    chemical_hazards,
    is_sahcodha_product,
    analysis_date,
    analyzed_by,
    qualified_individual_credentials,
    status
  ) VALUES (
    v_supplier_2_id,
    v_user_id,
    'Fresh Mango',
    'Produce',
    'Fresh mangoes for direct consumption',
    '[
      {"name": "Salmonella", "severity": "high", "likelihood": "low", "control": "GAP compliance"},
      {"name": "E. coli O157:H7", "severity": "high", "likelihood": "low", "control": "Washing, sanitation"}
    ]'::JSONB,
    '[
      {"name": "Pesticide residues", "severity": "medium", "likelihood": "low", "control": "Testing, supplier certification"}
    ]'::JSONB,
    FALSE,
    NOW() - INTERVAL '2 months',
    'Jane Doe, MS',
    'MS Food Safety, HACCP Certified',
    'active'
  );

  -- Hazard Analysis for Queso Fresco (SAHCODHA)
  INSERT INTO fsvp_hazard_analyses (
    supplier_id,
    importer_user_id,
    product_name,
    product_category,
    product_description,
    biological_hazards,
    is_sahcodha_product,
    sahcodha_justification,
    control_measures,
    analysis_date,
    analyzed_by,
    qualified_individual_credentials,
    status
  ) VALUES (
    v_supplier_4_id,
    v_user_id,
    'Queso Fresco',
    'Dairy',
    'Fresh Mexican-style cheese, ready-to-eat',
    '[
      {"name": "Listeria monocytogenes", "severity": "high", "likelihood": "medium", "control": "Temperature control, testing"},
      {"name": "Salmonella", "severity": "high", "likelihood": "low", "control": "Pasteurization verification"},
      {"name": "E. coli O157:H7", "severity": "high", "likelihood": "low", "control": "Pasteurization verification"}
    ]'::JSONB,
    TRUE,
    'Ready-to-eat dairy product with known Listeria risk - classified as SAHCODHA per 21 CFR 1.506(d)',
    '[
      {"measure": "Pasteurization verification", "frequency": "Each batch", "responsible": "QC"},
      {"measure": "Environmental monitoring for Listeria", "frequency": "Weekly", "responsible": "QC"},
      {"measure": "Product testing", "frequency": "Monthly", "responsible": "Lab"},
      {"measure": "Cold chain verification", "frequency": "Continuous", "responsible": "Logistics"}
    ]'::JSONB,
    NOW() - INTERVAL '1 month',
    'Dr. Maria Santos',
    'DVM, PCQI Certified, Dairy Safety Specialist',
    'active'
  );

  -- ============================================================================
  -- Insert Verification Activities
  -- ============================================================================
  
  -- Third-party audit for Vietnam Seafood
  INSERT INTO fsvp_verification_activities (
    supplier_id,
    importer_user_id,
    activity_type,
    activity_date,
    conducted_by,
    findings,
    result,
    notes
  ) VALUES (
    v_supplier_1_id,
    v_user_id,
    'third_party_audit',
    NOW() - INTERVAL '2 months',
    'SGS Vietnam',
    '{
      "score": 92,
      "rating": "A",
      "non_conformances": 2,
      "critical_findings": 0,
      "observations": [
        "Minor: Documentation update needed for allergen control plan",
        "Minor: Training records incomplete for 2 new employees"
      ]
    }'::JSONB,
    'passed',
    'Annual FSSC 22000 surveillance audit completed successfully'
  );

  -- Sampling/testing for Vietnam Seafood
  INSERT INTO fsvp_verification_activities (
    supplier_id,
    importer_user_id,
    activity_type,
    activity_date,
    conducted_by,
    findings,
    result
  ) VALUES (
    v_supplier_1_id,
    v_user_id,
    'sampling_testing',
    NOW() - INTERVAL '3 weeks',
    'FDA-accredited Lab',
    '{
      "test_type": "Microbiological",
      "samples_tested": 5,
      "tests_performed": ["Salmonella", "Vibrio", "Listeria"],
      "results": "All negative",
      "lot_numbers": ["SH-2025-001", "SH-2025-002", "SH-2025-003"]
    }'::JSONB,
    'passed'
  );

  -- Document review for Thai Produce
  INSERT INTO fsvp_verification_activities (
    supplier_id,
    importer_user_id,
    activity_type,
    activity_date,
    conducted_by,
    findings,
    result
  ) VALUES (
    v_supplier_2_id,
    v_user_id,
    'document_review',
    NOW() - INTERVAL '1 month',
    'Internal QA Team',
    '{
      "documents_reviewed": ["HACCP Plan", "GAP Certificate", "Pesticide Testing Results"],
      "compliance_status": "Compliant",
      "notes": "All documents current and valid"
    }'::JSONB,
    'passed'
  );

  -- Annual onsite audit for Mexico Dairy (SAHCODHA requirement)
  INSERT INTO fsvp_verification_activities (
    supplier_id,
    importer_user_id,
    activity_type,
    activity_date,
    conducted_by,
    findings,
    result,
    requires_followup,
    followup_due_date,
    notes
  ) VALUES (
    v_supplier_4_id,
    v_user_id,
    'annual_onsite_audit',
    NOW() - INTERVAL '1 month',
    'Bureau Veritas Mexico',
    '{
      "score": 85,
      "rating": "B",
      "non_conformances": 4,
      "critical_findings": 1,
      "major_findings": [
        "Environmental monitoring program needs enhancement for Listeria"
      ],
      "minor_findings": [
        "Temperature log gaps identified",
        "Employee training documentation incomplete"
      ],
      "corrective_actions_required": true
    }'::JSONB,
    'passed_with_conditions',
    TRUE,
    NOW() + INTERVAL '30 days',
    'SAHCODHA annual audit - corrective actions required within 30 days'
  );

  -- ============================================================================
  -- Insert Documents
  -- ============================================================================
  
  -- FSSC 22000 Certificate for Vietnam Seafood
  INSERT INTO fsvp_documents (
    importer_user_id,
    supplier_id,
    document_type,
    document_name,
    description,
    upload_date,
    expiry_date,
    status,
    version,
    notes
  ) VALUES (
    v_user_id,
    v_supplier_1_id,
    'certificate',
    'FSSC 22000 Certificate',
    'Food Safety System Certification for Vietnam Seafood Export Co.',
    NOW() - INTERVAL '6 months',
    NOW() + INTERVAL '6 months',
    'valid',
    '5.1',
    'Annual surveillance audit passed'
  );

  -- HACCP Certification
  INSERT INTO fsvp_documents (
    importer_user_id,
    supplier_id,
    document_type,
    document_name,
    upload_date,
    expiry_date,
    status
  ) VALUES (
    v_user_id,
    v_supplier_1_id,
    'certificate',
    'HACCP Certification',
    NOW() - INTERVAL '5 months',
    NOW() + INTERVAL '7 months',
    'valid'
  );

  -- Third-Party Audit Report
  INSERT INTO fsvp_documents (
    importer_user_id,
    supplier_id,
    document_type,
    document_name,
    description,
    upload_date,
    status
  ) VALUES (
    v_user_id,
    v_supplier_1_id,
    'audit_report',
    'Third-Party Audit Report 2025',
    'Annual GFSI audit report by SGS',
    NOW() - INTERVAL '2 months',
    'valid'
  );

  -- ISO 22000 Certificate (expired)
  INSERT INTO fsvp_documents (
    importer_user_id,
    supplier_id,
    document_type,
    document_name,
    upload_date,
    expiry_date,
    status
  ) VALUES (
    v_user_id,
    v_supplier_2_id,
    'certificate',
    'ISO 22000 Certificate',
    NOW() - INTERVAL '14 months',
    NOW() - INTERVAL '2 months',
    'expired'
  );

  -- Microbiological Testing Report
  INSERT INTO fsvp_documents (
    importer_user_id,
    supplier_id,
    document_type,
    document_name,
    upload_date,
    status
  ) VALUES (
    v_user_id,
    v_supplier_1_id,
    'test_report',
    'Microbiological Testing Report Q4 2025',
    NOW() - INTERVAL '3 weeks',
    'valid'
  );

  -- HACCP Plan (pending review)
  INSERT INTO fsvp_documents (
    importer_user_id,
    supplier_id,
    document_type,
    document_name,
    description,
    upload_date,
    status,
    notes
  ) VALUES (
    v_user_id,
    v_supplier_1_id,
    'haccp_plan',
    'Frozen Seafood HACCP Plan',
    'Updated HACCP plan for shrimp processing line',
    NOW() - INTERVAL '1 week',
    'pending_review',
    'Awaiting QI review and approval'
  );

  -- GAP Certificate for Thai Produce
  INSERT INTO fsvp_documents (
    importer_user_id,
    supplier_id,
    document_type,
    document_name,
    upload_date,
    expiry_date,
    status
  ) VALUES (
    v_user_id,
    v_supplier_2_id,
    'certificate',
    'GlobalGAP Certificate',
    NOW() - INTERVAL '4 months',
    NOW() + INTERVAL '8 months',
    'valid'
  );

  -- Letter of Guarantee
  INSERT INTO fsvp_documents (
    importer_user_id,
    supplier_id,
    document_type,
    document_name,
    upload_date,
    status
  ) VALUES (
    v_user_id,
    v_supplier_4_id,
    'letter_of_guarantee',
    'Food Safety Letter of Guarantee',
    NOW() - INTERVAL '3 months',
    'valid'
  );

  -- Product Specification Sheet
  INSERT INTO fsvp_documents (
    importer_user_id,
    supplier_id,
    document_type,
    document_name,
    upload_date,
    status,
    version
  ) VALUES (
    v_user_id,
    v_supplier_4_id,
    'specification_sheet',
    'Queso Fresco Product Specification',
    NOW() - INTERVAL '2 months',
    'valid',
    '2.3'
  );

  -- SOP Document
  INSERT INTO fsvp_documents (
    importer_user_id,
    supplier_id,
    document_type,
    document_name,
    upload_date,
    status
  ) VALUES (
    v_user_id,
    v_supplier_4_id,
    'sop',
    'Listeria Control SOP',
    NOW() - INTERVAL '1 month',
    'pending_review'
  );

  RAISE NOTICE 'Seed data inserted successfully!';
  RAISE NOTICE 'Supplier 1 (Vietnam Seafood): %', v_supplier_1_id;
  RAISE NOTICE 'Supplier 2 (Thai Produce): %', v_supplier_2_id;
  RAISE NOTICE 'Supplier 3 (India Spices): %', v_supplier_3_id;
  RAISE NOTICE 'Supplier 4 (Mexico Dairy): %', v_supplier_4_id;

END $$;
