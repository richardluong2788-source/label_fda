// Types for Supplier Portal Token System

export interface SupplierPortalToken {
  id: string
  document_request_id: string
  token: string
  supplier_email: string
  supplier_name?: string
  expires_at: string
  is_revoked: boolean
  access_count: number
  last_accessed_at?: string
  created_at: string
  created_by: string
}

export interface SupplierPortalSession {
  id: string
  token_id: string
  user_id?: string
  session_type: 'guest' | 'authenticated'
  guest_email?: string
  guest_name?: string
  email_verified: boolean
  verification_code?: string
  verification_expires_at?: string
  ip_address?: string
  user_agent?: string
  created_at: string
  expires_at: string
}

export interface SupplierPortalAction {
  id: string
  session_id: string
  action_type: 'view' | 'download' | 'upload' | 'submit' | 'comment'
  action_details?: Record<string, unknown>
  created_at: string
}

export interface DocumentRequestWithDetails {
  id: string
  supplier_id: string
  importer_id: string
  hazard_analysis_id?: string
  request_type: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'expired'
  requested_documents: string[]
  notes?: string
  due_date?: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  created_at: string
  updated_at: string
  // Joined data
  supplier?: {
    id: string
    company_name: string
    country: string
    contact_email?: string
  }
  importer?: {
    email: string
    company_name?: string
  }
  hazard_analysis?: {
    id: string
    product_name: string
    product_category: string
  }
  uploaded_documents?: UploadedDocument[]
}

export interface UploadedDocument {
  id: string
  document_request_id: string
  document_type: string
  file_name: string
  file_path: string
  file_size: number
  uploaded_by?: string
  uploaded_at: string
  status: 'pending' | 'approved' | 'rejected'
  reviewer_notes?: string
}

export interface TokenValidationResult {
  valid: boolean
  token?: SupplierPortalToken
  request?: DocumentRequestWithDetails
  session?: SupplierPortalSession
  error?: string
  errorCode?: 'INVALID_TOKEN' | 'EXPIRED_TOKEN' | 'REVOKED_TOKEN' | 'REQUEST_NOT_FOUND'
}

// Document type options for supplier portal
export const SUPPLIER_DOCUMENT_TYPES = [
  { value: 'haccp_plan', label: 'HACCP Plan', description: 'Hazard Analysis Critical Control Point plan' },
  { value: 'food_safety_cert', label: 'Food Safety Certificate', description: 'GFSI-recognized certification (SQF, BRC, FSSC 22000)' },
  { value: 'audit_report', label: 'Third-Party Audit Report', description: 'Recent audit report from accredited auditor' },
  { value: 'allergen_control', label: 'Allergen Control Plan', description: 'Documentation of allergen management procedures' },
  { value: 'spec_sheet', label: 'Product Specification Sheet', description: 'Detailed product specifications' },
  { value: 'coa', label: 'Certificate of Analysis', description: 'Lab analysis results for product batch' },
  { value: 'supplier_questionnaire', label: 'Supplier Questionnaire', description: 'Completed supplier qualification questionnaire' },
  { value: 'insurance_cert', label: 'Insurance Certificate', description: 'Product liability insurance documentation' },
  { value: 'export_license', label: 'Export License', description: 'Government export authorization' },
  { value: 'lab_test', label: 'Lab Test Results', description: 'Independent laboratory testing results' },
  { value: 'process_flow', label: 'Process Flow Diagram', description: 'Manufacturing process documentation' },
  { value: 'other', label: 'Other Document', description: 'Other supporting documentation' },
] as const

export type SupplierDocumentType = typeof SUPPLIER_DOCUMENT_TYPES[number]['value']
