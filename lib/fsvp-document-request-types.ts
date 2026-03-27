/**
 * FSVP Document Request System Types
 * Per 21 CFR Part 1, Subpart L (§1.504-§1.506)
 */

// =====================================================
// Document Types based on CFR requirements
// =====================================================

export const FSVP_DOCUMENT_TYPES = {
  food_safety_certificate: {
    id: 'food_safety_certificate',
    name: 'Food Safety Certificate',
    nameVi: 'Chứng nhận An toàn Thực phẩm',
    description: 'ISO 22000, FSSC 22000, BRC, SQF or equivalent GFSI-recognized certification',
    descriptionVi: 'Chứng nhận ISO 22000, FSSC 22000, BRC, SQF hoặc tương đương GFSI',
    cfrReference: '§1.506(e)',
    requiredFor: ['all'],
    expiryRequired: true,
    defaultRequired: true,
  },
  annual_audit_report: {
    id: 'annual_audit_report',
    name: 'Annual Onsite Audit Report',
    nameVi: 'Báo cáo Kiểm toán Hàng năm',
    description: 'Required for SAHCODHA products (Seafood, Adjusted-pH, Hot-fill, Acidified, etc.)',
    descriptionVi: 'Bắt buộc cho sản phẩm SAHCODHA (Hải sản, pH điều chỉnh, Hot-fill, Axit hóa, v.v.)',
    cfrReference: '§1.506(d)(2)',
    requiredFor: ['sahcodha'],
    expiryRequired: true,
    defaultRequired: false,
  },
  haccp_plan: {
    id: 'haccp_plan',
    name: 'HACCP Plan',
    nameVi: 'Kế hoạch HACCP',
    description: 'Hazard Analysis Critical Control Points plan for the product',
    descriptionVi: 'Kế hoạch phân tích mối nguy và điểm kiểm soát tới hạn cho sản phẩm',
    cfrReference: '§1.504',
    requiredFor: ['all'],
    expiryRequired: false,
    defaultRequired: true,
  },
  hazard_analysis: {
    id: 'hazard_analysis',
    name: 'Hazard Analysis Document',
    nameVi: 'Tài liệu Phân tích Mối nguy',
    description: 'Documented hazard analysis identifying known or foreseeable hazards',
    descriptionVi: 'Phân tích mối nguy đã biết hoặc có thể dự đoán được',
    cfrReference: '§1.504',
    requiredFor: ['all'],
    expiryRequired: false,
    defaultRequired: true,
  },
  test_report_coa: {
    id: 'test_report_coa',
    name: 'Test Report / Certificate of Analysis',
    nameVi: 'Báo cáo Xét nghiệm / COA',
    description: 'Laboratory test results for pathogens, chemicals, allergens, etc.',
    descriptionVi: 'Kết quả xét nghiệm phòng thí nghiệm về vi sinh, hóa chất, chất gây dị ứng',
    cfrReference: '§1.506(d)(1)',
    requiredFor: ['all'],
    expiryRequired: true,
    defaultRequired: true,
  },
  specification_sheet: {
    id: 'specification_sheet',
    name: 'Product Specification Sheet',
    nameVi: 'Bảng Thông số Sản phẩm',
    description: 'Detailed product specifications including ingredients, allergens, storage',
    descriptionVi: 'Thông số chi tiết sản phẩm bao gồm thành phần, chất gây dị ứng, bảo quản',
    cfrReference: '§1.505',
    requiredFor: ['all'],
    expiryRequired: false,
    defaultRequired: false,
  },
  letter_of_guarantee: {
    id: 'letter_of_guarantee',
    name: 'Letter of Guarantee',
    nameVi: 'Thư Bảo đảm',
    description: 'Continuing guarantee that products comply with FDA requirements',
    descriptionVi: 'Cam kết liên tục rằng sản phẩm tuân thủ yêu cầu FDA',
    cfrReference: '§1.506',
    requiredFor: ['all'],
    expiryRequired: true,
    defaultRequired: false,
  },
  corrective_action_record: {
    id: 'corrective_action_record',
    name: 'Corrective Action Records',
    nameVi: 'Hồ sơ Hành động Khắc phục',
    description: 'Records of corrective actions taken when issues are identified',
    descriptionVi: 'Hồ sơ các hành động khắc phục khi phát hiện vấn đề',
    cfrReference: '§1.508',
    requiredFor: ['conditional'],
    expiryRequired: false,
    defaultRequired: false,
  },
  supplier_questionnaire: {
    id: 'supplier_questionnaire',
    name: 'Supplier Evaluation Questionnaire',
    nameVi: 'Bảng Đánh giá Nhà cung cấp',
    description: 'Completed questionnaire for supplier evaluation per §1.505',
    descriptionVi: 'Bảng câu hỏi đánh giá nhà cung cấp theo §1.505',
    cfrReference: '§1.505',
    requiredFor: ['all'],
    expiryRequired: false,
    defaultRequired: true,
  },
  sop_document: {
    id: 'sop_document',
    name: 'Standard Operating Procedures',
    nameVi: 'Quy trình Vận hành Chuẩn',
    description: 'SOPs for sanitation, allergen control, and other food safety processes',
    descriptionVi: 'SOP về vệ sinh, kiểm soát chất gây dị ứng và các quy trình an toàn thực phẩm',
    cfrReference: '§1.506',
    requiredFor: ['conditional'],
    expiryRequired: false,
    defaultRequired: false,
  },
  allergen_control_plan: {
    id: 'allergen_control_plan',
    name: 'Allergen Control Plan',
    nameVi: 'Kế hoạch Kiểm soát Chất gây Dị ứng',
    description: 'Plan for controlling allergen cross-contact during manufacturing',
    descriptionVi: 'Kế hoạch kiểm soát chất gây dị ứng chéo trong sản xuất',
    cfrReference: '§1.504',
    requiredFor: ['allergen_products'],
    expiryRequired: false,
    defaultRequired: false,
  },
  recall_plan: {
    id: 'recall_plan',
    name: 'Product Recall Plan',
    nameVi: 'Kế hoạch Thu hồi Sản phẩm',
    description: 'Documented procedures for product recall if necessary',
    descriptionVi: 'Quy trình thu hồi sản phẩm nếu cần thiết',
    cfrReference: '§1.508',
    requiredFor: ['conditional'],
    expiryRequired: false,
    defaultRequired: false,
  },
  other: {
    id: 'other',
    name: 'Other Supporting Document',
    nameVi: 'Tài liệu Hỗ trợ Khác',
    description: 'Any other document supporting FSVP compliance',
    descriptionVi: 'Tài liệu khác hỗ trợ tuân thủ FSVP',
    cfrReference: '',
    requiredFor: ['conditional'],
    expiryRequired: false,
    defaultRequired: false,
  },
  // LACF/Acidified Foods Documents (21 CFR 108/113/114)
  process_authority_letter: {
    id: 'process_authority_letter',
    name: 'Process Authority Letter',
    nameVi: 'Thư Process Authority',
    description: 'Letter from a recognized process authority validating the scheduled thermal process',
    descriptionVi: 'Thư từ Process Authority công nhận quy trình xử lý nhiệt',
    cfrReference: '§113.83',
    requiredFor: ['lacf', 'acidified'],
    expiryRequired: false,
    defaultRequired: true,
  },
  scheduled_process_filing: {
    id: 'scheduled_process_filing',
    name: 'Scheduled Process Filing (SID)',
    nameVi: 'Hồ sơ đăng ký quy trình (SID)',
    description: 'FDA Form 2541 series - Process filing for LACF/AF products',
    descriptionVi: 'FDA Form 2541 - Hồ sơ đăng ký quy trình cho sản phẩm LACF/AF',
    cfrReference: '§108.35',
    requiredFor: ['lacf', 'acidified'],
    expiryRequired: false,
    defaultRequired: true,
  },
  fce_registration: {
    id: 'fce_registration',
    name: 'FCE Registration Certificate',
    nameVi: 'Giấy đăng ký FCE',
    description: 'Food Canning Establishment registration with FDA per 21 CFR 108.25',
    descriptionVi: 'Đăng ký cơ sở sản xuất đồ hộp với FDA theo 21 CFR 108.25',
    cfrReference: '§108.25',
    requiredFor: ['lacf', 'acidified'],
    expiryRequired: true,
    defaultRequired: true,
  },
  retort_records: {
    id: 'retort_records',
    name: 'Retort/Thermal Process Records',
    nameVi: 'Hồ sơ xử lý nhiệt Retort',
    description: 'Temperature/time records for thermal processing per 21 CFR 113.100',
    descriptionVi: 'Hồ sơ nhiệt độ/thời gian xử lý nhiệt theo 21 CFR 113.100',
    cfrReference: '§113.100',
    requiredFor: ['lacf'],
    expiryRequired: false,
    defaultRequired: false,
  },
  ph_monitoring_records: {
    id: 'ph_monitoring_records',
    name: 'pH Monitoring Records',
    nameVi: 'Hồ sơ theo dõi pH',
    description: 'Equilibrium pH monitoring records for acidified foods per 21 CFR 114.90',
    descriptionVi: 'Hồ sơ theo dõi pH cân bằng cho thực phẩm axit hóa theo 21 CFR 114.90',
    cfrReference: '§114.90',
    requiredFor: ['acidified'],
    expiryRequired: false,
    defaultRequired: false,
  },
  container_integrity_records: {
    id: 'container_integrity_records',
    name: 'Container Integrity Records',
    nameVi: 'Hồ sơ kiểm tra Container',
    description: 'Double seam inspection and container integrity records per 21 CFR 113.60',
    descriptionVi: 'Hồ sơ kiểm tra mối ghép đôi và tính toàn vẹn container theo 21 CFR 113.60',
    cfrReference: '§113.60',
    requiredFor: ['lacf', 'acidified'],
    expiryRequired: false,
    defaultRequired: false,
  },
  bpcs_certificate: {
    id: 'bpcs_certificate',
    name: 'Better Process Control School Certificate',
    nameVi: 'Chứng chỉ BPCS',
    description: 'Certificate from FDA-recognized Better Process Control School',
    descriptionVi: 'Chứng chỉ từ trường Better Process Control được FDA công nhận',
    cfrReference: '§113.10',
    requiredFor: ['lacf', 'acidified'],
    expiryRequired: true,
    defaultRequired: true,
  },
} as const

