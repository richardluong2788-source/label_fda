# 🚀 Migration & Setup Guide - Vexim Compliance AI

> **Hướng dẫn đầy đủ để setup Vexim trên database/server mới**

---

## 📋 Tổng quan

Khi chuyển sang server mới hoặc setup môi trường mới (staging, production), bạn cần chạy các scripts SQL theo đúng thứ tự để:
1. Tạo tables và relationships
2. Setup RLS (Row Level Security) policies
3. Tạo storage buckets
4. Cấp quyền cho admin

---

## 🗂️ Scripts SQL cần chạy (theo thứ tự)

### 1️⃣ **001_create_tables.sql**
**Mục đích**: Tạo các bảng chính của hệ thống

**Bảng được tạo**:
- `admin_users` - Quản lý admin users
- `audit_reports` - Lưu reports kiểm tra nhãn
- `compliance_knowledge` - Knowledge Base với vector embeddings
- `expert_reviews` - Expert feedback trên reports

**Chạy**: Supabase Dashboard → SQL Editor → Copy & paste script → Run

---

### 2️⃣ **002_add_expert_review.sql**
**Mục đích**: Thêm chức năng expert review workflow

**Tính năng**:
- Reviewer assignments
- Review status tracking
- Review notes và feedback

---

### 3️⃣ **003_add_version_control.sql**
**Mục đích**: Version control cho audit reports

**Tính năng**:
- Track changes qua các versions
- Compare versions
- Restore previous versions

---

### 4️⃣ **004_add_advanced_features.sql**
**Mục đích**: Các tính năng nâng cao

**Tính năng**:
- Multi-language support
- Advanced search
- Analytics tracking

---

### 5️⃣ **005_vector_search_function.sql**
**Mục đích**: Tạo function để search trong Knowledge Base

**Function**: `match_compliance_knowledge()`
- Input: query_embedding (vector), match_threshold (float), match_count (int)
- Output: Danh sách regulations có similarity cao nhất

**QUAN TRỌNG**: Cần enable extension `pgvector` trước:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

### 6️⃣ **006_grant_admin.sql** hoặc **006_grant_admin_user.sql**
**Mục đích**: Cấp quyền admin cho user đầu tiên

**Cách dùng**:
1. User đăng ký tài khoản qua `/auth/sign-up`
2. Lấy `user_id` từ Supabase Auth → Users
3. Chạy script với `user_id` đó:

```sql
-- Thay YOUR_USER_ID bằng UUID thực tế
INSERT INTO public.admin_users (user_id, role, granted_at)
VALUES ('YOUR_USER_ID', 'admin', NOW())
ON CONFLICT (user_id) DO NOTHING;
```

---

### 7️⃣ **007_fix_admin_rls.sql**
**Mục đích**: Fix Row Level Security policies

**RLS Policies được tạo**:
- Admin có thể SELECT/INSERT/UPDATE/DELETE trên `audit_reports`
- Admin có thể SELECT/INSERT/UPDATE/DELETE trên `expert_reviews`
- Admin có thể SELECT/INSERT/UPDATE trên `admin_users`

---

### 8️⃣ **008_create_storage_bucket.sql**
**Mục đích**: Tạo storage bucket cho ảnh nhãn

**Bucket**: `label-images`
- Public access cho đọc
- Authenticated users có thể upload vào folder riêng của họ
- Max file size: 50MB

**RLS Policies**:
```sql
-- User có thể upload vào folder của chính họ: {user_id}/*
-- User chỉ đọc được file của chính họ
-- Admin có thể đọc tất cả
```

---

### 9️⃣ **009_add_missing_columns.sql**
**Mục đích**: Thêm các cột còn thiếu vào bảng `audit_reports`

**Columns added**:
- `physical_width_cm`, `physical_height_cm` - Kích thước vật lý nhãn
- `product_category` - Phân loại sản phẩm
- `has_foreign_language`, `foreign_language` - Multi-language support

---

