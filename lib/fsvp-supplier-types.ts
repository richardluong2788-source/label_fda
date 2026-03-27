/**
 * FSVP Supplier Portal Types
 * 
 * Types for foreign suppliers (exporters) to manage their FSVP compliance
 * from the supplier's perspective - helping them prepare documentation
 * for US importers and FDA compliance.
 * 
 * Reference: 21 CFR Part 1, Subpart L (§1.500-§1.514)
 */

// ============================================================================
// Supplier Profile & Company Information
// ============================================================================

export interface SupplierProfile {
  id: string
  user_id: string
  company_name: string
  company_name_local?: string // Name in local language
  country: string
  address: string
  city: string
  state_province?: string
  postal_code?: string
  phone: string
  email: string
  website?: string
  
  // FDA Registration
  fei_number?: string // FDA Establishment Identifier
  duns_number?: string // D-U-N-S Number (9 digits)
  fda_registration_number?: string
  fda_registration_expiry?: string
  
  // FCE/SID for LACF/Acidified Foods (21 CFR 113/114)
  fce_number?: string // Food Canning Establishment Number
  fce_registration_date?: string
  fce_expiry_date?: string
  is_lacf_manufacturer?: boolean
  is_acidified_manufacturer?: boolean
  better_process_control_certified?: boolean
  bpcs_certificate_date?: string
  
  // Business Information
  business_type: 'manufacturer' | 'processor' | 'packer' | 'holder' | 'distributor'
  years_in_business?: number
  number_of_employees?: number
  annual_revenue_range?: string
  
  // Certifications
  certifications: SupplierCertification[]
  
  // Food Safety System
  food_safety_system?: 'HACCP' | 'ISO_22000' | 'FSSC_22000' | 'SQF' | 'BRC' | 'IFS' | 'other'
  food_safety_system_certified: boolean
  food_safety_certificate_expiry?: string
  
  // Primary Contact (Qualified Individual equivalent)
  primary_contact_name: string
  primary_contact_title?: string
  primary_contact_email: string
  primary_contact_phone?: string
  
  // FSVP Specific
  exports_to_usa: boolean
  us_importers: USImporterLink[]
  product_categories: string[]
  
  // Compliance Status
  compliance_score?: number // 0-100
  last_audit_date?: string
  next_audit_due?: string
  audit_readiness_score?: number // 0-100
  
  created_at: string
  updated_at: string
}

export interface SupplierCertification {
  id: string
  certification_type: string
  certification_body: string
  certificate_number?: string
  issue_date: string
  expiry_date: string
  scope?: string
  document_url?: string
  status: 'active' | 'expired' | 'pending_renewal'
}

export interface USImporterLink {
  id: string
  importer_name: string
  importer_duns?: string
  importer_email?: string
  relationship_start_date?: string
  products_supplied: string[]
  last_shipment_date?: string
  status: 'active' | 'inactive' | 'pending'
}

// ============================================================================
// Hazard Analysis (from Supplier's Perspective)
// ============================================================================

export interface SupplierHazardAnalysis {
  id: string
  supplier_id: string
  product_id: string
  product_name: string
  product_category: string
  
  // Analysis Details
  analysis_date: string
  analyzed_by: string
  qualified_individual_name: string
  qualified_individual_credentials?: string
  
  // Hazard Identification
  biological_hazards: HazardItem[]
  chemical_hazards: HazardItem[]
  physical_hazards: HazardItem[]
  radiological_hazards: HazardItem[]
  allergen_hazards: HazardItem[]
  
  // SAHCODHA Assessment
  is_sahcodha_product: boolean
  sahcodha_category?: string
  sahcodha_justification?: string
  
