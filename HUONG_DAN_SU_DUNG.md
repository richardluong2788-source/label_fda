# Hướng dẫn sử dụng Vexim Compliance AI

## 📋 Mục lục

1. [Giới thiệu](#giới-thiệu)
2. [Đăng ký và Đăng nhập](#đăng-ký-và-đăng-nhập)
3. [Hướng dẫn cho Người dùng](#hướng-dẫn-cho-người-dùng)
4. [Hướng dẫn cho Admin](#hướng-dẫn-cho-admin)
5. [Hiểu kết quả kiểm tra](#hiểu-kết-quả-kiểm-tra)
6. [Câu hỏi thường gặp](#câu-hỏi-thường-gặp)

---

## Giới thiệu

**Vexim Compliance AI** là hệ thống kiểm tra tuân thủ quy định FDA (Cục Quản lý Thực phẩm và Dược phẩm Hoa Kỳ) cho nhãn thực phẩm, sử dụng công nghệ AI tiên tiến.

### Tính năng chính:
- ✅ Phân tích nhãn thực phẩm tự động bằng AI
- ✅ Kiểm tra tuân thủ theo quy định FDA mới nhất
- ✅ Phát hiện vi phạm với 3 mức độ nghiêm trọng
- ✅ Đưa ra khuyến nghị sửa chữa cụ thể
- ✅ Hỗ trợ citations truy xuất nguồn quy định
- ✅ Kiểm duyệt bởi chuyên gia Vexim

---

## Đăng ký và Đăng nhập

### Đăng ký tài khoản mới

1. Truy cập trang chủ: `https://your-app-url.vercel.app`
2. Nhấn nút **"Bắt đầu"** hoặc **"Kiểm tra miễn phí"**
3. Điền thông tin:
   - Email
   - Mật khẩu (tối thiểu 6 ký tự)
4. Nhấn **"Đăng ký"**
5. Kiểm tra email để xác nhận tài khoản

### Đăng nhập

1. Nhấn **"Đăng nhập"** ở góc trên phải
2. Nhập email và mật khẩu
3. Nhấn **"Đăng nhập"**

---

## Hướng dẫn cho Người dùng

### 1. Upload nhãn thực phẩm

#### Bước 1: Chuẩn bị hình ảnh
- Chụp ảnh nhãn rõ ràng, sắc nét
- Đảm bảo đủ ánh sáng
- Tất cả thông tin phải đọc được
- Định dạng: JPG, PNG
- Kích thước tối đa: 10MB

#### Bước 2: Tải lên
1. Vào trang **Dashboard** (`/dashboard`)
2. Kéo thả hình ảnh vào khung upload hoặc nhấn **"Chọn file"**
3. Xem trước hình ảnh vừa chọn

#### Bước 3: Tùy chọn nâng cao (KHUYẾN KHÍCH)

Nhấn **"Hiện tùy chọn nâng cao"** để cung cấp thêm thông tin giúp AI phân tích chính xác hơn:

**A. Phân loại sản phẩm** ⭐ Khuyến khích
- Chọn nhóm sản phẩm:
  - 🥤 Đồ uống (Beverages)
  - 💊 Thực phẩm chức năng (Dietary Supplements)
  - 🥩 Thịt & Gia cầm (Meat & Poultry)
  - 🧀 Sữa & Phó phẩm (Dairy Products)
  - 🍪 Thực phẩm đóng gói (Packaged Foods)
  - 🥗 Thực phẩm tươi sống (Fresh Produce)
- Chọn phân loại chi tiết (nếu có)

💡 **Lợi ích**: AI sẽ tìm đúng quy định FDA áp dụng cho loại sản phẩm của bạn trong Knowledge Base.

**B. Kích thước nhãn** ⭐⭐ Rất khuyến khích
Điền chính xác để AI kiểm tra font size compliance:
- **Kích thước vật lý**: Rộng x Cao (cm) - đo trên bao bì thực tế
- **Ví dụ**: Nhãn 10cm × 15cm

🎯 **TẠI SAO CẦN THIẾT?**
- AI tính toán PDP (Principal Display Panel) area = width × height
- Validate font size Brand Name, Product Name, Net Quantity theo 21 CFR 101.105
- Không có thông tin này → AI không thể check geometry compliance
- **Công thức**: Area (sq in) = (width_cm / 2.54) × (height_cm / 2.54)

📏 **Cách đo**:
1. Dùng thước đo mặt chính của nhãn (mặt có tên sản phẩm)
2. Chỉ đo phần nhãn, không tính phần dư
3. Nhập đơn vị cm (hệ thống tự convert)

**C. Ngôn ngữ** (Tự động detect, không bắt buộc nhập)
- **MỚI**: AI tự động phát hiện ngôn ngữ trên nhãn
- Nếu detect > 1 ngôn ngữ → AI sẽ kiểm tra:
  - Mandatory fields có dịch đủ không
  - Consistency giữa các bản dịch
  - Warning nếu thiếu translations
- Bạn vẫn có thể chọn "Có ngôn ngữ ngoại" để AI chú ý đặc biệt

**Ngôn ngữ được hỗ trợ detect**:
- English (Tiếng Anh)
- Vietnamese (Tiếng Việt) ⭐
- Spanish (Tiếng Tây Ban Nha)
- Chinese (Tiếng Trung)
- French (Tiếng Pháp)
- Korean (Tiếng Hàn)

#### Bước 4: Bắt đầu kiểm tra
1. Nhấn **"Bắt đầu kiểm tra tuân thủ FDA"**
2. Chờ AI phân tích (thường 2-5 phút)
3. Xem tiến trình phân tích chi tiết:

**Phase 1: AI Vision Analysis** (30-40%)
   - Trích xuất văn bản từ hình ảnh (OCR)
   - **Trích xuất màu sắc thực tế** (text color + background color)
   - **Phát hiện ngôn ngữ tự động** (English, Vietnamese...)
   - Extract nutrition facts, ingredients, allergens
   - Estimate font sizes và vị trí

**Phase 2: RAG - Regulatory Search** (40-50%)
   - Generate embedding vector cho label text
   - Tìm kiếm cơ sở dữ liệu quy định (Vector Search)
   - Lấy top 5-10 regulations liên quan nhất
   - Build citations với độ liên quan (relevance score)

**Phase 3: Validation** (50-80%)
   - Phân tích thông tin dinh dưỡng
   - **Kiểm tra FDA rounding rules** (21 CFR 101.9)
   - **Color contrast check** (với màu thực)
   - **Font size validation** (với PDP area thực)
   - Kiểm tra danh sách thành phần
   - Xác nhận khai báo chất gây dị ứng
   - Validate health claims (forbidden terms)
   - **Multi-language validation** (nếu detect > 1 ngôn ngữ)

**Phase 4: Report Generation** (80-100%)
   - Tổng hợp violations với citations thực
   - Calculate confidence scores
   - Determine severity levels
   - Flag needs_expert_review nếu cần
   - Hoàn thiện báo cáo

💡 **Tips**: Bạn có thể xem console logs (nếu dùng v0 preview) để theo dõi chi tiết từng bước với prefix `[v0]`

### 2. Xem báo cáo kiểm tra

Sau khi phân tích xong, bạn sẽ được chuyển đến trang báo cáo chi tiết.

#### Tổng quan báo cáo

**Kết quả tổng thể:**
- 🔴 **FAIL** (Đỏ): Có vi phạm nghiêm trọng, cần sửa ngay
- 🟠 **WARNING** (Cam): Có cảnh báo, nên xem xét
- 🟢 **PASS** (Xanh): Tuân thủ đầy đủ

**Thông tin chi tiết:**
- Trạng thái: `pending`, `processing`, `ai_completed`, `verified`, `rejected`
- Ngày tạo
- Số lượng vi phạm
- Số citations (trích dẫn quy định)
- Cần kiểm duyệt chuyên gia không

#### Danh sách vi phạm

Mỗi vi phạm bao gồm:

**1. Mức độ nghiêm trọng:**
- 🔴 **Critical** (Nghiêm trọng): Phải sửa trước khi xuất khẩu
- 🟠 **Warning** (Cảnh báo): Nên xem xét sửa
- 🔵 **Info** (Thông tin): Gợi ý cải thiện

**2. Phân loại:**
- Nutritional Information (Thông tin dinh dưỡng)
- Ingredient List (Danh sách thành phần)
- Allergen Declaration (Khai báo chất gây dị ứng)
- Health Claims (Tuyên bố sức khỏe)
- Visual Geometry (Hình thức nhãn)
- Dimension Compliance (Tuân thủ kích thước)
- **Color Contrast** (Độ tương phản màu sắc) - MỚI ⭐
- **Multi-language** (Đa ngôn ngữ) - MỚI ⭐

**3. Mô tả vi phạm:**
Giải thích cụ thể vấn đề gì đang sai

**4. Quy định tham chiếu:**
Ví dụ: `21 CFR 101.9(b)(5)`, `FALCPA Section 203`

**5. Citations (Trích dẫn):**
- Mã quy định chính xác
- Phần nào của quy định
- Đoạn văn bản gốc từ quy định
- Nguồn: FDA Code of Federal Regulations
- Độ liên quan: 95%, 98%...

**6. Khuyến nghị sửa chữa:**
Hướng dẫn chi tiết cách sửa vi phạm

**7. Độ tin cậy AI:**
Thanh progress bar hiển thị AI tự tin bao nhiêu % với phát hiện này

### 3. Xem lịch sử phiên bản

Nếu bạn upload lại nhãn đã sửa:

1. Vào trang báo cáo
2. Nhấn **"Version History"** (Lịch sử phiên bản)
3. Xem danh sách các phiên bản:
   - Version 1: Bản gốc
   - Version 2: Bản đã sửa lần 1
   - Version 3: Bản đã sửa lần 2...

#### So sánh 2 phiên bản

1. Chọn 2 phiên bản muốn so sánh
2. Nhấn **"Compare Versions"**
3. Xem 3 tab:
   - **Visual**: So sánh hình ảnh trước/sau
   - **Violations**: Vi phạm đã sửa / mới xuất hiện / vẫn tồn tại
   - **Geometry**: Thay đổi về kích thước, tỷ lệ font chữ

### 4. Quản lý tài khoản

Nhấn vào **avatar** (chữ cái đầu) ở góc trên phải:

**Menu dropdown:**
- 👤 **Hồ sơ cá nhân**: Xem thông tin tài khoản
- ⚙️ **Cài đặt**: Thay đổi mật khẩu, thông báo, quyền riêng tư
- 🔐 **Admin Dashboard**: (Chỉ hiện nếu bạn là admin)
- 🚪 **Đăng xuất**: Thoát khỏi hệ thống

---

## Hướng dẫn cho Admin

### 1. Cấp quyền Admin

**Điều kiện tiên quyết:**
- Đã có tài khoản và đăng nhập
- Biết User UID của tài khoản

**Các bước cấp quyền:**

#### Cách 1: Qua trang Grant Admin (Khuyến nghị)

1. Truy cập: `/grant-admin`
2. Kiểm tra User ID hiển thị
3. Nhấn **"Grant Superadmin Access"**
4. Đợi xác nhận thành công
5. Refresh trang để cập nhật quyền

#### Cách 2: Qua Database (Cần SUPABASE_SERVICE_ROLE_KEY)

Thêm environment variable:
```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Lấy từ: Supabase Dashboard > Settings > API > service_role key

### 2. Truy cập Admin Dashboard

Sau khi có quyền admin:

1. Nhấn vào avatar ở góc trên phải
2. Chọn **"Admin Dashboard"** hoặc truy cập `/admin`

**Dashboard hiển thị:**
- 📊 **Thống kê:**
  - Báo cáo chờ kiểm duyệt
  - Báo cáo cần chú ý
  - Báo cáo đã xác nhận hôm nay
  - Báo cáo bị từ chối
  
- 📋 **2 Tab:**
  - **Chờ kiểm duyệt**: Báo cáo AI vừa phân tích xong, cần expert review
  - **Cần chú ý**: Báo cáo có độ tin cậy thấp hoặc không có citations

### 3. Kiểm duyệt báo cáo (Expert Review)

#### Mục đích:
- Xác minh kết quả AI có chính xác không
- Sửa/bổ sung vi phạm nếu AI bỏ sót
- Thêm ghi chú cho khách hàng
- Approve hoặc Reject trước khi gửi cho khách hàng

#### Quy trình kiểm duyệt:

1. Trong Admin Dashboard, nhấn **"Kiểm duyệt"** trên báo cáo
2. Xem chi tiết báo cáo AI tạo ra
3. Kiểm tra từng vi phạm:
   - **Đúng**: Giữ nguyên
   - **Sai**: Xóa hoặc sửa
   - **Thiếu**: Thêm vi phạm mới

**Thêm vi phạm mới:**
```
Category: Chọn loại vi phạm
Severity: Critical / Warning / Info
Description: Mô tả chi tiết vấn đề
Regulation: 21 CFR 101.9(c)
Suggested Fix: Cách khắc phục
```

4. Thêm **Review Notes** (Ghi chú):
   - Giải thích cho khách hàng
   - Lưu ý đặc biệt
   - Hướng dẫn bổ sung

5. Quyết định:
   - ✅ **Approve (Xác nhận)**: Gửi cho khách hàng
   - ❌ **Reject (Từ chối)**: Cần AI phân tích lại

6. Nhấn **"Submit Review"**

### 4. Quản lý Knowledge Base

Knowledge Base là cơ sở dữ liệu quy định FDA được AI sử dụng để tìm citations.

#### Truy cập:
1. Admin Dashboard > Nhấn **"Knowledge Base"**
2. Hoặc truy cập: `/admin/knowledge`

#### Chức năng:

**A. Xem danh sách tài liệu**
- Tiêu đề
- Phân loại (category)
- Ngày tải lên
- Trạng thái embedding

**B. Tìm kiếm tài liệu**
- Nhập từ khóa vào ô tìm kiếm
- Xem kết quả có độ liên quan (relevance score)

**C. Upload tài liệu mới**

Các loại file hỗ trợ:
- PDF (ưu tiên)
- TXT
- DOCX
- CSV

**Quy trình upload:**

1. Nhấn **"Upload Document"**
2. Chọn file
3. Điền thông tin:
   - **Title**: Tên tài liệu (VD: "FDA CFR 101.9 - Nutrition Labeling")
   - **Category**: General / Beverages / Supplements / Meat / Dairy...
   - **Tags**: Từ khóa (cách nhau bởi dấu phẩy)
4. Nhấn **"Upload"**
5. Chờ hệ thống:
   - Trích xuất văn bản
   - Chia thành chunks (đoạn nhỏ)
   - Tạo embeddings (vector hóa)
   - Lưu vào database

**Lưu ý:**
- Tài liệu lớn có thể mất vài phút để xử lý
- Nên upload tài liệu chính thức từ FDA
- Định kỳ cập nhật khi có quy định mới

**D. Xóa tài liệu**
1. Nhấn nút xóa (🗑️) bên cạnh tài liệu
2. Xác nhận xóa
3. Tài liệu và embeddings sẽ bị xóa vĩnh viễn

---

## Hiểu kết quả kiểm tra

### 1. Các loại vi phạm thường gặp

#### A. Nutrition Facts (Thông tin dinh dưỡng)

**Vi phạm:** Giá trị không tuân thủ quy tắc làm tròn FDA

**Ví dụ:**
- Calories 143 kcal → Phải làm tròn thành 140 kcal
- Total Fat 8.5g → Phải làm tròn thành 8g hoặc 9g
- Sodium 143mg → Có thể giữ nguyên (dưới 5mg mới làm tròn)

**Quy định:** 21 CFR 101.9(c)

**Khắc phục:** Làm tròn theo bảng quy tắc FDA

#### B. Serving Size (Khẩu phần ăn)

**Vi phạm:** Thiếu đơn vị thông dụng

**Ví dụ sai:**
```
Serving Size: 240ml
```

**Ví dụ đúng:**
```
Serving Size: 1 cup (240ml)
```

**Quy định:** 21 CFR 101.9(b)(5)

#### C. Ingredient List (Danh sách thành phần)

**Vi phạm:** Thành phần không theo thứ tự trọng lượng giảm dần

**Ví dụ sai:**
```
Ingredients: Water, Salt, Sugar, Wheat Flour
(Nếu Wheat Flour nhiều hơn Sugar)
```

**Ví dụ đúng:**
```
Ingredients: Water, Wheat Flour, Sugar, Salt
```

**Quy định:** 21 CFR 101.4(a)(1)

#### D. Allergen Declaration (Khai báo dị ứng)

**Vi phạm:** Thiếu tuyên bố chất gây dị ứng

8 loại allergen chính:
- Milk (Sữa)
- Eggs (Trứng)
- Fish (Cá)
- Shellfish (Hải sản có vỏ)
- Tree nuts (Hạt cây)
- Peanuts (Đậu phộng)
- Wheat (Lúa mì)
- Soybeans (Đậu nành)

**Ví dụ đúng:**
```
Contains: Milk, Soy, Wheat
```

**Quy định:** FALCPA Section 203

#### E. Health Claims (Tuyên bố sức khỏe)

**Vi phạm:** Dùng từ ngữ cấm hoặc tuyên bố không được phép

**Từ khóa NGHIÊM CẤM:**
- "cure" (chữa khỏi)
- "treat" (điều trị)
- "prevent disease" (phòng ngừa bệnh)
- "boost immune system" (tăng cường miễn dịch) - trừ khi có approved claim

**Cho phép (với điều kiện):**
- "supports" (hỗ trợ)
- "helps maintain" (giúp duy trì)
- "contributes to" (đóng góp vào)

**Disclaimer bắt buộc (nếu có claim):**
```
*These statements have not been evaluated by the Food and Drug Administration. 
This product is not intended to diagnose, treat, cure, or prevent any disease.
```

#### F. Visual Geometry (Hình thức)

**Vi phạm:** Font chữ quá nhỏ

**Quy định:**
- Tên sản phẩm ≥ 1/2 kích thước tên thương hiệu
- Nutrition Facts font tối thiểu 6pt
- Net quantity statement phải đủ lớn tùy diện tích nhãn

**Kiểm tra:** 
- **Cần nhập kích thước vật lý** (cm) khi upload
- AI tính PDP area = width × height (converted to sq inches)
- Font size được estimate từ hình ảnh và so sánh với PDP area

**Ví dụ:**
```
PDP: 10cm × 15cm = 23.2 sq inches
→ Net Quantity phải ≥ 1/16 inch height (theo 21 CFR 101.105)
→ Font size phải ≥ ~18pt
```

#### G. Color Contrast (Độ tương phản) - MỚI ⭐

**Vi phạm:** Màu chữ và nền không đủ tương phản

**Quy định:**
- WCAG 2.1 Level AA (mặc dù không bắt buộc theo FDA, nhưng khuyến khích)
- Contrast ratio tối thiểu: 4.5:1 cho text thường
- Contrast ratio tối thiểu: 3:1 cho text lớn (≥18pt)

**Ví dụ:**
```
❌ Vi phạm:
Text: #666666 (xám nhạt)
Background: #777777 (xám nhạt hơn)
Contrast ratio: 1.2:1 → Không đọc được

✅ Đúng:
Text: #000000 (đen)
Background: #FFFFFF (trắng)
Contrast ratio: 21:1 → Rất tốt
```

**Cách AI kiểm tra:**
1. GPT-4o Vision extract HEX color codes thực tế
2. Convert hex → RGB
3. Calculate luminance
4. Compute contrast ratio = (L1 + 0.05) / (L2 + 0.05)
5. So sánh với ngưỡng WCAG

**Khắc phục:**
- Dùng màu đậm hơn cho text
- Hoặc dùng nền sáng/tối hơn để tăng contrast

#### H. Multi-language (Đa ngôn ngữ) - MỚI ⭐

**Vi phạm:** Thiếu bản dịch cho thông tin bắt buộc

**Quy định:**
- 21 CFR 101.15(c): Nếu nhãn có ngôn ngữ ngoài tiếng Anh, tất cả mandatory information phải được dịch
- Mandatory fields: Product name, Net quantity, Ingredient list, Allergen statement, Nutrition Facts

**Cách AI kiểm tra:**
1. GPT-4o Vision tự động detect ngôn ngữ trên nhãn
2. Nếu detect > 1 ngôn ngữ (VD: English + Vietnamese)
3. Kiểm tra xem các trường bắt buộc có cả 2 ngôn ngữ không
4. Cảnh báo nếu thiếu bản dịch

**Ví dụ:**
```
❌ Vi phạm:
Product Name: "Organic Green Tea" (English only)
Ingredients: "Water, Green Tea Extract, Sugar" (English only)
→ Nhưng nhãn có text tiếng Việt → Thiếu bản dịch

✅ Đúng:
Product Name: "Organic Green Tea / Trà Xanh Hữu Cơ"
Ingredients: "Water, Green Tea Extract, Sugar / Nước, Chiết xuất Trà Xanh, Đường"
```

**Khắc phục:**
- Thêm bản dịch song song cho tất cả mandatory fields
- Hoặc chỉ dùng một ngôn ngữ duy nhất (khuyến nghị tiếng Anh cho thị trường Mỹ)

### 2. Trạng thái báo cáo

| Trạng thái | Ý nghĩa | Hành động |
|-----------|---------|-----------|
| `pending` | Vừa upload, chưa phân tích | Đợi hệ thống xử lý |
| `processing` | AI đang phân tích | Xem tiến trình |
| `ai_completed` | AI phân tích xong, chờ expert review | Đợi chuyên gia kiểm duyệt |
| `verified` | Đã được chuyên gia xác nhận | Có thể sử dụng kết quả |
| `rejected` | Chuyên gia từ chối, cần phân tích lại | Liên hệ support |
| `error` | Lỗi xử lý | Liên hệ support |

### 3. Độ tin cậy AI (Confidence Score)

- **90-100%**: Rất chắc chắn, citations đầy đủ
- **80-89%**: Tin cậy, có citations
- **70-79%**: Cần kiểm tra, citations ít
- **< 70%**: Đánh dấu cần expert review

**Lưu ý:** Vi phạm do code validation (như nutrition rounding) luôn có độ tin cậy 100%.

---

## Câu hỏi thường gặp

### Câu hỏi về Upload

**Q: Định dạng hình ảnh nào được hỗ trợ?**
A: JPG, PNG. Kích thước tối đa 10MB.

**Q: Tại sao ảnh của tôi bị từ chối?**
A: Có thể do:
- Ảnh mờ, không đọc được
- File quá lớn (>10MB)
- Định dạng không hỗ trợ
- Không phải là nhãn thực phẩm

**Q: Tôi có thể upload nhiều nhãn cùng lúc không?**
A: Hiện tại chỉ upload từng nhãn một. Tính năng batch upload đang phát triển.

**Q: Nhãn song ngữ có được hỗ trợ không?**
A: Có. Nhớ check "Có ngôn ngữ ngoại" và chọn ngôn ngữ thứ hai trong tùy chọn nâng cao.

### Câu hỏi về Kết quả

**Q: AI báo vi phạm nhưng tôi nghĩ đúng rồi, làm sao?**
A: Báo cáo sẽ được chuyên gia Vexim kiểm duyệt lại. Nếu có thắc mắc, liên hệ support.

**Q: Tại sao có vi phạm không có citations?**
A: Một số vi phạm được phát hiện bằng code validation (như nutrition rounding rules) nên không cần citations. Những vi phạm này có độ tin cậy 100%.

**Q: "Needs Expert Review" nghĩa là gì?**
A: AI không đủ tự tin hoặc không tìm thấy citations cho một số vi phạm. Báo cáo sẽ được chuyên gia xem xét trước khi gửi cho bạn.

**Q: Báo cáo mất bao lâu?**
A: 
- AI phân tích: 2-5 phút
- Expert review (nếu cần): 1-2 ngày làm việc

**Q: Kết quả có giá trị pháp lý không?**
A: Báo cáo của Vexim mang tính tư vấn. Quyết định cuối cùng thuộc về FDA và cơ quan quản lý.

### Câu hỏi về Phân loại

**Q: Phải chọn category không?**
A: Không bắt buộc, nhưng khuyến khích. Category giúp AI chọn đúng regulations áp dụng.

**Q: Sản phẩm của tôi thuộc nhiều category thì sao?**
A: Chọn category chính. Ví dụ: Protein shake → Dietary Supplements, không phải Beverages.

**Q: Không biết kích thước nhãn thì sao?**
A: Có thể bỏ qua, nhưng AI sẽ không kiểm tra được font size compliance.

### Câu hỏi về Admin

**Q: Làm sao để có quyền admin?**
A: Liên hệ administrator của Vexim Global để được cấp quyền.

**Q: Expert review bắt buộc cho mọi báo cáo?**
A: Không. Chỉ những báo cáo có `needs_expert_review = true` mới bắt buộc review.

**Q: Tôi có thể tự cập nhật Knowledge Base không?**
A: Có, nếu bạn là admin. Upload tài liệu PDF từ FDA vào `/admin/knowledge`.

**Q: Xóa tài liệu khỏi Knowledge Base có ảnh hưởng gì?**
A: Báo cáo cũ không bị ảnh hưởng. Chỉ các báo cáo mới sẽ không tìm thấy citations từ tài liệu đó.

### Câu hỏi về Bảo mật

**Q: Hình ảnh của tôi có được lưu trữ an toàn không?**
A: Có. Hình ảnh được lưu trên Supabase Storage với RLS (Row Level Security). Chỉ bạn và admin mới truy cập được.

**Q: AI có chia sẻ dữ liệu của tôi không?**
A: Không. Dữ liệu chỉ được sử dụng để phân tích cho bạn.

**Q: Tôi có thể xóa dữ liệu của mình không?**
A: Hiện chưa có tính năng self-service delete. Liên hệ support để yêu cầu xóa dữ liệu.

### Hỗ trợ

**Email support:** support@vexim.global
**Website:** https://vexim.global

---

## Thuật ngữ thường dùng

| Thuật ngữ | Giải thích |
|-----------|------------|
| **FDA** | Food and Drug Administration - Cục Quản lý Thực phẩm và Dược phẩm Hoa Kỳ |
| **CFR** | Code of Federal Regulations - Bộ luật Liên bang |
| **21 CFR** | Phần 21 của CFR, quy định về thực phẩm và dược phẩm |
| **FALCPA** | Food Allergen Labeling and Consumer Protection Act - Luật ghi nhãn chất gây dị ứng |
| **RLS** | Row Level Security - Bảo mật cấp độ hàng trong database |
| **RAG** | Retrieval-Augmented Generation - Kỹ thuật AI tìm kiếm và tạo văn bản |
| **Citation** | Trích dẫn quy định, bằng chứng tham chiếu |
| **Embedding** | Vector hóa văn bản để tìm kiếm semantic |
| **PDP** | Principal Display Panel - Mặt chính của nhãn |
| **Net Quantity** | Trọng lượng tịnh |

---

**Phiên bản:** 1.0  
**Ngày cập nhật:** 05/02/2026  
**© 2026 Vexim Global. All rights reserved.**
