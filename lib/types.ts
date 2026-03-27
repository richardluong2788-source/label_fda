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
  
  // ──── Recall-specific Fields (FDA Enforcement Reports) ────
  recall_number?: string           // FDA official recall number (e.g., "H-0460-2026")
  recalling_firm?: string          // Company name that issued recall
  recall_classification?: string   // "Class I" | "Class II" | "Class III"
  recall_reason?: string           // Why the product was recalled
  preventive_action?: string       // Recommended preventive action
  
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

// ====== FSVP (Foreign Supplier Verification Program) Types ======
// Reference: 21 CFR Part 1, Subpart L (§1.500-§1.514)

/**
 * FSVP Requirement definition
 */
export interface FSVPRequirement {
  id: string
  cfrSection: string
  title: string
  description: string
  isMandatory: boolean
  verificationMethod: 'document' | 'audit' | 'testing' | 'certification'
}

/**
 * SAHCODHA (Serious Adverse Health Consequences or Death) Category
 * Per 21 CFR 1.506(d) - requires annual onsite audit
 */
export interface SAHCODHACategory {
  hazards: string[]
  requiresAnnualAudit: boolean
  cfrReference: string
}

/**
 * FSVP Supplier record
 */
export interface FSVPSupplier {
  id: string
  importer_user_id: string
  supplier_name: string
  supplier_country: string
  supplier_address?: string
  supplier_fei?: string        // FDA Establishment Identifier
  supplier_duns?: string       // D-U-N-S Number (9 digits)
  supplier_contact_name?: string
  supplier_contact_email?: string
  supplier_contact_phone?: string
  product_categories: string[]
  primary_products?: string[]
  hazard_analysis: Record<string, unknown>
  supplier_evaluation: Record<string, unknown>
  verification_activities: FSVPVerificationActivity[]
  corrective_actions: FSVPCorrectiveAction[]
  status: 'pending_review' | 'approved' | 'conditionally_approved' | 'suspended' | 'removed'
  approval_date?: string
  last_verification_date?: string
  next_verification_due?: string
  is_sahcodha_risk: boolean
  sahcodha_hazards: string[]
  sahcodha_assessment_date?: string
  requires_annual_audit: boolean
  last_onsite_audit_date?: string
  next_onsite_audit_due?: string
  created_at: string
  updated_at: string
}

/**
 * FSVP Verification Activity
 */
export interface FSVPVerificationActivity {
  id: string
  supplier_id: string
  activity_type: 'onsite_audit' | 'third_party_audit' | 'sampling_testing' | 'document_review' | 'annual_onsite_audit' | 'corrective_action_followup'
  activity_date: string
  conducted_by: string
  findings: Record<string, unknown>
  result: 'passed' | 'passed_with_conditions' | 'failed' | 'pending_review'
  documents: Array<{ filename: string; url: string; uploaded_at: string }>
  notes?: string
  requires_followup: boolean
  followup_due_date?: string
  followup_completed: boolean
  created_at: string
}

/**
 * FSVP Corrective Action
 */
export interface FSVPCorrectiveAction {
  id: string
  issue_identified: string
  issue_date: string
  action_taken: string
  action_date: string
  responsible_party: string
  verification_of_correction?: string
  verified_date?: string
  status: 'pending' | 'in_progress' | 'completed' | 'verified'
}

/**
 * FSVP Hazard Analysis (21 CFR 1.504)
 */
export interface FSVPHazardAnalysis {
  id: string
  supplier_id: string
  product_name: string
  product_category?: string
  product_description?: string
  known_hazards: HazardEntry[]
  biological_hazards: HazardEntry[]
  chemical_hazards: HazardEntry[]
  physical_hazards: HazardEntry[]
  radiological_hazards: HazardEntry[]
  is_sahcodha_product: boolean
  sahcodha_justification?: string
  control_measures: ControlMeasure[]
  supplier_controls: Record<string, unknown>
  analysis_date: string
  analyzed_by: string
  qualified_individual_credentials?: string
  status: 'draft' | 'active' | 'superseded' | 'archived'
  created_at: string
  updated_at: string
}

export interface HazardEntry {
  hazard_name: string
  hazard_description: string
  likelihood: 'low' | 'medium' | 'high'
  severity: 'low' | 'medium' | 'high' | 'sahcodha'
  is_reasonably_foreseeable: boolean
  source?: string
  control_at_supplier: boolean
}

export interface ControlMeasure {
  hazard_addressed: string
  control_type: string
  description: string
  responsible_party: 'supplier' | 'importer' | 'both'
  verification_method: string
  frequency: string
}

/**
 * FSVP Dossier Export (for 24-hour FDA compliance per 21 CFR 1.510)
 */