  // LACF/Acidified Foods - FCE/SID (21 CFR 113/114)
  fce_number?: string // Food Canning Establishment Number
  sid_number?: string // Submission Identifier/Process Filing Number
  process_authority_name?: string
  process_authority_date?: string
  scheduled_process_filed?: boolean
  thermal_process_type?: 'retort' | 'aseptic' | 'hot_fill' | 'acidification' | 'other'
  equilibrium_ph?: number // For acidified foods, must be ≤4.6
  water_activity?: number
  
  // Control Measures
  preventive_controls: PreventiveControl[]
  critical_control_points: CriticalControlPoint[]
  
  // Supplier Food Safety Plan
  supplier_food_safety_plan_attached: boolean
  supplier_haccp_plan_attached: boolean
  
  // Documentation
  supporting_documents: SupportingDocument[]
  
  status: 'draft' | 'pending_review' | 'approved' | 'needs_revision'
  version: number
  created_at: string
  updated_at: string
}

export interface HazardItem {
  id: string
  hazard_name: string
  hazard_type: 'biological' | 'chemical' | 'physical' | 'radiological' | 'allergen'
  description: string
  source: string
  likelihood: 'low' | 'medium' | 'high'
  severity: 'low' | 'medium' | 'high' | 'sahcodha'
  is_reasonably_foreseeable: boolean
  control_measure: string
  verification_method: string
  monitoring_frequency: string
  responsible_person: string
}

export interface PreventiveControl {
  id: string
  control_type: 'process' | 'allergen' | 'sanitation' | 'supply_chain' | 'other'
  description: string
  hazard_addressed: string[]
  critical_limits?: string
  monitoring_procedure: string
  monitoring_frequency: string
  corrective_actions: string
  verification_activities: string
  records_maintained: string[]
}

export interface CriticalControlPoint {
  id: string
  ccp_number: string
  process_step: string
  hazard_controlled: string
  critical_limits: string
  monitoring_procedure: string
  monitoring_frequency: string
  corrective_actions: string
  verification_procedure: string
  records: string[]
}

export interface SupportingDocument {
  id: string
  document_type: 'certificate' | 'test_report' | 'audit_report' | 'haccp_plan' | 'sop' | 'other'
  document_name: string
  file_url: string
  upload_date: string
  expiry_date?: string
  status: 'valid' | 'expired' | 'pending_review'
}

// ============================================================================
// Self-Assessment & Audit Readiness
// ============================================================================

export interface SupplierSelfAssessment {
  id: string
  supplier_id: string
  assessment_type: 'initial' | 'periodic' | 'pre_audit' | 'corrective_followup'
  assessment_date: string
  completed_by: string
  
  // Assessment Sections
  sections: AssessmentSection[]
  
  // Overall Results
  total_score: number // 0-100
  max_possible_score: number
  compliance_percentage: number
  
  // Findings
  critical_gaps: AssessmentGap[]
  major_gaps: AssessmentGap[]
  minor_gaps: AssessmentGap[]
  observations: string[]
  
  // Recommendations
  corrective_actions_required: CorrectiveActionItem[]
  timeline_to_compliance?: string
  
  // Status
  status: 'draft' | 'completed' | 'reviewed' | 'action_plan_created'
  reviewed_by?: string
  reviewed_at?: string
  
  created_at: string
  updated_at: string
}

export interface AssessmentSection {
  id: string
  section_name: string
  section_description: string
  questions: AssessmentQuestion[]
  section_score: number
  max_score: number
  compliance_status: 'compliant' | 'partially_compliant' | 'non_compliant' | 'not_applicable'
}

export interface AssessmentQuestion {
  id: string
  question_text: string
  question_type: 'yes_no' | 'score' | 'text' | 'multiple_choice'
  regulation_reference?: string
  required: boolean
  weight: number
  answer?: string | number | boolean
  score?: number
  notes?: string
  evidence_required: boolean
  evidence_attached?: boolean
  evidence_url?: string
}

export interface AssessmentGap {
  id: string
  area: string
  description: string
  regulation_reference: string
  severity: 'critical' | 'major' | 'minor'
  root_cause?: string
  recommended_action: string
  target_completion_date?: string
  status: 'open' | 'in_progress' | 'closed' | 'verified'
}

