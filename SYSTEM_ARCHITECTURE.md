# Vexim System Architecture

## System Overview Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     VEXIM INTERNAL SYSTEM                       │
│                   FDA Food Compliance Platform                  │
└─────────────────────────────────────────────────────────────────┘

                         ┌──────────────────┐
                         │   User Interface │
                         │   (Next.js/React)│
                         └────────┬─────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
    ┌─────────────┐         ┌──────────────┐        ┌──────────────┐
    │  Dashboard  │         │   Analyze    │        │   Settings   │
    │  (Home)     │         │  (Label Scan)│        │              │
    └─────────────┘         └──────────────┘        └──────────────┘
        │                         │
        ├─►┌────────────────┐     └─►┌──────────────────┐
        │  │ Ingredient     │        │ AI Vision        │
        │  │ Check (NEW)    │        │ Analysis         │
        │  └────────────────┘        └──────────────────┘
        │
        ├─►┌────────────────┐
        │  │ Prior Notice   │
        │  │ System (NEW)   │
        │  └────────────────┘
        │      ├─► Form Entry
        │      ├─► PNRN Generation
        │      └─► Compliance Check
        │
        └─►┌────────────────┐
           │ FSVP Module    │
           │ (Existing)     │
           └────────────────┘

                         │
                         ▼
          ┌──────────────────────────────┐
          │     API Layer (Next.js)      │
          │  Route Handlers & Business   │
          │        Logic                 │
          └────────────┬─────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
    ┌─────────┐  ┌──────────┐  ┌──────────────┐
    │ Analysis│  │  Prior   │  │  FSVP & File │
    │ Engines │  │  Notice  │  │  Management  │
    │         │  │  Logic   │  │              │
    └────┬────┘  └──────┬───┘  └──────┬───────┘
         │              │             │
         └──────────────┼─────────────┘
                        │
                        ▼
          ┌──────────────────────────────┐
          │     Supabase Backend         │
          │  (PostgreSQL + Storage)      │
          └────────────┬─────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
    ┌─────────┐  ┌──────────┐  ┌──────────────┐
    │  Users/ │  │ Prior    │  │  FSVP/       │
    │  Audit  │  │ Notices  │  │  Products    │
    │  Reports│  │          │  │              │
    └─────────┘  └──────────┘  └──────────────┘
```

---

## Data Flow: Prior Notice System

```
User Input
    │
    ▼
┌─────────────────────────┐
│ Prior Notice Form       │
│ - Shipment details      │
│ - Product info          │
│ - Ingredients           │
│ - Allergens declared    │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Input Validation        │
│ - Check required fields │
│ - Validate dates        │
│ - Verify formats        │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Generate PNRN           │
│ Format: PNRN-YYYYMMDD-X │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ Compliance Checking Engine      │
│                                 │
│ ├─ Check restricted ingredients │
│ ├─ Verify allergen declarations │
│ ├─ Validate transit times       │
│ └─ Generate compliance status   │
└────────────┬────────────────────┘
             │
             ▼
    ┌────────────────────┐
    │ Store in Database  │
    │ - prior_notices    │
    │ - compliance_checks│
    └────────┬───────────┘
             │
             ▼
┌────────────────────────────────┐
│ Display Compliance Report      │
│ Status: Compliant/Conditional/ │
│         Non-Compliant          │
│                                │
│ - Issues found                 │
│ - Warnings issued              │
│ - Recommendations              │
│ - PNRN for submission          │
└────────────────────────────────┘
```

---

## Database Schema

```
prior_notices
├── id (PK)
├── pnrn (UNIQUE)
├── user_id (FK)
├── product_name
├── product_type
├── shipper_name
├── shipper_country
├── shipper_address
├── consignee_name
├── consignee_state
├── consignee_address
├── shipment_date
├── estimated_arrival_date
├── quantity
├── unit
├── compliance_status
├── created_at
└── updated_at

