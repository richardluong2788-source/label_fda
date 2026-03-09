export interface LabelImageEntry {
  type: 'pdp' | 'nutrition' | 'ingredients' | 'other'
  url: string
}

// ====== Claims Classification for Dietary Supplements (21 CFR 101.36, DSHEA) ======

/**
 * Classification type for dietary supplement claims
 * Reference: 21 CFR 101.36, DSHEA (Dietary Supplement Health and Education Act)
 */
export type ClaimClassificationType = 
  | 'STRUCTURE_FUNCTION'  // "Supports", "maintains", "promotes" etc. - Requires DSHEA disclaimer & symbol
  | 'FACTUAL'             // Potency, ingredient count, storage instructions - No disclaimer needed
  | 'MARKETING'           // "Third-party tested", "Developed with doctors" - No health claims
  | 'WARRANTY'            // "100% Satisfaction Guarantee" - Not a nutrient content or structure/function claim
  | 'HEALTH'              // Qualified health claims requiring FDA approval
  | 'DISEASE'             // Drug claims (prohibited for supplements)

/**
 * Result of classifying a dietary supplement claim
 */
export interface ClassifiedClaim {
  claim_text: string                // Original text from label
  claim_type: ClaimClassificationType
  severity: 'critical' | 'warning' | 'info'  // How serious is violation/issue
  status: 'compliant' | 'violation' | 'needs_review'
  has_symbol?: boolean              // ‡ or † symbol indicating structure/function
  has_disclaimer?: boolean          // DSHEA disclaimer present for structure/function claims
  description: string               // Human-readable explanation
  regulation_reference?: string     // e.g., "21 CFR 101.36", "DSHEA"
  suggested_fix?: string           // How to fix if non-compliant
}

// ====== Multi-Column Nutrition Facts Types (21 CFR §101.9(b)(12)) ======

/**
 * Column Type Classification for Multi-Column Nutrition Facts
 * Reference: VXG-DEV-SPEC-NF-001 Section 2
 */
export type ColumnType = 
  | 'PER_SERVING'      // Standard per-serving column
  | 'PER_CONTAINER'    // Per-container/package column (§101.9(b)(12))
  | 'AS_PACKAGED'      // As-packaged column for prepared foods (§101.9(b)(9))
  | 'AS_PREPARED'      // As-prepared with additions (e.g., "with milk")
  | 'VARIANT_SKU'      // Variety pack - different product variants (§101.9(h)(1))
  | 'PER_100G'         // International format (EU/Asia imports)
  | 'UNKNOWN'          // Could not determine - requires human review

/**
 * Source of column type classification (audit trail)
 */
export type ColumnTypeSource = 'AI' | 'RULE_BASED' | 'FALLBACK' | 'HUMAN_OVERRIDE'

/**
 * Enhanced Nutrition Facts Column with Column Type Detection
 */
export interface NutritionFactsColumn {
  columnName: string              // Variant/column name: "Cheddar", "Original", "As Prepared"
  columnType?: ColumnType         // Classified column type
  columnTypeSource?: ColumnTypeSource  // How was column type determined (audit trail)
  headerText?: string             // RAW header text from label - never modified
  headerTextNormalized?: string   // Normalized for display/matching
  needsHumanReview?: boolean      // True if column type could not be determined
  reviewReason?: string           // Why human review is needed
  servingSize?: string
  servingsPerContainer?: number
  nutritionFacts: Array<{
    name: string
    value: number
    unit?: string
    dailyValue?: number
    ocrConfidence?: number        // Per-cell OCR confidence (0-1)
    flagReview?: boolean          // True if confidence < 0.75
  }>
  columnConfidence?: number       // Overall confidence for this column (0-1)
}

/**
 * Multi-Column Validation Result with Cross-Column Math Checks
 */
export interface MultiColumnValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  columnIssues: Array<{
    column: string
    missingNutrients: string[]
    inconsistentNutrients: string[]
  }>
  crossColumnMathErrors?: Array<{
    ruleId: string              // e.g., 'NF-MATH-001'
    description: string
    column1: string
    column2: string
    expected: number
    actual: number
  }>
  humanReviewRequired?: boolean
  humanReviewReasons?: string[]
}

