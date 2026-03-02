import type { ViolationMapping, MappedFinding } from './violation-to-cfr-mapper'
import type { KnowledgeSearchResult } from './embedding-utils'

/**
 * SMART CITATION FORMATTER
 * Converts technical findings into professional business language with CFR citations
 */
export class SmartCitationFormatter {
  /**
   * Format a violation into a professional finding with expert language
   */
  static formatProfessionalFinding(
    violation: ViolationMapping,
    regulation: KnowledgeSearchResult | null
  ): MappedFinding {
    const templates = this.getTemplateByType(violation.type)
    
    return {
      summary: templates.summary(violation),
      legal_basis: templates.legalBasis(violation, regulation),
      expert_logic: templates.expertLogic(violation),
      remediation: templates.remediation(violation),
      severity: violation.severity,
      cfr_reference: violation.regulationSection,
      confidence_score: regulation?.similarity || 0.8
    }
  }

  /**
   * Get formatting templates by violation type
   */
  private static getTemplateByType(type: ViolationMapping['type']) {
    const templates = {
      font_size: {
        summary: (v: ViolationMapping) => `Phát hiện sai sót về kích thước chữ`,
        legalBasis: (v: ViolationMapping, reg: KnowledgeSearchResult | null) => {
          const citation = reg ? reg.content.substring(0, 150) + '...' : 'yêu cầu FDA về kích thước chữ tối thiểu'
          return `Căn cứ theo ${v.regulationSection}, ${citation}`
        },
        expertLogic: (v: ViolationMapping) => 
          `Hệ thống nhận diện tiêu đề "Nutrition Facts" của bạn có kích thước ${v.detectedValue}, nhỏ hơn yêu cầu tối thiểu ${v.requiredValue} đối với bao bì có diện tích mặt chính (PDP) lớn hơn 40 sq in. Việc này vi phạm quy định về khả năng đọc (readability) của thông tin dinh dưỡng.`,
        remediation: (v: ViolationMapping) => 
          `Hướng sửa đổi: Tăng kích thước tiêu đề "Nutrition Facts" lên tối thiểu ${v.requiredValue}. Đảm bảo tiêu đề này lớn hơn tất cả các văn bản khác trong panel dinh dưỡng.`
      },
      rounding: {
        summary: (v: ViolationMapping) => `Phát hiện lỗi làm tròn giá trị dinh dưỡng`,
        legalBasis: (v: ViolationMapping, reg: KnowledgeSearchResult | null) => 
          `Căn cứ theo ${v.regulationSection}, FDA yêu cầu các giá trị dinh dưỡng phải tuân thủ quy tắc làm tròn cụ thể`,
        expertLogic: (v: ViolationMapping) => {
          if (v.type === 'rounding' && v.detectedValue.includes('kcal')) {
            return `Hệ thống phát hiện giá trị Calories hiện tại là ${v.detectedValue}, không chia hết cho 5. Theo quy định FDA, Calories phải được làm tròn đến bội số gần nhất của 5 (ví dụ: 102 → 100, 103 → 105).`
          }
          if (v.type === 'rounding' && v.detectedValue.includes('Trans Fat')) {
            return `Hệ thống phát hiện Trans Fat ${v.detectedValue}. Theo quy định FDA, nếu hàm lượng Trans Fat nhỏ hơn 0.5g thì phải ghi là 0g trên nhãn. Điều này nhằm tránh gây nhầm lẫn cho người tiêu dùng về hàm lượng chất béo có hại.`
          }
          return `Giá trị ${v.detectedValue} không tuân thủ quy tắc làm tròn FDA, cần điều chỉnh thành ${v.requiredValue}.`
        },
        remediation: (v: ViolationMapping) => 
          `Hướng sửa đổi: Thay đổi giá trị từ ${v.detectedValue} thành ${v.requiredValue} theo quy tắc làm tròn FDA.`
      },
      net_weight: {
        summary: (v: ViolationMapping) => `Phát hiện thiếu khai báo khối lượng tịnh (net weight)`,
        legalBasis: (v: ViolationMapping, reg: KnowledgeSearchResult | null) => 
          `Căn cứ theo ${v.regulationSection}, nhãn thực phẩm xuất khẩu Mỹ phải có cả đơn vị Metric và Imperial`,
        expertLogic: (v: ViolationMapping) => 
          `Hệ thống phát hiện Net Weight hiện tại: "${v.detectedValue}". Theo quy định, bạn cần khai báo đồng thời cả hai đơn vị đo lường: Metric (g, ml) và Imperial (oz, fl oz). Ví dụ chuẩn: "Net Wt. 24 oz (680g)".`,
        remediation: (v: ViolationMapping) => 
          `Hướng sửa đổi: Thêm cả hai đơn vị đo lường. Ví dụ: nếu sản phẩm là 500g thì ghi "Net Wt. 17.6 oz (500g)".`
      },
      ingredient_order: {
        summary: (v: ViolationMapping) => {
          if (v.regulationSection.includes('701.3')) return `Cảnh báo về thứ tự thành phần mỹ phẩm (INCI)`
          if (v.regulationSection.includes('201.10')) return `Cảnh báo về thứ tự thành phần bất hoạt (OTC Drug)`
          return `Cảnh báo về thứ tự nguyên liệu`
        },
        legalBasis: (v: ViolationMapping, reg: KnowledgeSearchResult | null) => {
          if (v.regulationSection.includes('701.3'))
            return `Căn cứ theo ${v.regulationSection} (21 CFR 701.3 — Nhãn mỹ phẩm), các thành phần INCI phải được liệt kê theo thứ tự giảm dần về trọng lượng`
          if (v.regulationSection.includes('201.10'))
            return `Căn cứ theo ${v.regulationSection} (21 CFR 201.10 — Nhãn thuốc OTC), các thành phần bất hoạt phải được liệt kê theo thứ tự giảm dần về trọng lượng`
          return `Căn cứ theo ${v.regulationSection} (21 CFR 101.4 — Nhãn thực phẩm), các nguyên liệu phải được liệt kê theo thứ tự giảm dần về trọng lượng`
        },
        expertLogic: (v: ViolationMapping) => {
          if (v.regulationSection.includes('701.3'))
            return `Hệ thống nhận diện danh sách thành phần INCI của mỹ phẩm: ${v.detectedValue}. Theo 21 CFR 701.3(a), các thành phần phải được liệt kê theo thứ tự giảm dần về hàm lượng. Vui lòng đối chiếu với công thức sản xuất để xác nhận thứ tự chính xác.`
          if (v.regulationSection.includes('201.10'))
            return `Hệ thống nhận diện danh sách thành phần bất hoạt (inactive ingredients) của sản phẩm OTC: ${v.detectedValue}. Theo 21 CFR 201.10(g), thứ tự phải theo hàm lượng giảm dần. Vui lòng kiểm tra lại với nhà sản xuất.`
          return `Hệ thống nhận diện danh sách nguyên liệu: ${v.detectedValue}. Vui lòng kiểm tra xem thứ tự này có đúng với tỷ lệ trọng lượng thực tế không. Nguyên liệu chiếm tỷ trọng lớn nhất phải đứng đầu.`
        },
        remediation: (v: ViolationMapping) => {
          if (v.regulationSection.includes('701.3'))
            return `Hướng kiểm tra: Đối chiếu danh sách INCI với công thức mỹ phẩm. Sắp xếp lại theo hàm lượng giảm dần (% w/w). Thành phần có hàm lượng dưới 1% có thể liệt kê theo thứ tự bất kỳ ở cuối danh sách.`
          if (v.regulationSection.includes('201.10'))
            return `Hướng kiểm tra: Đối chiếu danh sách thành phần bất hoạt với công thức OTC drug. Sắp xếp theo hàm lượng giảm dần và tham khảo USP monograph tương ứng.`
          return `Hướng kiểm tra: Đối chiếu danh sách nguyên liệu với công thức sản xuất. Sắp xếp lại theo thứ tự giảm dần về khối lượng (ingredient chiếm % cao nhất đứng đầu).`
        },
      },
      allergen_bold: {
        summary: (v: ViolationMapping) => `Phát hiện lỗi định dạng chất gây dị ứng (allergen)`,
        legalBasis: (v: ViolationMapping, reg: KnowledgeSearchResult | null) => 
          `Căn cứ theo ${v.regulationSection} (FALCPA - Food Allergen Labeling and Consumer Protection Act), các chất gây dị ứng phải được highlight`,
        expertLogic: (v: ViolationMapping) => 
          `Hệ thống phát hiện bạn có các allergen cần khai báo nhưng chưa được in đậm (bold) hoặc phân biệt rõ ràng. Theo luật FALCPA, 8 loại allergen chính (milk, eggs, fish, shellfish, tree nuts, peanuts, wheat, soybeans) phải được hiển thị bằng chữ in đậm hoặc có "Contains:" statement riêng.`,
        remediation: (v: ViolationMapping) => 
          `Hướng sửa đổi: In đậm (bold) tất cả allergen trong ingredient list HOẶC thêm "Contains:" statement ngay sau ingredient list. Ví dụ: "Contains: Milk, Soy".`
      },
      color_contrast: {
        summary: (v: ViolationMapping) => `Cảnh báo về độ tương phản màu sắc`,
        legalBasis: (v: ViolationMapping, reg: KnowledgeSearchResult | null) => 
          `Căn cứ theo ${v.regulationSection}, văn bản trên nhãn phải có độ tương phản đủ để dễ đọc`,
        expertLogic: (v: ViolationMapping) => 
          `Hệ thống đo được tỷ lệ tương phản màu chữ/nền là ${v.detectedValue}, thấp hơn tiêu chuẩn ${v.requiredValue}. Điều này có thể khiến người tiêu dùng khó đọc thông tin, đặc biệt là người cao tuổi hoặc có vấn đề về thị lực.`,
        remediation: (v: ViolationMapping) => 
          `Hướng sửa đổi: Tăng độ tương phản bằng cách: (1) Dùng màu chữ đậm hơn (dark text), hoặc (2) Dùng nền sáng hơn (light background). Công cụ kiểm tra: WebAIM Contrast Checker.`
      },
      hairlines: {
        summary: (v: ViolationMapping) => `Phát hiện sử dụng hairlines không phù hợp`,
        legalBasis: (v: ViolationMapping, reg: KnowledgeSearchResult | null) => 
          `Căn cứ theo ${v.regulationSection}, khi diện tích panel nhỏ, nên dùng dots thay vì hairlines`,
        expertLogic: (v: ViolationMapping) => 
          `Hệ thống phát hiện bạn đang dùng hairlines (đường kẻ mỏng) để phân cách các mục trong Nutrition Facts. Tuy nhiên, với diện tích panel nhỏ (dưới 40 sq in), FDA khuyến nghị dùng dots (dấu chấm) vì dễ đọc hơn và tiết kiệm không gian.`,
        remediation: (v: ViolationMapping) => 
          `Hướng sửa đổi: Thay thế hairlines bằng dots (……) để kết nối tên nutrient với giá trị. Ví dụ: "Total Fat..........5g" thay vì "Total Fat _____ 5g".`
      },
      missing_field: {
        summary: (v: ViolationMapping) => `Phát hiện thiếu thông tin bắt buộc`,
        legalBasis: (v: ViolationMapping, reg: KnowledgeSearchResult | null) => 
          `Căn cứ theo ${v.regulationSection}, thông tin này là bắt buộc trên nhãn thực phẩm`,
        expertLogic: (v: ViolationMapping) => 
          `Hệ thống không phát hiện thông tin ${v.detectedValue}. Đây là thông tin bắt buộc theo quy định FDA.`,
        remediation: (v: ViolationMapping) => 
          `Hướng sửa đổi: Bổ sung ${v.requiredValue} vào vị trí quy định trên nhãn.`
      }
    }

    return templates[type] || templates.missing_field
  }

