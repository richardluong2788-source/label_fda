# Vexim Compliance AI - System Documentation

> AI-powered FDA food label compliance platform by Vexim Global.
> Automatically analyzes food labels against FDA regulations using computer vision, RAG (Retrieval-Augmented Generation), and real-time knowledge from FDA Warning Letters.

---

## 1. Platform Overview

**Vexim Compliance AI** is a SaaS platform that helps food manufacturers, importers, and compliance teams verify their product labels against U.S. FDA regulations before going to market.

**Core value proposition:**
- Upload a food label image -> receive a full compliance audit report in minutes
- AI-powered analysis backed by real FDA regulations and Warning Letter data
- Reduces manual compliance review from days to minutes
- Catches violations that human reviewers commonly miss

**Target users:**
- Food manufacturers exporting to the U.S. market
- Regulatory affairs teams at food companies
- Quality assurance managers
- Third-party compliance consultants

---

## 2. System Architecture

```
User uploads label image
        |
        v
+-----------------------------------------------+
|           ANALYSIS ENGINE (4 Phases)           |
|                                                |
|  Phase 1: GPT-4o Vision                        |
|    - OCR text extraction                       |
|    - Nutrition facts parsing                   |
|    - Claims detection                          |
|    - Allergen identification                   |
|    - Color extraction (foreground/background)  |
|    - Bounding box + confidence scoring         |
|    - Anti-hallucination validation (9 checks)  |
|                                                |
|  Phase 2: Dual-Query RAG                       |
|    - Vector search: FDA regulations (positive) |
|    - Vector search: Warning Letters (negative) |
|    - Hybrid scoring: semantic + keyword boost  |
|                                                |
|  Phase 3: Rule-Based Validation Modules        |
|    - NutritionValidator (FDA rounding rules)   |
|    - ClaimsValidator (prohibited/restricted)   |
|    - VisualGeometryAnalyzer (font size/ratio)  |
|    - ContrastChecker (text readability)        |
|    - DimensionConverter (physical vs pixel)    |
|    - ViolationToCFRMapper (auto-map to CFR)    |
|                                                |
|  Phase 4: Report Generation                    |
|    - SmartCitationFormatter                    |
|    - Professional findings with legal basis    |
|    - Expert tips and remediation guidance      |
|    - Commercial summary for stakeholders       |
+-----------------------------------------------+
        |
        v
  Audit Report with violations, citations,
  severity scores, and suggested fixes
```

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React, Tailwind CSS, shadcn/ui |
| AI / Vision | GPT-4o (vision), GPT-4o-mini (parsing), text-embedding-3-small |
| Database | Supabase (PostgreSQL + pgvector) |
| Vector Search | pgvector with cosine similarity + hybrid keyword boosting |
| Storage | Supabase Storage (label images) |
| Auth | Supabase Auth (email/password, admin roles) |
| Deployment | Vercel (serverless functions, cron jobs) |

---

## 3. AI Analysis Engine - Detail

### 3.1 Vision Extraction (GPT-4o)

The system uses GPT-4o with `detail: high` and `temperature: 0` (deterministic) to perform OCR on food label images. Key extractions:

- **Nutrition Facts**: Every nutrient with exact values, units, and %DV
- **Text Elements**: Brand name, product name, net quantity - each with font size, position, bounding box coordinates, foreground/background colors, and confidence score
- **Health Claims**: Any claim text detected on the label
- **Ingredients & Allergens**: Full ingredient list and allergen declarations
- **Languages**: Multi-language detection for bilingual labels

**Anti-hallucination system** (9 validation checks):
1. Minimum text extraction threshold
2. Nutrition facts presence vs. indicator text
3. Sufficient data extraction check
4. Nutrition facts structure validation
5. Bounding box confidence check (rejects text below 0.3 confidence)
6. Overall confidence threshold (flags below 0.6)
7. Ingredient hallucination detection (clears if no "Ingredients:" label found)
8. Font size sanity check (auto-corrects fontSize: 0 for visible text)
9. Product type vs. nutrition value consistency (catches adult values on infant products)

### 3.2 Dual-Query RAG

The knowledge base is queried in two parallel streams:

**Positive stream (Regulations):**
- Searches `compliance_knowledge` for matching FDA regulations (21 CFR)
- Returns regulation text, section references, and relevance scores
- Used to build citations for the audit report

**Negative stream (Warning Letters):**
- Searches for FDA Warning Letter violations with similar language
- Returns red-flag keywords, problematic claims, and correction requirements
- Injected into the analysis prompt as "patterns to watch for"
- If the label contains matching red-flag phrases, a specific violation is raised

Both streams use **hybrid search**: vector similarity (cosine) + keyword matching with score boosting.

