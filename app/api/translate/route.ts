import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

// Lazy initialize Groq client to avoid build errors when API key is not set
function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return null
  }
  return new Groq({ apiKey })
}

interface TranslateRequest {
  texts: string[]
  targetLocale: 'en' | 'vi'
  sourceLocale?: 'en' | 'vi'
  context?: 'violation' | 'general'
}

interface TranslateResponse {
  translations: string[]
  cached: boolean
}

// Simple Vietnamese detection heuristic
function detectVietnamese(text: string): boolean {
  const vietnamesePattern = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i
  return vietnamesePattern.test(text)
}

// Detect source language from text
function detectSourceLanguage(texts: string[]): 'en' | 'vi' {
  const sampleText = texts.slice(0, 3).join(' ')
  return detectVietnamese(sampleText) ? 'vi' : 'en'
}

export async function POST(request: NextRequest) {
  try {
    const groq = getGroqClient()
    
    if (!groq) {
      return NextResponse.json(
        { error: 'Translation service not configured - GROQ_API_KEY is missing' },
        { status: 503 }
      )
    }

    const body: TranslateRequest = await request.json()
    const { texts, targetLocale, context = 'violation' } = body

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: texts array is required' },
        { status: 400 }
      )
    }

    if (!targetLocale || !['en', 'vi'].includes(targetLocale)) {
      return NextResponse.json(
        { error: 'Invalid request: targetLocale must be "en" or "vi"' },
        { status: 400 }
      )
    }

    // Detect source language
    const sourceLocale = body.sourceLocale || detectSourceLanguage(texts)

    // Skip if same language
    if (sourceLocale === targetLocale) {
      return NextResponse.json({
        translations: texts,
        cached: false,
        skipped: true,
      })
    }

    // Build context-aware prompt
    const contextPrompt = context === 'violation'
      ? `You are a professional FDA compliance document translator specializing in food, cosmetic, and drug labeling regulations.
Your task is to translate violation descriptions and compliance guidance between Vietnamese and English.

IMPORTANT RULES:
1. Maintain technical accuracy for FDA regulatory terms (CFR references, ingredient names, labeling requirements)
2. Keep the professional, formal tone appropriate for compliance documents
3. Preserve any regulation codes (e.g., "21 CFR 101.4", "FD&C Act Section 403")
4. Translate measurement units appropriately but keep original values
5. Do NOT add explanations or notes - only translate the content`
      : `You are a professional translator. Translate the following texts accurately while maintaining the original meaning and tone.`

    const languageNames = {
      en: 'English',
      vi: 'Vietnamese'
    }

    const prompt = `${contextPrompt}

Translate the following ${texts.length} text(s) from ${languageNames[sourceLocale]} to ${languageNames[targetLocale]}.

Return ONLY a JSON array of translated strings in the same order as input.
Do not include any explanation, markdown, or additional text - just the JSON array.

Input texts:
${JSON.stringify(texts, null, 2)}

Output (JSON array only):`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 4000,
    })

    const response = completion.choices[0]?.message?.content || ''

    // Parse the response
    let translations: string[]
    try {
      // Try to extract JSON array from response
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        translations = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON array found in response')
      }
    } catch (parseError) {
      console.error('[v0] Failed to parse translation response:', response)
      // Fallback: return original texts
      return NextResponse.json({
        translations: texts,
        cached: false,
        error: 'Parse error - returning original texts',
      })
    }

    // Validate translations count matches input
    if (translations.length !== texts.length) {
      console.error('[v0] Translation count mismatch:', translations.length, 'vs', texts.length)
      return NextResponse.json({
        translations: texts,
        cached: false,
        error: 'Count mismatch - returning original texts',
      })
    }

    return NextResponse.json({
      translations,
      cached: false,
      sourceLocale,
      targetLocale,
    } as TranslateResponse)

  } catch (error) {
    console.error('[v0] Translation API error:', error)
    return NextResponse.json(
      { error: 'Translation failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
