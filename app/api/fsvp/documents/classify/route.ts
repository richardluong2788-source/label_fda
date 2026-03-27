/**
 * FSVP Document Classification API
 * 
 * POST /api/fsvp/documents/classify
 * 
 * Classifies uploaded documents (PDF or images) using AI Vision.
 * Only scans the first page for efficient classification.
 * 
 * Request: FormData with 'file' field
 * Response: DocumentClassificationResult
 */

import { NextRequest, NextResponse } from 'next/server'
import { openai, retryWithBackoff } from '@/lib/openai-client'
import sharp from 'sharp'
import {
  type FSVPDocumentType,
  type DocumentClassificationResult,
  FSVP_DOCUMENT_TYPES,
  classifyByKeywords
} from '@/lib/fsvp-document-classifier'

// ============================================================================
// Configuration
// ============================================================================

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/tiff'
]
const MAX_IMAGE_DIMENSION = 1024
const JPEG_QUALITY = 80
const AI_TIMEOUT = 15000 // 15 seconds

// Classification prompt optimized for minimal tokens
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
- test_report: "Laboratory", "Test Report", "Analysis Results"
- audit_report: "Audit Report", "Inspection", audit findings
- haccp_plan: "HACCP", "Hazard Analysis", "CCP"
- food_safety_plan: "Food Safety Plan", "Preventive Controls", "FSMA"
- sop: "Standard Operating Procedure", "SOP"
- letter_of_guarantee: "Guarantee", "Assurance", "Declaration"
- specification_sheet: "Specification", "Technical Data"
- coa: "Certificate of Analysis", "COA", "Batch Certificate"
- supplier_questionnaire: "Questionnaire", "Supplier Assessment"
- corrective_action: "Corrective Action", "CAPA"
- verification_record: "Verification", "FSVP Record"
- import_record: "Bill of Lading", "Customs", "Import"

Set confidence based on clarity of indicators.`

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert PDF first page to image using sharp
 * Note: Sharp can handle PDF with poppler backend on some systems
 * For broader compatibility, we process page 0 only
 */
async function convertPdfPageToImage(pdfBuffer: Buffer): Promise<Buffer> {
  try {
    // Sharp can read PDF first page on systems with poppler installed
    // If not available, the caller should use a different approach
    const imageBuffer = await sharp(pdfBuffer, { page: 0 })
      .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer()
    
    return imageBuffer
  } catch (error: any) {
    // If sharp can't process PDF, throw descriptive error
    if (error.message?.includes('Input file is missing') || 
        error.message?.includes('Input buffer contains unsupported image format')) {
      throw new Error('PDF processing not supported. Please upload an image of the first page instead.')
    }
    throw error
  }
}

/**
 * Process image buffer for Vision API
 */
async function processImageBuffer(buffer: Buffer): Promise<Buffer> {
  const metadata = await sharp(buffer).metadata()
  
  if ((metadata.width || 0) > MAX_IMAGE_DIMENSION || 
      (metadata.height || 0) > MAX_IMAGE_DIMENSION) {
    return await sharp(buffer)
      .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer()
  }
  
  return await sharp(buffer)
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer()
}

/**
 * Classify document using GPT-4o-mini Vision
 */
async function classifyWithAI(imageBuffer: Buffer): Promise<{
  type: FSVPDocumentType
  confidence: number
  suggestedName?: string
  language?: string
  keywords?: string[]
}> {
  const base64 = imageBuffer.toString('base64')
  const imageDataUrl = `data:image/jpeg;base64,${base64}`
  
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
                detail: 'low' // Low detail saves tokens for classification
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
  
  const content = response.choices[0].message.content || '{}'
  const parsed = JSON.parse(content)
  
  // Validate document type
  const docType = (parsed.type || 'unknown') as FSVPDocumentType
  const validType = docType in FSVP_DOCUMENT_TYPES ? docType : 'unknown'
  
  return {
    type: validType,
    confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
    suggestedName: parsed.suggestedName,
    language: parsed.language,
    keywords: parsed.keywords
  }
}

// ============================================================================
// API Route Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }
    
    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { 
          error: 'Invalid file type',
          message: `Allowed types: ${ALLOWED_TYPES.join(', ')}`
        },
        { status: 400 }
      )
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { 
          error: 'File too large',
          message: `Maximum file size: ${MAX_FILE_SIZE / 1024 / 1024}MB`
        },
        { status: 400 }
      )
    }
    
    // Get file buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    let imageBuffer: Buffer
    
    // Convert PDF to image if needed
    if (file.type === 'application/pdf') {
      try {
        imageBuffer = await convertPdfPageToImage(buffer)
      } catch (pdfError: any) {
        console.error('[FSVP-Classify] PDF conversion failed:', pdfError.message)
        
        // Return a graceful response with unknown type
        return NextResponse.json({
          documentType: 'unknown',
          confidence: 0.1,
          fsvpRelevance: {
            isRelevant: false,
            applicableSections: []
          },
          classificationMethod: 'keyword_fallback',
          error: 'PDF processing failed. Please upload an image of the first page for AI classification.',
          requiresManualSelection: true
        } satisfies DocumentClassificationResult & { error: string; requiresManualSelection: boolean })
      }
    } else {
      // Process image
      imageBuffer = await processImageBuffer(buffer)
    }
    
    // Classify with AI
    let result: DocumentClassificationResult
    
    try {
      const aiResult = await Promise.race([
        classifyWithAI(imageBuffer),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('AI classification timeout')), AI_TIMEOUT)
        )
      ])
      
      const docConfig = FSVP_DOCUMENT_TYPES[aiResult.type]
      
      result = {
        documentType: aiResult.type,
        confidence: aiResult.confidence,
        suggestedName: aiResult.suggestedName,
        detectedLanguage: aiResult.language || 'english',
        requiresTranslation: aiResult.language && aiResult.language !== 'english',
        fsvpRelevance: {
          isRelevant: docConfig.cfrSections.length > 0,
          applicableSections: docConfig.cfrSections,
          notes: docConfig.requiredFor.length > 0
            ? `Required for: ${docConfig.requiredFor.join(', ')}`
            : undefined
        },
        keywords: aiResult.keywords || [],
        classificationMethod: 'ai_vision'
      }
      
    } catch (aiError: any) {
      console.error('[FSVP-Classify] AI classification failed:', aiError.message)
      
      // Return unknown with flag for manual selection
      result = {
        documentType: 'unknown',
        confidence: 0.1,
        fsvpRelevance: {
          isRelevant: false,
          applicableSections: []
        },
        classificationMethod: 'keyword_fallback'
      }
    }
    
    return NextResponse.json(result)
    
  } catch (error: any) {
    console.error('[FSVP-Classify] Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Classification failed',
        message: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// GET - Return available document types
// ============================================================================

export async function GET() {
  const types = Object.entries(FSVP_DOCUMENT_TYPES)
    .filter(([key]) => key !== 'unknown')
    .map(([value, config]) => ({
      value,
      label: config.label,
      description: config.description,
      cfrSections: config.cfrSections,
      requiredFor: config.requiredFor
    }))
  
  return NextResponse.json({ types })
}
