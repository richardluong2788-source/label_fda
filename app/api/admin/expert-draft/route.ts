import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateText, Output } from 'ai'
import { z } from 'zod'

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
        product_category, findings
      )
    `)
    .eq('id', requestId)
    .single()

  if (reqError || !reviewRequest) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }

  const report = reviewRequest.audit_reports as any
  const findings = report?.findings ?? []

  // Build prompt context
  const violationsSummary = findings
    .map((v: any, i: number) =>
      `[${i + 1}] ${v.violation_type ?? v.type ?? 'Unknown'} — ${v.description ?? ''} | Severity: ${v.severity ?? 'unknown'} | CFR: ${v.citations?.join(', ') ?? 'N/A'} | AI suggested fix: ${v.suggested_fix ?? 'N/A'}`
    )
    .join('\n')

  const systemPrompt = `You are an expert FDA compliance consultant with 15+ years experience reviewing food, dietary supplement, and cosmetic labels for the US market. You provide precise, actionable, and legally sound guidance based on 21 CFR regulations.

Your task: Review an AI-generated FDA compliance report and produce a structured expert review with:
1. A professional summary in Vietnamese explaining the overall compliance status and key risks
2. Per-violation analysis: confirm/dismiss each finding and suggest exact corrected wording
3. Prioritized recommended actions

IMPORTANT:
- Write the expert_summary in Vietnamese (professional tone)
- wording_fix should be the EXACT replacement text in English (as it should appear on the label)
- legal_note should cite the specific CFR section and explain the legal risk in Vietnamese
- Be precise about which violations are genuinely critical vs. minor`

  const userPrompt = `Product: ${report?.product_name ?? report?.file_name ?? 'Unknown'}
Category: ${report?.product_category ?? reviewRequest.product_category ?? 'Food'}
Target Market: ${reviewRequest.target_market ?? 'US'}
Overall AI Result: ${report?.overall_result ?? 'N/A'} (Risk Score: ${report?.overall_risk_score ?? 'N/A'}/10)
User Context: ${reviewRequest.user_context ?? 'No additional context provided'}

AI-Detected Violations (${findings.length} total):
${violationsSummary || 'No violations detected by AI'}

Please provide a complete expert review draft.`

  try {
    const { experimental_output } = await generateText({
      model: 'openai/gpt-4o',
      system: systemPrompt,
      prompt: userPrompt,
      experimental_output: Output.object({
        schema: z.object({
          expert_summary: z.string().describe('Tổng quan đánh giá bằng tiếng Việt, 2-4 câu'),
          violation_reviews: z.array(
            z.object({
              violation_index: z.number().describe('0-based index of violation'),
              confirmed: z.boolean().describe('true nếu vi phạm thực sự cần sửa'),
              wording_fix: z.string().nullable().describe('Exact corrected label text in English'),
              legal_note: z.string().nullable().describe('Giải thích pháp lý bằng tiếng Việt'),
            })
          ),
          recommended_actions: z.array(
            z.object({
              action: z.string().describe('Hành động cụ thể bằng tiếng Việt'),
              priority: z.enum(['high', 'medium', 'low']),
              cfr_reference: z.string().nullable().describe('e.g. 21 CFR 101.9(d)'),
            })
          ),
          overall_assessment: z.enum(['approved', 'needs_revision', 'rejected']),
          estimated_fix_complexity: z.enum(['simple', 'moderate', 'complex']),
        }),
      }),
      maxOutputTokens: 2000,
    })

    return NextResponse.json({
      draft: experimental_output,
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