export type FSVPDocumentTypeId = keyof typeof FSVP_DOCUMENT_TYPES

// =====================================================
// Product Categories (for SAHCODHA detection)
// =====================================================

export const PRODUCT_CATEGORIES = {
  seafood: {
    id: 'seafood',
    name: 'Seafood',
    nameVi: 'Hải sản',
    isSahcodha: true,
    examples: ['Fish', 'Shrimp', 'Crab', 'Lobster', 'Scallops'],
  },
  tree_nuts: {
    id: 'tree_nuts',
    name: 'Tree Nuts',
    nameVi: 'Hạt cây',
    isSahcodha: true,
    examples: ['Cashews', 'Almonds', 'Walnuts', 'Pistachios', 'Macadamia'],
  },
  produce: {
    id: 'produce',
    name: 'Fresh Produce',
    nameVi: 'Rau quả tươi',
    isSahcodha: true,
    examples: ['Leafy greens', 'Tomatoes', 'Berries', 'Melons'],
  },
  dairy: {
    id: 'dairy',
    name: 'Dairy Products',
    nameVi: 'Sản phẩm sữa',
    isSahcodha: true,
    examples: ['Cheese', 'Milk', 'Yogurt', 'Butter'],
  },
  meat_poultry: {
    id: 'meat_poultry',
    name: 'Meat & Poultry',
    nameVi: 'Thịt & Gia cầm',
    isSahcodha: true,
    examples: ['Beef', 'Pork', 'Chicken', 'Turkey'],
  },
  acidified_foods: {
    id: 'acidified_foods',
    name: 'Acidified Foods',
    nameVi: 'Thực phẩm Axit hóa',
    isSahcodha: true,
    examples: ['Pickles', 'Sauerkraut', 'Acidified sauces'],
  },
  low_acid_canned: {
    id: 'low_acid_canned',
    name: 'Low-Acid Canned Foods',
    nameVi: 'Thực phẩm Đóng hộp Axit thấp',
    isSahcodha: true,
    examples: ['Canned vegetables', 'Canned meats', 'Soups'],
    requiresFceSid: true,
    cfrReference: '21 CFR 113',
  },
  lacf: {
    id: 'lacf',
    name: 'Low-Acid Canned Foods (LACF)',
    nameVi: 'Thực phẩm Đóng hộp Axit thấp (LACF)',
    isSahcodha: true,
    examples: ['Canned vegetables', 'Canned meats', 'Retort pouches'],
    requiresFceSid: true,
    cfrReference: '21 CFR 113',
  },
  canned_vegetables: {
    id: 'canned_vegetables',
    name: 'Canned Vegetables',
    nameVi: 'Rau đóng hộp',
    isSahcodha: true,
    examples: ['Canned corn', 'Canned beans', 'Canned peas'],
    requiresFceSid: true,
    cfrReference: '21 CFR 113',
  },
  canned_meat: {
    id: 'canned_meat',
    name: 'Canned Meat/Poultry',
    nameVi: 'Thịt đóng hộp',
    isSahcodha: true,
    examples: ['Canned chicken', 'Canned beef', 'Canned pork'],
    requiresFceSid: true,
    cfrReference: '21 CFR 113',
  },
  pickles: {
    id: 'pickles',
    name: 'Pickles',
    nameVi: 'Dưa chua',
    isSahcodha: true,
    examples: ['Dill pickles', 'Bread and butter pickles', 'Relish'],
    requiresFceSid: true,
    cfrReference: '21 CFR 114',
  },
  spices: {
    id: 'spices',
    name: 'Spices & Herbs',
    nameVi: 'Gia vị & Thảo mộc',
    isSahcodha: false,
    examples: ['Pepper', 'Cinnamon', 'Turmeric', 'Oregano'],
  },
  grains: {
    id: 'grains',
    name: 'Grains & Cereals',
    nameVi: 'Ngũ cốc',
    isSahcodha: false,
    examples: ['Rice', 'Wheat', 'Oats', 'Corn'],
  },
  confectionery: {
    id: 'confectionery',
    name: 'Confectionery',
    nameVi: 'Bánh kẹo',
    isSahcodha: false,
    examples: ['Chocolate', 'Candy', 'Gum'],
  },
  beverages: {
    id: 'beverages',
    name: 'Beverages',
    nameVi: 'Đồ uống',
    isSahcodha: false,
    examples: ['Juice', 'Tea', 'Coffee', 'Soft drinks'],
  },
  other: {
    id: 'other',
    name: 'Other',
    nameVi: 'Khác',
    isSahcodha: false,
    examples: [],
  },
} as const

