/**
 * FSVP Document Classifier
 * 
 * AI-powered document classification for FSVP compliance documents.
 * Uses GPT-4o-mini Vision to scan the first page of PDF documents
 * and automatically classify them into FSVP document types.
 * 
 * Optimized for minimal token usage by:
 * 1. Only scanning the first page
 * 2. Using a focused classification prompt
 * 3. Falling back to keyword matching when AI is unavailable
 * 
 * Reference: 21 CFR Part 1, Subpart L (§1.500-§1.514)
 */

import { openai, retryWithBackoff } from './openai-client'
import sharp from 'sharp'

// ============================================================================
// Types
// ============================================================================

export type FSVPDocumentType =
  | 'certificate'
  | 'test_report'
  | 'audit_report'
  | 'haccp_plan'
  | 'food_safety_plan'
  | 'sop'
  | 'letter_of_guarantee'
  | 'specification_sheet'
  | 'coa'
  | 'supplier_questionnaire'
  | 'corrective_action'
  | 'verification_record'
  | 'import_record'
  | 'unknown'

export interface DocumentClassificationResult {
  documentType: FSVPDocumentType
  confidence: number // 0.0 - 1.0
  suggestedName?: string
  detectedLanguage?: string
  requiresTranslation?: boolean
  fsvpRelevance: {
    isRelevant: boolean
    applicableSections: string[] // CFR sections like "§1.505", "§1.506"
    notes?: string
  }
  keywords?: string[]
  classificationMethod: 'ai_vision' | 'keyword_fallback' | 'manual'
}

export interface ClassificationOptions {
  useAI?: boolean
  fallbackToKeywords?: boolean
  timeout?: number // milliseconds
}

// ============================================================================
// Document Type Definitions with FSVP Mapping
// ============================================================================

