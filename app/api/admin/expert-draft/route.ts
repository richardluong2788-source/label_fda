import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createGroq } from '@ai-sdk/groq'

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

// POST /api/admin/expert-draft
// AI tự động soạn thảo expert review dựa trên báo cáo + request context.
// Chỉ admin mới gọi được. Trả về draft để admin chỉnh sửa trước khi ký off.

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, isAdmin: false }

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  const isAdmin =
    adminUser?.role === 'admin' ||
    adminUser?.role === 'superadmin' ||
    adminUser?.role === 'expert'

  return { supabase, user, isAdmin }
}

export async function POST(request: Request) {
  const { supabase, isAdmin } = await requireAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { requestId } = await request.json()
  if (!requestId) {
    return NextResponse.json({ error: 'requestId is required' }, { status: 400 })
  }

  // Lấy toàn bộ thông tin request + báo cáo AI
  const { data: reviewRequest, error: reqError } = await supabase
    .from('expert_review_requests')
    .select(`
      id, user_context, target_market, product_category,
      audit_report_id,
      audit_reports (
        product_name, file_name, overall_result, overall_risk_score,
        product_category, findings, health_claims, ingredient_list
      )
    `)
    .eq('id', requestId)
    .single()

  if (reqError || !reviewRequest) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }

  const report = reviewRequest.audit_reports as any
  const findings = report?.findings ?? []
  const healthClaims = report?.health_claims ?? []

  // Build prompt context - include EXACT CFR references from findings to prevent hallucination
  // Separate actual violations from market warnings (recalls)
  const actualViolations = findings.filter((v: any) => v.source_type !== 'recall')
  const recallWarnings = findings.filter((v: any) => v.source_type === 'recall')

  const violationsSummary = actualViolations
    .map((v: any, i: number) => {
      // Get CFR from multiple possible sources in the finding
      const cfrRef = v.regulation_reference || v.cfr_reference || 
        (v.citations && v.citations.length > 0 ? v.citations.join(', ') : null)
      
      return `[VI PHẠM #${i + 1}] Type: ${v.category ?? v.violation_type ?? v.type ?? 'Unknown'}
   Description: ${v.description ?? ''}
   Severity: ${v.severity ?? 'unknown'}
   EXACT CFR Reference (use this, do NOT invent): ${cfrRef ?? 'Not specified'}
   AI Suggested Fix: ${v.suggested_fix ?? 'N/A'}
   >>> This is an ACTUAL VIOLATION on the label being checked <<<`
    })
    .join('\n\n')
  
  const recallSummary = recallWarnings.length > 0 
    ? `\n\n═══ MARKET WARNINGS (NOT label violations) ═══\n` + recallWarnings.map((v: any, i: number) => {
        return `[CẢNH BÁO THỊ TRƯỜNG #${i + 1}] ${v.category ?? 'Recall Warning'}
   Description: ${v.description ?? ''}
   >>> THIS IS NOT A VIOLATION - just market context about similar products that were recalled <<<`
      }).join('\n\n')
    : ''

  const healthClaimsList = Array.isArray(healthClaims)
    ? healthClaims.map((c: any) => typeof c === 'string' ? c : c.claim || c.text || '').filter(Boolean).join('; ')
    : ''

  const systemPrompt = `You are an expert FDA compliance consultant with 15+ years experience reviewing food, dietary supplement, and cosmetic labels for the US market. You provide precise, actionable, and legally sound guidance based on 21 CFR regulations.

Your task: Review an AI-generated FDA compliance report and produce a structured expert review with:
1. A professional summary in Vietnamese explaining the overall compliance status and key risks
2. Per-violation analysis: confirm/dismiss each finding and suggest exact corrected wording
3. Prioritized recommended actions

═══════════════════════════════════════════════════════════════════════════
CRITICAL DISTINCTION - TWO TYPES OF FINDINGS:
═══════════════════════════════════════════════════════════════════════════

📌 **SECTION 1: ACTUAL LABEL VIOLATIONS** (marked with "VI PHẠM #")
- These are REAL issues found on the label being checked
- Each requires: confirmed=true/false, wording_fix, legal_note
- THESE AFFECT compliance assessment

📌 **SECTION 2: MARKET WARNINGS** (marked with "CẢNH BÁO THỊ TRƯỜNG #")
- These are informational context about SIMILAR products that were recalled
- NOT violations on the current label being checked
- Do NOT include these in violation_reviews array
- Mention them ONLY in expert_summary as reference information

═══════════════════════════════════════════════════════════════════════════
EXPERT SUMMARY GUIDELINES:
═══════════════════════════════════════════════════════════════════════════

**If NO actual violations (only market warnings):**
Write: "Nhãn sản phẩm TUÂN THỦ tốt các quy định FDA. Vexim AI không phát hiện vi phạm nghiêm trọng nào trên nhãn. [If market warnings exist:] Lưu ý tham khảo: Sản phẩm thuộc category có lịch sử thu hồi gần đây - đây là thông tin cảnh báo chung cho ngành, không phải lỗi trên nhãn hiện tại."

**If there ARE actual violations:**
Write: "Sản phẩm có [N] vấn đề cần khắc phục: [list main issues]. [If market warnings exist:] Ngoài ra, category này có cảnh báo thu hồi tại thị trường Mỹ - xem chi tiết bên dưới để phòng ngừa."

═══════════════════════════════════════════════════════════════════════════

CRITICAL RULES:
- Write the expert_summary in Vietnamese (professional tone)
- wording_fix should be the EXACT replacement text in English (as it should appear on the label)
- legal_note MUST be written in Vietnamese with the following structure:
  1. Start with "Qua rà soát nhãn, hệ thống phát hiện..." describing what was found
  2. Explain why it matters legally
  3. Provide a concrete example from the label
  4. Reference the EXACT CFR section provided in the violation data
  
CFR REFERENCE RULES (EXTREMELY IMPORTANT - LEGAL LIABILITY):
- You MUST use the EXACT CFR Reference provided for each violation
- NEVER invent or hallucinate CFR numbers
- If "EXACT CFR Reference" says "Not specified" - do NOT include any CFR reference
- NEVER use non-existent CFR sections like 102.41, 1160.30, etc.
  
- Be precise about which violations are genuinely critical vs. minor
- violation_reviews array should ONLY contain actual violations, NOT market warnings`

  const userPrompt = `Product: ${report?.product_name ?? report?.file_name ?? 'Unknown'}
Category: ${report?.product_category ?? reviewRequest.product_category ?? 'Food'}
Target Market: ${reviewRequest.target_market ?? 'US'}
Overall AI Result: ${report?.overall_result ?? 'N/A'} (Risk Score: ${report?.overall_risk_score ?? 'N/A'}/10)
User Context: ${reviewRequest.user_context ?? 'No additional context provided'}

═══ STATISTICS ═══
- Actual Label Violations: ${actualViolations.length}
- Market Warnings (reference only): ${recallWarnings.length}

Health Claims Found on Label:
${healthClaimsList || 'No health claims extracted'}

═══ ACTUAL LABEL VIOLATIONS (${actualViolations.length} total) ═══
${violationsSummary || 'No actual violations detected on this label - LABEL IS COMPLIANT'}
${recallSummary}

IMPORTANT REMINDER:
- violation_reviews array should have exactly ${actualViolations.length} items (one per actual violation)
- Do NOT create violation_reviews for market warnings
- If there are 0 actual violations, violation_reviews should be an empty array []
- overall_assessment should be "approved" if there are no actual violations

Please provide a complete expert review draft.`

  // Instruct the model to return pure JSON — no Output.object() since Groq
  // rejects JSON Schema meta-properties ($schema, additionalProperties, etc.)
  const jsonSystemPrompt = systemPrompt + `

RESPONSE FORMAT: You MUST respond with ONLY valid JSON, no markdown, no code blocks, no commentary. The JSON must have this exact shape:
{
  "expert_summary": "Vietnamese summary: if 0 actual violations, state label is compliant. Mention market warnings as reference only.",
  "violation_reviews": [
    // ONLY for ACTUAL violations (not market warnings)
    // If 0 actual violations, this should be an empty array: []
    {
      "violation_index": 0,
      "confirmed": true,
      "wording_fix": "exact English text or null",
      "legal_note": "Vietnamese explanation starting with 'Qua rà soát nhãn...' or null"
    }
  ],
  "recommended_actions": [
    {
      "action": "Vietnamese action text",
      "priority": "high|medium|low",
      "cfr_reference": "21 CFR xxx or null"
    }
  ],
  "overall_assessment": "approved if 0 actual violations | needs_revision if minor issues | rejected if critical",
  "estimated_fix_complexity": "simple|moderate|complex"
}

CRITICAL: If there are 0 actual violations, set overall_assessment to "approved" and violation_reviews to [].`

  try {
    const { text } = await generateText({
      model: groq('meta-llama/llama-4-scout-17b-16e-instruct'),
      system: jsonSystemPrompt,
      prompt: userPrompt,
      maxOutputTokens: 2000,
    })

    // Strip potential markdown code fences and parse JSON
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim()

    let draft: any
    try {
      draft = JSON.parse(cleaned)
    } catch {
      // Try extracting the first {...} block if surrounding text leaked in
      const match = cleaned.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('AI response is not valid JSON')
      draft = JSON.parse(match[0])
    }

    return NextResponse.json({
      draft,
      violations_count: findings.length,
    })
  } catch (err: any) {
    console.error('[expert-draft] AI generation failed:', err.message)
    return NextResponse.json(
      { error: 'AI generation failed. Please draft manually.', details: err.message },
      { status: 500 }
    )
  }
}