export interface CorrectiveActionItem {
  id: string
  gap_id: string
  action_description: string
  responsible_person: string
  target_date: string
  actual_completion_date?: string
  verification_method: string
  verified_by?: string
  verified_date?: string
  status: 'pending' | 'in_progress' | 'completed' | 'verified' | 'overdue'
  evidence_urls: string[]
}

// ============================================================================
// Audit Readiness Checklist
// ============================================================================

export interface AuditReadinessChecklist {
  id: string
  supplier_id: string
  checklist_type: 'fda_inspection' | 'third_party_audit' | 'importer_audit' | 'gfsi_certification'
  
  // Checklist Items
  items: ChecklistItem[]
  
  // Progress
  total_items: number
  completed_items: number
  progress_percentage: number
  
  // Timeline
  target_audit_date?: string
  days_until_audit?: number
  
  // Readiness Score
  readiness_score: number // 0-100
  readiness_status: 'not_ready' | 'needs_work' | 'almost_ready' | 'ready'
  
  // Documents Required
  required_documents: RequiredDocument[]
  missing_documents: string[]
  
  created_at: string
  updated_at: string
}

export interface ChecklistItem {
  id: string
  category: string
  item_description: string
  regulation_reference?: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  status: 'not_started' | 'in_progress' | 'completed' | 'not_applicable'
  completed_date?: string
  notes?: string
  evidence_required: boolean
  evidence_attached: boolean
  evidence_url?: string
}

export interface RequiredDocument {
  id: string
  document_type: string
  document_name: string
  description: string
  required_for: string[] // ['fda_inspection', 'third_party_audit', etc.]
  status: 'available' | 'missing' | 'expired' | 'pending_update'
  current_document_url?: string
  expiry_date?: string
  last_updated?: string
}

// ============================================================================
// Document Templates & Management
// ============================================================================

export interface DocumentTemplate {
  id: string
  template_type: 'hazard_analysis' | 'food_safety_plan' | 'supplier_questionnaire' | 'audit_checklist' | 'certificate_of_analysis' | 'letter_of_guarantee' | 'specification_sheet' | 'sop'
  template_name: string
  description: string
  category: string
  file_url: string
  preview_url?: string
  language: string
  version: string
  last_updated: string
  download_count: number
  is_fda_compliant: boolean
  regulation_references: string[]
}

export interface GeneratedDocument {
  id: string
  supplier_id: string
  template_id: string
  document_type: string
  document_name: string
  generated_at: string
  generated_by: string
  file_url: string
  status: 'draft' | 'finalized' | 'shared' | 'expired'
  shared_with: string[] // Importer IDs or emails
  valid_until?: string
  version: number
  data_snapshot: Record<string, unknown> // Data used to generate
}

// ============================================================================
// SAHCODHA Risk Assessment Tool
// ============================================================================

export interface SAHCODHARiskAssessment {
  id: string
  supplier_id: string
  product_id: string
  product_name: string
  product_category: string
  
  // Risk Assessment
  assessment_date: string
  assessed_by: string
  
  // Product Characteristics
  product_characteristics: {
    is_ready_to_eat: boolean
    requires_cooking: boolean
    contains_raw_ingredients: boolean
    is_minimally_processed: boolean
    has_long_shelf_life: boolean
    requires_refrigeration: boolean
    supports_pathogen_growth: boolean
    has_history_of_recalls: boolean
  }
  
  // SAHCODHA Hazards Check
  sahcodha_hazards_present: SAHCODHAHazardCheck[]
  
  // Overall Risk Determination
  is_sahcodha_product: boolean
  risk_level: 'low' | 'medium' | 'high' | 'sahcodha'
  risk_score: number // 0-100
  
  // Justification
  rationale: string
  
  // Required Actions
  required_verification: 'standard' | 'periodic' | 'annual_onsite'
  verification_frequency: string
  