### 🔟 **010_fix_audit_reports_schema.sql**
**Mục đích**: Fix schema của `audit_reports` để match với API

**Changes**:
- Update column types
- Add constraints
- Fix default values

---

### 1️⃣1️⃣ **011_add_bulk_import_storage_security.sql** (MỚI - Feb 2026)
**Mục đích**: RLS cho bulk import functionality

**Policies được tạo**:

#### A. Storage Policies (bucket: `label-images`)
```sql
-- Admin có thể upload vào folder bulk-imports/
CREATE POLICY "Admin can upload to bulk-imports folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'label-images' 
  AND (storage.foldername(name))[1] = 'bulk-imports'
  AND EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
);

-- Admin có thể đọc từ folder bulk-imports/
CREATE POLICY "Admin can read bulk-imports folder"
ON storage.objects FOR SELECT
USING (...);

-- Admin có thể xóa từ folder bulk-imports/
CREATE POLICY "Admin can delete bulk-imports folder"
ON storage.objects FOR DELETE
USING (...);
```

#### B. Knowledge Base Policies (table: `compliance_knowledge`)
```sql
-- Admin có thể INSERT vào Knowledge Base
CREATE POLICY "Admin can insert knowledge base entries"
ON compliance_knowledge FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
);

-- Admin có thể UPDATE Knowledge Base
CREATE POLICY "Admin can update knowledge base entries"
ON compliance_knowledge FOR UPDATE
USING (...) WITH CHECK (...);

-- Admin có thể DELETE từ Knowledge Base
CREATE POLICY "Admin can delete knowledge base entries"
ON compliance_knowledge FOR DELETE
USING (...);
```

---

## 🔐 Environment Variables cần thiết

Khi chuyển sang server mới, đảm bảo set các biến môi trường sau:

### Supabase
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### OpenAI (cho AI Analysis)
```bash
OPENAI_API_KEY=sk-proj-...
```

### Vercel (optional, cho Cron Jobs)
```bash
CRON_SECRET=your-random-secret-string
```

---

## ✅ Checklist Migration

Khi setup database mới, làm theo checklist sau:

