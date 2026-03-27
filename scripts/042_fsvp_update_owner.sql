-- ============================================================================
-- Update FSVP Seed Data Owner
-- Run this script to assign all FSVP test data to a specific user
-- ============================================================================

-- Option 1: Update by email (recommended)
-- Replace 'your-email@example.com' with your actual email
DO $$
DECLARE
  v_target_user_id UUID;
  v_email TEXT := 'hocluongvan88@gmail.com';  -- <-- CHANGE THIS TO YOUR EMAIL
BEGIN
  -- Get user ID by email
  SELECT id INTO v_target_user_id 
  FROM auth.users 
  WHERE email = v_email
  LIMIT 1;
  
  IF v_target_user_id IS NULL THEN
    RAISE NOTICE 'No user found with email: %. Please check the email address.', v_email;
    RAISE NOTICE 'Available users:';
    FOR v_target_user_id IN SELECT id, email FROM auth.users LOOP
      RAISE NOTICE '  - %', v_target_user_id;
    END LOOP;
    RETURN;
  END IF;
  
  RAISE NOTICE 'Found user ID: % for email: %', v_target_user_id, v_email;
  
  -- Update all suppliers (has created_by, updated_by columns)
  UPDATE fsvp_suppliers 
  SET importer_user_id = v_target_user_id,
      created_by = v_target_user_id,
      updated_by = v_target_user_id
  WHERE importer_user_id IS NOT NULL OR importer_user_id IS NULL;
  RAISE NOTICE 'Updated % suppliers', (SELECT COUNT(*) FROM fsvp_suppliers WHERE importer_user_id = v_target_user_id);
  
  -- Update all hazard analyses (NO created_by/updated_by columns)
  UPDATE fsvp_hazard_analyses 
  SET importer_user_id = v_target_user_id
  WHERE importer_user_id IS NOT NULL OR importer_user_id IS NULL;
  RAISE NOTICE 'Updated % hazard analyses', (SELECT COUNT(*) FROM fsvp_hazard_analyses WHERE importer_user_id = v_target_user_id);
  
  -- Update all verification activities (has created_by column only)
  UPDATE fsvp_verification_activities 
  SET importer_user_id = v_target_user_id,
      created_by = v_target_user_id
  WHERE importer_user_id IS NOT NULL OR importer_user_id IS NULL;
  RAISE NOTICE 'Updated % verification activities', (SELECT COUNT(*) FROM fsvp_verification_activities WHERE importer_user_id = v_target_user_id);
  
  -- Update all documents (has created_by column only)
  UPDATE fsvp_documents 
  SET importer_user_id = v_target_user_id,
      created_by = v_target_user_id
  WHERE importer_user_id IS NOT NULL OR importer_user_id IS NULL;
  RAISE NOTICE 'Updated % documents', (SELECT COUNT(*) FROM fsvp_documents WHERE importer_user_id = v_target_user_id);
  
  RAISE NOTICE '====================================';
  RAISE NOTICE 'SUCCESS! All FSVP data now belongs to: %', v_email;
  RAISE NOTICE '====================================';
END $$;

-- Verify the update
SELECT 'Suppliers' as table_name, COUNT(*) as count FROM fsvp_suppliers
UNION ALL
SELECT 'Hazard Analyses', COUNT(*) FROM fsvp_hazard_analyses
UNION ALL
SELECT 'Verification Activities', COUNT(*) FROM fsvp_verification_activities
UNION ALL
SELECT 'Documents', COUNT(*) FROM fsvp_documents;
