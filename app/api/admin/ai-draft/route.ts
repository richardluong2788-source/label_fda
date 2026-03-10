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
        `[${f.source_type === 'recall' ? 'Cảnh báo thị trường' : 'Vi phạm'} #${i + 1}] Severity: ${f.severity ?? 'unknown'}\nCategory: ${f.category ?? ''}\nDescription: ${f.description ?? ''}\nAI suggested_fix: ${f.suggested_fix ?? 'N/A'}\nRegulation: ${f.regulation_reference ?? 'N/A'}\nConfidence: ${f.confidence_score ?? 'N/A'}\nSource Type: ${f.source_type ?? 'ai_detected'}`
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

PHÂN BIỆT LOẠI PHÁT HIỆN (BẮT BUỘC TUÂN THỦ):

**Loại 1: VI PHẠM THỰC TẾ** (source_type="ai_detected" hoặc "cfr_violation")
- confirmed = true
- wording_fix = đề xuất cụ thể, copy-paste được
- legal_note = trích dẫn CFR cụ thể

**Loại 2: CẢNH BÁO THỊ TRƯỜNG** (source_type="recall") - QUAN TRỌNG:
- confirmed = FALSE (BẮT BUỘC) - vì đây KHÔNG PHẢI vi phạm trên nhãn hiện tại
- wording_fix = "Không áp dụng - đây là cảnh báo thị trường, không phải vi phạm trên nhãn sản phẩm này."
- legal_note PHẢI bắt đầu bằng: "ĐÂY LÀ CẢNH BÁO THỊ TRƯỜNG THAM KHẢO, không phải vi phạm trên nhãn sản phẩm này. Sản phẩm thuộc category có lịch sử thu hồi tại FDA..." rồi mới đến chi tiết vụ recall.
- prevention_guide = hướng dẫn phòng ngừa chi tiết bao gồm:
  1. Kiểm tra lại độ chính xác thông tin thành phần trên nhãn
  2. Đảm bảo quy trình kiểm soát chất lượng (QC) trước xuất khẩu
  3. Chuẩn bị hồ sơ chứng minh nguồn gốc nguyên liệu
  4. Lưu trữ kết quả kiểm nghiệm an toàn thực phẩm (ATTP)
  5. Liên hệ chuyên gia Vexim để được tư vấn chi tiết

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
              confirmed: z.boolean().describe('BẮT BUỘC: Với source_type=recall → confirmed=FALSE. Với vi phạm thực tế → confirmed=true nếu cần sửa'),
              wording_fix: z.string().describe('Với recall: "Không áp dụng - đây là cảnh báo thị trường, không phải vi phạm trên nhãn sản phẩm này." Với vi phạm thực tế: wording cụ thể'),
              legal_note: z.string().describe('Với recall: BẮT BUỘC bắt đầu bằng "ĐÂY LÀ CẢNH BÁO THỊ TRƯỜNG THAM KHẢO, không phải vi phạm trên nhãn sản phẩm này...". Với vi phạm thực tế: trích dẫn CFR'),
              prevention_guide: z.string().optional().describe('CHỈ cho source_type=recall. Hướng dẫn phòng ngừa 5 điểm: (1) kiểm tra nhãn, (2) QC, (3) hồ sơ nguồn gốc, (4) kiểm nghiệm ATTP, (5) liên hệ Vexim'),
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
