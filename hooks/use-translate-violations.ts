'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Violation } from '@/lib/types'
import type { Locale } from '@/lib/i18n/context'

// Cache key generator
function getCacheKey(reportId: string, locale: Locale): string {
  return `vexim_translate_${reportId}_${locale}`
}

// Simple hash function for text
function hashText(text: string): string {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(36)
}

// Detect if text contains Vietnamese characters
function isVietnamese(text: string): boolean {
  const vietnamesePattern = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i
  return vietnamesePattern.test(text)
}

// Detect source language of violations
function detectViolationsLanguage(violations: Violation[]): Locale {
  const sampleText = violations
    .slice(0, 3)
    .map(v => `${v.category} ${v.description}`)
    .join(' ')
  return isVietnamese(sampleText) ? 'vi' : 'en'
}

interface TranslatedViolation extends Violation {
  _translated?: boolean
  _originalCategory?: string
  _originalDescription?: string
  _originalSuggestedFix?: string
}

interface TranslationCache {
  violations: TranslatedViolation[]
  timestamp: number
}

interface UseTranslateViolationsResult {
  translatedViolations: TranslatedViolation[]
  isTranslating: boolean
  translationError: string | null
  sourceLanguage: Locale | null
  retryTranslation: () => void
}

const CACHE_TTL = 1000 * 60 * 60 // 1 hour cache

export function useTranslateViolations(
  violations: Violation[],
  targetLocale: Locale,
  reportId: string
): UseTranslateViolationsResult {
  const [translatedViolations, setTranslatedViolations] = useState<TranslatedViolation[]>(violations)
  const [isTranslating, setIsTranslating] = useState(false)
  const [translationError, setTranslationError] = useState<string | null>(null)
  const [sourceLanguage, setSourceLanguage] = useState<Locale | null>(null)
  
  // Ref to track if translation is in progress
  const translatingRef = useRef(false)
  // Ref to track last translation params to avoid duplicate calls
  const lastTranslationRef = useRef<string>('')

  const translateViolations = useCallback(async () => {
    if (!violations || violations.length === 0) {
      setTranslatedViolations([])
      return
    }

    // Detect source language
    const detectedSource = detectViolationsLanguage(violations)
    setSourceLanguage(detectedSource)
    console.log('[v0] Translation language detection:', { 
      detectedSource, 
      targetLocale, 
      sameLanguage: detectedSource === targetLocale,
      sampleText: violations[0]?.category?.substring(0, 50)
    })

    // Skip if same language
    if (detectedSource === targetLocale) {
      console.log('[v0] Skipping translation - same language')
      setTranslatedViolations(violations)
      return
    }

    // Create translation key for deduplication
    const translationKey = `${reportId}_${targetLocale}_${hashText(violations.map(v => v.id || v.category).join('_'))}`
    
    // Skip if we're already translating with same params
    if (lastTranslationRef.current === translationKey && translatingRef.current) {
      return
    }
    lastTranslationRef.current = translationKey

    // Check sessionStorage cache first
    const cacheKey = getCacheKey(reportId, targetLocale)
    try {
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) {
        const parsedCache: TranslationCache = JSON.parse(cached)
        if (Date.now() - parsedCache.timestamp < CACHE_TTL) {
          setTranslatedViolations(parsedCache.violations)
          return
        }
      }
    } catch {
      // Cache read failed, continue with API call
    }

    // Prevent concurrent translations
    if (translatingRef.current) return
    translatingRef.current = true
    setIsTranslating(true)
    setTranslationError(null)

    try {
      // Prepare texts for translation
      const textsToTranslate: string[] = []
      const textIndices: Array<{ violationIndex: number; field: 'category' | 'description' | 'suggested_fix' }> = []

      violations.forEach((v, vIndex) => {
        // Category
        if (v.category) {
          textsToTranslate.push(v.category)
          textIndices.push({ violationIndex: vIndex, field: 'category' })
        }
        // Description
        if (v.description) {
          textsToTranslate.push(v.description)
          textIndices.push({ violationIndex: vIndex, field: 'description' })
        }
        // Suggested fix
        if (v.suggested_fix) {
          textsToTranslate.push(v.suggested_fix)
          textIndices.push({ violationIndex: vIndex, field: 'suggested_fix' })
        }
      })

      // Call translation API
      console.log('[v0] Calling translation API:', { 
        textsCount: textsToTranslate.length, 
        targetLocale,
        sourceLocale: detectedSource,
        firstText: textsToTranslate[0]?.substring(0, 50)
      })
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texts: textsToTranslate,
          targetLocale,
          sourceLocale: detectedSource,
          context: 'violation',
        }),
      })

      if (!response.ok) {
        throw new Error(`Translation failed: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      // Map translations back to violations
      const translated: TranslatedViolation[] = violations.map(v => ({
        ...v,
        _translated: true,
        _originalCategory: v.category,
        _originalDescription: v.description,
        _originalSuggestedFix: v.suggested_fix,
      }))

      data.translations.forEach((translatedText: string, index: number) => {
        const { violationIndex, field } = textIndices[index]
        if (field === 'category') {
          translated[violationIndex].category = translatedText
        } else if (field === 'description') {
          translated[violationIndex].description = translatedText
        } else if (field === 'suggested_fix') {
          translated[violationIndex].suggested_fix = translatedText
        }
      })

      setTranslatedViolations(translated)

      // Save to cache
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          violations: translated,
          timestamp: Date.now(),
        } as TranslationCache))
      } catch {
        // Cache write failed, ignore
      }

    } catch (error) {
      console.error('[v0] Translation error:', error)
      setTranslationError(error instanceof Error ? error.message : 'Translation failed')
      // Fallback to original violations
      setTranslatedViolations(violations)
    } finally {
      setIsTranslating(false)
      translatingRef.current = false
    }
  }, [violations, targetLocale, reportId])

  // Trigger translation when locale or violations change
  useEffect(() => {
    console.log('[v0] useTranslateViolations triggered:', {
      violationsCount: violations?.length,
      targetLocale,
      reportId,
      isTranslating: translatingRef.current,
    })
    translateViolations()
  }, [translateViolations])

  // Retry function - also clears cache
  const retryTranslation = useCallback(() => {
    console.log('[v0] Retrying translation - clearing cache')
    lastTranslationRef.current = '' // Reset to allow retry
    // Clear cache for this report
    try {
      const cacheKey = getCacheKey(reportId, targetLocale)
      sessionStorage.removeItem(cacheKey)
    } catch {
      // Ignore cache clear errors
    }
    translateViolations()
  }, [translateViolations, reportId, targetLocale])

  return {
    translatedViolations,
    isTranslating,
    translationError,
    sourceLanguage,
    retryTranslation,
  }
}
