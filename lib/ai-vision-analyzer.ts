import { openai, retryWithBackoff } from './openai-client'
import type { NutritionFact, TextElement } from './types'

export interface ColorInfo {
  foreground: string // Hex color code
  background: string // Hex color code
}

export interface TextElementWithColor extends TextElement {
  colors?: ColorInfo
}

export interface VisionAnalysisResult {
  nutritionFacts: NutritionFact[]
  textElements: {
    brandName?: TextElementWithColor
    productName?: TextElementWithColor
    netQuantity?: TextElementWithColor
    allText: string
  }
  detectedClaims: string[]
  ingredients: string[]
  allergens: string[]
  warnings: string[]
  detectedLanguages: string[]
  tokensUsed: number
  overallConfidence?: number
  /**
   * Product type detected directly from the image by Vision AI.
   * Values: 'food' | 'beverage' | 'cosmetic' | 'drug_otc' |
   *         'dietary_supplement' | 'medical_device' | 'infant_food' |
   *         'toddler_food' | 'solid_food' | 'unknown'
   * Used to auto-populate productDomain when user hasn't selected a category.
   */
  detectedProductType?: string
}

const VISION_SYSTEM_PROMPT = `You are an FDA compliance expert analyzing product labels. Your PRIMARY GOAL is to extract ONLY the EXACT information VISIBLE in the image. DO NOT use example values, DO NOT hallucinate, DO NOT fill in common values.

STEP 1: IDENTIFY PRODUCT TYPE — THIS IS CRITICAL
Before extracting data, identify what type of product this is from visual cues:
- "food": Nutrition Facts panel visible, food/beverage product
- "beverage": "ml", "fl oz", "12 oz can", "355ml" — liquid food/drink
- "solid_food": "g" servings, "1 cup", "1 pack" — solid food product
- "infant_food": "Infants", "0-12 months", baby bottle imagery
- "toddler_food": "Toddlers", "12-36 months"
- "dietary_supplement": "Supplement Facts" panel (NOT Nutrition Facts), capsules/tablets/powders
- "cosmetic": INCI ingredient list, "Ingredients:" without Nutrition Facts, shampoo/lotion/cream/makeup/skincare/fragrance
- "drug_otc": "Drug Facts" panel, "Active Ingredient(s)", "Uses:", "Warnings:", "Directions:"
- "medical_device": CE mark, UDI barcode, "sterile", "single use", no nutrition/drug facts

STEP 2: READ SERVING SIZE CAREFULLY (for food products)
The serving size tells you the product type:
- "1 pack (70g)" or "1 cup (228g)" = solid food
- "8 fl oz (240ml)" or "1 can (355ml)" = beverage
This MUST match the nutrition values scale.

Return a JSON object with this structure:
{
  "productType": "infant_food" | "toddler_food" | "beverage" | "solid_food" | "food" | "dietary_supplement" | "cosmetic" | "drug_otc" | "medical_device" | "unknown",
  "servingSize": "exact text from label",
  "nutritionFacts": [
    { "name": "Calories", "value": <READ_FROM_LABEL>, "unit": "kcal", "dailyValue": <READ_OR_NULL> },
    <...include EVERY nutrient you see...>
  ],
  "textElements": {
    "brandName": { 
      "text": "exact brand text or empty string", 
      "fontSize": 18, 
      "x": 100, 
      "y": 50, 
      "width": 300, 
      "height": 60,
      "colors": { "foreground": "#000000", "background": "#FFFFFF" },
      "boundingBox": { "x": 100, "y": 50, "width": 300, "height": 60, "confidence": 0.95 }
    },
    "productName": { 
      "text": "exact product name or empty string", 
      "fontSize": 14, 
      "x": 100, 
      "y": 120, 
      "width": 200, 
      "height": 30,
      "colors": { "foreground": "#333333", "background": "#F5F5F5" },
      "boundingBox": { "x": 100, "y": 120, "width": 200, "height": 30, "confidence": 0.95 }
    },
    "netQuantity": { 
      "text": "FIND NET WEIGHT - look for 'Net Wt', 'Net Weight', or weight in serving size like '1 pack (70g)' or '2 oz (56g)'", 
      "fontSize": 12, 
      "x": 100, 
      "y": 160, 
      "width": 150, 
      "height": 20,
      "colors": { "foreground": "#000000", "background": "#FFFFFF" },
      "boundingBox": { "x": 100, "y": 160, "width": 150, "height": 20, "confidence": 0.95 }
    },
    "allText": "complete text from label"
  },
  "detectedClaims": ["exact claims found or empty array"],
  "ingredients": ["exact ingredients list or empty array"],
  "allergens": ["exact allergens found or empty array"],
  "warnings": ["exact warnings or empty array"],
  "detectedLanguages": ["English"],
  "overallConfidence": 0.95
}

CRITICAL ANTI-HALLUCINATION RULES:
1. ONLY extract text that is CLEARLY VISIBLE - DO NOT infer, guess, or assume
2. MUST provide boundingBox coordinates for each text element you extract
3. If you CANNOT determine exact location, set confidence to 0 and leave text empty
4. If you CANNOT SEE ingredient list clearly, return empty array [] for ingredients
5. If you CANNOT SEE allergen warnings, return empty array [] for allergens  
6. If you CANNOT SEE health claims, return empty array [] for detectedClaims
7. For nutrition facts, extract ALL visible nutrients with EXACT values from the label
8. Set overallConfidence based on image quality and text clarity (0.0-1.0)
9. Be DETERMINISTIC - same image should produce identical output every time
10. CRITICAL: If only Nutrition Facts panel is visible, ingredients/allergens/claims MUST be EMPTY
11. Never extract text from blurry, obstructed, or unclear areas

CRITICAL NUTRITION FACTS RULES - READ EVERY WORD:
1. READ the EXACT numbers you see - never use placeholder/example values
2. If Calories shows "25", enter 25 (NOT 110, NOT 230, NOT any other number)
3. If Sodium shows "75mg", enter 75 (NOT 0, NOT 140, NOT any beverage value)
4. Extract EVERY nutrient visible: Calories, Fats, Cholesterol, Sodium, Carbs, Fiber, Sugars, Protein, Vitamins, Minerals
5. For sub-nutrients (Saturated Fat, Trans Fat, Dietary Fiber, Added Sugars), include as separate entries
6. If value is "0g" or "0mg", enter value: 0
7. For % Daily Value, use exact % shown or null if missing
8. NEVER skip nutrients that are present on the label
9. Infants/toddlers often have LOWER values than adult foods - this is NORMAL
10. Cross-check: Does your extracted data match the serving size type (70g vs 355ml)?

NET QUANTITY / NET WEIGHT EXTRACTION:
- Look for "Net Wt", "Net Weight", "NET WT" anywhere on the label
- Check the serving size line - often contains net quantity like "Serving size: 1 pack (70g)" or "1 container (2 oz / 56g)"
- If you see weight in grams (g) or ounces (oz), extract it as netQuantity
- Format: Include both imperial and metric if both present, e.g. "2 oz (56g)" or "1 pack (70g)"
- NEVER leave netQuantity empty if you see any weight measurement on the label`