### Phase 1: Database Setup
- [ ] Tạo Supabase project mới
- [ ] Enable extension `pgvector`:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```
- [ ] Chạy script 001 → 010 theo thứ tự
- [ ] Verify tables được tạo:
  ```sql
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public';
  ```

### Phase 2: Storage Setup
- [ ] Chạy script 008 để tạo bucket `label-images`
- [ ] Verify bucket tồn tại: Supabase Dashboard → Storage
- [ ] Test upload 1 file thử vào bucket

### Phase 3: Admin User Setup
- [ ] Đăng ký 1 tài khoản admin qua app UI (`/auth/sign-up`)
- [ ] Lấy `user_id` từ Supabase Auth
- [ ] Chạy script 006 với `user_id` đó
- [ ] Verify: 
  ```sql
  SELECT * FROM admin_users;
  ```
- [ ] Login lại và verify có quyền admin (badge SUPERADMIN xuất hiện)

### Phase 4: RLS Policies
- [ ] Chạy script 007 (fix admin RLS)
- [ ] Chạy script 011 (bulk import RLS) ⭐ **QUAN TRỌNG**
- [ ] Verify policies:
  ```sql
  -- Check storage policies
  SELECT policyname, cmd FROM pg_policies 
  WHERE schemaname = 'storage' AND tablename = 'objects';
  
  -- Check compliance_knowledge policies
  SELECT policyname, cmd FROM pg_policies 
  WHERE tablename = 'compliance_knowledge';
  ```

### Phase 5: Knowledge Base Import
- [ ] Truy cập `/admin/knowledge/bulk-import`
- [ ] Upload file JSON 21 CFR Part 101 (18MB)
- [ ] Verify import thành công (check logs trong UI)
- [ ] Verify data:
  ```sql
  SELECT COUNT(*), source FROM compliance_knowledge 
  GROUP BY source;
  ```

### Phase 6: Testing
- [ ] Test upload nhãn bằng user thường
- [ ] Test AI analysis với nhãn mẫu
- [ ] Verify RAG citations có xuất hiện trong violations
- [ ] Test expert review workflow (admin approve/reject)
- [ ] Test multi-language detection
- [ ] Test color contrast analysis

---

## 🛠️ Troubleshooting

### Lỗi: "new row violates row-level security policy"

**Nguyên nhân**: RLS policies chưa được tạo hoặc user không có quyền

**Fix**:
1. Kiểm tra user có trong `admin_users`:
   ```sql
   SELECT * FROM admin_users WHERE user_id = auth.uid();
   ```
2. Nếu không có, chạy script 006 để grant admin
3. Kiểm tra policies đã được tạo:
   ```sql
   SELECT policyname FROM pg_policies WHERE tablename = 'your_table';
   ```
4. Nếu thiếu policies, chạy lại script 007 và 011

---

### Lỗi: "relation does not exist"

**Nguyên nhân**: Bảng chưa được tạo hoặc tên bảng sai

**Fix**:
1. Chạy lại scripts 001-005 theo thứ tự
2. Verify tables tồn tại:
   ```sql
   \dt public.*
   ```

---

### Lỗi: "function match_compliance_knowledge does not exist"

**Nguyên nhân**: Vector search function chưa được tạo

**Fix**:
1. Enable extension pgvector:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
2. Chạy lại script 005

---

### Lỗi: "413 Request Entity Too Large" khi upload bulk import

**Nguyên nhân**: File quá lớn để upload qua API

**Fix**: 
- Code đã được fix để upload trực tiếp từ client lên Supabase Storage
- Ensure bucket `label-images` có RLS policies cho folder `bulk-imports/`
- Check script 011 đã được chạy

---

## 📊 Verify Setup thành công

Sau khi chạy hết các scripts, verify bằng các queries sau:

```sql
-- 1. Check tables
SELECT COUNT(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'public';
-- Expected: ~10 tables

-- 2. Check admin users
SELECT user_id, role, granted_at 
FROM admin_users;
-- Expected: Có ít nhất 1 admin

-- 3. Check storage bucket
SELECT name FROM storage.buckets;
-- Expected: label-images

-- 4. Check RLS policies count
SELECT tablename, COUNT(*) as policy_count 
FROM pg_policies 
WHERE schemaname IN ('public', 'storage')
GROUP BY tablename;
-- Expected: Mỗi bảng có 2-5 policies

-- 5. Check Knowledge Base có data chưa
SELECT COUNT(*), source 
FROM compliance_knowledge 
GROUP BY source;
-- Expected: Sau khi import sẽ có data
```

---

## 🔄 Cron Jobs Setup (Vercel)

File `vercel.json` đã được config sẵn:

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-bulk-imports",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Schedule**: Chạy mỗi ngày lúc 2:00 AM UTC

**Function**: Xóa các file tạm trong `bulk-imports/` folder sau 24h

**Verify**: Sau khi deploy, check Vercel Dashboard → Cron Jobs

---

## 📝 Notes quan trọng

1. **Luôn chạy scripts theo thứ tự 001 → 011**
2. **Backup database trước khi chạy scripts trên production**
3. **Test trên staging environment trước**
4. **Document lại user_id của admin đầu tiên**
5. **Keep OpenAI API key bảo mật, không commit vào Git**
6. **Enable pgvector extension TRƯỚC khi chạy script 005**
7. **RLS policies rất quan trọng - không skip script 007 và 011**

---

## 🆘 Support

Nếu gặp vấn đề:
1. Check console logs với prefix `[v0]`
2. Check Supabase logs: Dashboard → Logs → SQL Logs
3. Verify RLS policies với queries ở trên
4. Check environment variables đã set đúng chưa

---

**Last Updated**: Feb 2026 (v1.1 - RAG Enhanced)
