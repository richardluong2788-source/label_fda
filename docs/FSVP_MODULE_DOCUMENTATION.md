# FSVP Module Documentation
## Foreign Supplier Verification Program (21 CFR Part 1, Subpart L)

---

## 1. Tổng Quan Hệ Thống

### 1.1 Mục Đích
Module FSVP (Foreign Supplier Verification Program) được xây dựng để hỗ trợ các nhà nhập khẩu thực phẩm vào Hoa Kỳ tuân thủ quy định FDA theo 21 CFR Part 1, Subpart L (§1.500-§1.514). Quy định này yêu cầu nhà nhập khẩu phải:

- Xác minh rằng thực phẩm nhập khẩu được sản xuất theo cách tuân thủ các yêu cầu an toàn thực phẩm của Hoa Kỳ
- Thực hiện phân tích mối nguy cho từng sản phẩm
- Đánh giá và xác minh nhà cung cấp nước ngoài
- Lưu giữ hồ sơ và sẵn sàng cung cấp trong vòng 24 giờ khi FDA yêu cầu

### 1.2 Kiến Trúc Hệ Thống

```
┌─────────────────────────────────────────────────────────────────┐
│                        FSVP Dashboard                            │
│   /dashboard/fsvp                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐  ┌──────────────┐  ┌────────────┐  ┌───────────┐  │
│  │ Overview │  │  Suppliers   │  │  Hazard    │  │ Documents │  │
│  │   Tab    │  │     Tab      │  │  Analysis  │  │    Tab    │  │
│  └────┬─────┘  └──────┬───────┘  └─────┬──────┘  └─────┬─────┘  │
│       │               │                │               │         │
│  ┌────┴─────┐  ┌──────┴───────┐  ┌─────┴──────┐  ┌─────┴─────┐  │
│  │ Audit    │  │  SAHCODHA    │  │            │  │           │  │
│  │ Readiness│  │  Assessment  │  │            │  │           │  │
│  └──────────┘  └──────────────┘  └────────────┘  └───────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API Layer                                │
│  /api/fsvp/*                                                     │
├─────────────────────────────────────────────────────────────────┤
│  /suppliers     │ /hazard-analyses │ /documents │ /sahcodha     │
│  /stats         │ /verification-activities      │ /export-dossier│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Database (Supabase)                         │
├─────────────────────────────────────────────────────────────────┤
│  fsvp_suppliers │ fsvp_hazard_analyses │ fsvp_documents         │
│  fsvp_verification_activities │ fsvp_dossier_exports            │
│  user_profiles (FSVP importer data)                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Các Chức Năng Chi Tiết

### 2.1 Tab Overview (Tổng Quan)

**Đường dẫn:** `/dashboard/fsvp` (tab mặc định)

**Component:** `app/dashboard/fsvp/page.tsx`

**Mục đích:** Hiển thị tổng quan về tình trạng tuân thủ FSVP

**Các chỉ số hiển thị:**
| Chỉ số | Mô tả | Ý nghĩa |
|--------|-------|---------|
| Compliance Score | Điểm tuân thủ tổng thể (0-100%) | Phản ánh mức độ hoàn thiện hồ sơ FSVP |
| Audit Readiness | Điểm sẵn sàng kiểm tra (0-100%) | Mức độ sẵn sàng cho FDA inspection |
| SAHCODHA Products | Số sản phẩm có nguy cơ SAHCODHA | Sản phẩm cần giám sát đặc biệt |
| Total Suppliers | Tổng số nhà cung cấp | Số nhà cung cấp nước ngoài đang quản lý |

**Cảnh báo tự động:**
- Quá hạn Corrective Actions
- Kiểm tra sắp đến (trong 7 ngày)
- Nhà cung cấp cần xác minh

---

### 2.2 Tab Suppliers (Nhà Cung Cấp Nước Ngoài)

**Component:** `components/fsvp-supplier-manager.tsx`

**API Endpoints:**
- `GET /api/fsvp/suppliers` - Lấy danh sách suppliers
- `POST /api/fsvp/suppliers` - Thêm mới supplier
- `PUT /api/fsvp/suppliers/[id]` - Cập nhật supplier
- `DELETE /api/fsvp/suppliers/[id]` - Xóa supplier

**Chức năng:**

| Chức năng | Mô tả | Quy định FDA |
|-----------|-------|--------------|
| Thêm Supplier | Đăng ký nhà cung cấp mới | 21 CFR 1.505 |
| Quản lý Status | pending/approved/conditionally_approved/suspended | 21 CFR 1.506 |
| SAHCODHA Flagging | Đánh dấu nhà cung cấp có rủi ro SAHCODHA | 21 CFR 1.506(d) |
| Verification Due | Theo dõi lịch xác minh tiếp theo | 21 CFR 1.506 |

**Các trường thông tin Supplier:**
```
├── Thông tin cơ bản
│   ├── supplier_name (Tên công ty) *
│   ├── supplier_country (Quốc gia) *
│   ├── supplier_address (Địa chỉ)
│   ├── supplier_fei (FDA Establishment Identifier)
│   └── supplier_duns (D-U-N-S Number - 9 chữ số)
│
├── Liên hệ
│   ├── supplier_contact_name
│   ├── supplier_contact_email
│   └── supplier_contact_phone
│
├── Sản phẩm
│   ├── product_categories[] (seafood, produce, dairy, etc.)
│   └── primary_products[]
│
├── Trạng thái FSVP
│   ├── status (pending_review | approved | conditionally_approved | suspended | removed)
│   ├── approval_date
│   ├── last_verification_date
│   └── next_verification_due
│
└── SAHCODHA Risk
    ├── is_sahcodha_risk (boolean)
    ├── sahcodha_hazards[] (danh sách mối nguy SAHCODHA)
    ├── requires_annual_audit (boolean)
    ├── last_onsite_audit_date
    └── next_onsite_audit_due