export const FSVP_DOCUMENT_TYPES: Record<FSVPDocumentType, {
  label: string
  description: string
  keywords: string[]
  cfrSections: string[]
  requiredFor: string[]
}> = {
  certificate: {
    label: 'Certificate',
    description: 'Food safety certification (ISO, FSSC, BRC, SQF, GFSI)',
    keywords: [
      'certificate', 'certification', 'certified', 'certify',
      'iso 22000', 'fssc 22000', 'brc', 'sqf', 'ifs', 'gfsi',
      'haccp certified', 'gmp certified', 'organic certified',
      'halal', 'kosher', 'non-gmo', 'gluten-free certified'
    ],
    cfrSections: ['§1.505', '§1.506'],
    requiredFor: ['supplier_verification', 'third_party_audit']
  },
  test_report: {
    label: 'Test Report',
    description: 'Laboratory test results and analysis reports',
    keywords: [
      'test report', 'laboratory', 'analysis results', 'testing',
      'microbiological', 'chemical analysis', 'pathogen testing',
      'residue analysis', 'pesticide testing', 'heavy metals',
      'aflatoxin', 'melamine', 'lab results', 'analytical report'
    ],
    cfrSections: ['§1.505', '§1.506(d)'],
    requiredFor: ['hazard_evaluation', 'supplier_verification']
  },
  audit_report: {
    label: 'Audit Report',
    description: 'Third-party or internal audit findings',
    keywords: [
      'audit report', 'audit findings', 'inspection report',
      'assessment report', 'compliance audit', 'food safety audit',
      'supplier audit', 'facility inspection', 'gfsi audit',
      'unannounced audit', 'surveillance audit', 'follow-up audit'
    ],
    cfrSections: ['§1.506(d)', '§1.511'],
    requiredFor: ['onsite_audit', 'third_party_audit']
  },
  haccp_plan: {
    label: 'HACCP Plan',
    description: 'Hazard Analysis Critical Control Points plan',
    keywords: [
      'haccp', 'hazard analysis', 'critical control point', 'ccp',
      'haccp plan', 'haccp study', 'hazard analysis plan',
      'critical limits', 'monitoring procedures', 'corrective actions',
      'verification procedures', 'haccp team', 'process flow diagram'
    ],
    cfrSections: ['§1.505', '§1.506'],
    requiredFor: ['hazard_analysis', 'supplier_verification']
  },
  food_safety_plan: {
    label: 'Food Safety Plan',
    description: 'Comprehensive food safety plan (FSMA compliant)',
    keywords: [
      'food safety plan', 'preventive controls', 'fsma',
      'food defense plan', 'intentional adulteration', 'recall plan',
      'sanitation controls', 'allergen controls', 'supply chain program',
      'hazard requiring preventive control', 'qualified individual'
    ],
    cfrSections: ['§1.505', '§1.506'],
    requiredFor: ['hazard_analysis', 'supplier_verification']
  },
  sop: {
    label: 'SOP',
    description: 'Standard Operating Procedure',
    keywords: [
      'standard operating procedure', 'sop', 'work instruction',
      'operating procedure', 'procedure manual', 'process procedure',
      'sanitation sop', 'cleaning procedure', 'sanitization procedure',
      'ssop', 'sanitation standard operating procedure'
    ],
    cfrSections: ['§1.506'],
    requiredFor: ['process_verification']
  },
  letter_of_guarantee: {
    label: 'Letter of Guarantee',
    description: 'Supplier guarantee or continuing guarantee',
    keywords: [
      'letter of guarantee', 'guarantee', 'continuing guarantee',
      'supplier guarantee', 'warranty letter', 'assurance letter',
      'product guarantee', 'quality assurance letter', 'compliance guarantee',
      'declaration of compliance', 'attestation'
    ],
    cfrSections: ['§1.505', '§1.512'],
    requiredFor: ['supplier_verification']
  },
  specification_sheet: {
    label: 'Specification Sheet',
    description: 'Product specifications and technical data',
    keywords: [
      'specification', 'product spec', 'technical data sheet', 'tds',
      'product specification', 'spec sheet', 'datasheet',
      'product data', 'technical specification', 'quality specification',
      'ingredient specification', 'raw material specification'
    ],
    cfrSections: ['§1.505'],
    requiredFor: ['hazard_analysis', 'product_verification']
  },
  coa: {
    label: 'Certificate of Analysis',
    description: 'COA with batch-specific test results',
    keywords: [
      'certificate of analysis', 'coa', 'analytical certificate',
      'batch certificate', 'lot certificate', 'quality certificate',
      'batch analysis', 'lot analysis', 'conformity certificate',
      'test certificate', 'inspection certificate'
    ],
    cfrSections: ['§1.505', '§1.506(d)'],
    requiredFor: ['sampling_testing', 'lot_verification']
  },
  supplier_questionnaire: {
    label: 'Supplier Questionnaire',
    description: 'Supplier qualification questionnaire responses',
    keywords: [
      'supplier questionnaire', 'vendor questionnaire', 'qualification',
      'supplier assessment', 'vendor assessment', 'supplier evaluation',
      'qualification questionnaire', 'pre-qualification', 'supplier survey',
      'vendor qualification', 'supplier approval'
    ],
    cfrSections: ['§1.505', '§1.506'],
    requiredFor: ['initial_evaluation', 'supplier_approval']
  },
  corrective_action: {
    label: 'Corrective Action',
    description: 'CAPA - Corrective and Preventive Action records',
    keywords: [
      'corrective action', 'capa', 'preventive action', 'car',
      'corrective action report', 'non-conformance', 'deviation',
      'root cause analysis', 'corrective measure', 'remediation',
      'non-compliance', 'corrective action request'
    ],
    cfrSections: ['§1.508', '§1.506(e)'],
    requiredFor: ['corrective_actions']
  },
  verification_record: {
    label: 'Verification Record',
    description: 'FSVP verification activity records',
    keywords: [
      'verification record', 'verification activity', 'fsvp record',
      'supplier verification', 'verification documentation',
      'compliance verification', 'audit verification', 'review record',
      'monitoring record', 'inspection record'
    ],
    cfrSections: ['§1.506', '§1.510'],
    requiredFor: ['verification_activities']
  },
  import_record: {
    label: 'Import Record',
    description: 'Import documentation and customs records',
    keywords: [
      'import record', 'customs', 'bill of lading', 'commercial invoice',
      'packing list', 'import permit', 'entry document', 'arrival notice',
      'prior notice', 'fda prior notice', 'import declaration',
      'country of origin', 'shipping document'
    ],
    cfrSections: ['§1.509', '§1.510'],
    requiredFor: ['import_documentation']
  },
  unknown: {
    label: 'Unknown',
    description: 'Document type could not be determined',
    keywords: [],
    cfrSections: [],
    requiredFor: []
  }
}

