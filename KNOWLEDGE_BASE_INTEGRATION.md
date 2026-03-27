# Knowledge Base Admin - Tích hợp hoàn chỉnh

## Tổng quan

Hệ thống Knowledge Base Admin cho phép quản trị viên Vexim tải lên, quản lý và tìm kiếm tài liệu tuân thủ FDA sử dụng RAG (Retrieval-Augmented Generation) với vector embeddings.

## Kiến trúc hệ thống

### 1. Database Schema

**Bảng: `compliance_knowledge`**
```sql
- id: uuid (primary key)
- regulation_id: text (VD: "21 CFR 101.9")
- title: text
- content: text (full regulatory text)
- category: text (Beverage, Supplement, Meat, etc.)
- sub_category: text
- effective_date: date
- source_url: text
- embedding: vector(1536) -- OpenAI ada-002 embeddings
- metadata: jsonb
- created_at, updated_at: timestamp
```

**Vector Search Function:**
- `search_knowledge(query_embedding, category, limit)`: Semantic search sử dụng cosine similarity
- `get_knowledge_stats()`: Thống kê knowledge base

### 2. Upload Pipeline

**Quy trình tải lên tài liệu:**

1. **Input**: Admin nhập nội dung qua form
   - Tiêu đề
   - Nội dung (regulation text)
   - Category (Beverage, Supplement, Meat, etc.)
   - Doc type (CFR_Law, FDA_Guidance, Internal_Checklist, etc.)
   - Section number (VD: "21 CFR 101.9")
   - Severity (Critical, Warning, Info)

2. **Chunking**: Content được chia nhỏ thành chunks 500 từ với overlap 50 từ
   - Giữ nguyên context
   - Tối ưu cho embedding

3. **Embedding Generation**: 
   - Sử dụng OpenAI `text-embedding-ada-002`
   - Vector 1536 dimensions
   - Lưu vào Supabase với pgvector extension

4. **Storage**: Lưu vào `compliance_knowledge` table với full-text search index

### 3. RAG Integration

**Trong AI Analysis Flow:**

```typescript
// Step 1: Extract text từ label (OCR)
const labelText = extractTextFromImage(image)

// Step 2: Retrieve relevant regulations từ KB
const regulatoryContext = await getRelevantContext(
  labelText,
  productCategory // Beverage, Supplement, etc.
)

// Step 3: Feed vào AI model với RAG-Strict prompt
const prompt = `
${RAG_STRICT_PROMPT}

Regulatory Context:
${regulatoryContext.map(doc => doc.content).join('\n\n')}

Label Text:
${labelText}

Task: Analyze compliance and cite sources
`

// Step 4: AI returns violations với citations
const violations = await analyzeWithAI(prompt)
```

### 4. API Endpoints

#### `/api/knowledge/upload` (POST)
Upload tài liệu mới và generate embeddings
```json
{
  "content": "The serving size declaration...",
  "metadata": {
    "title": "FDA Nutrition Labeling Guide",
    "industry": "Beverage",
    "doc_type": "FDA_Guidance",
    "section": "21 CFR 101.9",
    "severity": "Critical",
    "source": "FDA.gov"
  }
}
```

#### `/api/knowledge` (GET)
Lấy danh sách tài liệu với filter
```
Query params: ?category=Beverage&search=serving+size
```

#### `/api/knowledge` (DELETE)
Xóa tài liệu
```
Query params: ?id=uuid
```

#### `/api/knowledge/search` (POST)
Semantic search với vector similarity
```json
{
  "query": "serving size requirements for beverages",
  "category": "Beverage",
  "limit": 5
}
```

### 5. UI Components

**Trang Admin: `/admin/knowledge`**
- Upload form với đầy đủ metadata fields
- Danh sách tài liệu với filters (category, doc_type)
- Search box cho full-text search
- Actions: View, Edit, Delete

**Features:**
- ✅ Multi-category support
- ✅ Document type classification
- ✅ Severity tagging
- ✅ Section numbering
- ✅ Source tracking
- ✅ Full-text search
- ✅ Vector semantic search
- ✅ Stats dashboard

## Workflow sử dụng

### Cho Admin (Vexim internal team)

1. **Upload regulations:**
   - Login vào `/admin`
   - Click "Knowledge Base"
   - Click "Nạp tài liệu mới"
   - Nhập metadata và content
   - Click "Tải lên và Embedding"

2. **Quản lý tài liệu:**
   - Browse danh sách
   - Filter theo category/doc_type
   - Search full-text
   - Delete outdated docs

3. **Monitor coverage:**
   - Xem stats by category
   - Track số lượng tài liệu
   - Last updated timestamp

### Cho AI System

1. **Khi analyze label:**
   - Extract product category
   - Query knowledge base với semantic search
   - Retrieve top 5 relevant regulations
   - Feed vào AI prompt với RAG-Strict mode

2. **Citation generation:**
   - AI phải trích dẫn từ retrieved context
   - Không được hallucinate regulations
   - Mỗi violation phải có regulation_id + quote

## Lợi ích

### 1. Chống Hallucination
- AI chỉ được cite từ KB
- Grounded trong factual documents
- Traceable sources

### 2. Easy Updates
- Admin tự update regulations
- Không cần retrain AI
- Immediate effect

### 3. Multi-category Support
- Mỗi ngành có regulations riêng
- Targeted retrieval
- Reduced noise

### 4. Audit Trail
- Mỗi violation có source_url
- Customer có thể verify
- Compliance transparency

## Triển khai

### Database Migration
```bash
# Run trong Supabase SQL Editor:
1. scripts/001_create_tables.sql
2. scripts/005_vector_search_function.sql
```

### Environment Variables
```env
OPENAI_API_KEY=sk-... # Cho embeddings
```

### Access Control
- Chỉ admin users có quyền upload/delete
- Check `admin_users` table
- RLS policies protect data

## Best Practices

### Upload Guidelines
1. **Chunk size**: 500 words optimal
2. **Overlap**: 50 words giữa chunks
3. **Title**: Descriptive, include regulation ID
4. **Category**: Chính xác để improve retrieval
5. **Section**: Full citation (VD: "21 CFR 101.9(b)(5)")

### Maintenance
1. **Regular updates**: Khi FDA release new guidance
2. **Deduplication**: Check trùng lặp trước khi upload
3. **Version control**: Note effective_date cho updates
4. **Source URLs**: Always include để customers verify

## Roadmap

### Phase 2 (Planned)
- [ ] Bulk upload từ PDF/DOCX files
- [ ] Auto-categorization với AI
- [ ] Version history cho documents
- [ ] Approval workflow (draft → review → published)
- [ ] Analytics: Most cited regulations
- [ ] Multi-language support (Vietnamese regulations)

## Support

Nếu gặp vấn đề:
1. Check database logs cho embedding errors
2. Verify OPENAI_API_KEY configured
3. Test vector search với simple query
4. Check pgvector extension enabled

---

**Tài liệu này mô tả đầy đủ Knowledge Base Admin system đã được tích hợp vào Vexim Compliance AI.**