```

**Trạng thái Supplier:**
| Status | Màu | Ý nghĩa |
|--------|-----|---------|
| `pending` | Xám | Đang chờ đánh giá |
| `approved` | Xanh lá | Đã được phê duyệt |
| `conditional` | Cam | Phê duyệt có điều kiện |
| `suspended` | Đỏ | Tạm ngưng |

---

### 2.3 Tab Phân Tích Mối Nguy (Hazard Analysis)

**Component:** `components/fsvp/supplier-hazard-analysis.tsx`

**API Endpoints:**
- `GET /api/fsvp/hazard-analyses` - Lấy danh sách phân tích
- `POST /api/fsvp/hazard-analyses` - Tạo phân tích mới
- `PUT /api/fsvp/hazard-analyses` - Cập nhật phân tích

**Quy định:** 21 CFR 1.504

**Mục đích:** Xác định và đánh giá các mối nguy có thể xảy ra đối với từng sản phẩm nhập khẩu

**Các loại mối nguy:**

| Loại | Icon | Ví dụ | Mô tả |
|------|------|-------|-------|
| Biological | Bug | Salmonella, Listeria, E.coli O157:H7, Vibrio | Vi sinh vật gây bệnh |
| Chemical | Droplet | Histamine, Pesticides, Heavy metals, Mycotoxins | Hóa chất độc hại |
| Physical | Atom | Metal fragments, Glass, Plastic, Wood | Vật lạ nguy hiểm |
| Radiological | ShieldAlert | - | Phóng xạ (ít gặp) |
| Allergen | Wheat | Milk, Eggs, Fish, Shellfish, Peanuts, Tree nuts, Wheat, Soy, Sesame | 9 allergen chính theo FALCPA |

**Đánh giá mức độ nghiêm trọng:**
| Severity | Ý nghĩa | Yêu cầu |
|----------|---------|---------|
| Low | Ít nguy hiểm | Kiểm soát cơ bản |
| Medium | Nguy hiểm trung bình | Kiểm soát định kỳ |
| High | Nguy hiểm cao | Kiểm soát nghiêm ngặt |
| **SAHCODHA** | Có thể gây tử vong | Kiểm tra onsite hàng năm |

**Workflow:**
```
1. Chọn Supplier → 2. Nhập thông tin sản phẩm → 3. Xác định các mối nguy
                                                      │
                    ┌─────────────────────────────────┴─────────────────────────────────┐
                    ▼                                                                   ▼
            4a. Không có SAHCODHA                                          4b. Có mối nguy SAHCODHA
                    │                                                                   │
                    ▼                                                                   ▼
            5a. Verification theo                                          5b. Yêu cầu audit onsite
                lịch thông thường                                              hàng năm (21 CFR 1.506(d))
