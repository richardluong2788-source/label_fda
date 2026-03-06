import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateText, Output } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { z } from 'zod'

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

// POST /api/admin/ai-draft
// AI soạn thảo sẵn expert review cho admin — wording fix, legal notes, summary, actions
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify admin
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!adminUser) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const body = await request.json()
  const { findings, productName, productCategory, targetMarket, userContext, overallResult, overallRiskScore } = body

  if (!findings || !Array.isArray(findings)) {
    return NextResponse.json({ error: 'findings array required' }, { status: 400 })
  }

  const findingsText = findings
    .map(
      (f: any, i: number) =>
        `[Vi phạm #${i + 1}] Severity: ${f.severity ?? 'unknown'}\nCategory: ${f.category ?? ''}\nDescription: ${f.description ?? ''}\nAI suggested_fix: ${f.suggested_fix ?? 'N/A'}\nRegulation: ${f.regulation_reference ?? 'N/A'}\nConfidence: ${f.confidence_score ?? 'N/A'}`
    )
    .join('\n\n')

  const systemPrompt = `Bạn là chuyên gia tư vấn FDA compliance hàng đầu Việt Nam, chuyên về nhãn mác sản phẩm xuất khẩu sang thị trường ${targetMarket ?? 'US'}.

Nhiệm vụ: Dựa vào danh sách vi phạm AI phát hiện, bạn soạn thảo BẢN NHÁP đầy đủ cho expert review:

NGUYÊN TẮC QUAN TRỌNG:
1. Wording fix phải CỤ THỂ, có thể copy-paste vào nhãn ngay — không chung chung
2. Legal note phải trích dẫn CHÍNH XÁC điều luật (21 CFR section cụ thể)
3. Viết bằng tiếng Việt, wording trên nhãn viết bằng tiếng Anh (vì nhãn xuất khẩu)
4. Nếu vi phạm có confidence thấp hoặc không rõ — đánh dấu confirmed=false và giải thích
5. Recommended actions phải thực tế, có thể thực hiện ngay

Thông tin sản phẩm:
- Tên: ${productName ?? 'Không rõ'}
- Ngành: ${productCategory ?? 'food'}
- Thị trường: ${targetMarket ?? 'US'}
- Kết quả AI: ${overallResult ?? 'N/A'}, Risk score: ${overallRiskScore ?? 'N/A'}/10
${userContext ? `- Ghi chú từ khách hàng: "${userContext}"` : ''}`

  try {
    const result = await generateText({
      model: groq('meta-llama/llama-4-scout-17b-16e-instruct'),
      system: systemPrompt,
      prompt: `Dưới đây là danh sách vi phạm AI phát hiện:\n\n${findingsText}\n\nHãy soạn expert review draft đầy đủ.`,
      output: Output.object({
        schema: z.object({
          expertSummary: z.string().describe('Nhận xét tổng quan 3-5 câu về mức độ tuân thủ, rủi ro chính, hướng khắc phục'),
          violationReviews: z.array(
            z.object({
              violation_index: z.number().describe('Index vi phạm (bắt đầu từ 0)'),
              confirmed: z.boolean().describe('true = xác nhận cần sửa, false = không nghiêm trọng/false positive'),
              wording_fix: z.string().describe('Wording mới đề xuất — cụ thể, copy-paste được. Để trống nếu confirmed=false'),
              legal_note: z.string().describe('Giải thích pháp lý chi tiết + trích dẫn CFR cụ thể'),
            })
          ),
          recommendedActions: z.array(
            z.object({
              action: z.string().describe('Mô tả hành động cần làm'),
              priority: z.enum(['high', 'medium', 'low']),
              cfr_reference: z.string().describe('Điều luật CFR liên quan'),
            })
          ),
        }),
      }),
    })

    return NextResponse.json({ draft: result.output })
  } catch (err: any) {
    console.error('[ai-draft] Error:', err.message)
    return NextResponse.json({ error: 'AI draft generation failed: ' + err.message }, { status: 500 })
  }
}