  // Regulatory Reference
  cfr_references: string[]
  
  status: 'draft' | 'completed' | 'approved'
  created_at: string
  updated_at: string
}

export interface SAHCODHAHazardCheck {
  hazard_category: string // 'seafood', 'leafy_greens', 'sprouts', etc.
  hazard_name: string
  is_present: boolean
  control_measures_in_place: boolean
  control_description?: string
  verification_method?: string
  cfr_reference: string
}

// ============================================================================
// Supplier Dashboard Stats
// ============================================================================

// ============================================================================
// LACF/Acidified Foods - Process Filing (21 CFR 108.35)
// ============================================================================

export interface ProcessFiling {
  id: string
  supplier_id: string
  product_id?: string
  
  // FCE/SID Information
  fce_number: string // Food Canning Establishment Number
  sid_number: string // Submission Identifier/Process Filing Number
  
  // Product Information
  product_name: string
  product_description?: string
  container_type?: 'can' | 'pouch' | 'jar' | 'bottle' | 'other'
  container_size?: string
  
  // Process Details
  process_type: 'lacf_thermal' | 'acidified' | 'aseptic' | 'hot_fill' | 'other'
  thermal_process_description?: string
  critical_factors?: string[] // pH, aw, fill weight, headspace, etc.
  scheduled_process_details?: {
    initial_temperature?: number
    process_temperature?: number
    process_time?: number
    come_up_time?: number
    cooling_procedure?: string
  }
  
  // Process Authority
  process_authority_name?: string
  process_authority_organization?: string
  process_authority_contact?: string
  process_authority_letter_date?: string
  process_authority_letter_url?: string
  
  // Filing Status
  filing_status: 'pending' | 'filed' | 'accepted' | 'rejected'
  filing_date?: string
  fda_acceptance_date?: string
  fda_response_notes?: string
  
  // Verification
  last_verification_date?: string
  next_verification_due?: string
  verification_method?: string
  
  created_at: string
  updated_at: string
}

// LACF/AF Product Categories that require FCE/SID
export const LACF_AF_CATEGORIES = [
  'lacf',
  'low_acid_canned',
  'canned_vegetables',
  'canned_meat',
  'retort_pouches',
  'acidified_foods',
  'pickles',
  'peppers_in_oil',
  'artichoke_hearts',
] as const

export type LACFAFCategory = typeof LACF_AF_CATEGORIES[number]

/**
 * Check if a product category requires FCE/SID
 */
export function requiresFCESID(category: string): boolean {
  const normalizedCategory = category.toLowerCase().replace(/[\s-]/g, '_')
  return LACF_AF_CATEGORIES.includes(normalizedCategory as LACFAFCategory)
}

/**
 * Get CFR reference for LACF/AF category
 */
export function getLACFAFCfrReference(category: string): string {
  const normalizedCategory = category.toLowerCase().replace(/[\s-]/g, '_')
  
  if (['lacf', 'low_acid_canned', 'canned_vegetables', 'canned_meat', 'retort_pouches'].includes(normalizedCategory)) {
    return '21 CFR 113 (Thermally Processed Low-Acid Foods)'
  }
  
  if (['acidified_foods', 'pickles', 'peppers_in_oil', 'artichoke_hearts'].includes(normalizedCategory)) {
    return '21 CFR 114 (Acidified Foods)'
  }
  
  return ''
}

export interface SupplierDashboardStats {
  compliance_score: number
  audit_readiness_score: number
  total_products: number
  products_with_hazard_analysis: number
  products_pending_analysis: number
  sahcodha_products: number
  certifications_active: number
  certifications_expiring_soon: number
  documents_up_to_date: number
  documents_needing_update: number
  open_corrective_actions: number
  overdue_corrective_actions: number
  us_importers_count: number
  last_audit_date?: string
  next_audit_due?: string
  days_until_next_audit?: number
}