export type ProductCategoryId = keyof typeof PRODUCT_CATEGORIES

// =====================================================
// Request Status
// =====================================================

export const REQUEST_STATUS = {
  draft: {
    id: 'draft',
    label: 'Draft',
    labelVi: 'Bản nháp',
    color: 'bg-gray-100 text-gray-700',
    icon: 'FileEdit',
  },
  sent: {
    id: 'sent',
    label: 'Sent',
    labelVi: 'Đã gửi',
    color: 'bg-blue-100 text-blue-700',
    icon: 'Send',
  },
  in_progress: {
    id: 'in_progress',
    label: 'In Progress',
    labelVi: 'Đang xử lý',
    color: 'bg-yellow-100 text-yellow-700',
    icon: 'Clock',
  },
  under_review: {
    id: 'under_review',
    label: 'Under Review',
    labelVi: 'Đang xem xét',
    color: 'bg-purple-100 text-purple-700',
    icon: 'Eye',
  },
  approved: {
    id: 'approved',
    label: 'Approved',
    labelVi: 'Đã duyệt',
    color: 'bg-green-100 text-green-700',
    icon: 'CheckCircle',
  },
  rejected: {
    id: 'rejected',
    label: 'Rejected',
    labelVi: 'Từ chối',
    color: 'bg-red-100 text-red-700',
    icon: 'XCircle',
  },
  expired: {
    id: 'expired',
    label: 'Expired',
    labelVi: 'Hết hạn',
    color: 'bg-gray-100 text-gray-500',
    icon: 'AlertTriangle',
  },
} as const