export interface AuditReport {
  id: string
  user_id: string
  label_image_url: string
  label_images?: LabelImageEntry[]
  status: 'pending' | 'processing' | 'ai_completed' | 'verified' | 'rejected' | 'error' | 'kb_unavailable'
  overall_result: 'pass' | 'warning' | 'fail' | null
  created_at: string
  updated_at: string
  violations: Violation[]
  progress?: number
  current_step?: string
  needs_expert_review?: boolean
  reviewed_by?: string
  reviewed_at?: string
  review_notes?: string
  citation_count?: number
  version_number?: number
  parent_report_id?: string
  is_latest_version?: boolean
  version_notes?: string
  geometry_violations?: GeometryViolation[]
  contrast_violations?: Array<{
    type: string
    severity: 'critical' | 'warning' | 'info'
    description: string
    ratio?: number
    recommendation?: string
    colors?: { foreground: string; background: string }
  }>
  multilanguage_issues?: Array<{
    hasIssue: boolean
    description: string
    detectedLanguages: string[]
    missingFields: string[]
  }>
  // Phase 1: Vision extraction (awaiting human verification)
  vision_data_verified?: boolean
  vision_data_verified_by?: string
  vision_data_verified_at?: string
  // Phase 2: Full compliance analysis (after verification)
  analysis_phase?: 'vision_extraction' | 'compliance_check' | 'completed'
  double_pass_needed?: boolean // Flag for images needing extra verification
  ocr_confidence?: number // Overall confidence from vision extraction
  extraction_confidence?: number // Confidence in OCR text extraction (0-1)
  legal_reasoning_confidence?: number // Confidence in AI legal analysis (0-1)
  // Risk scoring
  overall_risk_score?: number // 0-10 current risk score
  projected_risk_score?: number // 0-10 risk after fixing critical issues
  risk_assessment?: string // Risk level: Low, Medium, High, Critical
  // Commercial report data
  commercial_summary?: string // Markdown-formatted professional report summary
  expert_tips?: string[] // Expert recommendations from SmartCitationFormatter
  enforcement_insights?: string[] // Enforcement pattern insights from risk engine
  // Manual entry fields
  product_category?: string
  nutrition_facts?: Array<{ nutrient: string; value: number; unit?: string; dailyValue?: number }>
  // Multi-column Nutrition Facts support (variety packs)
  is_multi_column_nutrition?: boolean
  nutrition_facts_columns?: Array<{
    columnName: string
    servingSize?: string
    servingsPerContainer?: number
    nutritionFacts: Array<{ name: string; value: number; unit?: string; dailyValue?: number }>
  }>
  multi_column_validation?: {
    isValid: boolean
    errors: string[]
    warnings: string[]
    columnIssues: Array<{
      column: string
      missingNutrients: string[]
      inconsistentNutrients: string[]
    }>
  }
  ingredient_list?: string
  allergen_declaration?: string
  product_name?: string
  form_data?: Record<string, string>
  // Payment fields
  payment_status?: 'free_preview' | 'paid' | 'expert_review' | 'refunded'
  payment_amount?: number
  payment_method?: string
  payment_id?: string
  paid_at?: string
  report_unlocked?: boolean
  // Advanced analysis settings
  label_language?: string[] // e.g., ['en', 'es'] for bilingual labels
  target_market?: string // 'US' | 'Canada' | 'EU' | 'Multiple'
  pdp_dimensions?: {
    width: number
    height: number
    unit: 'in' | 'cm'
  }
  package_type?: 'bottle' | 'box' | 'pouch' | 'can' | 'jar' | 'bag' | 'other'
  packaging_format?: 'outer_carton' | 'retail_box' | 'individual_unit' | 'multipack_wrapper' | 'single_package'
  net_content?: {
    value: number
    unit: string
    metric_value?: number
    imperial_value?: number
  }
  product_type?: 'food' | 'dietary_supplement' | 'beverage' | 'infant_formula' | 'medical_food' | 'cosmetic' | 'drug_otc'
  target_audience?: 'adults' | 'children' | 'infants' | 'elderly'
  special_claims?: string[] // ['organic', 'non-GMO', 'gluten-free', etc.]
  manufacturer_info?: {
    country_of_origin?: string
    is_importer?: boolean
    facility_registration?: string
    company_name?: string
  }
  font_sizes?: {
    brand_name?: number
    product_identity?: number
    net_content?: number
    nutrition_heading?: number
  }
  unlock_token?: string
}

export interface Violation {
  id?: string
  category: string
  severity: 'critical' | 'warning' | 'info'
  description: string
  regulation_reference: string
  suggested_fix: string
  citations: Citation[]
  confidence_score?: number
  risk_score?: number // 0-10 risk score for this violation
  enforcement_frequency?: number // How many times FDA flagged this in warning letters
  enforcement_context?: string // Recent enforcement examples
  legal_basis?: string // Legal reasoning for the violation
  source_type?: string // e.g. 'warning_letter', 'regulation', 'recall', 'import_alert'
  warning_letter_id?: string // Reference to FDA warning letter if applicable
  import_alert_number?: string // Reference to FDA Import Alert if source_type === 'import_alert'
  /** Raw OCR text from label - NOT AI rewritten. For "Currently on Label" display */
  raw_text_on_label?: string
  