  /**
   * Format multiple findings into a categorized report
   */
  static formatCommercialReport(findings: MappedFinding[]): {
    critical: MappedFinding[]
    warning: MappedFinding[]
    info: MappedFinding[]
  } {
    return {
      critical: findings.filter(f => f.severity === 'critical'),
      warning: findings.filter(f => f.severity === 'warning'),
      info: findings.filter(f => f.severity === 'info')
    }
  }

  /**
   * Generate expert tips based on common patterns
   */
  static generateExpertTips(findings: MappedFinding[]): string[] {
    const tips: string[] = []

    // Check if multiple font size issues
    const fontIssues = findings.filter(f => f.cfr_reference.includes('101.9') && f.summary.includes('chữ'))
    if (fontIssues.length > 0) {
      tips.push('Lời khuyên từ Vexim: Hải quan tại cảng Long Beach (Los Angeles) thường kiểm tra kỹ kích thước chữ. Đề xuất tăng font lên 18pt để an toàn.')
    }

    // Check allergen issues
    const allergenIssues = findings.filter(f => f.summary.includes('allergen') || f.summary.includes('dị ứng'))
    if (allergenIssues.length > 0) {
      tips.push('Lời khuyên từ Vexim: Với sản phẩm có allergen, FDA thường yêu cầu giữ hàng (detention) nếu không khai báo đúng. Hãy in đậm tất cả allergen để tránh rủi ro.')
    }

    // Check rounding issues
    const roundingIssues = findings.filter(f => f.summary.includes('làm tròn'))
    if (roundingIssues.length > 0) {
      tips.push('Lời khuyên từ Vexim: Lỗi làm tròn là lỗi phổ biến nhất của doanh nghiệp Việt Nam. Hãy sử dụng FDA Rounding Calculator trước khi in nhãn.')
    }

    return tips
  }

