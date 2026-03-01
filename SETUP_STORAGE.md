# Hướng dẫn tạo Storage Bucket trong Supabase

## Lỗi: "Bucket not found"

Lỗi này xảy ra vì Storage Bucket chưa được tạo trong Supabase. Làm theo các bước sau để khắc phục:

## Bước 1: Truy cập Supabase Dashboard

1. Đăng nhập vào https://supabase.com
2. Chọn project của bạn
3. Vào mục **Storage** ở sidebar bên trái

## Bước 2: Tạo Bucket mới

1. Nhấn nút **"New bucket"**
2. Điền thông tin:
   - **Name**: `label-images` (phải đúng tên này)
   - **Public bucket**: ✅ Bật (checked)
   - **File size limit**: 50MB (hoặc tùy chọn)
   - **Allowed MIME types**: `image/*`
3. Nhấn **"Create bucket"**

## Bước 3: Cấu hình RLS Policies

Sau khi tạo bucket, cần thêm policies để cho phép users upload:

### 3.1. Policy cho Upload (INSERT)

1. Vào bucket `label-images` vừa tạo
2. Chọn tab **Policies**
3. Nhấn **"New Policy"** → **"For full customization"**
4. Điền:
   - **Policy name**: `Users can upload label images`
   - **Allowed operation**: `INSERT`
   - **Target roles**: `authenticated`
   - **USING expression**: Để trống
   - **WITH CHECK expression**:
     ```sql
     bucket_id = 'label-images' AND
     (storage.foldername(name))[1] = auth.uid()::text
     ```
5. Nhấn **"Save policy"**

### 3.2. Policy cho Read (SELECT)

1. Nhấn **"New Policy"** lần nữa
2. Điền:
   - **Policy name**: `Users can view their own label images`
   - **Allowed operation**: `SELECT`
   - **Target roles**: `authenticated`
   - **USING expression**:
     ```sql
     bucket_id = 'label-images' AND
     (storage.foldername(name))[1] = auth.uid()::text
     ```
3. Nhấn **"Save policy"**

### 3.3. Policy cho Public Read (Optional nhưng khuyến nghị)

1. Nhấn **"New Policy"**
2. Điền:
   - **Policy name**: `Public can view label images`
   - **Allowed operation**: `SELECT`
   - **Target roles**: `public` (hoặc `anon`)
   - **USING expression**:
     ```sql
     bucket_id = 'label-images'
     ```
3. Nhấn **"Save policy"**

### 3.4. Policy cho Delete (Optional)

1. Nhấn **"New Policy"**
2. Điền:
   - **Policy name**: `Users can delete their own label images`
   - **Allowed operation**: `DELETE`
   - **Target roles**: `authenticated`
   - **USING expression**:
     ```sql
     bucket_id = 'label-images' AND
     (storage.foldername(name))[1] = auth.uid()::text
     ```
3. Nhấn **"Save policy"**

## Bước 4: Kiểm tra

Sau khi hoàn thành các bước trên:

1. Refresh lại trang dashboard của bạn
2. Thử upload một hình ảnh nhãn
3. Lỗi "Bucket not found" sẽ biến mất

## Cấu trúc thư mục

Files sẽ được lưu theo cấu trúc:
```
label-images/
  └── {user_id}/
      ├── 1738761234567-product-label.jpg
      ├── 1738761345678-another-label.png
      └── ...
```

Mỗi user chỉ có thể upload/xem/xóa files trong folder của riêng họ.

## Ghi chú bảo mật

- ✅ Users chỉ upload được vào folder `{user_id}` của họ
- ✅ Users chỉ xem được files của họ (trừ khi bật public)
- ✅ Public URLs vẫn hoạt động để hiển thị trong báo cáo
- ✅ Không ai có thể xóa files của người khác

## Nếu vẫn gặp lỗi

1. Kiểm tra tên bucket phải chính xác là `label-images`
2. Đảm bảo "Public bucket" đã được bật
3. Kiểm tra các policies đã được tạo đầy đủ
4. Thử logout và login lại để refresh session