export type RequestStatusId = keyof typeof REQUEST_STATUS

// =====================================================
// Item Status
// =====================================================

export const ITEM_STATUS = {
  pending: {
    id: 'pending',
    label: 'Pending',
    labelVi: 'Chờ tải lên',
    color: 'bg-gray-100 text-gray-600',
    icon: 'Clock',
  },
  uploaded: {
    id: 'uploaded',
    label: 'Uploaded',
    labelVi: 'Đã tải lên',
    color: 'bg-blue-100 text-blue-700',
    icon: 'Upload',
  },
  approved: {
    id: 'approved',
    label: 'Approved',
    labelVi: 'Đã duyệt',
    color: 'bg-green-100 text-green-700',
    icon: 'CheckCircle',
  },
  rejected: {
    id: 'rejected',
    label: 'Rejected',
    labelVi: 'Từ chối',
    color: 'bg-red-100 text-red-700',
    icon: 'XCircle',
  },
  waived: {
    id: 'waived',
    label: 'Waived',
    labelVi: 'Miễn',
    color: 'bg-gray-100 text-gray-500',
    icon: 'MinusCircle',
  },
} as const

export type ItemStatusId = keyof typeof ITEM_STATUS

// =====================================================
// Document Integrity Status (FDA 483 compliance)
// =====================================================

