import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateText, Output } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { z } from 'zod'

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

// POST /api/admin/fda-intelligence-analysis
// AI phân tích FDA Compliance Intelligence data (Import Alerts, Warning Letters, Recalls)
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
  const { 
    productName, 
    productCategory, 
    targetMarket,
    brandName,
    importAlertCount,
    warningLetterCount, 
    recallCount,
    findings,
    overallRiskScore
  } = body

  // Build FDA intelligence context
  const fdaFindings = (findings || []).filter((f: any) => 
    f.category?.toLowerCase().includes('recall') ||
    f.category?.toLowerCase().includes('thu hồi') ||
    f.category?.toLowerCase().includes('import') ||
    f.category?.toLowerCase().includes('alert') ||
    f.category?.toLowerCase().includes('warning') ||
    f.category?.toLowerCase().includes('letter')
  )

  const fdaContext = fdaFindings.map((f: any, i: number) => 
    `[${i + 1}] ${f.category}: ${f.description}\nSuggested fix: ${f.suggested_fix || 'N/A'}`
  ).join('\n\n')

  const systemPrompt = `Bạn là chuyên gia phân tích FDA compliance với kinh nghiệm 15+ năm, chuyên về:
- Import Alerts: Danh sách sản phẩm/công ty bị FDA flag để detention tự động
- Warning Letters: Thư cảnh báo FDA gửi cho các công ty vi phạm 
- Recalls: Lịch sử thu hồi sản phẩm do vi phạm an toàn/nhãn mác

Nhiệm vụ: Phân tích FDA intelligence data và đưa ra nhận định CHUYÊN GIA cho sản phẩm.

NGUYÊN TẮC:
1. Đánh giá mức độ LIÊN QUAN trực tiếp đến sản phẩm hiện tại (không phải chung chung)
2. Xác định các PATTERN rủi ro từ dữ liệu lịch sử
3. Đề xuất hành động CỤ THỂ, có thể thực hiện ngay
4. Viết bằng tiếng Việt, chuyên nghiệp

Thông tin sản phẩm:
- Tên: ${productName ?? 'Không rõ'}
- Thương hiệu: ${brandName ?? 'Không rõ'}
- Ngành: ${productCategory ?? 'food'}
- Thị trường: ${targetMarket ?? 'US'}
- Risk Score hiện tại: ${overallRiskScore ?? 'N/A'}/10

FDA Intelligence Summary:
- Import Alerts: ${importAlertCount ?? 0}
- Warning Letters: ${warningLetterCount ?? 0}
- Recalls: ${recallCount ?? 0}`

  try {
    const result = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      system: systemPrompt,
      prompt: fdaContext 
        ? `Dưới đây là chi tiết FDA intelligence findings:\n\n${fdaContext}\n\nHãy phân tích chi tiết và đưa ra nhận định chuyên gia.`
        : `Không có Import Alerts, Warning Letters hoặc Recalls liên quan được tìm thấy cho sản phẩm này. Hãy đưa ra nhận định về ý nghĩa của điều này và các khuyến nghị.`,
      output: Output.object({
        schema: z.object({
          riskAssessment: z.object({
            level: z.enum(['low', 'medium', 'high', 'critical']).describe('Mức độ rủi ro tổng thể'),
            summary: z.string().describe('Tóm tắt đánh giá rủi ro 2-3 câu'),
          }),
          importAlertAnalysis: z.object({
            relevance: z.enum(['none', 'low', 'medium', 'high']).describe('Mức độ liên quan đến sản phẩm'),
            insight: z.string().describe('Phân tích chi tiết về Import Alert findings'),
            action: z.string().describe('Hành động khuyến nghị'),
          }),
          warningLetterAnalysis: z.object({
            relevance: z.enum(['none', 'low', 'medium', 'high']).describe('Mức độ liên quan đến sản phẩm'),
            insight: z.string().describe('Phân tích chi tiết về Warning Letter findings'),
            action: z.string().describe('Hành động khuyến nghị'),
          }),
          recallAnalysis: z.object({
            relevance: z.enum(['none', 'low', 'medium', 'high']).describe('Mức độ liên quan đến sản phẩm'),
            insight: z.string().describe('Phân tích chi tiết về Recall findings'),
            action: z.string().describe('Hành động khuyến nghị'),
          }),
          expertRecommendations: z.array(
            z.object({
              recommendation: z.string().describe('Khuyến nghị cụ thể'),
              priority: z.enum(['immediate', 'short-term', 'long-term']),
              rationale: z.string().describe('Lý do đưa ra khuyến nghị này'),
            })
          ).describe('Danh sách khuyến nghị từ chuyên gia'),
          complianceScore: z.object({
            score: z.number().min(0).max(100).describe('Điểm tuân thủ FDA dựa trên intelligence data (0-100)'),
            interpretation: z.string().describe('Giải thích ý nghĩa điểm số'),
          }),
        }),
      }),
    })

    return NextResponse.json({ analysis: result.output })
  } catch (err: any) {
    console.error('[fda-intelligence-analysis] Error:', err.message)
    return NextResponse.json({ error: 'AI analysis failed: ' + err.message }, { status: 500 })
  }
}