// ============================================================================
// Language Detection Patterns
// ============================================================================

const LANGUAGE_PATTERNS: Record<string, string[]> = {
  english: ['the', 'and', 'for', 'certificate', 'report', 'analysis', 'food', 'safety'],
  vietnamese: ['và', 'của', 'cho', 'giấy', 'chứng', 'nhận', 'báo', 'cáo', 'thực', 'phẩm'],
  chinese: ['证书', '报告', '分析', '食品', '安全', '检测', '认证'],
  spanish: ['certificado', 'informe', 'análisis', 'seguridad', 'alimentaria'],
  french: ['certificat', 'rapport', 'analyse', 'sécurité', 'alimentaire'],
  german: ['zertifikat', 'bericht', 'analyse', 'lebensmittel', 'sicherheit'],
  japanese: ['証明書', '報告書', '分析', '食品', '安全'],
  korean: ['인증서', '보고서', '분석', '식품', '안전'],
  thai: ['ใบรับรอง', 'รายงาน', 'การวิเคราะห์', 'อาหาร', 'ความปลอดภัย']
}

// ============================================================================
// AI Classification Prompt (Optimized for minimal tokens)
// ============================================================================

const CLASSIFICATION_PROMPT = `Classify this document's first page. Return JSON only:

{
  "type": "certificate|test_report|audit_report|haccp_plan|food_safety_plan|sop|letter_of_guarantee|specification_sheet|coa|supplier_questionnaire|corrective_action|verification_record|import_record|unknown",
  "confidence": 0.0-1.0,
  "suggestedName": "brief document title",
  "language": "english|vietnamese|chinese|spanish|french|german|japanese|korean|thai|other",
  "keywords": ["key", "terms", "found"]
}

CLASSIFICATION RULES:
- certificate: ISO/FSSC/BRC/SQF/GFSI logos, "Certificate", "Certified"
- test_report: "Laboratory", "Test Report", "Analysis Results", scientific data
- audit_report: "Audit Report", "Inspection", audit findings
- haccp_plan: "HACCP", "Hazard Analysis", "CCP", flow diagrams
- food_safety_plan: "Food Safety Plan", "Preventive Controls", "FSMA"
- sop: "Standard Operating Procedure", "SOP", "Work Instruction"
- letter_of_guarantee: "Guarantee", "Assurance", "Declaration"
- specification_sheet: "Specification", "Technical Data", "Product Spec"
- coa: "Certificate of Analysis", "COA", "Batch Certificate"
- supplier_questionnaire: "Questionnaire", "Supplier Assessment"
- corrective_action: "Corrective Action", "CAPA", "Non-conformance"
- verification_record: "Verification", "FSVP Record"
- import_record: "Bill of Lading", "Customs", "Import"

Look for: titles, logos, headers, certification body stamps, document structure.
Set confidence based on clarity of indicators.`

// ============================================================================
// Image Processing
// ============================================================================

const MAX_IMAGE_DIMENSION = 1024
const JPEG_QUALITY = 80

/**
 * Convert PDF first page or image to base64 for Vision API
 */