```

---

### 2.4 Tab Tài Liệu (Documents)

**Component:** `components/fsvp/supplier-document-manager.tsx`

**API Endpoints:**
- `GET /api/fsvp/documents` - Lấy danh sách tài liệu
- `POST /api/fsvp/documents/upload` - Upload tài liệu
- `GET /api/fsvp/documents/file` - Xem/tải file
- `DELETE /api/fsvp/documents/[id]` - Xóa tài liệu

**Storage:** Vercel Blob (private access)

**Loại tài liệu hỗ trợ:**

| Document Type | Mô tả | Bắt buộc |
|---------------|-------|----------|
| `certificate` | Giấy chứng nhận (ISO, FSSC, BRC, SQF) | Tùy theo supplier |
| `test_report` | Báo cáo kiểm nghiệm | Có |
| `audit_report` | Báo cáo kiểm toán | Có cho SAHCODHA |
| `haccp_plan` | Kế hoạch HACCP | Có |
| `food_safety_plan` | Kế hoạch an toàn thực phẩm | Có |
| `sop` | Quy trình vận hành chuẩn | Khuyến khích |
| `letter_of_guarantee` | Thư đảm bảo | Có |
| `specification_sheet` | Bảng thông số kỹ thuật | Khuyến khích |
| `coa` | Certificate of Analysis | Có |
| `other` | Tài liệu khác | - |

**Trạng thái tài liệu:**
| Status | Màu | Ý nghĩa |
|--------|-----|---------|
| `valid` | Xanh lá | Còn hiệu lực |
| `expired` | Đỏ | Đã hết hạn |
| `pending_review` | Vàng | Đang chờ xem xét |
| `rejected` | Đỏ | Bị từ chối |
| `archived` | Xám | Đã lưu trữ |

**Tính năng:**
- Upload nhiều loại file (PDF, DOC, XLS, images)
- Preview file trong dialog (PDF, images)
- Theo dõi ngày hết hạn
- Versioning tài liệu
- Liên kết với Supplier cụ thể

---

### 2.5 Tab Sẵn Sàng Kiểm Tra (Audit Readiness)

**Component:** `components/fsvp/supplier-audit-readiness.tsx`

**Mục đích:** Checklist giúp nhà cung cấp/nhà nhập khẩu chuẩn bị cho FDA inspection

**Các danh mục checklist:**

| Category | Icon | Số items | Mô tả |
|----------|------|----------|-------|
| Pre-Audit Preparation | Calendar | 5 | Chuẩn bị trước kiểm tra |
| Documentation Review | FileText | 8 | Kiểm tra tài liệu |
| Personnel & Training | Users | 5 | Nhân sự & đào tạo |
| Facility & Equipment | Building2 | 5 | Cơ sở vật chất |
| Sanitation & Hygiene | Sparkles | 5 | Vệ sinh |
| Allergen Control | AlertTriangle | 5 | Kiểm soát allergen |
| Process Controls | Beaker | 5 | Kiểm soát quy trình |
| Microbiological Control | Bug | 4 | Kiểm soát vi sinh |
| Traceability & Recall | Package | 5 | Truy xuất & thu hồi |
| Supplier Verification | Truck | 4 | Xác minh nhà cung cấp |

**Mức độ ưu tiên:**
| Priority | Màu | Ý nghĩa |
|----------|-----|---------|
| Critical | Đỏ | Bắt buộc - thiếu sẽ fail audit |
| High | Cam | Quan trọng - cần hoàn thành |
| Medium | Vàng | Khuyến khích |

**Tính điểm:**
```
Audit Readiness Score = (Completed Items / Total Items) × 100%
```

---

### 2.6 Tab Đánh Giá SAHCODHA

**Component:** `components/fsvp/sahcodha-risk-assessment.tsx`

**API Endpoint:** `GET /api/fsvp/sahcodha` - Lấy danh sách sản phẩm SAHCODHA

**Quy định:** 21 CFR 1.506(d)

**SAHCODHA = Serious Adverse Health Consequences or Death to Humans or Animals**

**Các danh mục SAHCODHA phổ biến:**

| Category | CFR Reference | Mối nguy chính |
|----------|---------------|----------------|
| Seafood | 21 CFR 123 | Histamine, Ciguatera, Vibrio, Parasites, Mercury |
| Leafy Greens | 21 CFR 112 | E. coli O157:H7, Salmonella, Cyclospora |
| Sprouts | 21 CFR 112.144 | Salmonella, E. coli, Listeria |
| Juice | 21 CFR 120 | E. coli O157:H7, Salmonella, Cryptosporidium |
| Cheese/Dairy | 21 CFR 133 | Listeria, Salmonella, E. coli O157:H7 |

**Yêu cầu đặc biệt cho sản phẩm SAHCODHA:**
- Kiểm tra onsite hàng năm (annual onsite audit)
- Xác minh supplier thường xuyên hơn (6 tháng thay vì 12 tháng)
- Lưu giữ hồ sơ chi tiết hơn

**Màn hình hiển thị:**
- Danh sách sản phẩm SAHCODHA
- Risk Score (0-100)
- Verification frequency
- Supplier info & audit status

---

## 3. Mapping Chức Năng & Luồng Dữ Liệu

### 3.1 Relationship Diagram

```
                    ┌─────────────────────┐
                    │    user_profiles    │
                    │  (FSVP Importer)    │
                    │  - importer_duns    │
                    │  - qualified_individual │
                    │  - fsvp_program_active │
                    └──────────┬──────────┘
                               │ 1
                               │
                               │ owns
                               │
                               ▼ many
                    ┌─────────────────────┐
                    │   fsvp_suppliers    │◄──────────────────────────────┐
                    │  - supplier_name    │                               │
                    │  - country, FEI     │                               │
                    │  - is_sahcodha_risk │                               │
                    │  - status           │                               │
                    └──────────┬──────────┘                               │
                               │ 1                                        │
               ┌───────────────┼───────────────┐                          │
               │               │               │                          │
               ▼ many          ▼ many          ▼ many                     │
    ┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐            │
    │ fsvp_hazard_     │ │fsvp_documents│ │fsvp_verification_│            │
    │    analyses      │ │              │ │    activities    │            │
    │                  │ │- document_type│ │                  │            │
    │- product_name    │ │- file_url    │ │- activity_type   │            │
    │- biological_     │ │- expiry_date │ │- conducted_by    │            │
    │  hazards[]       │ │- status      │ │- result          │            │
    │- chemical_       │ │              │ │- findings        │            │
    │  hazards[]       │ │              │ │                  │            │
    │- is_sahcodha_    │ │              │ │                  │            │
    │  product         │ │              │ │                  │            │
    └────────┬─────────┘ └──────────────┘ └──────────────────┘            │
             │                                                             │
             │ feeds into                                                  │
             │                                                             │
             ▼                                                             │
    ┌──────────────────┐                                                   │
    │    SAHCODHA      │───────────────────────────────────────────────────┘
    │   Assessment     │       updates is_sahcodha_risk
    │   (calculated)   │
    └──────────────────┘
