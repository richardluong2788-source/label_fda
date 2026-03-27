import { put } from '@vercel/blob'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const documentType = formData.get('document_type') as string
    const documentName = formData.get('document_name') as string
    const expiryDate = formData.get('expiry_date') as string | null
    const description = formData.get('description') as string | null
    
    // Translation tracking fields (21 CFR 1.510(b)(1))
    const originalLanguage = formData.get('original_language') as string || 'english'
    const translationFile = formData.get('translation_file') as File | null
    
    // AI classification fields
    const aiSuggestedType = formData.get('ai_suggested_type') as string | null
    const aiConfidence = formData.get('ai_confidence') as string | null
    const classificationMethod = formData.get('classification_method') as string || 'manual'
    const applicableCfrSectionsRaw = formData.get('applicable_cfr_sections') as string | null
    const applicableCfrSections = applicableCfrSectionsRaw ? JSON.parse(applicableCfrSectionsRaw) : []

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!documentType || !documentName) {
      return NextResponse.json({ error: 'Document type and name are required' }, { status: 400 })
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Allowed: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF, WEBP' 
      }, { status: 400 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const pathname = `fsvp-documents/${user.id}/${timestamp}-${sanitizedName}`

    // Upload to Vercel Blob (private)
    const blob = await put(pathname, file, {
      access: 'private',
    })
    
    // Upload translation file if provided
    let translationFileUrl: string | null = null
    if (translationFile && translationFile.size > 0) {
      const translationPathname = `fsvp-documents/${user.id}/translations/${timestamp}-${translationFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const translationBlob = await put(translationPathname, translationFile, {
        access: 'private',
      })
      translationFileUrl = translationBlob.pathname
    }
    
    // Determine translation status
    let translationStatus: 'not_needed' | 'pending' | 'uploaded' = 'not_needed'
    if (originalLanguage !== 'english') {
      translationStatus = translationFileUrl ? 'uploaded' : 'pending'
    }

    // Calculate expiry status
    // Valid statuses in database: 'valid', 'expired', 'pending_review', 'rejected', 'archived'
    let status = 'valid'
    if (expiryDate) {
      const expiry = new Date(expiryDate)
      const now = new Date()
      if (expiry < now) {
        status = 'expired'
      }
      // Note: Documents expiring soon still have 'valid' status
      // The expiry_date field is used to track when they will expire
    }

    // Save document metadata to database
    const { data, error } = await supabase
      .from('fsvp_documents')
      .insert({
        importer_user_id: user.id,
        document_type: documentType,
        document_name: documentName,
        description: description || null,
        file_url: blob.pathname, // Store pathname for private access
        file_size_bytes: file.size,
        mime_type: file.type,
        upload_date: new Date().toISOString(),
        expiry_date: expiryDate || null,
        status: status,
        version: '1.0',
        // Translation tracking (21 CFR 1.510(b)(1))
        original_language: originalLanguage,
        has_english_translation: originalLanguage === 'english' || !!translationFileUrl,
        translation_file_url: translationFileUrl,
        translation_status: translationStatus,
        // AI classification data
        ai_suggested_type: aiSuggestedType,
        ai_confidence: aiConfidence ? parseFloat(aiConfidence) : null,
        classification_method: classificationMethod,
        applicable_cfr_sections: applicableCfrSections.length > 0 ? applicableCfrSections : null,
        is_fsvp_relevant: true
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      document: data,
      message: 'File uploaded successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