/**
 * Downloads an image from a URL and converts it to a base64 data URL.
 * This is required because OpenAI Vision cannot reliably fetch images from
 * Supabase Storage URLs (returns 400 "Timeout while downloading").
 */
async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Vexim/1.0)',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to download image: HTTP ${response.status} for ${imageUrl}`)
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg'
  const arrayBuffer = await response.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')
  return `data:${contentType};base64,${base64}`
}

export async function analyzeLabel(imageUrl: string, packagingFormatContext?: string): Promise<VisionAnalysisResult> {
  console.log('[v0] Analyzing label with GPT-4o Vision:', imageUrl)
  if (packagingFormatContext) {
    console.log('[v0] Packaging format context provided for AI analysis')
  }

  // Download image server-side and convert to base64 to avoid OpenAI timeout
  // when fetching from Supabase Storage URLs directly.
  let imageDataUrl: string
  try {
    imageDataUrl = await fetchImageAsBase64(imageUrl)
    console.log('[v0] Image downloaded and converted to base64 successfully')
  } catch (downloadErr: any) {
    console.error('[v0] Failed to download image for Vision analysis:', downloadErr.message)
    throw new Error(`Vision analysis failed: could not download image — ${downloadErr.message}`)
  }

  try {
    const response = await retryWithBackoff(() =>
      openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: VISION_SYSTEM_PROMPT + (packagingFormatContext || ''),
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: imageDataUrl, // base64 data URL — no external fetch needed by OpenAI
                  detail: 'high',
                },
              },
              {
                type: 'text',
                text: `🚨 CRITICAL INSTRUCTION: PERFORM OCR - READ THE ACTUAL TEXT IN THIS IMAGE 🚨

You are performing OPTICAL CHARACTER RECOGNITION (OCR) on this food label image.
Your job is to READ and TRANSCRIBE the EXACT text and numbers PRINTED on this label.

DO NOT:
❌ Use your knowledge of typical nutrition values
❌ Guess based on product type
❌ Fill in "reasonable" values
❌ Use examples from your training data

DO:
✅ Read each number character-by-character from the image
✅ Transcribe EXACTLY what is printed
✅ If you see "25" write 25, not 250 or 260
✅ If you see "75mg" write 75, not 750 or 660
✅ Double-check each value against what's visually in the image

VERIFICATION STEP BEFORE RETURNING DATA:
1. Look at the image again
2. Point to the "Calories" line - what NUMBER do you see?
3. Point to "Sodium" - what NUMBER do you see?
4. Verify these match what you're about to return

Now extract all information in JSON format as specified. Be deterministic and consistent.

⚠️ CRITICAL FONT SIZE REQUIREMENT - READ CAREFULLY:
You MUST provide accurate fontSize estimates. Use this reference chart:

FONT SIZE CHART (use these values):
- Extra Large headings (brand names): 24-48pt
- "Nutrition Facts" title: 16-18pt (YOUR BASELINE REFERENCE)
- Serving size / Net Wt text: 12-14pt
- Nutrient names (Calories, Total Fat): 10-12pt
- Nutrient values and %DV: 10-12pt
- Ingredient list text: 8-10pt
- Small footnotes/disclaimers: 6-8pt

🚫 NEVER USE fontSize: 0 FOR VISIBLE TEXT
- If you see "Nutrition Facts" heading → fontSize MUST be 16-18pt minimum
- If you see any text at all → fontSize MUST be > 0
- fontSize: 0 means COMPLETELY EMPTY FIELD with NO TEXT
- When in doubt, estimate conservatively (don't guess 0!)`,
              },
            ],
          },
        ],
        max_tokens: 2000,
        temperature: 0, // Zero temperature for maximum consistency
        seed: 12345, // Fixed seed for reproducible outputs
        response_format: { type: 'json_object' },
      })
    )

    const content = response.choices[0].message.content || '{}'
    const tokensUsed = response.usage?.total_tokens || 0

    console.log('[v0] Vision analysis complete. Tokens used:', tokensUsed)

    const parsed = JSON.parse(content)

    const normalized: VisionAnalysisResult = {
      nutritionFacts: Array.isArray(parsed.nutritionFacts) ? parsed.nutritionFacts : [],
      textElements: {
        brandName: parsed.textElements?.brandName || { text: '', fontSize: 0, x: 0, y: 0, width: 0, height: 0, colors: { foreground: '#000000', background: '#FFFFFF' }, boundingBox: { x: 0, y: 0, width: 0, height: 0, confidence: 0 } },
        productName: parsed.textElements?.productName || { text: '', fontSize: 0, x: 0, y: 0, width: 0, height: 0, colors: { foreground: '#000000', background: '#FFFFFF' }, boundingBox: { x: 0, y: 0, width: 0, height: 0, confidence: 0 } },
        netQuantity: parsed.textElements?.netQuantity || { text: '', fontSize: 0, x: 0, y: 0, width: 0, height: 0, colors: { foreground: '#000000', background: '#FFFFFF' }, boundingBox: { x: 0, y: 0, width: 0, height: 0, confidence: 0 } },
        allText: parsed.textElements?.allText || ''
      },
      detectedClaims: Array.isArray(parsed.detectedClaims) ? parsed.detectedClaims : [],
      ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
      allergens: Array.isArray(parsed.allergens) ? parsed.allergens : [],
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      detectedLanguages: Array.isArray(parsed.detectedLanguages) ? parsed.detectedLanguages : ['English'],
      overallConfidence: typeof parsed.overallConfidence === 'number' ? parsed.overallConfidence : 0.8,
      detectedProductType: parsed.productType || 'unknown',  // expose for auto-domain detection
      tokensUsed
    }

    // Add area calculation and ensure colors are valid hex
    Object.keys(normalized.textElements).forEach(key => {
      const element = normalized.textElements[key as keyof typeof normalized.textElements]
      if (element && typeof element === 'object' && 'width' in element && 'height' in element) {
        element.area = element.width * element.height
        element.fontWeight = element.fontWeight || 'normal'
        
        // Ensure colors are valid hex codes
        if (element.colors) {
          if (!/^#[0-9A-F]{6}$/i.test(element.colors.foreground)) {
            element.colors.foreground = '#000000'
          }
          if (!/^#[0-9A-F]{6}$/i.test(element.colors.background)) {
            element.colors.background = '#FFFFFF'
          }
        }
      }
    })

    // CRITICAL: Validate that AI actually extracted meaningful data
    const validationErrors = []
    const validationWarnings = []
    
    // Check 1: Must have some text extracted
    if (!normalized.textElements.allText || normalized.textElements.allText.trim().length < 10) {
      validationErrors.push('No substantial text extracted from image - AI may not be able to see the label')
    }
    
    // Check 2: If it's a nutrition label, must have nutrition facts
    const hasNutritionIndicator = normalized.textElements.allText.toLowerCase().includes('nutrition') ||
                                   normalized.textElements.allText.toLowerCase().includes('calories')
    if (hasNutritionIndicator && normalized.nutritionFacts.length === 0) {
      validationErrors.push('Nutrition Facts detected in text but no nutrition data extracted')
    }
    
    // Check 3: Must have EITHER text elements OR sufficient allText OR nutrition facts
    // (Allow nutrition-only labels without brand/product names)
    const hasTextElement = normalized.textElements.brandName.text.length > 0 ||
                          normalized.textElements.productName.text.length > 0 ||
                          normalized.textElements.netQuantity.text.length > 0
    const hasNutritionData = normalized.nutritionFacts.length > 0
    const hasSufficientText = normalized.textElements.allText.length >= 50
    
    if (!hasTextElement && !hasSufficientText && !hasNutritionData) {
      validationErrors.push('Insufficient data extracted - image may be unclear or AI cannot process it')
    }
    
    // Check 4: Validate nutrition facts structure if present
    for (const fact of normalized.nutritionFacts) {
      if (!fact.name || fact.value === undefined) {
        validationErrors.push(`Invalid nutrition fact structure: ${JSON.stringify(fact)}`)
        break
      }
    }
    
    // NEW CHECK 5: Bounding Box validation - Critical for anti-hallucination
    const elementsWithText = [
      { name: 'brandName', element: normalized.textElements.brandName },
      { name: 'productName', element: normalized.textElements.productName },
      { name: 'netQuantity', element: normalized.textElements.netQuantity }
    ]
    
    for (const { name, element } of elementsWithText) {
      if (element.text && element.text.length > 0) {
        // If text is present, bounding box MUST exist with high confidence
        if (!element.boundingBox || element.boundingBox.confidence < 0.7) {
          validationWarnings.push(`${name} text extracted but low location confidence (${element.boundingBox?.confidence || 0}) - may be hallucinated`)
          // If confidence is extremely low, reject the text
          if (!element.boundingBox || element.boundingBox.confidence < 0.3) {
            element.text = '' // Clear potentially hallucinated text
            console.log(`[v0] ANTI-HALLUCINATION: Rejected ${name} due to low bounding box confidence`)
          }
        }
      }
    }
    
    // NEW CHECK 6: Overall confidence threshold
    if (normalized.overallConfidence < 0.6) {
      validationWarnings.push(`Low overall extraction confidence (${normalized.overallConfidence}) - double-pass OCR recommended`)
    }
    
    // NEW CHECK 7: Ingredient hallucination detection
    if (normalized.ingredients.length > 0 && !normalized.textElements.allText.toLowerCase().includes('ingredient')) {
      validationWarnings.push('Ingredients extracted but no "Ingredients:" label found - possible hallucination')
      // Clear potentially hallucinated ingredients
      normalized.ingredients = []
      console.log('[v0] ANTI-HALLUCINATION: Cleared ingredients without label')
    }
    
    // NEW CHECK 8: Font size sanity check - Fix fontSize: 0 for visible text
    const hasNutritionFactsText = normalized.textElements.allText.toLowerCase().includes('nutrition facts')
    if (hasNutritionFactsText) {
      // If we detected "Nutrition Facts" text, ensure we have reasonable font sizes
      // The title "Nutrition Facts" should never be 0pt
      for (const key of ['brandName', 'productName', 'netQuantity'] as const) {
        const element = normalized.textElements[key]
        if (element && element.text && element.text.length > 0 && element.fontSize === 0) {
          // AI incorrectly returned fontSize: 0 for visible text - estimate based on text
          const textLength = element.text.length
          if (textLength < 20) {
            element.fontSize = 16 // Likely a heading or brand name
          } else if (textLength < 50) {
            element.fontSize = 12 // Medium text
          } else {
            element.fontSize = 10 // Body text
          }
          validationWarnings.push(`${key} had fontSize: 0 but contains text - auto-corrected to ${element.fontSize}pt`)
          console.log(`[v0] AUTO-FIX: Corrected ${key} fontSize from 0 to ${element.fontSize}pt`)
        }
      }
    }
    
    // NEW CHECK 9: Data consistency - Product type vs nutrition values
    const productType = (parsed as any).productType || 'unknown'
    const servingSize = (parsed as any).servingSize || normalized.textElements.netQuantity?.text || ''
    const allText = normalized.textElements.allText || ''
    
    // CRITICAL: Detect infant/toddler products from text
    const isInfantProduct = allText.toLowerCase().includes('infant') || 
                           allText.toLowerCase().includes('0-12 month') ||
                           allText.toLowerCase().includes('under 12 month') ||
                           allText.toLowerCase().includes('through 12 month') ||
                           allText.toLowerCase().includes('babies')
    
    // Check for data inconsistencies that suggest hallucination
    const inconsistencies = []
    const criticalErrors = []
    
    // Check 9a: Serving size unit mismatch
    const hasGramServingSize = /\d+\s*g\b/i.test(servingSize) || /pack.*g/i.test(servingSize)
    const hasMlServingSize = /\d+\s*ml\b/i.test(servingSize) || /fl\s*oz/i.test(servingSize)
    
    // Check 9b: Calories consistency with product type
    const caloriesEntry = normalized.nutritionFacts.find(n => n.name.toLowerCase().includes('calorie'))
    if (caloriesEntry) {
      // CRITICAL: Infant products have VERY LOW calorie values per serving (typically 10-60 calories)
      if (isInfantProduct && caloriesEntry.value > 100) {
        criticalErrors.push(`HALLUCINATION DETECTED: Infant product but Calories=${caloriesEntry.value}. Infant foods typically have 10-60 cal per serving (1 pack ~70g). AI is using adult food values!`)
      }
      
      // Infant/toddler foods typically have lower calories per serving than beverages
      if (hasGramServingSize && caloriesEntry.value > 200 && !isInfantProduct) {
        inconsistencies.push(`High calories (${caloriesEntry.value}) for gram-based serving - verify this is correct`)
      }
      
      // Beverages with ml serving should have different calorie ranges
      if (hasMlServingSize && caloriesEntry.value < 50 && caloriesEntry.value > 0) {
        inconsistencies.push(`Unusually low calories (${caloriesEntry.value}) for ml-based beverage - verify this is correct`)
      }
      
      // Common hallucination: 110 calories for 355ml (soft drink template)
      if (caloriesEntry.value === 110 && hasMlServingSize) {
        validationWarnings.push('WARNING: Calories=110 with ml serving detected - common hallucination pattern, verify carefully')
      }
      
      // Common hallucination: 260 calories for infant food
      if (caloriesEntry.value === 260 && isInfantProduct) {
        criticalErrors.push('HALLUCINATION DETECTED: Calories=260 is adult food value, not infant food!')
      }
    }
    
    // Check 9c: Sodium consistency checks
    const sodiumEntry = normalized.nutritionFacts.find(n => n.name.toLowerCase().includes('sodium'))
    if (sodiumEntry) {
      // CRITICAL: Infant products have VERY LOW sodium (typically 20-100mg per serving)
      if (isInfantProduct && sodiumEntry.value > 200) {
        criticalErrors.push(`HALLUCINATION DETECTED: Infant product but Sodium=${sodiumEntry.value}mg. Infant foods typically have 20-100mg sodium per serving. AI is using adult food values!`)
      }
      
      // Common hallucination: 660mg sodium for infant food
      if (sodiumEntry.value === 660 && isInfantProduct) {
        criticalErrors.push('HALLUCINATION DETECTED: Sodium=660mg is adult food value, not infant food!')
      }
      
      // Sodium 0mg is suspicious unless confirmed
      if (sodiumEntry.value === 0 && normalized.nutritionFacts.length > 3 && !isInfantProduct) {
        inconsistencies.push('Sodium shows 0mg - verify this is actually printed on label (not missing)')
      }
    }
    
    // Check 9d: Product type mismatch
    if (productType && productType !== 'unknown') {
      if (productType.includes('beverage') && hasGramServingSize) {
        validationWarnings.push('CRITICAL: Product type detected as beverage but serving in grams - data inconsistency!')
      }
      if (productType.includes('food') && hasMlServingSize) {
        validationWarnings.push('CRITICAL: Product type detected as food but serving in ml - data inconsistency!')
      }
    }
    
    if (inconsistencies.length > 0) {
      console.log('[v0] Data consistency warnings:', inconsistencies)
      validationWarnings.push(...inconsistencies)
    }
    
    // Store product type and serving size in normalized result
    normalized.productType = productType
    normalized.servingSize = servingSize
    
    // CRITICAL: If hallucination detected (infant product with adult values), FAIL HARD
    if (criticalErrors.length > 0) {
      console.error('[v0] CRITICAL HALLUCINATION DETECTED:', criticalErrors)
      validationErrors.push(...criticalErrors)
      validationErrors.push('AI Vision is hallucinating nutrition values. This is a CRITICAL failure.')
      validationErrors.push('Possible causes: (1) AI using knowledge base instead of reading image, (2) Poor image quality, (3) Model limitation')
      validationErrors.push('Recommendation: Try re-uploading image with higher resolution or better lighting')
    }
    
    // If critical validation fails, throw error
    if (validationErrors.length > 0) {
      console.error('[v0] Vision validation FAILED:', validationErrors)
      throw new Error(`Vision analysis validation failed: ${validationErrors.join('; ')}. The AI may not be able to properly read this image. Please ensure the image is clear, properly oriented, and contains a readable nutrition label.`)
    }
    
    // Log warnings but don't fail
    if (validationWarnings.length > 0) {
      console.warn('[v0] Vision validation WARNINGS:', validationWarnings)
    }
    
    console.log('[v0] Vision analysis validated successfully. Sample:', {
      nutritionFactsCount: normalized.nutritionFacts.length,
      brandName: normalized.textElements.brandName.text.substring(0, 30),
      detectedLanguages: normalized.detectedLanguages,
      totalTextLength: normalized.textElements.allText.length
    })

    return normalized
  } catch (error: any) {
    console.error('[v0] Vision analysis error:', error)
    throw new Error(`Vision analysis failed: ${error.message}`)
  }
}