```

### 3.2 Luồng Nghiệp Vụ Chính

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FSVP COMPLIANCE WORKFLOW                         │
└────────────────────────────────────────────────────────────────────────┘

     BƯỚC 1                  BƯỚC 2                   BƯỚC 3
┌──────────────┐       ┌──────────────────┐     ┌──────────────────┐
│ Đăng ký      │       │ Phân tích        │     │ Thu thập         │
│ Supplier     │──────►│ Mối nguy         │────►│ Tài liệu         │
│              │       │ (Hazard Analysis)│     │                  │
└──────────────┘       └──────────────────┘     └──────────────────┘
       │                        │                        │
       │                        │                        │
       ▼                        ▼                        ▼
┌──────────────┐       ┌──────────────────┐     ┌──────────────────┐
│ Thông tin:   │       │ Xác định:        │     │ Upload:          │
│ - Tên        │       │ - Biological     │     │ - Certificates   │
│ - Quốc gia   │       │ - Chemical       │     │ - Test reports   │
│ - FEI/DUNS   │       │ - Physical       │     │ - Audit reports  │
│ - Sản phẩm   │       │ - Allergen       │     │ - HACCP plan     │
└──────────────┘       │ - SAHCODHA?      │     │ - FSP            │
                       └──────────────────┘     └──────────────────┘
                                │
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
           ┌──────────────┐        ┌──────────────┐
           │ SAHCODHA=NO  │        │ SAHCODHA=YES │
           └──────────────┘        └──────────────┘
                    │                       │
                    ▼                       ▼
           ┌──────────────┐        ┌──────────────┐
           │ Standard     │        │ Enhanced     │
           │ Verification │        │ Verification │
           │ (Annual)     │        │ (6 months)   │
           └──────────────┘        │ + Annual     │
                                   │ Onsite Audit │
                                   └──────────────┘
                                          │
                    ┌─────────────────────┤
                    ▼                     ▼
           ┌──────────────┐        ┌──────────────┐
           │   BƯỚC 4     │        │   BƯỚC 5     │
           │ Audit        │        │ Export       │
           │ Readiness    │        │ Dossier      │
           │ Checklist    │        │ (24h ready)  │
           └──────────────┘        └──────────────┘
```

---

## 4. Database Schema

### 4.1 Bảng fsvp_suppliers

```sql
CREATE TABLE fsvp_suppliers (
  id UUID PRIMARY KEY,
  importer_user_id UUID REFERENCES auth.users(id),
  
  -- Identity
  supplier_name TEXT NOT NULL,
  supplier_country TEXT NOT NULL,
  supplier_fei TEXT,      -- FDA Establishment Identifier
  supplier_duns TEXT,     -- D-U-N-S Number
  
  -- Status
  status TEXT CHECK (status IN ('pending_review', 'approved', 
                                 'conditionally_approved', 'suspended', 'removed')),
  
  -- SAHCODHA
  is_sahcodha_risk BOOLEAN DEFAULT FALSE,
  requires_annual_audit BOOLEAN DEFAULT FALSE,
  
  -- Verification Dates
  last_verification_date TIMESTAMPTZ,
  next_verification_due TIMESTAMPTZ,
  last_onsite_audit_date TIMESTAMPTZ,
  next_onsite_audit_due TIMESTAMPTZ
);
```

### 4.2 Bảng fsvp_hazard_analyses

```sql
CREATE TABLE fsvp_hazard_analyses (
  id UUID PRIMARY KEY,
  supplier_id UUID REFERENCES fsvp_suppliers(id),
  
  -- Product
  product_name TEXT NOT NULL,
  product_category TEXT,
  
  -- Hazards (JSONB arrays)
  biological_hazards JSONB DEFAULT '[]',
  chemical_hazards JSONB DEFAULT '[]',
  physical_hazards JSONB DEFAULT '[]',
  radiological_hazards JSONB DEFAULT '[]',
  known_hazards JSONB DEFAULT '[]', -- allergens
  
  -- SAHCODHA
  is_sahcodha_product BOOLEAN DEFAULT FALSE,
  
  -- Analysis Info
  analyzed_by TEXT NOT NULL,
  analysis_date TIMESTAMPTZ NOT NULL,
  status TEXT CHECK (status IN ('draft', 'active', 'superseded', 'archived'))
);
```

### 4.3 Bảng fsvp_documents

```sql
CREATE TABLE fsvp_documents (
  id UUID PRIMARY KEY,
  supplier_id UUID REFERENCES fsvp_suppliers(id),
  
  -- Document Info
  document_type TEXT NOT NULL,  -- certificate, test_report, audit_report, etc.
  document_name TEXT NOT NULL,
  file_url TEXT,
  
  -- Dates
  upload_date TIMESTAMPTZ,
  expiry_date TIMESTAMPTZ,
  
  -- Status
  status TEXT CHECK (status IN ('valid', 'expired', 'pending_review', 
                                 'rejected', 'archived'))
);
```

---

## 5. API Reference

### 5.1 Suppliers API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/fsvp/suppliers` | Lấy tất cả suppliers của user |
| POST | `/api/fsvp/suppliers` | Tạo supplier mới |
| PUT | `/api/fsvp/suppliers/[id]` | Cập nhật supplier |
| DELETE | `/api/fsvp/suppliers/[id]` | Xóa supplier |