### 3.3 Validation Modules

| Module | What it checks | Regulation basis |
|--------|---------------|-----------------|
| **NutritionValidator** | FDA rounding rules for all nutrients, serving size format | 21 CFR 101.9(c) |
| **ClaimsValidator** | Prohibited disease claims, restricted health claims, drug-like language, structure/function claims without disclaimer | 21 CFR 101.14, 101.93, FD&C Act |
| **VisualGeometryAnalyzer** | Font size minimums based on PDP area, brand-to-product name ratio, net quantity prominence | 21 CFR 101.105, 101.7 |
| **ContrastChecker** | Text-to-background color contrast ratio using WCAG-inspired thresholds | FDA readability guidance |
| **DimensionConverter** | Physical-to-pixel ratio calculation, actual font size in inches | 21 CFR 101.105 |
| **ViolationToCFRMapper** | Auto-maps detected issues to specific CFR sections with confidence scoring | All applicable CFR |

### 3.4 Report Output

Each audit report includes:
- **Overall result**: Pass / Warning / Fail
- **Violations list**: Each with category, severity (critical/warning/info), description, CFR reference, suggested fix, and citations from the knowledge base
- **Warning Letter matches**: If the label language matches patterns from real FDA Warning Letters
- **Commercial summary**: Professional report suitable for stakeholders
- **Expert tips**: Actionable remediation guidance
- **Cost tracking**: AI tokens used and estimated cost per analysis

---

## 4. Knowledge Base

### 4.1 Structure

The knowledge base lives in the `compliance_knowledge` table with pgvector embeddings (1536 dimensions, `text-embedding-3-small`).

Two types of knowledge:

| Type | Purpose | Source |
|------|---------|--------|
| **Regulations** | Positive examples - "what the rules are" | 21 CFR Parts 101-199, FD&C Act, FALCPA |
| **Warning Letters** | Negative examples - "what NOT to do" | FDA Warning Letters (real enforcement actions) |

### 4.2 Warning Letter Processing

Each Warning Letter is parsed by GPT-4o-mini into individual **violation chunks**. Each chunk contains:
- The exact problematic claim
- Why FDA flagged it
- Which regulation was violated
- Red-flag keywords (used for label matching)
- Severity rating
- Required correction

This violation-based chunking (vs. paragraph-based) ensures high relevance in vector search - each chunk focuses on one specific regulatory issue.

### 4.3 Search Architecture

```
User's label text + product category
        |
        v
  Generate embedding (text-embedding-3-small)
        |
        +---> match_compliance_knowledge_deduplicated()
        |       - Cosine similarity > 0.35
        |       - Deduplicated by metadata.section
        |       - Keyword boost: +0.15 per match
        |       - Exact phrase boost: +0.25
        |
        +---> match_compliance_knowledge() [Warning Letters]
                - Cosine similarity > 0.30
                - Filter: document_type = 'FDA Warning Letter'
                - Keyword boost: +0.10 per match
                - Red-flag keyword boost: +0.20 per match
```

---

## 5. FDA Warning Letter Auto-Fetch Pipeline

### 5.1 Problem

FDA publishes Warning Letters publicly at [fda.gov/warning-letters](https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/warning-letters). Previously, admins had to manually copy letter content and POST to the import API - not scalable.

### 5.2 Solution: Semi-Automated Pipeline

```
  [Vercel Cron - Daily 6AM UTC]
          |
          v
  1. Fetch FDA listing page (last 30 days)
          |
          v
  2. Parse HTML table -> extract metadata + URLs
          |
          v
  3. Dedup against pending_warning_letters DB
          |
          v
  4. Fetch individual letter pages -> extract text
          |  (2-second delay between requests)
          v
  5. Save to pending_warning_letters (status: pending_review)
          |
          v
  [Admin Dashboard - /admin/knowledge/fda-pipeline]
          |
          v
  6. Admin reviews extracted content
          |
     +----+----+
     |         |
  Approve   Reject
     |
     v
  7. AI Pipeline: GPT-4o-mini parses violations
          |
          v
  8. Generate embeddings (batch)
          |
          v
  9. Insert into compliance_knowledge
```

### 5.3 Why Semi-Automated (not fully automated)?

- FDA Warning Letter HTML format is **not standardized** across issuing offices
- AI parsing can make mistakes - admin verification ensures knowledge base quality
- FDA can change page structure at any time - human oversight catches scraping issues
- **Quality over quantity** for RAG knowledge base

### 5.4 Database Tables

**`pending_warning_letters`**
- Stores letters fetched from FDA with full metadata
- Status flow: `pending_review` -> `approved` -> `processing` -> `imported` (or `rejected` / `fetch_failed`)
- Unique constraint on `letter_id` prevents duplicates
- Tracks: fetch method, review history, import results, violation count