export interface FSVPDossierExport {
  id: string
  importer_user_id: string
  export_type: 'full_program' | 'supplier_specific' | 'product_specific' | 'fda_request'
  supplier_ids: string[]
  product_ids: string[]
  pdf_url?: string
  json_backup_url?: string
  export_size_bytes?: number
  requested_at: string
  generated_at?: string
  generation_time_ms?: number
  is_fda_request: boolean
  fda_request_date?: string
  fda_request_reference?: string
  delivered_to_fda_at?: string
  status: 'pending' | 'generating' | 'completed' | 'failed'
  error_message?: string
}

/**
 * FSVP Violation types for analysis
 */
export type FSVPViolationType = 
  | 'FSVP-001' // Missing DUNS
  | 'FSVP-002' // No Qualified Individual
  | 'FSVP-003' // Missing hazard analysis
  | 'FSVP-004' // Verification overdue
  | 'FSVP-005' // SAHCODHA audit overdue
  | 'FSVP-006' // Missing supplier evaluation
  | 'FSVP-007' // Recordkeeping deficiency

/**
 * FSVP Compliance Check Result
 */
export interface FSVPComplianceResult {
  isApplicable: boolean
  isCompliant: boolean
  violations: FSVPViolationItem[]
  warnings: FSVPViolationItem[]
  supplierStatus?: {
    supplierId: string
    supplierName: string
    status: string
    verificationDue?: string
    isOverdue: boolean
  }
  sahcodhaAssessment?: {
    isHighRisk: boolean
    requiredVerification: 'annual_onsite' | 'periodic' | 'standard'
    hazards: string[]
    rationale: string
  }
}

export interface FSVPViolationItem {
  id: FSVPViolationType
  category: string
  severity: 'critical' | 'warning' | 'info'
  description: string
  regulation_reference: string
  suggested_fix: string
}

/**
 * Importer Profile (FSVP-specific fields in user profile)
 */
export interface FSVPImporterProfile {
  importer_duns?: string
  importer_duns_verified: boolean
  importer_duns_verified_at?: string
  fsvp_qualified_individual?: string
  fsvp_qi_title?: string
  fsvp_qi_credentials: {
    education?: string
    certifications?: string[]
    training_completed?: Array<{
      course_name: string
      completion_date: string
      provider: string
    }>
    years_experience?: number
  }
  fsvp_program_active: boolean
  fsvp_program_established_date?: string
  fsvp_last_dossier_export?: string
}

// ============================================================================
// FSVP Records Types (Per 21 CFR Part 1 Subpart L)
// ============================================================================

export type FSVPComplianceStatus = 
  | 'draft'        // FSVP record created but not yet active
  | 'pending'      // Awaiting supplier documents/verification
  | 'active'       // FSVP fully compliant and active
  | 'needs_review' // Requires re-evaluation (e.g., regulation change)
  | 'suspended'    // Temporarily suspended due to issues
  | 'archived'     // No longer importing this product

export type FSVPRiskLevel = 'low' | 'medium' | 'high' | 'sahcodha'

export interface FSVPRecord {
  id: string
  importer_user_id: string
  supplier_id: string
  
  // Product information
  product_name: string
  product_description?: string
  product_category?: string
  fda_product_code?: string
  hs_code?: string
  country_of_origin?: string
  
  // Risk assessment
  risk_level: FSVPRiskLevel
  is_sahcodha: boolean
  hazard_types: string[]
  
  // Compliance tracking
  compliance_status: FSVPComplianceStatus
  compliance_score: number
  
  // Linked records
  hazard_analysis_id?: string
  primary_qi_user_id?: string
  linked_audit_report_id?: string
  
  // Verification schedule
  verification_frequency: string
  last_verification_date?: string
  next_verification_due?: string
  
  // Notes and metadata
  notes?: string
  tags: string[]
  
  // Timestamps
  created_at: string
  updated_at: string
  
  // Joined data (from view)
  supplier_name?: string
  supplier_country?: string
  supplier_email?: string
  supplier_fda_number?: string
  total_checklist_items?: number
  completed_checklist_items?: number
}

export interface FSVPRecordActivity {
  id: string
  fsvp_record_id: string
  
  activity_type: 'verification' | 'document_review' | 'audit' | 'corrective_action' | 'status_change' | 'note'
  activity_title: string
  activity_description?: string
  
  performed_by?: string
  performed_by_role?: 'importer' | 'qi' | 'supplier'
  
  result?: 'pass' | 'fail' | 'pending' | 'not_applicable'
  result_details?: Record<string, unknown>
  
  linked_document_ids: string[]
  
  activity_date: string
  created_at: string
}

export type FSVPChecklistCategory = 
  | 'hazard_analysis' 
  | 'evaluation' 
  | 'verification' 
  | 'corrective_action' 
  | 'reassessment' 
  | 'recordkeeping'

export interface FSVPComplianceChecklistItem {
  id: string
  fsvp_record_id: string
  
  requirement_code: string
  requirement_title: string
  requirement_description?: string
  category: FSVPChecklistCategory
  
