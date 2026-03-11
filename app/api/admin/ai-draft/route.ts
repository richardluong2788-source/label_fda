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

  // Count actual violations vs market intelligence items for summary
  const MARKET_INTELLIGENCE_TYPES = ['recall', 'warning_letter', 'import_alert']
  const actualViolations = findings.filter((f: any) => !MARKET_INTELLIGENCE_TYPES.includes(f.source_type))
  const recallWarnings = findings.filter((f: any) => f.source_type === 'recall')
  
  const systemPrompt = `Bạn là chuyên gia tư vấn FDA compliance hàng đầu Việt Nam, chuyên về nhãn mác sản phẩm xuất khẩu sang thị trường ${targetMarket ?? 'US'}.

Nhiệm vụ: Dựa vào danh sách phát hiện từ AI, bạn soạn thảo BẢN NHÁP đầy đủ cho expert review.

═══════════════════════════════════════════════════════════════════════════
NGUYÊN TẮC TỐI QUAN TRỌNG - PHÂN BIỆT 2 LOẠI PHÁT HIỆN:
═══════════════════════════════════════════════════════════════════════════

📌 **MỤC 1: VI PHẠM THỰC TẾ TRÊN NHÃN** (source_type != "recall")
- Đây là lỗi thực sự trên nhãn sản phẩm đang kiểm tra
- confirmed = TRUE nếu vi phạm rõ ràng
- wording_fix = đề xuất sửa cụ thể, copy-paste được
- legal_note = trích dẫn CFR cụ thể
- CÓ ảnh hưởng đến đánh giá tuân thủ

📌 **MỤC 2: CẢNH BÁO THỊ TRƯỜNG** (source_type = "recall") - RẤT QUAN TRỌNG:
- Đây là thông tin THAM KHẢO về các sản phẩm CÙNG LOẠI đã bị thu hồi
- KHÔNG PHẢI vi phạm trên nhãn sản phẩm đang kiểm tra
- confirmed = FALSE (BẮT BUỘC)
- wording_fix = "Không áp dụng - đây là cảnh báo thị trường tham khảo."
- legal_note PHẢI bắt đầu bằng: "⚠️ ĐÂY LÀ CẢNH BÁO THỊ TRƯỜNG THAM KHẢO, không phải lỗi trên nhãn sản phẩm này. Thông tin này cho biết sản phẩm cùng category có lịch sử thu hồi tại FDA..."
- KHÔNG ảnh hưởng đến đánh giá tuân thủ của nhãn

═══════════════════════════════════════════════════════════════════════════
HƯỚNG DẪN VIẾT NHẬN XÉT TỔNG QUAN (expertSummary):
═══════════════════════════════════════════════════════════════════════════

Nhận xét tổng quan PHẢI được viết theo cấu trúc sau:

**Nếu KHÔNG CÓ vi phạm thực tế (chỉ có recall warnings):**
"Nhãn sản phẩm ${productName ?? 'này'} TUÂN THỦ tốt các quy định FDA. Vexim AI không phát hiện vi phạm nghiêm trọng nào trong quá trình kiểm tra. [Nếu có recall warnings thì thêm:] Lưu ý: Sản phẩm thuộc category có ${recallWarnings.length} vụ thu hồi gần đây tại thị trường Mỹ - đây là thông tin tham khảo để phòng ngừa rủi ro, không phải lỗi trên nhãn hiện tại."

**Nếu CÓ vi phạm thực tế:**
"Sản phẩm ${productName ?? 'này'} có ${actualViolations.length} vấn đề cần khắc phục trên nhãn: [liệt kê ngắn gọn]. [Chi tiết đề xuất sửa trong từng mục bên dưới.] [Nếu có recall warnings thì thêm:] Ngoài ra, sản phẩm thuộc category có lịch sử thu hồi - xem mục Cảnh báo thị trường để phòng ngừa."

Thông tin sản phẩm:
- Tên: ${productName ?? 'Không rõ'}
- Ngành: ${productCategory ?? 'food'}
- Thị trường: ${targetMarket ?? 'US'}
- Số vi phạm thực tế trên nhãn: ${actualViolations.length}
- Số cảnh báo thị trường (tham khảo): ${recallWarnings.length}
${userContext ? `- Ghi chú từ khách hàng: "${userContext}"` : ''}`

  try {
    const result = await generateText({
      model: groq('meta-llama/llama-4-scout-17b-16e-instruct'),
      system: systemPrompt,
      prompt: `Dưới đây là danh sách phát hiện AI:

${findingsText}

THỐNG KÊ:
- Số vi phạm thực tế trên nhãn: ${actualViolations.length}
- Số cảnh báo thị trường (recall): ${recallWarnings.length}

YÊU CẦU BẮT BUỘC:
1. violationReviews phải có đúng ${findings.length} items (mỗi finding một item)
2. Với vi phạm thực tế: confirmed=true, wording_fix bằng tiếng Anh, legal_note trích dẫn CFR
3. Với recall/cảnh báo thị trường: confirmed=false, wording_fix="Không áp dụng...", legal_note mô tả chi tiết vụ thu hồi, prevention_guide hướng dẫn 5 bước phòng ngừa

Hãy soạn expert review draft đầy đủ với NỘI DUNG CHI TIẾT cho từng mục.`,
      output: Output.object({
        schema: z.object({
          expertSummary: z.string().describe('Nhận xét tổng quan 3-5 câu về mức độ tuân thủ, rủi ro chính, hướng khắc phục'),
          violationReviews: z.array(
            z.object({
              violation_index: z.number().describe('Index vi phạm (bắt đầu từ 0)'),
              confirmed: z.boolean().describe('BẮT BUỘC: Với source_type=recall → confirmed=FALSE. Với vi phạm thực tế → confirmed=true nếu cần sửa'),
              wording_fix: z.string().describe('Với recall: "Không áp dụng - đây là cảnh báo thị trường, không phải vi phạm trên nhãn sản phẩm này." Với vi phạm thực tế: wording cụ thể bằng tiếng Anh'),
              legal_note: z.string().describe(`Với recall: Mô tả chi tiết vụ thu hồi bằng tiếng Việt - bao gồm: (1) Nguyên nhân thu hồi (ví dụ: nhiễm khuẩn, ghi sai nhãn, allergen không công bố), (2) Loại sản phẩm bị thu hồi, (3) Lý do FDA ra quyết định, (4) Tác động tiềm ẩn đến sức khỏe người tiêu dùng. Ví dụ: "Vụ thu hồi này liên quan đến sản phẩm gia vị bị phát hiện chứa chì vượt ngưỡng cho phép. FDA yêu cầu thu hồi vì có nguy cơ gây hại sức khỏe nếu tiêu thụ lâu dài. Các nhà nhập khẩu cùng category nên kiểm tra nguồn gốc nguyên liệu và kết quả kiểm nghiệm kim loại nặng." 
              Với vi phạm thực tế: trích dẫn CFR cụ thể và giải thích vi phạm`),
              prevention_guide: z.string().optional().describe(`CHỈ cho source_type=recall. Hướng dẫn phòng ngừa chi tiết bằng tiếng Việt gồm 5 điểm cụ thể:
              1. Kiểm tra lại độ chính xác thông tin thành phần và cảnh báo trên nhãn
              2. Đảm bảo quy trình kiểm soát chất lượng (QC) nghiêm ngặt trước xuất khẩu  
              3. Chuẩn bị hồ sơ chứng minh nguồn gốc nguyên liệu (COA, phiếu nhập)
              4. Lưu trữ kết quả kiểm nghiệm an toàn thực phẩm (ATTP) đáp ứng tiêu chuẩn FDA
              5. Liên hệ chuyên gia Vexim để được tư vấn chi tiết về compliance`),
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
