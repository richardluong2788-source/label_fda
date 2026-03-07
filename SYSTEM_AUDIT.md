# AI Label Pro - System Architecture Overview

## 🎯 Product Purpose
**AI Label Pro** là nền tảng kiểm tra tuân thủ FDA tự động cho nhãn sản phẩm, sử dụng AI Vision để phát hiện vi phạm quy định từ ảnh nhãn.

**Các đối tượng sử dụng chính:**
- **Nhà sản xuất/xuất khẩu**: Kiểm tra tuân thủ trước khi ra thị trường
- **Nhà nhập khẩu**: Xác thực hàng nhập vào cảng (tránh bị giữ hàng)
- **Chuyên gia quản lý**: Quản lý cơ sở dữ liệu violation/recall

---

## 🏗️ Architecture Stack

### Frontend (Next.js 16)
- **UI Framework**: React 19 + Shadcn/UI (Radix UI)
- **Styling**: Tailwind CSS + Recharts (charts)
- **State Management**: SWR (for data fetching + caching)
- **Forms**: React Hook Form + Zod validation

### Backend (Next.js API Routes)
- **Database**: Supabase PostgreSQL
- **Cache**: Upstash Redis (vision analysis cache)
- **AI Vision**: OpenAI GPT-4o Vision API
- **Payment**: Stripe (checkout) + VNPay (local payments)
- **File Storage**: Blob storage

### Data
- **Database**: Supabase (28 tables)
  - Core: `audit_reports`, `user_subscriptions`, `payment_transactions`
  - FDA Data: `warning_letters`, `pending_recalls`, `pending_import_alerts`
  - Admin: `admin_users`, `expert_review_requests`, `violation_user_feedback`
  - Caching: `fda_fetch_log`, `comparison_sessions`, `device_fingerprints`

---

## 📋 Core Features

### 1. **Label Analysis (Phân tích Nhãn)**
- **Flow**: Upload ảnh → Vision OCR → AI phát hiện violation → Tạo báo cáo PDF
- **Multi-Column Detection**: Phát hiện variety pack (3+ cột dinh dưỡng khác nhau)
- **Supported Label Types**: Nutrition Facts, Ingredients, PDP (Product Display Panel)
- **Output**: 
  - JSON report (violations, severity levels)
  - PDF compliance report (Tiếng Việt/Anh)
  - Risk score (0-10)

### 2. **FDA Data Integration**
- **Auto-fetch**: Cron jobs lấy dữ liệu FDA hàng ngày
  - Warning Letters
  - Import Alerts  
  - Recalls
- **Search/Filter**: Full-text search compliance knowledge base
- **Expert Review**: Yêu cầu chuyên gia xem xét (paid feature)

### 3. **Subscription & Billing**
- **Plans**: Free, Professional, Enterprise
- **Features**: Per-report limits, expert reviews, API access
- **Payments**: Stripe (international), VNPay (Vietnam)

### 4. **Admin Dashboard**
- **User Management**: Create/manage admin users
- **Knowledge Management**: Bulk import FDA data, sync eCFR
- **Report Cleanup**: Xóa báo cáo quá hạn
- **Vision Cache**: Clear cache để re-analyze

---

## 🔄 Main API Endpoints

### Analyze Flow
```
POST /api/analyze/submit          → Submit ảnh + info sản phẩm
POST /api/analyze/process/run     → Run AI vision analysis
GET  /api/analyze/status          → Check analysis status
```

### Report Access
```
GET  /api/reports/[id]            → Fetch report data
GET  /api/audit/[id]/pdf          → Generate PDF
GET  /api/audit/[id]              → Get audit details
```

### Knowledge Base
```
GET  /api/knowledge/search        → Search FDA violations
GET  /api/knowledge/pending-recalls     → Get recent recalls
GET  /api/knowledge/pending-letters     → Get warning letters
```

### Admin
```
POST /api/admin/delete-vision-cache-direct  → Clear vision cache
POST /api/admin/ai-draft          → Generate AI expert draft
GET  /api/admin/revenue           → Revenue dashboard
```

---

## 📊 Database Schema (Key Tables)

| Table | Purpose |
|-------|---------|
| `audit_reports` | Main report data + multi-column nutrition facts |
| `label_versions` | Version history của labels |
| `warning_letters` | FDA warning letters database |
| `pending_recalls` | Upcoming recalls |
| `pending_import_alerts` | Import alerts from FDA |
| `user_subscriptions` | User plans + usage limits |
| `subscription_plans` | Plan tiers (Free/Pro/Enterprise) |
| `expert_review_requests` | Expert review requests |
| `violation_user_feedback` | User corrections/feedback |

---

## 🔑 Key Technical Features

### Multi-Column Nutrition Facts (21 CFR §101.9(b)(12))
- **Detection**: AI vision tìm 2+ cột nutrition với serving size/calorie khác nhau
- **Data Structure**: `NutritionFactsColumn[]` với column type classification
- **Column Types**:
  - `PER_SERVING` - Per-serving column
  - `VARIANT_SKU` - Variety pack (Lance, Goldfish, etc.)
  - `AS_PREPARED` - Prepared vs as-packaged
  - `PER_100G` - International format
  - `UNKNOWN` - Needs human review

### Vision Cache System
- **Tech**: Upstash Redis
- **Key**: Hash của ảnh (content-addressable)
- **TTL**: 7 ngày
- **Benefit**: Tránh phân tích lại ảnh giống nhau

### Compliance Checking
- **Rule-based**: 21 CFR violations (font size, allergen, net weight, etc.)
- **AI-powered**: Pattern matching từ FDA cases
- **Confidence Score**: 0-1 per violation

---

## 🚀 Deployment

- **Hosting**: Vercel
- **Database**: Supabase (EU/US)
- **CDN**: Vercel Edge Network
- **Cron Jobs**: Vercel Cron (scheduled tasks)
- **Monitoring**: Vercel Analytics + Custom logs

---

## 📈 User Journey

1. **Sign Up** → Choose plan
2. **Upload Label** → JPG/PNG/PDF của nhãn sản phẩm
3. **AI Analysis** → 5-30 giây xử lý
4. **View Report** → Violations + severity + PDF download
5. **Export/Share** → PDF hoặc share link
6. **Expert Review** (Optional) → Request chuyên gia kiểm tra

---

## 🔐 Security

- **Auth**: Supabase Auth (email/password)
- **Row Level Security (RLS)**: Users chỉ thấy reports của họ
- **Rate Limiting**: Upstash rate limit per IP/user
- **Payment**: Stripe PCI compliance
- **Data**: End-to-end encryption cho sensitive data

---

## 📝 Recent Updates (Multi-Column Support)

- ✅ Database migration: Thêm `is_multi_column_nutrition`, `nutrition_facts_columns` columns
- ✅ AI Vision prompt: Cải thiện phát hiện variety pack
- ✅ `skipCache` option: Cho phép re-analyze mà không xóa cache
- ✅ Admin panel: Clear vision cache tại `/admin/clear-cache`
- ⚠️ UI component: Đang hoàn thiện hiển thị multi-column layout

---

## 🔧 Development Notes

- **Language**: TypeScript + React
- **Deployment**: `main` branch auto-deploys
- **Testing**: Vitest for unit tests
- **API Rate Limit**: 10 req/min per user (free tier)
- **Vision API Cost**: $0.0085 per image (GPT-4o)

---

**Last Updated**: 2026-03-07
**Status**: Production + Active Development (Multi-Column Feature)