### 5.2 Hazard Analysis API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/fsvp/hazard-analyses` | Lấy tất cả hazard analyses |
| POST | `/api/fsvp/hazard-analyses` | Tạo analysis mới |
| PUT | `/api/fsvp/hazard-analyses` | Cập nhật analysis |

### 5.3 Documents API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/fsvp/documents` | Lấy danh sách tài liệu |
| POST | `/api/fsvp/documents/upload` | Upload tài liệu mới |
| GET | `/api/fsvp/documents/file?id=` | Lấy file để xem/tải |
| DELETE | `/api/fsvp/documents/[id]` | Xóa tài liệu |

### 5.4 Other APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/fsvp/stats` | Dashboard statistics |
| GET | `/api/fsvp/sahcodha` | SAHCODHA products list |
| POST | `/api/fsvp/export-dossier` | Export FSVP Dossier |

---

## 6. BÁO CÁO KIỂM TOÁN LOGIC NGHIỆP VỤ

### 6.1 Tổng Quan Đánh Giá

| Tiêu chí | Trạng thái | Chi tiết |
|----------|------------|----------|
| **Luồng chính** | ✅ Đạt | 5 bước chính đã được triển khai |
| **Database Schema** | ✅ Đạt | Đầy đủ các bảng và quan hệ |
| **RLS Security** | ✅ Đạt | Bảo mật theo user ID |
| **SAHCODHA Logic** | ⚠️ Cần bổ sung | Thiếu tự động cập nhật lịch verification |
| **Document Management** | ✅ Đạt | Upload, preview, versioning |
| **Audit Readiness** | ✅ Đạt | 50 items checklist |

### 6.2 So Sánh Chi Tiết: Yêu Cầu vs Thực Tế

#### BƯỚC 1: Đăng ký Supplier

| Yêu cầu | Hệ thống hiện tại | Trạng thái |
|---------|-------------------|------------|
| Nhập tên supplier | `POST /api/fsvp/suppliers` với `supplier_name` | ✅ Có |
| Chọn quốc gia | `supplier_country` field | ✅ Có |
| Mã FEI (FDA Establishment ID) | `supplier_fei` field | ✅ Có |
| DUNS Number (9 digits) | `supplier_duns` field | ✅ Có |
| Thông tin liên hệ | `supplier_contact_*` fields | ✅ Có |
| Product categories | `product_categories[]` array | ✅ Có |
| Status ban đầu = "pending_review" | Default value trong schema | ✅ Có |
| Auto-detect SAHCODHA từ category | `assessSAHCODHARisk()` trong API | ✅ Có |

#### BƯỚC 2: Phân Tích Mối Nguy (Hazard Analysis)

| Yêu cầu | Hệ thống hiện tại | Trạng thái |
|---------|-------------------|------------|
| Chọn supplier + sản phẩm | `supplier_id` + `product_name` | ✅ Có |
| 5 loại mối nguy | biological/chemical/physical/radiological/allergen | ✅ Có |
| Đánh giá Severity (Low/Medium/High/SAHCODHA) | `severity` field trong hazard objects | ✅ Có |
| Likelihood assessment | `likelihood` field | ✅ Có |
| Control measures | `control_measures[]` array | ✅ Có |
| Auto-update supplier `is_sahcodha_risk` | Logic trong `POST /api/fsvp/hazard-analyses` | ✅ Có |
| Quick select common hazards | `COMMON_HAZARDS` trong component | ✅ Có |
| Edit hazard analysis | `PUT /api/fsvp/hazard-analyses` | ✅ Có |

#### BƯỚC 3: Phê Duyệt Supplier

| Yêu cầu | Hệ thống hiện tại | Trạng thái |
|---------|-------------------|------------|
| Status workflow (pending → approved) | `PUT /api/fsvp/suppliers/[id]` với `status` | ✅ Có |
| `conditionally_approved` status | Có trong CHECK constraint | ✅ Có |
| `suspended` status | Có trong CHECK constraint | ✅ Có |
| `removed` status | Có trong CHECK constraint | ✅ Có |
| Ghi nhận `approval_date` | `approval_date` field | ✅ Có |
| Tự động tính `next_verification_due` | DB trigger `calculate_fsvp_verification_due()` | ✅ Có |
| SAHCODHA → 6 months verification | Logic trong trigger | ✅ Có |
| Non-SAHCODHA → 12 months verification | Logic trong trigger | ✅ Có |
| SAHCODHA → `requires_annual_audit = true` | Auto-update trong API | ✅ Có |

#### BƯỚC 4: Quản Lý Tài Liệu

| Yêu cầu | Hệ thống hiện tại | Trạng thái |
|---------|-------------------|------------|
| Upload nhiều loại file (PDF, DOC, XLS, images) | `POST /api/fsvp/documents/upload` với Vercel Blob | ✅ Có |
| Document types (certificate, test_report, audit_report, etc.) | `document_type` enum | ✅ Có |
| Expiry date tracking | `expiry_date` field | ✅ Có |
| Status workflow (pending → valid/rejected/expired) | `status` field với CHECK constraint | ✅ Có |
| Preview PDF/images | Dialog với iframe/img trong component | ✅ Có |
| Download file | `GET /api/fsvp/documents/file` | ✅ Có |
| Liên kết với supplier | `supplier_id` foreign key | ✅ Có |
| Auto-expire tracking | ⚠️ Cần cron job | ⚠️ Chưa có |

