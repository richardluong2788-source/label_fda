# 🗄️ Hướng dẫn thiết lập Database - Vexim Compliance AI

## Vấn đề hiện tại
Hệ thống báo lỗi: `Could not find the 'label_image_url' column` vì database schema chưa đầy đủ.

## ✅ Giải pháp: Chạy SQL trong Supabase SQL Editor

### Bước 1: Truy cập SQL Editor
1. Mở Supabase Dashboard: https://supabase.com/dashboard
2. Chọn project của bạn
3. Vào **SQL Editor** (icon ở sidebar bên trái)
4. Click **New query**

### Bước 2: Copy và chạy SQL sau

```sql
-- ============================================
-- VEXIM COMPLIANCE AI - DATABASE MIGRATION
-- Thêm tất cả các cột còn thiếu
-- ============================================

-- Thêm các cột mới vào audit_reports
ALTER TABLE public.audit_reports 
  ADD COLUMN IF NOT EXISTS label_image_url TEXT,
  ADD COLUMN IF NOT EXISTS overall_result TEXT CHECK (overall_result IN ('pass', 'warning', 'fail')),
  ADD COLUMN IF NOT EXISTS violations JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_step TEXT,
  ADD COLUMN IF NOT EXISTS needs_expert_review BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_notes TEXT,
  ADD COLUMN IF NOT EXISTS citation_count INTEGER DEFAULT 0;

-- Thêm các cột version control
ALTER TABLE public.audit_reports
  ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parent_report_id UUID REFERENCES public.audit_reports(id),
  ADD COLUMN IF NOT EXISTS is_latest_version BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS version_notes TEXT;

-- Thêm các cột phân tích nâng cao
ALTER TABLE public.audit_reports
  ADD COLUMN IF NOT EXISTS geometry_violations JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS contrast_violations JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS claim_violations JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS multilanguage_issues JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS required_disclaimers JSONB DEFAULT '[]';

-- Thêm các cột kích thước
ALTER TABLE public.audit_reports
  ADD COLUMN IF NOT EXISTS pixels_per_inch NUMERIC,
  ADD COLUMN IF NOT EXISTS pdp_area_square_inches NUMERIC,
  ADD COLUMN IF NOT EXISTS physical_width_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS physical_height_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS pixel_width INTEGER,
  ADD COLUMN IF NOT EXISTS pixel_height INTEGER;

-- Thêm các cột phân loại sản phẩm
ALTER TABLE public.audit_reports
  ADD COLUMN IF NOT EXISTS product_category TEXT,
  ADD COLUMN IF NOT EXISTS product_sub_category TEXT,
  ADD COLUMN IF NOT EXISTS has_foreign_language BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS foreign_language TEXT;

-- Cập nhật constraint cho status
ALTER TABLE public.audit_reports 
  DROP CONSTRAINT IF EXISTS audit_reports_status_check;

ALTER TABLE public.audit_reports
  ADD CONSTRAINT audit_reports_status_check 
  CHECK (status IN ('pending', 'processing', 'ai_completed', 'verified', 'rejected', 'error'));

-- Tạo indexes cho performance
CREATE INDEX IF NOT EXISTS idx_audit_reports_user_id 
  ON public.audit_reports(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_reports_status 
  ON public.audit_reports(status);

CREATE INDEX IF NOT EXISTS idx_audit_reports_needs_review 
  ON public.audit_reports(needs_expert_review) 
  WHERE needs_expert_review = true;

-- Tạo bảng admin_users nếu chưa có
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('expert', 'admin', 'superadmin')),
  can_review BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS cho admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- RLS policies cho admin_users (đơn giản hóa để tránh đệ quy)
DROP POLICY IF EXISTS admin_users_select ON public.admin_users;
DROP POLICY IF EXISTS admin_users_modify ON public.admin_users;

CREATE POLICY admin_users_select 
  ON public.admin_users FOR SELECT 
  TO authenticated 
  USING (true);

-- Chỉ service role mới được modify (tránh đệ quy)
CREATE POLICY admin_users_modify 
  ON public.admin_users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Tạo bảng label_versions nếu chưa có
CREATE TABLE IF NOT EXISTS public.label_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_report_id UUID NOT NULL REFERENCES public.audit_reports(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  label_image_url TEXT NOT NULL,
  status TEXT NOT NULL,
  overall_result TEXT CHECK (overall_result IN ('pass', 'warning', 'fail')),
  findings JSONB DEFAULT '[]',
  geometry_violations JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  version_notes TEXT,
  changes_summary JSONB DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE public.label_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY label_versions_select_own
  ON public.label_versions FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR 
    original_report_id IN (
      SELECT id FROM public.audit_reports WHERE user_id = auth.uid()
    )
  );

-- Tạo bảng comparison_sessions
CREATE TABLE IF NOT EXISTS public.comparison_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_report_id UUID NOT NULL REFERENCES public.audit_reports(id) ON DELETE CASCADE,
  version_a_id UUID NOT NULL REFERENCES public.label_versions(id) ON DELETE CASCADE,
  version_b_id UUID NOT NULL REFERENCES public.label_versions(id) ON DELETE CASCADE,
  compared_by UUID NOT NULL REFERENCES auth.users(id),
  comparison_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.comparison_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY comparison_sessions_select_own
  ON public.comparison_sessions FOR SELECT
  TO authenticated
  USING (compared_by = auth.uid());
```

### Bước 3: Chạy SQL
1. Click nút **Run** (hoặc nhấn Ctrl/Cmd + Enter)
2. Đợi khoảng 5-10 giây
3. Kiểm tra kết quả - phải thấy "Success. No rows returned"

### Bước 4: Xác nhận
Chạy query sau để kiểm tra:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'audit_reports' 
ORDER BY ordinal_position;
```

Bạn phải thấy các cột sau:
- ✅ label_image_url
- ✅ overall_result  
- ✅ violations
- ✅ product_category
- ✅ physical_width_cm
- ✅ needs_expert_review
- ... và nhiều cột khác

### Bước 5: Grant quyền admin
Chạy SQL này để cấp quyền superadmin cho tài khoản của bạn:

```sql
INSERT INTO public.admin_users (user_id, role, can_review)
VALUES ('2e89bd83-6c7b-43c1-9df6-323688d73519', 'superadmin', true)
ON CONFLICT (user_id) 
DO UPDATE SET role = 'superadmin', can_review = true;
```

## 🎉 Hoàn thành!
Sau khi chạy xong, refresh lại trang web và lỗi sẽ biến mất.

## ⚠️ Nếu vẫn gặp lỗi
- Kiểm tra RLS policies có đang block không
- Xem logs tại **Logs > Postgres Logs** trong Supabase Dashboard
- Liên hệ support nếu cần thiểu