async function prepareImageForClassification(buffer: Buffer, mimeType: string): Promise<string> {
  // If it's a PDF, we need pdf-parse or similar, but for now assume image
  // In production, use pdf.js or pdf-parse to extract first page
  
  let imageBuffer = buffer
  
  // If PDF, extract first page (simplified - in production use pdf.js)
  if (mimeType === 'application/pdf') {
    // For now, return early - we'll handle this in the API route
    // by converting PDF to image using a library like pdf-poppler or pdf2pic
    throw new Error('PDF processing requires conversion to image first')
  }
  
  // Compress and resize image
  const image = sharp(imageBuffer)
  const metadata = await image.metadata()
  
  let processedBuffer: Buffer
  
  if ((metadata.width || 0) > MAX_IMAGE_DIMENSION || (metadata.height || 0) > MAX_IMAGE_DIMENSION) {
    processedBuffer = await image
      .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer()
  } else {
    processedBuffer = await image
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer()
  }
  
  const base64 = processedBuffer.toString('base64')
  return `data:image/jpeg;base64,${base64}`
}

// ============================================================================
// Keyword-based Classification (Fallback)
// ============================================================================

/**
 * Classify document using keyword matching (fallback when AI unavailable)
 */
export function classifyByKeywords(text: string): DocumentClassificationResult {
  const normalizedText = text.toLowerCase()
  
  let bestMatch: FSVPDocumentType = 'unknown'
  let maxScore = 0
  let matchedKeywords: string[] = []
  
  for (const [docType, config] of Object.entries(FSVP_DOCUMENT_TYPES)) {
    if (docType === 'unknown') continue
    
    let score = 0
    const found: string[] = []
    
    for (const keyword of config.keywords) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        score += keyword.split(' ').length // Multi-word keywords get higher weight
        found.push(keyword)
      }
    }
    
    if (score > maxScore) {
      maxScore = score
      bestMatch = docType as FSVPDocumentType
      matchedKeywords = found
    }
  }
  
  // Detect language
  let detectedLanguage = 'english'
  for (const [lang, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
    const matches = patterns.filter(p => normalizedText.includes(p.toLowerCase())).length
    if (matches >= 2 && lang !== 'english') {
      detectedLanguage = lang
      break
    }
  }
  
  const confidence = maxScore > 0 ? Math.min(maxScore / 10, 0.8) : 0.1
  const docConfig = FSVP_DOCUMENT_TYPES[bestMatch]
  
  return {
    documentType: bestMatch,
    confidence,
    detectedLanguage,
    requiresTranslation: detectedLanguage !== 'english',
    fsvpRelevance: {
      isRelevant: docConfig.cfrSections.length > 0,
      applicableSections: docConfig.cfrSections,
      notes: docConfig.requiredFor.length > 0 
        ? `Required for: ${docConfig.requiredFor.join(', ')}`
        : undefined
    },
    keywords: matchedKeywords,
    classificationMethod: 'keyword_fallback'
  }
}

// ============================================================================
// AI Classification
// ============================================================================

/**
 * Classify document using GPT-4o-mini Vision API
 */