  is_completed: boolean
  is_applicable: boolean
  completed_date?: string
  completed_by?: string
  
  evidence_notes?: string
  evidence_document_ids: string[]
  
  created_at: string
  updated_at: string
}

// ============================================================================
// FSVP Products & Labels
// ============================================================================

export type FSVPProductStatus = 'draft' | 'active' | 'discontinued' | 'archived'
export type FSVPLabelStatus = 'draft' | 'pending_review' | 'approved' | 'superseded' | 'rejected'
export type FSVPCreatedByRole = 'importer' | 'supplier'

export interface FSVPProduct {
  id: string
  
  // Supplier reference
  supplier_id: string
  
  // Ownership tracking
  created_by: string
  created_by_role: FSVPCreatedByRole
  
  // Product identification
  product_name: string
  product_name_local?: string
  brand_name?: string
  sku?: string
  upc?: string
  
  // Product details
  product_description?: string
  product_category?: string
  fda_product_code?: string
  hs_code?: string
  
  // Packaging and format
  packaging_format?: string
  net_weight?: string
  units_per_case?: number
  shelf_life_days?: number
  storage_requirements?: string
  
  // Ingredients and allergens
  ingredient_list?: string
  allergens: string[]
  contains_major_allergen: boolean
  
  // Country and origin
  country_of_origin?: string
  manufacturing_facility?: string
  facility_fda_registration?: string
  
  // Risk classification
  default_risk_level: 'low' | 'medium' | 'high' | 'sahcodha'
  is_sahcodha: boolean
  known_hazards: string[]
  
  // Certifications
  certifications: string[]
  
  // Status
  status: FSVPProductStatus
  
  // Current label reference
  current_label_id?: string
  current_label_version: number
  
  // Linked records
  linked_audit_report_id?: string
  auto_generated: boolean
  auto_generated_from?: string
  
  // Metadata
  notes?: string
  tags: string[]
  metadata: Record<string, unknown>
  
  // Timestamps
  created_at: string
  updated_at: string
}

export interface FSVPProductWithSupplier extends FSVPProduct {
  supplier_name: string
  supplier_country: string
  current_label_image_url?: string
  current_ingredient_list?: string
  current_allergen_statement?: string
  current_nutrition_facts?: Record<string, unknown>
  current_label_uploaded_at?: string
  total_label_versions: number
}

export interface FSVPProductLabel {
  id: string
  
  // Product reference
  product_id: string
  
  // Version tracking
  version: number
  is_current: boolean
  
  // Label images
  label_image_url: string
  label_image_urls: string[]
  
  // Status
  status: FSVPLabelStatus
  
  // Who uploaded/modified
  uploaded_by: string
  uploaded_by_role: FSVPCreatedByRole
  
  // Review tracking
  reviewed_by?: string
  reviewed_at?: string
  review_notes?: string
  
  // Extracted content
  product_name_on_label?: string
  brand_name_on_label?: string
  ingredient_list?: string
  allergen_statement?: string
  nutrition_facts: Record<string, unknown>
  net_weight?: string
  country_of_origin?: string
  manufacturer_info?: string
  
  // AI analysis results
  ai_analysis_id?: string
  ai_extracted_data: Record<string, unknown>
  compliance_issues: Array<{ issue: string; severity: string }>
  
  // Change tracking
  change_reason?: string
  changes_from_previous: Record<string, unknown>
  
  // Timestamps
  uploaded_at: string
  effective_from: string
  effective_until?: string
  created_at: string
}

export interface FSVPProductImporterAccess {
  id: string
  product_id: string
  importer_user_id: string
  can_edit: boolean
  can_request_updates: boolean
  granted_at: string
  granted_by?: string
}

// Form data types for creating/updating products
export interface FSVPProductFormData {
  supplier_id: string
  product_name: string
  product_name_local?: string
  brand_name?: string
  sku?: string
  upc?: string
  product_description?: string
  product_category?: string
  fda_product_code?: string
  hs_code?: string
  packaging_format?: string
  net_weight?: string
  units_per_case?: number
  shelf_life_days?: number
  storage_requirements?: string
  ingredient_list?: string
  allergens: string[]
  country_of_origin?: string
  manufacturing_facility?: string
  facility_fda_registration?: string
  default_risk_level: 'low' | 'medium' | 'high' | 'sahcodha'
  is_sahcodha: boolean
  known_hazards: string[]
  certifications: string[]
  notes?: string
  tags: string[]
}

export interface FSVPLabelUploadData {
  product_id: string
  label_image_url: string
  label_image_urls?: string[]
  change_reason?: string
  product_name_on_label?: string
  brand_name_on_label?: string
  ingredient_list?: string
  allergen_statement?: string
  nutrition_facts?: Record<string, unknown>
  net_weight?: string
  country_of_origin?: string
  manufacturer_info?: string
}