#### BƯỚC 5: Audit Readiness Checklist

| Yêu cầu | Hệ thống hiện tại | Trạng thái |
|---------|-------------------|------------|
| 50 items checklist | `CHECKLIST_CATEGORIES` với 50 items | ✅ Có |
| 10 categories | Pre-Audit, Docs, Personnel, Facility, Sanitation, Allergen, Process, Micro, Trace, Supplier | ✅ Có |
| Priority levels (Critical/High/Medium) | `priority` field | ✅ Có |
| Score calculation | `(completed/total) * 100` | ✅ Có |
| Progress tracking per category | Category-wise breakdown trong component | ✅ Có |
| Regulatory reference | CFR references trong checklist items | ✅ Có |

#### SAHCODHA Assessment

| Yêu cầu | Hệ thống hiện tại | Trạng thái |
|---------|-------------------|------------|
| Danh sách SAHCODHA products | `GET /api/fsvp/sahcodha` | ✅ Có |
| Risk score calculation | `calculateRiskScore()` trong component | ✅ Có |
| Visual risk indicators | Badge colors (Red/Orange/Yellow/Green) | ✅ Có |
| Verification schedule display | `next_verification_due` field | ✅ Có |
| Annual audit tracking | `next_onsite_audit_due` field | ✅ Có |

### 6.3 Các Điểm Cần Cải Thiện (GAPs)

| # | Vấn đề | Mức độ | Giải pháp đề xuất |
|---|--------|--------|-------------------|
| 1 | **Thiếu cron job auto-expire documents** | Medium | Thêm scheduled function để cập nhật status = 'expired' khi quá hạn |
| 2 | **Thiếu notification system** | Medium | Thêm email/in-app alerts cho documents sắp hết hạn, verification due |
| 3 | **Thiếu verification activities tracking** | Low | Table `fsvp_verification_activities` đã có, cần UI để quản lý |
| 4 | **Thiếu export dossier PDF** | High | Cần implement `/api/fsvp/export-dossier` để xuất hồ sơ FDA |
| 5 | **Thiếu multi-product per supplier** | Low | Hazard analysis đã support, nhưng UI có thể cải thiện |

### 6.4 Kết Luận

**Đánh giá tổng thể:** Hệ thống FSVP hiện tại **đã triển khai đúng 90%** luồng nghiệp vụ theo yêu cầu FDA 21 CFR Part 1, Subpart L.

**Các điểm mạnh:**
- Schema database đầy đủ và tuân thủ quy định
- RLS security bảo vệ dữ liệu theo user
- SAHCODHA logic tự động cập nhật khi tạo hazard analysis
- UI/UX tốt với 6 tabs chức năng rõ ràng
- Audit readiness checklist 50 items đầy đủ

**Cần bổ sung để hoàn thiện:**
1. Export dossier PDF (bắt buộc cho FDA compliance - 24h requirement)
2. Notification system cho expiry dates và verification due
3. Cron job auto-update document statuses

---

## 7. Quy Định FDA Liên Quan

| Section | Mô tả | Áp dụng trong hệ thống |
|---------|-------|------------------------|
| 21 CFR 1.500 | Định nghĩa & phạm vi | Toàn bộ module FSVP |
| 21 CFR 1.502 | Qualified Individual | user_profiles.fsvp_qualified_individual |
| 21 CFR 1.504 | Hazard Analysis | fsvp_hazard_analyses table |
| 21 CFR 1.505 | Foreign Supplier Evaluation | fsvp_suppliers table |
| 21 CFR 1.506 | Supplier Verification | verification_activities, next_verification_due |
| 21 CFR 1.506(d) | SAHCODHA Requirements | is_sahcodha_risk, requires_annual_audit |
| 21 CFR 1.508 | Corrective Actions | corrective_actions JSONB field |
| 21 CFR 1.510 | Records Availability (24h) | fsvp_dossier_exports table |

---

## 8. Bảo Mật (RLS Policies)

Tất cả các bảng FSVP đều được bảo vệ bằng Row Level Security:

```sql
-- Users chỉ xem được data của chính mình
CREATE POLICY "Users can view own suppliers" ON fsvp_suppliers
  FOR SELECT USING (auth.uid() = importer_user_id);

-- Admin có quyền xem tất cả
CREATE POLICY "Admins can view all suppliers" ON fsvp_suppliers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );
```

