# Vexim Internal System - FDA Food Compliance Platform

## System Overview

This is a converted internal FDA food compliance system for Vexim, transformed from a SaaS platform to an enterprise-grade internal system. The platform provides comprehensive FDA food compliance checking and prior notice generation.

## Major Features

### 1. Label Audit Analysis
- Upload product labels (images/PDFs)
- AI-powered vision analysis using Claude
- Automatic compliance checking against FDA regulations
- Detailed violation reports with citations
- Historical report tracking

### 2. Ingredient Check (NEW)
- Real-time ingredient analysis
- FDA restricted ingredient detection
- Allergen identification
- Compliance verification
- Integrated into main navigation menu

### 3. Prior Notice System (NEW)
- FDA Prior Notice Reference Number (PNRN) generation
- Shipment data collection and validation
- Automatic compliance checking
- Allergen disclosure verification
- Restricted ingredient detection
- Comprehensive compliance reports
- PNRN export for FDA submission

### 4. FSVP Module
- Facility registration management
- Product and supplier tracking
- Hazard analysis documentation
- Document request management
- Supplier portal integration

## System Architecture

### Technology Stack
- **Frontend**: Next.js 16 (React 19.2)
- **Backend**: Next.js API routes
- **Database**: Supabase (PostgreSQL)
- **File Storage**: Supabase Storage / Vercel Blob
- **AI/ML**: Claude Vision API, OpenAI embeddings
- **Authentication**: Supabase Auth (now internal only)

### Key Directories
```
app/
├── dashboard/
│   ├── ingredient-check/        # NEW: Ingredient analysis UI
│   ├── prior-notice/            # NEW: Prior notice management
│   ├── fsvp/                    # FSVP module
│   └── ...
├── api/
│   ├── ingredient-check/        # NEW: Ingredient analysis API
│   ├── prior-notice/            # NEW: Prior notice generation API
│   ├── fsvp/                    # FSVP endpoints
│   └── ...
components/
├── ingredient-checker-form.tsx  # NEW: Ingredient input form
├── ingredient-checker-results.tsx # NEW: Analysis results display
├── prior-notice-form.tsx        # NEW: PNRN data entry
├── prior-notice-result.tsx      # NEW: Compliance report
├── prior-notice-list.tsx        # NEW: PNRN listing
└── ...
lib/
├── ingredient-analysis-engine.ts # Existing ingredient analyzer
├── prior-notice-utils.ts        # NEW: PNRN utilities and compliance checks
└── ...