  // ──── Claims Classification Fields (Dietary Supplements) ────
  claim_type?: ClaimClassificationType  // Type of claim: STRUCTURE_FUNCTION, FACTUAL, MARKETING, WARRANTY, etc.
  claim_text?: string                   // The actual claim text from label
  has_disclaimer?: boolean              // For structure/function claims with symbols: is DSHEA disclaimer present?
}

export interface Citation {
  regulation_id: string
  section: string
  text: string
  source: string
  relevance_score: number
  relevance_tier?: 'primary' | 'supporting' | 'related' // Tiered relevance for trust display
}

export interface ComplianceKnowledge {
  id: string
  regulation_id: string
  category: string
  requirement: string
  examples: string
  common_violations: string
  source: string
  created_at: string
}

export interface AnalysisProgress {
  step: string
  progress: number
  message: string
}

export interface NutritionFact {
  name: string
  value: number
  unit: string
  dailyValue?: number
}

export interface NutritionValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface AdminUser {
  user_id: string
  role: 'expert' | 'admin' | 'superadmin'
  can_review: boolean
  created_at: string
}

export interface TextElement {
  text: string
  fontSize: number
  fontWeight: string
  x: number
  y: number
  width: number
  height: number
  area: number
  boundingBox?: {
    x: number
    y: number
    width: number
    height: number
    confidence: number // 0-1, AI confidence in the location
  }
}

export interface GeometryViolation {
  type: 'font_ratio' | 'text_area' | 'placement' | 'prominence'
  severity: 'critical' | 'warning' | 'info'
  description: string
  expected: string
  actual: string
  regulation: string
}

export interface LabelVersion {
  id: string
  original_report_id: string
  version_number: number
  label_image_url: string
  status: string
  overall_result: 'pass' | 'warning' | 'fail' | null
  findings: Violation[]
  geometry_violations: GeometryViolation[]
  created_at: string
  created_by: string
  version_notes?: string
  changes_summary?: Record<string, any>
}

export interface ComparisonSession {
  id: string
  original_report_id: string
  version_a_id: string
  version_b_id: string
  compared_by: string
  comparison_notes?: string
  created_at: string
}

export interface VersionComparison {
  versionA: LabelVersion
  versionB: LabelVersion
  differences: {
    new_violations: Violation[]
    resolved_violations: Violation[]
    modified_violations: Violation[]
    geometry_changes: GeometryViolation[]
  }
}

// ====== FDA Warning Letter Types ======

export interface WarningLetterMetadata {
  document_type: 'FDA Warning Letter'
  letter_id: string
  issue_date: string
  company_name: string
  product_name?: string
  violation_type: string[]
  severity: 'Critical' | 'Major' | 'Minor'
  regulation_violated: string[]
  problematic_claim: string
  why_problematic: string
  correction_required: string
  industry: 'Drug' | 'Food' | 'Cosmetic' | 'Device'
  product_category?: string
  is_example_of_violation: true
  problematic_keywords: string[]
  keywords: string[]
}

export interface WarningLetterViolationChunk {
  content: string
  metadata: WarningLetterMetadata & {
    chunk_index: number
    total_chunks: number
    is_negative_example: true
  }
}

export interface ParsedWarningLetterViolation {
  type: string
  claim: string
  reason: string
  regulation: string
  keywords: string[]
  severity: 'Critical' | 'Major' | 'Minor'
  correction: string
}

export interface WarningLetterSearchResult {
  id: string
  content: string
  similarity: number
  metadata: WarningLetterMetadata
  violation_type: string
  problematic_claim: string
  problematic_keywords: string[]
}

// ====== FDA Recall Types ======

export interface RecallMetadata {
  document_type: 'FDA Recall'
  recall_number: string
  recall_classification: string
  recalling_firm: string
  product_type: string
  product_category?: string
  recall_issue_type: string
  issue_description: string
  why_recalled: string
  preventive_action: string
  regulation_related: string
  severity: 'Critical' | 'Major' | 'Minor'
  is_example_of_violation: true
  problematic_keywords: string[]
  keywords: string[]
}

export interface RecallChunk {
  content: string
  metadata: RecallMetadata & {
    chunk_index: number
    total_chunks: number
    is_negative_example: true
  }
}

export interface ParsedRecallLesson {
  type: string
  issue: string
  reason: string
  regulation: string
  keywords: string[]
  severity: 'Critical' | 'Major' | 'Minor'
  preventive_action: string
}

export interface RecallSearchResult {
  id: string
  content: string
  similarity: number
  metadata: RecallMetadata
  recall_issue_type: string
  problematic_keywords: string[]
}