export const DOCUMENT_INTEGRITY_STATUS = {
  pending_review: {
    id: 'pending_review',
    label: 'Pending Review',
    labelVi: 'Chờ kiểm tra',
    color: 'bg-gray-100 text-gray-600',
    icon: 'Clock',
  },
  verified_complete: {
    id: 'verified_complete',
    label: 'Verified Complete',
    labelVi: 'Đã xác minh',
    color: 'bg-green-100 text-green-700',
    icon: 'CheckCircle',
  },
  missing_signature: {
    id: 'missing_signature',
    label: 'Missing QA Signature',
    labelVi: 'Thiếu chữ ký QA',
    color: 'bg-amber-100 text-amber-700',
    icon: 'AlertTriangle',
  },
  missing_stamp: {
    id: 'missing_stamp',
    label: 'Missing Official Stamp',
    labelVi: 'Thiếu con dấu',
    color: 'bg-amber-100 text-amber-700',
    icon: 'AlertTriangle',
  },
  incomplete: {
    id: 'incomplete',
    label: 'Incomplete',
    labelVi: 'Không đầy đủ',
    color: 'bg-red-100 text-red-700',
    icon: 'XCircle',
  },
  waived: {
    id: 'waived',
    label: 'Waived',
    labelVi: 'Miễn kiểm tra',
    color: 'bg-gray-100 text-gray-500',
    icon: 'MinusCircle',
  },
} as const

export type DocumentIntegrityStatusId = keyof typeof DOCUMENT_INTEGRITY_STATUS