Điều này đảm bảo:
- Mỗi importer chỉ thấy suppliers/documents/analyses của riêng mình
- Admin có thể giám sát toàn bộ hệ thống
- Không có data leak giữa các userp/verification-activities` | Verification history |
| POST | `/api/fsvp/export-dossier` | Export FSVP dossier |

---

## 6. Quy Định FDA Tham Chiếu

| CFR Section | Tiêu đề | Module liên quan |
|-------------|---------|------------------|
| 21 CFR 1.500 | Definitions | All |
| 21 CFR 1.502 | Qualified Individual | User Profile |
| 21 CFR 1.504 | Hazard Analysis | Hazard Analysis Tab |
| 21 CFR 1.505 | Supplier Evaluation | Suppliers Tab |
| 21 CFR 1.506 | Verification Activities | Suppliers + SAHCODHA |
| 21 CFR 1.506(d) | SAHCODHA Requirements | SAHCODHA Tab |
| 21 CFR 1.508 | Identification of FSVP Importer | User Profile |
| 21 CFR 1.510 | Records Availability | Documents + Export |

---

## 7. Bảo Mật & RLS

Tất cả các bảng FSVP đều được bảo vệ bằng Row Level Security (RLS):

```sql
-- Ví dụ policy cho fsvp_suppliers
CREATE POLICY "Users can view own suppliers" ON fsvp_suppliers
  FOR SELECT USING (auth.uid() = importer_user_id);

CREATE POLICY "Users can insert own suppliers" ON fsvp_suppliers
  FOR INSERT WITH CHECK (auth.uid() = importer_user_id);
```

Điều này đảm bảo:
- Mỗi user chỉ có thể truy cập dữ liệu FSVP của chính họ
- Admin có thể xem tất cả dữ liệu
- Không có rò rỉ dữ liệu giữa các tenant

---

## 8. Tóm Tắt

Module FSVP cung cấp một giải pháp toàn diện để quản lý tuân thủ FDA FSVP, bao gồm:

1. **Quản lý Suppliers**: Theo dõi nhà cung cấp nước ngoài, trạng thái phê duyệt, và lịch xác minh
2. **Hazard Analysis**: Phân tích mối nguy theo 21 CFR 1.504 với support cho tất cả loại mối nguy
3. **Document Management**: Quản lý tài liệu chứng nhận, báo cáo, và hồ sơ FSVP
4. **SAHCODHA Assessment**: Đánh giá và theo dõi sản phẩm có nguy cơ SAHCODHA
5. **Audit Readiness**: Checklist chuẩn bị cho FDA inspection
6. **Export Dossier**: Xuất hồ sơ FSVP trong vòng 24 giờ theo yêu cầu FDA

Hệ thống được thiết kế cho mô hình SaaS multi-tenant với bảo mật RLS và sẵn sàng scale.

---

## 9. KIỂM TOÁN LUỒNG QI (QUALIFIED INDIVIDUAL)

### 9.1 Tổng Quan Yêu Cầu QI

Theo tài liệu nghiệp vụ, QI đóng vai trò "Trọng tài" và "Chốt hồ sơ" với 3 bước chính:

| Bước | Mô tả | Yêu cầu hệ thống |
|------|-------|------------------|
| **Bước 1** | Thẩm định Hazard Analysis | Nút [Verify as QI], ghi nhận `qi_user_id` + timestamp |
| **Bước 2** | Document Validation | Trạng thái "QI Approved" cho tài liệu |
| **Bước 3** | Ký duyệt FSVP Determination | Digital Signature, chuyển supplier sang Approved |

### 9.2 So Sánh Yêu Cầu vs Thực Tế

#### Bước 1: Thẩm định Hazard Analysis

| Yêu cầu | Hệ thống hiện tại | Trạng thái |
|---------|-------------------|------------|
| Nút [Verify as QI] trên Hazard Analysis | Chưa có nút riêng cho QI | :x: Thiếu |
| Ghi nhận `qi_user_id` khi verify | Schema có `analyzed_by` nhưng không có `qi_verified_by` | :x: Thiếu |
| Ghi nhận `qi_verified_at` timestamp | Không có field này | :x: Thiếu |
| QI có thể Reject và yêu cầu bổ sung | Không có workflow reject/revision | :x: Thiếu |
| Hiển thị trạng thái "QI Verified" | Chỉ có status draft/active/superseded | :x: Thiếu |

#### Bước 2: Document Validation

| Yêu cầu | Hệ thống hiện tại | Trạng thái |
|---------|-------------------|------------|
| QI rà soát tài liệu chuyên môn | Upload documents hoạt động | :white_check_mark: Có |
| Trạng thái "QI Approved" | Chỉ có valid/expired/pending/rejected | :x: Thiếu |
| Đối chiếu kết quả Test với ngưỡng FDA | Không có logic so sánh | :x: Thiếu |
| Field `qi_reviewed_by` + `qi_reviewed_at` | Không có trong schema | :x: Thiếu |

#### Bước 3: Ký duyệt FSVP Determination

| Yêu cầu | Hệ thống hiện tại | Trạng thái |
|---------|-------------------|------------|
| Digital Signature của QI | Không có | :x: Thiếu |
| Đánh giá tổng thể supplier | Status change (pending → approved) có | :white_check_mark: Có |
| Ghi nhận `final_determination_by` + timestamp | Có `approval_date` nhưng không có `approved_by` | :warning: Thiếu 1 phần |
| Tự động bắt đầu verification schedule | DB trigger `calculate_fsvp_verification_due()` | :white_check_mark: Có |

### 9.3 Dashboard QI

| Yêu cầu | Hệ thống hiện tại | Trạng thái |
|---------|-------------------|------------|
| **Pending Reviews**: Danh sách hồ sơ cần thẩm định | Không có view riêng cho QI | :x: Thiếu |
| **Expiring Tasks**: Hồ sơ sắp đến hạn xác minh | Function `get_fsvp_suppliers_due_verification()` có | :white_check_mark: Có (backend) |
| **Critical Alerts**: Cảnh báo Test vượt ngưỡng | Không có | :x: Thiếu |
| Giao diện riêng cho QI role | Không có phân quyền QI riêng | :x: Thiếu |

### 9.4 Credential Management cho QI

| Yêu cầu | Hệ thống hiện tại | Trạng thái |
|---------|-------------------|------------|
| Lưu bằng cấp/chứng chỉ QI | `user_profiles.fsvp_qi_credentials` JSONB | :white_check_mark: Có |
| Lưu training records | `user_profiles.fsvp_qi_training_records` JSONB | :white_check_mark: Có |
| Xuất QI_Profile.pdf | Không có | :x: Thiếu |
| Hiển thị QI name + credentials | `fsvp_qualified_individual` + `fsvp_qi_title` | :white_check_mark: Có |

### 9.5 Luồng 3 Bên: Supplier - QI - Importer

| Yêu cầu | Hệ thống hiện tại | Trạng thái |
|---------|-------------------|------------|
| **Supplier**: Khởi tạo Raw Data | Importer tự nhập (không có Supplier portal) | :warning: Khác design |
| **QI**: Technical Approval | Không có role QI riêng | :x: Thiếu |
| **Importer**: Final Approval | Importer làm tất cả | :warning: Gộp chung |
| Multi-role assignment | RLS chỉ có `importer_user_id` | :x: Thiếu |
| QI as Outsourced Service (Vexim model) | Không có cơ chế | :x: Thiếu |

### 9.6 Tổng Kết Gap Analysis

| Mức độ | Số lượng GAPs | Chi tiết |
|--------|---------------|----------|
| :x: **Critical** | 8 | QI verification workflow, Digital signature, Role separation |
| :warning: **Medium** | 3 | Approval tracking, Supplier portal, Alert system |
| :white_check_mark: **Có sẵn** | 6 | Credential storage, Verification schedule, Document upload |

### 9.7 Đề Xuất Bổ Sung

#### Priority 1: Database Schema Updates

```sql
-- Thêm fields cho QI workflow trong fsvp_hazard_analyses
ALTER TABLE fsvp_hazard_analyses ADD COLUMN qi_verified_by UUID REFERENCES auth.users(id);
ALTER TABLE fsvp_hazard_analyses ADD COLUMN qi_verified_at TIMESTAMPTZ;
ALTER TABLE fsvp_hazard_analyses ADD COLUMN qi_verification_status TEXT CHECK (
  qi_verification_status IN ('pending_qi_review', 'qi_approved', 'qi_rejected', 'revision_requested')
);
ALTER TABLE fsvp_hazard_analyses ADD COLUMN qi_rejection_reason TEXT;

