-- ============================================================
-- SCRIPT: Dọn dẹp toàn bộ dữ liệu labels và cache (Phiên bản an toàn)
-- CÔNG TY: Vexim Global - Hệ thống Compliance AI
-- Ghi chú: Sử dụng DELETE thay cho TRUNCATE để tránh lỗi RLS và Syntax
-- ============================================================

BEGIN; -- Bắt đầu giao dịch để đảm bảo an toàn dữ liệu

-- 1. Xóa dữ liệu hàng đợi phân tích
DELETE FROM analysis_queue;

-- 2. Xóa dữ liệu phản hồi người dùng (phải xóa trước vì có khóa ngoại)
DELETE FROM violation_user_feedback;

-- 3. Xóa các yêu cầu review của chuyên gia
DELETE FROM expert_review_requests;

-- 4. Xóa dữ liệu so sánh labels
DELETE FROM comparison_sessions;

-- 5. Xóa lịch sử phiên bản nhãn
DELETE FROM label_versions;

-- 6. Xóa log hành vi người dùng
DELETE FROM user_behavior_logs;

-- 7. Xóa bảng báo cáo chính (BẢNG QUAN TRỌNG NHẤT)
DELETE FROM audit_reports;

COMMIT; -- Xác nhận xóa vĩnh viễn

-- ============================================================
-- KIỂM TRA LẠI SỐ LƯỢNG (Nếu kết quả trả về toàn 0 là đã sạch)
-- ============================================================
SELECT 
    (SELECT COUNT(*) FROM audit_reports) as remaining_reports,
    (SELECT COUNT(*) FROM analysis_queue) as remaining_queue,
    'Hệ thống Vexim Global đã được dọn dẹp sạch sẽ!' AS message;