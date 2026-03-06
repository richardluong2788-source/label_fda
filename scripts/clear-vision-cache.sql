-- ============================================================
-- CLEAR AUDIT REPORTS (Supabase) — Run to force re-analysis
-- ============================================================
-- This deletes ALL audit_reports so the next upload re-runs
-- the Vision AI pipeline instead of serving cached results.
--
-- ⚠️  WARNING: This is irreversible. All existing audit results
--              will be permanently deleted.
-- ============================================================

-- 1. Show current count before deletion
SELECT COUNT(*) AS reports_before_deletion FROM audit_reports;

-- 2. Delete all reports (cascade to child tables if any)
DELETE FROM audit_reports;

-- 3. Confirm deletion
SELECT COUNT(*) AS reports_after_deletion FROM audit_reports;

SELECT 'Vision cache in Supabase cleared. Redis cache must be cleared separately via /api/admin/clear-cache.' AS message;