-- Thêm fields cho QI workflow trong fsvp_documents
ALTER TABLE fsvp_documents ADD COLUMN qi_reviewed_by UUID REFERENCES auth.users(id);
ALTER TABLE fsvp_documents ADD COLUMN qi_reviewed_at TIMESTAMPTZ;
ALTER TABLE fsvp_documents ADD COLUMN qi_review_status TEXT CHECK (
  qi_review_status IN ('pending_qi_review', 'qi_approved', 'qi_rejected')
);

-- Thêm fields cho FSVP Determination
ALTER TABLE fsvp_suppliers ADD COLUMN final_determination_by UUID REFERENCES auth.users(id);
ALTER TABLE fsvp_suppliers ADD COLUMN final_determination_at TIMESTAMPTZ;
ALTER TABLE fsvp_suppliers ADD COLUMN qi_digital_signature TEXT; -- Base64 signature
ALTER TABLE fsvp_suppliers ADD COLUMN qi_determination_notes TEXT;
```

#### Priority 2: UI Components

1. **QI Dashboard Tab**: Pending reviews, expiring tasks, critical alerts
2. **[Verify as QI] Button**: Trên Hazard Analysis với modal confirmation
3. **QI Document Review**: Approve/Reject buttons với reason input
4. **Digital Signature Component**: Capture QI signature cho final determination
5. **QI Profile Management**: Upload credentials, training records

#### Priority 3: Role-Based Access

```typescript
// Thêm role QI trong user management
type UserRole = 'importer' | 'qi' | 'supplier' | 'admin'

// QI có thể được assign cho nhiều Importer (Outsourced QI model)
interface QIAssignment {
  qi_user_id: string
  importer_user_id: string
  assigned_at: Date
  scope: 'all_suppliers' | 'specific_suppliers'
  supplier_ids?: string[]
}
```

### 9.8 Kết Luận

**Mức độ tuân thủ QI workflow hiện tại: ~35%**

Hệ thống đã có nền tảng database tốt (credential storage, verification scheduling) nhưng **thiếu hoàn toàn luồng nghiệp vụ QI** bao gồm:
- Role separation (Supplier vs QI vs Importer)
- QI verification workflow với approval/rejection
- Digital signature cho FSVP Determination
- Dashboard riêng cho QI

Để triển khai mô hình SaaS + Service của Vexim Global (QI thuê ngoài), cần bổ sung các tính năng trên.