prior_notice_items
├── id (PK)
├── notice_id (FK → prior_notices)
├── ingredient
├── allergen
└── notes

compliance_checks
├── id (PK)
├── notice_id (FK → prior_notices)
├── check_type (restricted_ingredient|allergen_disclosure)
├── result (pass|fail|warning)
├── details
└── checked_at

prior_notice_documents
├── id (PK)
├── notice_id (FK → prior_notices)
├── file_path
├── file_type
└── uploaded_at
```

---

## API Endpoint Structure

```
/api/
├── ingredient-check/
│   └── POST → Analyze ingredients
│
├── prior-notice/
│   ├── generate/
│   │   └── POST → Create PNRN & check compliance
│   │
│   ├── list/
│   │   └── GET → List all user's PNRNs
│   │
│   └── [id]/
│       ├── GET → Get PNRN details
│       └── DELETE → Delete PNRN
│
└── ... (other endpoints)
```

---

## Component Hierarchy

```
DashboardLayout
│
├── AppHeader (Navigation)
│   ├── Home Link
│   ├── Analyze Link
│   ├── Ingredient Check Link (NEW)
│   ├── Prior Notice Link (NEW)
│   ├── History Link
│   ├── FSVP Link
│   ├── Guide Link
│   └── Settings Link
│
└── PageContent
    │
    └── (Selected Route Component)
        │
        ├── Ingredient Check
        │   ├── IngredientCheckerForm
        │   └── IngredientCheckerResults
        │
        └── Prior Notice
            ├── PriorNoticeForm
            ├── PriorNoticeResult
            └── PriorNoticeList
```

---

## External Integration Points

```
┌─────────────────┐
│  Supabase       │
│  - Auth         │
│  - Database     │
│  - Storage      │
└────────┬────────┘
         │
         ├─ User Management
         ├─ Data Persistence
         ├─ File Storage
         └─ Real-time Updates

┌─────────────────┐
│  OpenAI/Claude  │
│  - Vision API   │
│  - Embeddings   │
└────────┬────────┘
         │
         └─ Label Image Analysis

┌─────────────────┐
│  FDA Systems    │
│  (Future)       │
│  - PNRN Submit  │
│  - Regulations  │
└─────────────────┘
```

---

## Compliance Rules Engine

```
User Input (Ingredients + Allergens)
    │
    ├──────────────────────┐
    │                      │
    ▼                      ▼
Restricted Ingredient    Allergen
Check                    Declaration Check
│                        │
├─ Safrole              ├─ Big 9 Detection
├─ Sassafras            ├─ Declaration Match
├─ Coumarin             ├─ Undeclared Check
├─ Calamus              └─ Severity Rating
├─ Cyclamate
├─ Cycad
├─ Bracken fern
└─ Thiouracil

    │                      │
    └──────────┬───────────┘
               │
               ▼
    Status Determination
    ├─ Compliant (✓)
    ├─ Conditional (⚠)
    └─ Non-Compliant (✗)
```

---

## Deployment Architecture

```
Development
    ↓
   (Local Testing)
    ↓
Staging
    ↓
   (QA Testing)
    ↓
Production
    ├─ Vercel (Frontend/API)
    ├─ Supabase (Database)
    └─ Blob Storage (Files)
```

---

## Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 16, React 19.2, TypeScript | UI & Client Logic |
| **Backend** | Next.js API Routes, TypeScript | Server Logic & Processing |
| **Database** | Supabase (PostgreSQL) | Data Persistence |
| **Storage** | Supabase Storage / Vercel Blob | File Management |
| **AI/ML** | Claude Vision, OpenAI | Image & Text Analysis |
| **Authentication** | Supabase Auth | User Management |
| **Styling** | Tailwind CSS, Shadcn/UI | UI Components |
| **Deployment** | Vercel | Production Hosting |

---

Generated: 2025-03-27
Purpose: System Architecture Reference