// Documents that MUST have integrity check per FDA 483
export const DOCUMENTS_REQUIRING_INTEGRITY_CHECK = [
  'food_safety_certificate',
  'annual_audit_report',
  'haccp_plan',
  'test_report_coa',
  'corrective_action_record',
] as const

// =====================================================
// TypeScript Interfaces
// =====================================================

export interface FSVPDocumentRequest {
  id: string
  request_number: string
  importer_user_id: string
  supplier_id: string | null
  supplier_email: string | null
  product_name: string
  product_category: ProductCategoryId | null
  is_sahcodha: boolean
  fda_product_code: string | null
  status: RequestStatusId
  deadline: string | null
  reminder_sent_at: string | null
  importer_notes: string | null
  supplier_notes: string | null
  applicable_cfr_sections: string[] | null
  ai_suggestion_used: boolean
  ai_confidence_score: number | null
  created_at: string
  updated_at: string
  sent_at: string | null
  completed_at: string | null
}

export interface FSVPDocumentRequestItem {
  id: string
  request_id: string
  document_type: FSVPDocumentTypeId
  document_name: string
  description: string | null
  is_required: boolean
  cfr_reference: string | null
  status: ItemStatusId
  uploaded_document_id: string | null
  uploaded_file_name: string | null
  uploaded_file_url: string | null
  uploaded_at: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  rejection_reason: string | null
  ai_verified: boolean
  ai_confidence: number | null
  ai_document_type_match: boolean | null
  sort_order: number
  created_at: string
  updated_at: string
  // Document Integrity fields (FDA 483 compliance)
  has_qa_signature: boolean | null
  has_official_stamp: boolean | null
  document_integrity_status: DocumentIntegrityStatusId | null
  integrity_checked_by: string | null
  integrity_checked_at: string | null
  integrity_notes: string | null
  ai_detected_signature: boolean | null
  ai_detected_stamp: boolean | null
  ai_integrity_confidence: number | null
}

export interface FSVPDocumentRequestSummary extends FSVPDocumentRequest {
  supplier_name: string | null
  total_items: number
  completed_items: number
  pending_items: number
  uploaded_items: number
  rejected_items: number
  progress_percentage: number
  days_until_deadline: number | null
}