**`fda_fetch_log`**
- Logs every cron run with: letters found/new/skipped/failed, duration, errors
- Used for monitoring and debugging the pipeline

### 5.5 Admin Dashboard Features

Accessible at `/admin/knowledge/fda-pipeline`:

- **6 status tabs**: Pending Review, Approved, Imported, Rejected, Failed, All
- **Letter preview**: Full extracted text with metadata (company, date, office, URL)
- **Bulk actions**: Select multiple letters -> approve or reject in one click
- **1-click import**: Approve -> triggers AI violation parsing -> embeddings -> knowledge base
- **Manual fetch**: Trigger the cron job on-demand from the dashboard
- **Retry failed**: Re-attempt content extraction for failed fetches
- **Fetch logs**: View history of all cron runs with statistics

---

## 6. User Flows

### 6.1 End User Flow

```
1. Sign up / Login
2. Upload food label image
3. (Optional) Provide physical dimensions for accurate font size checks
4. AI analyzes label:
   - Vision extraction -> Human verification (if low confidence)
   - Full compliance analysis with RAG
5. Receive audit report:
   - Violations with severity ratings
   - CFR citations from knowledge base
   - Warning Letter pattern matches
   - Suggested fixes
6. Download/share report
7. Upload corrected label -> version comparison
```

### 6.2 Admin Flow

```
1. Login with admin role (expert/admin/superadmin)
2. Knowledge Management (/admin/knowledge):
   - View/edit/delete knowledge base entries
   - Bulk import regulations
   - Manual Warning Letter import (legacy)
3. FDA Pipeline (/admin/knowledge/fda-pipeline):
   - Review auto-fetched Warning Letters
   - Approve/reject -> import to knowledge base
   - Monitor cron job health via fetch logs
4. Audit Review (/admin):
   - Review AI-generated audit reports
   - Expert verification for low-confidence findings
   - Approve/reject reports
```

---

## 7. API Reference

### Analysis
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analyze` | POST | Run FDA compliance analysis on a label image |

### Knowledge Base
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/knowledge/warning-letters` | POST | Manual Warning Letter import (legacy) |
| `/api/knowledge/warning-letters` | GET | List imported Warning Letters |
| `/api/knowledge/bulk-import` | POST | Bulk import regulations |

### FDA Pipeline
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/cron/fetch-warning-letters` | GET/POST | Fetch new letters from FDA (cron or manual) |
| `/api/knowledge/pending-letters` | GET | List pending letters with status filter |
| `/api/knowledge/pending-letters` | PATCH | Update letter status (approve/reject) |
| `/api/knowledge/pending-letters/import` | POST | Import approved letter(s) through AI pipeline |
| `/api/knowledge/pending-letters/logs` | GET | Fetch cron job run logs |

### Cron Jobs
| Schedule | Endpoint | Description |
|----------|----------|-------------|
| Daily 6AM UTC | `/api/cron/fetch-warning-letters` | Auto-fetch new FDA Warning Letters |
| Daily 2AM UTC | `/api/cron/cleanup-bulk-imports` | Clean up old bulk import records |

---

## 8. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Violation-based chunking** (not paragraph-based) for Warning Letters | Each chunk = 1 violation = higher relevance in vector search |
| **Dual-query RAG** (regulations + warnings in parallel) | Catches both "what's required" and "what's been flagged before" |
| **Semi-automated pipeline** (not full-auto) | Quality control - admin verifies before AI-parsed data enters knowledge base |
| **Hybrid search** (vector + keyword boost) | Pure semantic search misses exact regulation references; keyword boost ensures precision |
| **Anti-hallucination checks** (9 validation layers) | GPT-4o can hallucinate nutrition values - multi-layer validation catches inconsistencies |
| **Temperature 0 + fixed seed** for vision analysis | Maximizes reproducibility across runs |
| **Service role for cron/pipeline** (not user auth) | Cron jobs run without user context; service role bypasses RLS |

---

## 9. Deployment & Configuration

**Environment variables required:**
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` - Database
- `OPENAI_API_KEY` - AI analysis (GPT-4o, GPT-4o-mini, embeddings)
- `CRON_SECRET` - Vercel cron job authentication

**Vercel configuration** (`vercel.json`):
- Cron jobs defined with schedule expressions
- `maxDuration: 300` (5 min) for AI-heavy routes

**Database setup:**
- PostgreSQL with pgvector extension
- Migration scripts in `scripts/` directory (numbered sequentially)
- RLS policies: service_role for backend operations, authenticated for user-facing

---

*Document version: February 2026 | Vexim Global*