  /**
   * Create a complete commercial report summary
   */
  static createReportSummary(findings: MappedFinding[]): string {
    const categorized = this.formatCommercialReport(findings)
    const tips = this.generateExpertTips(findings)

    let summary = '## BÁO CÁO KIỂM TRA NHÃN FDA - VEXIM GLOBAL\n\n'
    
    if (categorized.critical.length > 0) {
      summary += `### 🔴 LỖI NGHIÊM TRỌNG (${categorized.critical.length})\n`
      summary += 'Các lỗi này có thể dẫn đến giữ hàng (detention) tại cảng:\n\n'
      categorized.critical.forEach((f, i) => {
        summary += `**${i + 1}. ${f.summary}**\n`
        summary += `- ${f.expert_logic}\n`
        summary += `- ${f.remediation}\n`
        summary += `- Căn cứ pháp lý: ${f.cfr_reference}\n\n`
      })
    }

    if (categorized.warning.length > 0) {
      summary += `### 🟠 CẢNH BÁO (${categorized.warning.length})\n`
      summary += 'Các lỗi về trình bày, nên sửa để tránh rủi ro:\n\n'
      categorized.warning.forEach((f, i) => {
        summary += `**${i + 1}. ${f.summary}**\n`
        summary += `- ${f.expert_logic}\n`
        summary += `- ${f.remediation}\n\n`
      })
    }

    if (tips.length > 0) {
      summary += '### 💡 LỜI KHUYÊN TỪ CHUYÊN GIA\n\n'
      tips.forEach(tip => {
        summary += `- ${tip}\n`
      })
    }

    return summary
  }
}