export interface FSVPDocumentRequestWithItems extends FSVPDocumentRequest {
  items: FSVPDocumentRequestItem[]
  supplier_name?: string
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Check if a category requires FCE/SID
 */
export function requiresFCESIDForCategory(category: ProductCategoryId): boolean {
  const categoryConfig = PRODUCT_CATEGORIES[category]
  return (categoryConfig as { requiresFceSid?: boolean })?.requiresFceSid === true
}

/**
 * Check if a category is LACF (Low-Acid Canned Foods)
 */
export function isLACFCategory(category: ProductCategoryId): boolean {
  return ['lacf', 'low_acid_canned', 'canned_vegetables', 'canned_meat'].includes(category)
}

/**
 * Check if a category is Acidified Foods
 */
export function isAcidifiedCategory(category: ProductCategoryId): boolean {
  return ['acidified_foods', 'pickles'].includes(category)
}

/**
* Get required documents based on product category
*/
export function getRequiredDocuments(
  productCategory: ProductCategoryId,
  isSahcodha: boolean
): FSVPDocumentTypeId[] {
  const required: FSVPDocumentTypeId[] = []
  const isLacf = isLACFCategory(productCategory)
  const isAcidified = isAcidifiedCategory(productCategory)
  
  Object.entries(FSVP_DOCUMENT_TYPES).forEach(([key, doc]) => {
    const docType = key as FSVPDocumentTypeId
    
    // Always required documents
    if (doc.requiredFor.includes('all') && doc.defaultRequired) {
      required.push(docType)
    }
    
    // SAHCODHA-specific requirements
    if (isSahcodha && doc.requiredFor.includes('sahcodha')) {
      required.push(docType)
    }
    
    // LACF-specific requirements (21 CFR 113)
    if (isLacf && doc.requiredFor.includes('lacf') && doc.defaultRequired) {
      required.push(docType)
    }
    
    // Acidified Foods-specific requirements (21 CFR 114)
    if (isAcidified && doc.requiredFor.includes('acidified') && doc.defaultRequired) {
      required.push(docType)
    }
  })
  
  return [...new Set(required)] // Remove duplicates
}

/**
* Get suggested documents based on product category (for AI suggestions)
*/
export function getSuggestedDocuments(
  productCategory: ProductCategoryId,
  isSahcodha: boolean
): FSVPDocumentTypeId[] {
  const suggested: FSVPDocumentTypeId[] = getRequiredDocuments(productCategory, isSahcodha)
  
  // Add category-specific suggestions
  if (productCategory === 'seafood' || productCategory === 'meat_poultry') {
    if (!suggested.includes('test_report_coa')) suggested.push('test_report_coa')
    if (!suggested.includes('sop_document')) suggested.push('sop_document')
  }
  
  if (['tree_nuts', 'dairy', 'confectionery'].includes(productCategory)) {
    if (!suggested.includes('allergen_control_plan')) suggested.push('allergen_control_plan')
  }
  
  // LACF/Acidified Foods - add additional process control documents
  if (isLACFCategory(productCategory)) {
    if (!suggested.includes('retort_records')) suggested.push('retort_records')
    if (!suggested.includes('container_integrity_records')) suggested.push('container_integrity_records')
  }
  
  if (isAcidifiedCategory(productCategory)) {
    if (!suggested.includes('ph_monitoring_records')) suggested.push('ph_monitoring_records')
    if (!suggested.includes('container_integrity_records')) suggested.push('container_integrity_records')
  }
  
  return suggested
}

/**
 * Check if a product category is SAHCODHA
 */
export function isSahcodhaCategory(category: ProductCategoryId): boolean {
  return PRODUCT_CATEGORIES[category]?.isSahcodha ?? false
}

/**
 * Calculate progress from items
 */
export function calculateProgress(items: FSVPDocumentRequestItem[]): {
  total: number
  completed: number
  pending: number
  uploaded: number
  rejected: number
  percentage: number
} {
  const total = items.length
  const completed = items.filter(i => i.status === 'approved' || i.status === 'waived').length
  const pending = items.filter(i => i.status === 'pending').length
  const uploaded = items.filter(i => i.status === 'uploaded').length
  const rejected = items.filter(i => i.status === 'rejected').length
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
  
  return { total, completed, pending, uploaded, rejected, percentage }
}

/**
 * Check if a document type requires integrity verification (FDA 483)
 */
export function requiresIntegrityCheck(documentType: FSVPDocumentTypeId): boolean {
  return (DOCUMENTS_REQUIRING_INTEGRITY_CHECK as readonly string[]).includes(documentType)
}

/**
 * Get integrity status summary for a list of items
 */
export function getIntegritySummary(items: FSVPDocumentRequestItem[]): {
  total: number
  verified: number
  pending: number
  incomplete: number
  percentage: number
} {
  const relevantItems = items.filter(i => 
    requiresIntegrityCheck(i.document_type) && 
    (i.status === 'uploaded' || i.status === 'approved')
  )
  const total = relevantItems.length
  const verified = relevantItems.filter(i => i.document_integrity_status === 'verified_complete').length
  const pending = relevantItems.filter(i => 
    i.document_integrity_status === 'pending_review' || 
    i.document_integrity_status === null
  ).length
  const incomplete = relevantItems.filter(i => 
    i.document_integrity_status === 'incomplete' || 
    i.document_integrity_status === 'missing_signature' ||
    i.document_integrity_status === 'missing_stamp'
  ).length
  const percentage = total > 0 ? Math.round((verified / total) * 100) : 0
  
  return { total, verified, pending, incomplete, percentage }
}