export async function classifyWithAI(
  imageDataUrl: string,
  options?: { timeout?: number }
): Promise<DocumentClassificationResult> {
  const timeout = options?.timeout || 15000
  
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await retryWithBackoff(() =>
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: CLASSIFICATION_PROMPT
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: imageDataUrl,
                  detail: 'low' // Use low detail for classification (saves tokens)
                }
              },
              {
                type: 'text',
                text: 'Classify this document. Return JSON only.'
              }
            ]
          }
        ],
        max_tokens: 200,
        temperature: 0,
        response_format: { type: 'json_object' }
      })
    )
    
    clearTimeout(timeoutId)
    
    const content = response.choices[0].message.content || '{}'
    const parsed = JSON.parse(content)
    
    // Validate and map response
    const docType = (parsed.type || 'unknown') as FSVPDocumentType
    const validType = docType in FSVP_DOCUMENT_TYPES ? docType : 'unknown'
    const docConfig = FSVP_DOCUMENT_TYPES[validType]
    
    return {
      documentType: validType,
      confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
      suggestedName: parsed.suggestedName,
      detectedLanguage: parsed.language || 'english',
      requiresTranslation: parsed.language && parsed.language !== 'english',
      fsvpRelevance: {
        isRelevant: docConfig.cfrSections.length > 0,
        applicableSections: docConfig.cfrSections,
        notes: docConfig.requiredFor.length > 0
          ? `Required for: ${docConfig.requiredFor.join(', ')}`
          : undefined
      },
      keywords: parsed.keywords || [],
      classificationMethod: 'ai_vision'
    }
  } catch (error: any) {
    clearTimeout(timeoutId)
    
    if (error.name === 'AbortError') {
      throw new Error('Document classification timed out')
    }
    
    throw error
  }
}

// ============================================================================
// Main Classification Function
// ============================================================================

/**
 * Classify a document (PDF or image) using AI with keyword fallback
 * 
 * @param buffer - File buffer
 * @param mimeType - MIME type of the file
 * @param options - Classification options
 */
export async function classifyDocument(
  buffer: Buffer,
  mimeType: string,
  options: ClassificationOptions = {}
): Promise<DocumentClassificationResult> {
  const { useAI = true, fallbackToKeywords = true, timeout = 15000 } = options
  
  // For PDFs, we need to convert to image first
  // This is handled in the API route using pdf.js or similar
  if (mimeType === 'application/pdf') {
    throw new Error('PDF must be converted to image before classification. Use the /api/fsvp/documents/classify endpoint.')
  }
  
  if (useAI) {
    try {
      const imageDataUrl = await prepareImageForClassification(buffer, mimeType)
      return await classifyWithAI(imageDataUrl, { timeout })
    } catch (error: any) {
      console.error('[FSVP-Classifier] AI classification failed:', error.message)
      
      if (fallbackToKeywords) {
        console.log('[FSVP-Classifier] Falling back to keyword classification')
        // For images, we can't extract text easily, so return unknown
        return {
          documentType: 'unknown',
          confidence: 0.1,
          fsvpRelevance: {
            isRelevant: false,
            applicableSections: []
          },
          classificationMethod: 'keyword_fallback'
        }
      }
      
      throw error
    }
  }
  
  // Keyword-only classification requires extracted text
  return {
    documentType: 'unknown',
    confidence: 0.1,
    fsvpRelevance: {
      isRelevant: false,
      applicableSections: []
    },
    classificationMethod: 'keyword_fallback'
  }
}

/**
 * Classify document from extracted text (for OCR-processed documents)
 */
export function classifyFromText(text: string): DocumentClassificationResult {
  return classifyByKeywords(text)
}

/**
 * Get human-readable label for document type
 */
export function getDocumentTypeLabel(type: FSVPDocumentType): string {
  return FSVP_DOCUMENT_TYPES[type]?.label || 'Unknown'
}

/**
 * Get all document types with labels (for dropdown)
 */
export function getAllDocumentTypes(): Array<{ value: FSVPDocumentType; label: string; description: string }> {
  return Object.entries(FSVP_DOCUMENT_TYPES)
    .filter(([key]) => key !== 'unknown')
    .map(([value, config]) => ({
      value: value as FSVPDocumentType,
      label: config.label,
      description: config.description
    }))
}

/**
 * Check if a document type is relevant for a specific FSVP requirement
 */
export function isRelevantForRequirement(
  docType: FSVPDocumentType,
  requirement: string
): boolean {
  const config = FSVP_DOCUMENT_TYPES[docType]
  return config?.requiredFor.includes(requirement) || false
}

/**
 * Get CFR sections associated with a document type
 */
export function getCFRSections(docType: FSVPDocumentType): string[] {
  return FSVP_DOCUMENT_TYPES[docType]?.cfrSections || []
}
