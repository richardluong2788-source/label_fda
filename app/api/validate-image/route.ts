import { NextRequest, NextResponse } from 'next/server'
import { getOpenAIClient } from '@/lib/openai-client'

// Validation rules for each label type
const VALIDATION_RULES = {
  pdp: {
    name: 'Principal Display Panel',
    requiredElements: ['Net Weight', 'Product Name', 'Brand Name'],
    keywords: ['net wt', 'oz', 'g', 'ml', 'fl oz', 'lbs', 'kg'],
    description: 'Mặt trước bao bì phải có tên sản phẩm, thương hiệu và khối lượng tịnh'
  },
  nutrition: {
    name: 'Nutrition Facts',
    requiredElements: ['Nutrition Facts', 'Serving Size', 'Calories'],
    keywords: ['nutrition facts', 'serving size', 'calories', 'total fat', 'sodium', 'carbohydrate', 'protein'],
    description: 'Bảng dinh dưỡng phải có đầy đủ các thông tin bắt buộc theo FDA'
  },
  supplementFacts: {
    name: 'Supplement Facts',
    requiredElements: ['Supplement Facts', 'Serving Size', 'Amount Per Serving'],
    keywords: ['supplement facts', 'serving size', 'amount per serving', 'daily value', '% daily value', 'other ingredients'],
    description: 'Bảng Supplement Facts cho thực phẩm chức năng (21 CFR 101.36)'
  },
  drugFacts: {
    name: 'Drug Facts',
    requiredElements: ['Drug Facts', 'Active Ingredient', 'Purpose', 'Uses', 'Warnings', 'Directions'],
    keywords: ['drug facts', 'active ingredient', 'purpose', 'uses', 'warnings', 'directions', 'inactive ingredients'],
    description: 'Bảng Drug Facts cho dược phẩm OTC (21 CFR 201.66)'
  },
  inciIngredients: {
    name: 'INCI Ingredient Declaration',
    requiredElements: ['Ingredients'],
    keywords: ['ingredients', 'aqua', 'water', 'glycerin', 'sodium', 'parfum', 'fragrance', 'ci ', 'tocopherol'],
    description: 'Danh sách thành phần mỹ phẩm theo INCI (21 CFR 701.3)'
  },
  ingredients: {
    name: 'Ingredients',
    requiredElements: ['Ingredients'],
    keywords: ['ingredients', 'contains', 'allergen'],
    description: 'Danh sách thành phần phải liệt kê theo thứ tự khối lượng'
  },
  other: {
    name: 'Other Label',
    requiredElements: [],
    keywords: [],
    description: 'Các mặt khác của nhãn'
  }
}

interface ValidationResult {
  isValid: boolean
  confidence: number
  quality: 'good' | 'acceptable' | 'poor'
  issues: string[]
  detectedType: string | null
  hasText: boolean
  isBlurry: boolean
  isLabel: boolean
  detectedElements: string[]
  message: string
}

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, expectedType } = await req.json()

    if (!imageUrl) {
      return NextResponse.json({ error: 'Missing imageUrl' }, { status: 400 })
    }

    console.log('[v0] Validating image type:', expectedType)

    // Call GPT-4o Vision to analyze the image
    const openai = getOpenAIClient()
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert FDA label compliance validator. Analyze the uploaded image and determine:
1. Is this a product label? (food, supplement, cosmetic, or OTC drug label — not a random image, person, landscape, etc.)
2. What type of label panel is it? (PDP/front panel, Nutrition Facts, Supplement Facts, Drug Facts, INCI Ingredient Declaration, Ingredients list, or other)
3. Image quality (sharp/blurry, well-lit/dark, readable/unreadable)
4. What key elements are visible on the label?
5. Any major issues that would prevent analysis?

Return JSON format:
{
  "isLabel": boolean,
  "detectedType": "pdp" | "nutrition" | "supplementFacts" | "drugFacts" | "inciIngredients" | "ingredients" | "other" | "not_a_label",
  "confidence": 0-1,
  "quality": "good" | "acceptable" | "poor",
  "isBlurry": boolean,
  "hasText": boolean,
  "detectedElements": ["element1", "element2"],
  "issues": ["issue1", "issue2"]
}`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Expected label type: ${VALIDATION_RULES[expectedType as keyof typeof VALIDATION_RULES]?.name || expectedType}. Validate this image.`
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'low' // Use low detail for faster validation
              }
            }
          ]
        }
      ],
      max_tokens: 500,
      temperature: 0.3,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from AI')
    }

    console.log('[v0] AI validation response:', content)

    // Parse AI response
    let aiResult: any
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/)
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content
      aiResult = JSON.parse(jsonStr)
    } catch (e) {
      console.error('[v0] Failed to parse AI response:', e)
      throw new Error('Invalid AI response format')
    }

    // Build validation result
    const result: ValidationResult = {
      isValid: aiResult.isLabel && aiResult.quality !== 'poor',
      confidence: aiResult.confidence || 0,
      quality: aiResult.quality || 'acceptable',
      issues: aiResult.issues || [],
      detectedType: aiResult.detectedType,
      hasText: aiResult.hasText ?? true,
      isBlurry: aiResult.isBlurry ?? false,
      isLabel: aiResult.isLabel ?? false,
      detectedElements: aiResult.detectedElements || [],
      message: ''
    }

    // Generate user-friendly message
    if (!result.isLabel) {
      result.message = '❌ Đây không phải ảnh nhãn sản phẩm. Vui lòng upload ảnh nhãn đúng.'
      result.issues.push('Không phải ảnh nhãn sản phẩm')
    } else if (result.isBlurry) {
      result.message = '⚠️ Ảnh bị mờ. Vui lòng chụp lại rõ hơn để AI phân tích chính xác.'
    } else if (result.detectedType !== expectedType && result.detectedType !== 'other') {
      const expected = VALIDATION_RULES[expectedType as keyof typeof VALIDATION_RULES]?.name
      const detected = VALIDATION_RULES[result.detectedType as keyof typeof VALIDATION_RULES]?.name
      result.message = `⚠️ Ảnh này là ${detected}, không phải ${expected}. Vui lòng upload đúng loại nhãn.`
      result.issues.push(`Sai loại nhãn: phát hiện ${detected} thay vì ${expected}`)
    } else if (result.quality === 'poor') {
      result.message = '⚠️ Chất lượng ảnh kém. Vui lòng chụp lại với ánh sáng tốt hơn.'
    } else if (result.quality === 'acceptable') {
      result.message = '✓ Ảnh chấp nhận được. Khuyến nghị chụp lại rõ hơn để tăng độ chính xác.'
    } else {
      result.message = '✓ Ảnh chất lượng tốt, AI đã nhận diện thành công!'
    }

    console.log('[v0] Validation result:', result)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[v0] Image validation error:', error)
    return NextResponse.json(
      { 
        error: 'Validation failed',
        message: error.message,
        isValid: false,
        confidence: 0,
        quality: 'poor',
        issues: ['Lỗi hệ thống khi validate ảnh'],
        detectedType: null,
        hasText: false,
        isBlurry: false,
        isLabel: false,
        detectedElements: []
      },
      { status: 500 }
    )
  }
}
