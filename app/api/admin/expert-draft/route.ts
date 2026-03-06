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

  // Build prompt context
  const violationsSummary = findings
    .map((v: any, i: number) =>
      `[${i + 1}] ${v.violation_type ?? v.type ?? 'Unknown'} — ${v.description ?? ''} | Severity: ${v.severity ?? 'unknown'} | CFR: ${v.citations?.join(', ') ?? 'N/A'} | AI suggested fix: ${v.suggested_fix ?? 'N/A'}`
    )
    .join('\n')

  const healthClaimsList = Array.isArray(healthClaims)
    ? healthClaims.map((c: any) => typeof c === 'string' ? c : c.claim || c.text || '').filter(Boolean).join('; ')
    : ''

  const systemPrompt = `You are an expert FDA compliance consultant with 15+ years experience reviewing food, dietary supplement, and cosmetic labels for the US market. You provide precise, actionable, and legally sound guidance based on 21 CFR regulations.

Your task: Review an AI-generated FDA compliance report and produce a structured expert review with:
1. A professional summary in Vietnamese explaining the overall compliance status and key risks
2. Per-violation analysis: confirm/dismiss each finding and suggest exact corrected wording
3. Prioritized recommended actions

IMPORTANT:
- Write the expert_summary in Vietnamese (professional tone)
- wording_fix should be the EXACT replacement text in English (as it should appear on the label)
- legal_note MUST be written in Vietnamese with the following structure:
  1. Start with "Qua rà soát nhãn, hệ thống phát hiện..." describing what was found (e.g., health benefit phrases, missing disclaimers)
  2. Explain why it matters legally (e.g., "Theo quy định, các tuyên bố này bắt buộc phải đi kèm câu miễn trừ DSHEA để tránh bị FDA phân loại nhầm thành dược phẩm")
  3. Provide a concrete example from the label: "Ví dụ: nhãn hiện có cụm từ '[quote from label]' cần được bổ sung disclaimer."
  4. Reference the specific CFR section at the end
- Be precise about which violations are genuinely critical vs. minor`

  const userPrompt = `Product: ${report?.product_name ?? report?.file_name ?? 'Unknown'}
Category: ${report?.product_category ?? reviewRequest.product_category ?? 'Food'}
Target Market: ${reviewRequest.target_market ?? 'US'}
Overall AI Result: ${report?.overall_result ?? 'N/A'} (Risk Score: ${report?.overall_risk_score ?? 'N/A'}/10)
User Context: ${reviewRequest.user_context ?? 'No additional context provided'}

Health Claims Found on Label:
${healthClaimsList || 'No health claims extracted'}

AI-Detected Violations (${findings.length} total):
${violationsSummary || 'No violations detected by AI'}

When writing legal_note, quote specific phrases from the "Health Claims Found on Label" above as examples.
Please provide a complete expert review draft.`

  // Instruct the model to return pure JSON — no Output.object() since Groq
  // rejects JSON Schema meta-properties ($schema, additionalProperties, etc.)
  const jsonSystemPrompt = systemPrompt + `

RESPONSE FORMAT: You MUST respond with ONLY valid JSON, no markdown, no code blocks, no commentary. The JSON must have this exact shape:
{
  "expert_summary": "string (Vietnamese, 2-4 sentences)",
  "violation_reviews": [
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
  "overall_assessment": "approved|needs_revision|rejected",
  "estimated_fix_complexity": "simple|moderate|complex"
}`

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
