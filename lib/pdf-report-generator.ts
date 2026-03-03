import type { AuditReport, Violation, Citation } from './types'

// PDF generation using pure server-side HTML template
// This generates a professional FDA compliance report HTML that is converted to PDF

type SupportedLang = 'vi' | 'en'

interface PDFReportData {
  report: AuditReport
  violations: Violation[]
  generatedAt: string
  generatedBy: string // 'Vexim Compliance AI' or expert name
  companyInfo: {
    name: string
    address: string
    phone: string
    email: string
    website: string
    certificationId: string
  }
  lang?: SupportedLang
}

// ── i18n label map ────────────────────────────────────────────────────
const PDF_LABELS: Record<SupportedLang, Record<string, string>> = {
  vi: {
    downloadTitle: 'Báo cáo kiểm tra tuân thủ FDA',
    downloadBtn: 'Tải xuống PDF',
    coverTitle: 'Báo Cáo Kiểm Tra Tuân Thủ FDA',
    defaultProduct: 'Phân Tích Nhãn Sản Phẩm',
    reportId: 'Mã Báo Cáo',
    dateCreated: 'Ngày Tạo',
    result: 'Kết Quả',
    riskScore: 'Điểm Rủi Ro',
    pass: 'ĐẠT',
    fail: 'KHÔNG ĐẠT',
    pending: 'CHỜ XÁC MINH',
    quickSummary: 'Tóm Tắt Nhanh',
    critical: 'Nghiêm trọng',
    warning: 'Cảnh báo',
    info: 'Thông tin',
    cfrCitations: 'Trích dẫn CFR',
    mainReasons: 'Lý do chính:',
    generatedBy: 'Thực hiện bởi',
    overview: 'Tổng Quan',
    riskLevel: 'Mức rủi ro',
    overallAssessment: 'Đánh Giá Tổng Thể Từ Vexim AI',
    currentRisk: 'Rủi ro hiện tại',
    afterFix: 'Sau khi sửa',
    productInfo: 'Thông Tin Sản Phẩm',
    productName: 'Tên sản phẩm',
    brandName: 'Thương hiệu',
    category: 'Danh mục',
    productType: 'Loại sản phẩm',
    packageFormat: 'Định dạng bao bì',
    netContent: 'Khối lượng tịnh',
    pdpArea: 'Diện tích PDP',
    manufacturer: 'Nhà sản xuất',
    origin: 'Xuất xứ',
    targetMarket: 'Thị trường mục tiêu',
    detectedLangs: 'Ngôn ngữ phát hiện',
    analysisDate: 'Ngày phân tích',
    aiConfidence: 'Độ tin cậy AI',
    allergenDeclaration: 'Khai Báo Dị Ứng',
    allergens: 'Chất gây dị ứng',
    ingredientList: 'Danh Sách Thành Phần',
    ingredientDetected: 'Thành phần được phát hiện bởi AI Vision',
    nutritionInfo: 'Thông Tin Dinh Dưỡng',
    nutritionDetected: 'Bảng dinh dưỡng được phát hiện bởi AI Vision',
    servingSize: 'Khẩu phần',
    servingsPerContainer: 'Số khẩu phần/hộp',
    calories: 'Năng lượng',
    totalFat: 'Chất béo tổng',
    saturatedFat: 'Chất béo bão hòa',
    transFat: 'Chất béo trans',
    cholesterol: 'Cholesterol',
    sodium: 'Natri',
    totalCarb: 'Carbohydrate tổng',
    dietaryFiber: 'Chất xơ',
    totalSugars: 'Đường tổng',
    addedSugars: 'Đường bổ sung',
    protein: 'Protein',
    vitaminD: 'Vitamin D',
    calcium: 'Canxi',
    iron: 'Sắt',
    potassium: 'Kali',
    findingsDetail: 'Chi Tiết Phát Hiện',
    noViolations: 'Không phát hiện vi phạm',
    noViolationsDesc: 'Nhãn sản phẩm đáp ứng tất cả yêu cầu tuân thủ FDA đã kiểm tra.',
    legalBasis: 'Cơ sở pháp lý',
    fixGuidance: 'Hướng dẫn khắc phục',
    enforcementHistory: 'Lịch sử xử phạt',
    aiConfidenceLabel: 'Độ tin cậy AI',
    riskScoreLabel: 'Điểm rủi ro',
    enforcementFreq: 'Tần suất xử phạt',
    citationsLabel: 'Trích dẫn',
    cfrSection: 'Mục CFR',
    citationContent: 'Nội dung trích dẫn',
    source: 'Nguồn',
    relevance: 'Độ liên quan',
    importAlerts: 'Cảnh Báo Nhập Khẩu FDA',
    portRiskLabel: 'RỦI RO TẠI CẢNG NHẬP KHẨU (Chỉ mang tính tham khảo)',
    portRiskDesc: 'Các Cảnh báo Nhập khẩu FDA sau đây đã được khớp với sản phẩm hoặc danh mục này. Import Alerts cho phép FDA giữ hàng tại các cảng Hoa Kỳ KHÔNG cần kiểm tra vật lý (DWPE). Đây là các tín hiệu rủi ro - không phải vi phạm pháp lý - và không thay thế các yêu cầu tuân thủ quy định. Sản phẩm từ các công ty trong Danh sách Đỏ sẽ bị giữ tự động tại tất cả các cảng nhập cảnh Hoa Kỳ.',
    importAlertRef: 'Tham chiếu Import Alert',
    viewOnFda: 'Xem trên FDA.gov',
    remediationSteps: 'Các bước khắc phục',
    matchConfidence: 'Độ tin cậy khớp',
    referenceOnly: 'Chỉ mang tính tham khảo — không phải vi phạm pháp lý',
    dwpeRedList: 'DWPE — Danh sách Đỏ',
    categoryRisk: 'Rủi ro danh mục',
    technicalChecks: 'Kiểm Tra Kỹ Thuật & Hình Ảnh',
    geometryLayout: 'Hình học & Bố cục',
    issueCount: 'vấn đề',
    expected: 'Yêu cầu',
    actual: 'Thực tế',
    colorContrast: 'Độ tương phản màu',
    contrastRatio: 'Tỷ lệ tương phản',
    minimum: 'tối thiểu',
    on: 'trên',
    multiLangCompliance: 'Tuân thủ đa ngôn ngữ',
    checks: 'kiểm tra',
    detected: 'Đã phát hiện',
    missingTranslations: 'Thiếu bản dịch',
    commercialSummary: 'Tóm Tắt Phân Tích Thương Mại',
    expertRecommendations: 'Khuyến Nghị Chuyên Gia',
    recommendation: 'Khuyến nghị',
    veximAdvice: 'Lời khuyên từ Vexim',
    portWarning: 'Cảnh báo cảng nhập khẩu',
    portWarningDesc: 'Sản phẩm có vi phạm nhãn thường bị giữ tại các cảng nhập cảnh Hoa Kỳ (đặc biệt Long Beach, Los Angeles và Newark). Cục Hải quan và Bảo vệ Biên giới (CBP) phối hợp với FDA trong kiểm tra nhập khẩu. Khắc phục tất cả các vấn đề nghiêm trọng trước khi vận chuyển là rất cần thiết.',
    expertReviewNotes: 'Ghi chú đánh giá chuyên gia',
    actionItems: 'Danh Sách Hành Động',
    actionSeverity: 'Mức độ',
    actionIssue: 'Vấn đề',
    actionRequired: 'Hành động cần thực hiện',
    seeDetails: 'Xem chi tiết',
    reportVerified: 'Báo cáo đã xác minh bởi chuyên gia',
    pendingVerification: 'Chờ xác minh chuyên gia',
    upgradeTitle: 'Nâng cao độ tin cậy của báo cáo',
    upgradeDesc: 'Để chuyên gia tuân thủ FDA có năng lực đánh giá và xác minh báo cáo này.',
    upgradeDesc2: 'Xác minh chuyên gia tăng độ tin cậy và cung cấp khuyến nghị chi tiết hơn.',
    requestVerification: 'Yêu cầu xác minh chuyên gia',
    contactConsulting: 'Liên hệ tư vấn',
    certification: 'Chứng nhận',
    certificationDesc: 'Báo cáo này được tạo bởi Vexim Compliance AI và',
    verifiedByExpert: 'đã được xác minh bởi chuyên gia tuân thủ FDA',
    pendingExpertVerification: 'đang chờ xác minh chuyên gia',
    certificationDesc2: 'Các phát hiện dựa trên phân tích tự động nhãn đã gửi so với các quy định FDA hiện hành (21 CFR) và tiền lệ xử phạt.',
    fdaComplianceExpert: 'Chuyên gia tuân thủ FDA',
    veximAiSystem: 'Hệ thống phân tích Vexim AI',
    certId: 'Mã chứng nhận',
    disclaimer: 'Tuyên bố miễn trừ trách nhiệm',
    disclaimerText: 'Báo cáo này chỉ được cung cấp cho mục đích thông tin và không cấu thành tư vấn pháp lý. Mặc dù Vexim Compliance AI sử dụng công nghệ AI tiên tiến và cơ sở dữ liệu quy định FDA toàn diện (bao gồm hơn 4.064 quy định, Thư cảnh báo FDA, Thu hồi FDA và Cảnh báo nhập khẩu FDA) để xác định các vấn đề tuân thủ tiềm năng, nó không nên được sử dụng thay thế cho tư vấn với chuyên gia quản lý quy định FDA có trình độ. Các phát hiện Import Alert chỉ là tín hiệu rủi ro và không cấu thành vi phạm quy định hoặc trích dẫn pháp lý. Vexim Global không chịu trách nhiệm cho bất kỳ quyết định nào được đưa ra dựa trên báo cáo này. Các quy định FDA có thể thay đổi, và chủ sở hữu nhãn có trách nhiệm đảm bảo tuân thủ liên tục. Báo cáo này có hiệu lực kể từ ngày tạo và cần được xem xét lại nếu quy định thay đổi.',
    defaultRiskHigh: (score: string, critical: number) => `Nhãn sản phẩm có điểm rủi ro ${score}/10. Các vấn đề nghiêm trọng cần được khắc phục trước khi phân phối.`,
    defaultRiskLow: (score: string) => `Nhãn sản phẩm có điểm rủi ro ${score}/10. Không phát hiện vấn đề nghiêm trọng, nhưng cần cải thiện một số điểm.`,
    expertTipCritical: 'Nhãn sản phẩm này có các vấn đề tuân thủ FDA nghiêm trọng cần được khắc phục trước khi phân phối tại thị trường Hoa Kỳ. Không tuân thủ có thể dẫn đến Import Alert, hàng bị giữ tại cảng, hoặc Thư cảnh báo FDA.',
    expertTipWarning: 'Nhãn sản phẩm này đáp ứng yêu cầu FDA tối thiểu nhưng có các điểm cần cải thiện. Khắc phục các cảnh báo sẽ giảm rủi ro bị xử phạt và tăng niềm tin của người tiêu dùng.',
    expertTipPass: 'Nhãn sản phẩm này thể hiện sự tuân thủ FDA tốt. Tiếp tục theo dõi các cập nhật quy định v�� duy trì các tiêu chuẩn ghi nhãn hiện tại.',
    riskHigh: 'Cao',
    riskMedHigh: 'Trung bình - Cao',
    riskMed: 'Trung bình',
    riskLow: 'Thấp',
    sevCritical: 'NGHIÊM TRỌNG',
    sevWarning: 'CẢNH BÁO',
    sevInfo: 'THÔNG TIN',
    catHealthClaims: 'Tuyên bố sức khỏe',
    catIngredientOrder: 'Thứ tự nguyên liệu',
    catIngredientListing: 'Danh sách thành phần',
    catNutritionFacts: 'Thông tin dinh dưỡng',
    catAllergenDeclaration: 'Khai báo chất gây dị ứng',
    catNetContent: 'Khối lượng tịnh',
    catCountryOfOrigin: 'Xuất xứ',
    catManufacturerInfo: 'Thông tin nhà sản xuất',
    catFontSize: 'Cỡ chữ',
    catLabelProminence: 'Độ nổi bật nhãn',
    catColorContrast: 'Độ tương phản màu',
    catLangRequirements: 'Yêu cầu ngôn ngữ',
    catMissingStatement: 'Thiếu tuyên bố bắt buộc',
    catProhibitedClaims: 'Tuyên bố bị cấm',
    catDrugClaims: 'Tuyên bố thuốc',
    catDiseaseClaims: 'Tuyên bố bệnh',
    catStructureClaims: 'Tuyên bố cấu trúc/chức năng',
    catNutrientClaims: 'Tuyên bố hàm lượng dinh dưỡng',
    catServingSize: 'Khẩu phần ăn',
    catDailyValue: 'Giá trị hàng ngày',
    catBarcodeIssues: 'Vấn đề mã vạch',
    catPackagingCompliance: 'Tuân thủ bao bì',
    catImportAlertMatch: 'Khớp cảnh báo nhập khẩu',
    catWarningLetterCitation: 'Trích dẫn thư cảnh báo',
    catRecallAssociation: 'Liên quan thu hồi',
  },
  en: {
    downloadTitle: 'FDA Compliance Audit Report',
    downloadBtn: 'Download PDF',
    coverTitle: 'FDA Compliance Audit Report',
    defaultProduct: 'Product Label Analysis',
    reportId: 'Report ID',
    dateCreated: 'Date Created',
    result: 'Result',
    riskScore: 'Risk Score',
    pass: 'PASS',
    fail: 'FAIL',
    pending: 'PENDING VERIFICATION',
    quickSummary: 'Quick Summary',
    critical: 'Critical',
    warning: 'Warning',
    info: 'Info',
    cfrCitations: 'CFR Citations',
    mainReasons: 'Main reasons:',
    generatedBy: 'Generated by',
    overview: 'Overview',
    riskLevel: 'Risk level',
    overallAssessment: 'Overall Assessment by Vexim AI',
    currentRisk: 'Current risk',
    afterFix: 'After fixes',
    productInfo: 'Product Information',
    productName: 'Product name',
    brandName: 'Brand',
    category: 'Category',
    productType: 'Product type',
    packageFormat: 'Package format',
    netContent: 'Net content',
    pdpArea: 'PDP area',
    manufacturer: 'Manufacturer',
    origin: 'Country of origin',
    targetMarket: 'Target market',
    detectedLangs: 'Detected languages',
    analysisDate: 'Analysis date',
    aiConfidence: 'AI confidence',
    allergenDeclaration: 'Allergen Declaration',
    allergens: 'Allergens',
    ingredientList: 'Ingredient List',
    ingredientDetected: 'Ingredients detected by AI Vision',
    nutritionInfo: 'Nutrition Information',
    nutritionDetected: 'Nutrition facts detected by AI Vision',
    servingSize: 'Serving size',
    servingsPerContainer: 'Servings per container',
    calories: 'Calories',
    totalFat: 'Total fat',
    saturatedFat: 'Saturated fat',
    transFat: 'Trans fat',
    cholesterol: 'Cholesterol',
    sodium: 'Sodium',
    totalCarb: 'Total carbohydrate',
    dietaryFiber: 'Dietary fiber',
    totalSugars: 'Total sugars',
    addedSugars: 'Added sugars',
    protein: 'Protein',
    vitaminD: 'Vitamin D',
    calcium: 'Calcium',
    iron: 'Iron',
    potassium: 'Potassium',
    findingsDetail: 'Detailed Findings',
    noViolations: 'No violations found',
    noViolationsDesc: 'Product label meets all checked FDA compliance requirements.',
    legalBasis: 'Legal basis',
    fixGuidance: 'Fix guidance',
    enforcementHistory: 'Enforcement history',
    aiConfidenceLabel: 'AI confidence',
    riskScoreLabel: 'Risk score',
    enforcementFreq: 'Enforcement frequency',
    citationsLabel: 'Citations',
    cfrSection: 'CFR Section',
    citationContent: 'Citation content',
    source: 'Source',
    relevance: 'Relevance',
    importAlerts: 'FDA Import Alerts',
    portRiskLabel: 'PORT OF ENTRY RISK (Reference only)',
    portRiskDesc: 'The following FDA Import Alerts have been matched to this product or category. Import Alerts allow FDA to detain goods at US ports WITHOUT physical examination (DWPE). These are risk signals - not legal violations - and do not replace regulatory compliance requirements. Products from companies on the Red List will be automatically detained at all US ports of entry.',
    importAlertRef: 'Import Alert reference',
    viewOnFda: 'View on FDA.gov',
    remediationSteps: 'Remediation steps',
    matchConfidence: 'Match confidence',
    referenceOnly: 'Reference only — not a legal violation',
    dwpeRedList: 'DWPE — Red List',
    categoryRisk: 'Category risk',
    technicalChecks: 'Technical & Visual Checks',
    geometryLayout: 'Geometry & Layout',
    issueCount: 'issues',
    expected: 'Required',
    actual: 'Actual',
    colorContrast: 'Color Contrast',
    contrastRatio: 'Contrast ratio',
    minimum: 'minimum',
    on: 'on',
    multiLangCompliance: 'Multi-language Compliance',
    checks: 'checks',
    detected: 'Detected',
    missingTranslations: 'Missing translations',
    commercialSummary: 'Commercial Analysis Summary',
    expertRecommendations: 'Expert Recommendations',
    recommendation: 'Recommendation',
    veximAdvice: 'Vexim advice',
    portWarning: 'Port of entry warning',
    portWarningDesc: 'Products with label violations are commonly detained at US ports of entry (especially Long Beach, Los Angeles and Newark). US Customs and Border Protection (CBP) coordinates with FDA on import inspections. Addressing all critical issues before shipping is essential.',
    expertReviewNotes: 'Expert review notes',
    actionItems: 'Action Items',
    actionSeverity: 'Severity',
    actionIssue: 'Issue',
    actionRequired: 'Action required',
    seeDetails: 'See details',
    reportVerified: 'Report verified by expert',
    pendingVerification: 'Pending expert verification',
    upgradeTitle: 'Enhance report confidence',
    upgradeDesc: 'Have a qualified FDA compliance expert review and verify this report.',
    upgradeDesc2: 'Expert verification increases confidence and provides more detailed recommendations.',
    requestVerification: 'Request expert verification',
    contactConsulting: 'Contact consulting',
    certification: 'Certification',
    certificationDesc: 'This report was generated by Vexim Compliance AI and',
    verifiedByExpert: 'has been verified by an FDA compliance expert',
    pendingExpertVerification: 'is pending expert verification',
    certificationDesc2: 'Findings are based on automated analysis of the submitted label against current FDA regulations (21 CFR) and enforcement precedent.',
    fdaComplianceExpert: 'FDA Compliance Expert',
    veximAiSystem: 'Vexim AI Analysis System',
    certId: 'Certification ID',
    disclaimer: 'Disclaimer',
    disclaimerText: 'This report is provided for informational purposes only and does not constitute legal advice. While Vexim Compliance AI uses advanced AI technology and a comprehensive FDA regulatory database (including over 4,064 regulations, FDA Warning Letters, FDA Recalls and FDA Import Alerts) to identify potential compliance issues, it should not be used as a substitute for consultation with qualified FDA regulatory professionals. Import Alert findings are risk signals only and do not constitute regulatory violations or legal citations. Vexim Global is not responsible for any decisions made based on this report. FDA regulations are subject to change, and label owners are responsible for ensuring ongoing compliance. This report is valid as of the date of creation and should be reviewed if regulations change.',
    defaultRiskHigh: (score: string, critical: number) => `Product label has a risk score of ${score}/10. Critical issues must be addressed before distribution.`,
    defaultRiskLow: (score: string) => `Product label has a risk score of ${score}/10. No critical issues found, but some areas need improvement.`,
    expertTipCritical: 'This product label has critical FDA compliance issues that must be addressed before distribution in the US market. Non-compliance could lead to Import Alerts, port detention, or FDA Warning Letters.',
    expertTipWarning: 'This product label meets minimum FDA requirements but has areas for improvement. Addressing warnings will reduce enforcement risk and increase consumer confidence.',
    expertTipPass: 'This product label demonstrates good FDA compliance. Continue monitoring regulatory updates and maintaining current labeling standards.',
    riskHigh: 'High',
    riskMedHigh: 'Medium-High',
    riskMed: 'Medium',
    riskLow: 'Low',
    sevCritical: 'CRITICAL',
    sevWarning: 'WARNING',
    sevInfo: 'INFO',
    catHealthClaims: 'Health Claims',
    catIngredientOrder: 'Ingredient Order',
    catIngredientListing: 'Ingredient Listing',
    catNutritionFacts: 'Nutrition Facts',
    catAllergenDeclaration: 'Allergen Declaration',
    catNetContent: 'Net Content',
    catCountryOfOrigin: 'Country of Origin',
    catManufacturerInfo: 'Manufacturer Info',
    catFontSize: 'Font Size',
    catLabelProminence: 'Label Prominence',
    catColorContrast: 'Color Contrast',
    catLangRequirements: 'Language Requirements',
    catMissingStatement: 'Missing Required Statement',
    catProhibitedClaims: 'Prohibited Claims',
    catDrugClaims: 'Drug Claims',
    catDiseaseClaims: 'Disease Claims',
    catStructureClaims: 'Structure/Function Claims',
    catNutrientClaims: 'Nutrient Content Claims',
    catServingSize: 'Serving Size',
    catDailyValue: 'Daily Value',
    catBarcodeIssues: 'Barcode Issues',
    catPackagingCompliance: 'Packaging Compliance',
    catImportAlertMatch: 'Import Alert Match',
    catWarningLetterCitation: 'Warning Letter Citation',
    catRecallAssociation: 'Recall Association',
  },
}

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatDate(dateStr: string, lang: SupportedLang): string {
  try {
    return new Date(dateStr).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function getSeverityColor(severity: string): { bg: string; text: string; border: string } {
  switch (severity) {
    case 'critical':
      return { bg: '#FEE2E2', text: '#991B1B', border: '#F87171' }
    case 'warning':
      return { bg: '#FEF3C7', text: '#92400E', border: '#FBBF24' }
    case 'info':
      return { bg: '#DBEAFE', text: '#1E40AF', border: '#60A5FA' }
    default:
      return { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB' }
  }
}

function getRiskColor(score: number): string {
  if (score >= 7) return '#DC2626'
  if (score >= 4) return '#F59E0B'
  return '#16A34A'
}

function getRiskLabel(score: number, L: Record<string, string>): string {
  if (score >= 8) return L.riskHigh
  if (score >= 6) return L.riskMedHigh
  if (score >= 4) return L.riskMed
  return L.riskLow
}

function getSeverityLabel(severity: string, L: Record<string, string>): string {
  switch (severity) {
    case 'critical': return L.sevCritical
    case 'warning': return L.sevWarning
    case 'info': return L.sevInfo
    default: return severity.toUpperCase()
  }
}

function translateCategory(category: string, L: Record<string, string>): string {
  const map: Record<string, string> = {
    'Health Claims': L.catHealthClaims,
    'Ingredient Order': L.catIngredientOrder,
    'Ingredient Listing': L.catIngredientListing,
    'Nutrition Facts': L.catNutritionFacts,
    'Allergen Declaration': L.catAllergenDeclaration,
    'Net Content': L.catNetContent,
    'Country of Origin': L.catCountryOfOrigin,
    'Manufacturer Info': L.catManufacturerInfo,
    'Font Size': L.catFontSize,
    'Label Prominence': L.catLabelProminence,
    'Color Contrast': L.catColorContrast,
    'Language Requirements': L.catLangRequirements,
    'Missing Required Statement': L.catMissingStatement,
    'Prohibited Claims': L.catProhibitedClaims,
    'Drug Claims': L.catDrugClaims,
    'Disease Claims': L.catDiseaseClaims,
    'Structure/Function Claims': L.catStructureClaims,
    'Nutrient Content Claims': L.catNutrientClaims,
    'Serving Size': L.catServingSize,
    'Daily Value': L.catDailyValue,
    'Barcode Issues': L.catBarcodeIssues,
    'Packaging Compliance': L.catPackagingCompliance,
    'Import Alert Match': L.catImportAlertMatch,
    'Warning Letter Citation': L.catWarningLetterCitation,
    'Recall Association': L.catRecallAssociation,
  }
  return map[category] || category
}

export function generatePDFReportHTML(data: PDFReportData): string {
  const { report, violations, generatedAt, generatedBy, companyInfo, lang = 'vi' } = data
  const L = PDF_LABELS[lang] || PDF_LABELS.vi

  const importAlertViolations = violations.filter(v => v.source_type === 'import_alert')
  const standardViolations = violations.filter(v => v.source_type !== 'import_alert')

  const criticalCount = standardViolations.filter(v => v.severity === 'critical').length
  const warningCount = standardViolations.filter(v => v.severity === 'warning').length
  const infoCount = standardViolations.filter(v => v.severity === 'info').length
  const totalCitations = standardViolations.reduce((sum, v) => sum + (v.citations?.length || 0), 0)

  const riskScore = report.overall_risk_score ?? 0
  const projectedRisk = report.projected_risk_score ?? 0

  const productCategory = (report.product_category || '').toLowerCase()
  const productType = (report.product_type || '').toLowerCase()
  const isCosmetic = productCategory.includes('cosmetic') || 
                     productCategory.includes('mỹ phẩm') ||
                     productType.includes('cosmetic') ||
                     productType.includes('skincare') ||
                     productType.includes('cream') ||
                     productType.includes('lotion') ||
                     productType.includes('elixir')

  const sortedViolations = [...standardViolations].sort((a, b) => {
    const order: Record<string, number> = { critical: 0, warning: 1, info: 2 }
    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3)
  })

  const resultLabel = report.overall_result === 'pass' ? L.pass : report.overall_result === 'fail' ? L.fail : L.pending
  const resultColor = report.overall_result === 'pass' ? '#16a34a' : report.overall_result === 'fail' ? '#dc2626' : '#f59e0b'

  const defaultAssessment = criticalCount > 0
    ? (L.defaultRiskHigh as Function)(riskScore.toFixed(1), criticalCount)
    : (L.defaultRiskLow as Function)(riskScore.toFixed(1))

  const defaultExpertTip = criticalCount > 0 ? L.expertTipCritical : warningCount > 0 ? L.expertTipWarning : L.expertTipPass

  // Keep the SAME CSS (unchanged) — only swap text labels
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${L.downloadTitle} - ${escapeHtml(report.product_name || 'Label Analysis')}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; color: #1a1a2e; background: #ffffff; line-height: 1.6; font-size: 10pt; }
  .download-bar { position: fixed; top: 0; left: 0; right: 0; background: #0f172a; padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; z-index: 1000; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
  .download-bar-title { color: #ffffff; font-size: 14px; font-weight: 600; }
  .download-btn { display: inline-flex; align-items: center; gap: 8px; background: #2563eb; color: white; padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; border: none; cursor: pointer; transition: background 0.2s; }
  .download-btn:hover { background: #1d4ed8; }
  .download-btn svg { width: 18px; height: 18px; }
  .page-content-wrapper { padding-top: 60px; }
  @media print { .download-bar { display: none !important; } .page-content-wrapper { padding-top: 0; } }
  .page { width: 210mm; min-height: auto; margin: 0 auto; padding: 0; background: white; }
  @media print { body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .page { margin: 0; padding: 0; width: 100%; box-shadow: none; min-height: auto; } .page-break { page-break-before: always; } .no-break { page-break-inside: avoid; } .content-page { min-height: auto; } }
  @page { size: A4; margin: 10mm; }
  .cover-page { min-height: auto; display: flex; flex-direction: column; position: relative; background: #ffffff; color: #0f172a; padding: 20mm; }
  .cover-header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; margin-bottom: 40px; }
  .cover-logo { display: flex; align-items: center; gap: 12px; }
  .cover-logo-icon { width: 48px; height: 48px; background: #2563eb; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 20px; color: white; }
  .cover-logo-text { font-size: 24px; font-weight: 700; letter-spacing: -0.5px; color: #0f172a; }
  .cover-logo-sub { font-size: 11px; color: #64748b; font-weight: 400; letter-spacing: 2px; text-transform: uppercase; }
  .cover-badge { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 16px; font-size: 11px; color: #475569; font-weight: 600; }
  .cover-title { font-size: 32px; font-weight: 800; line-height: 1.3; margin-bottom: 12px; letter-spacing: -0.5px; color: #0f172a; }
  .cover-subtitle { font-size: 16px; color: #64748b; font-weight: 500; margin-bottom: 40px; }
  .cover-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 40px; }
  .cover-meta-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
  .cover-meta-label { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px; }
  .cover-meta-value { font-size: 14px; font-weight: 600; color: #0f172a; }
  .cover-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #64748b; }
  .content-page { padding: 15mm 20mm; min-height: auto; }
  .page-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 2px solid #e2e8f0; margin-bottom: 24px; }
  .page-header-left { display: flex; align-items: center; gap: 8px; }
  .page-header-logo { width: 28px; height: 28px; background: #1e293b; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; color: white; }
  .page-header-brand { font-size: 12px; font-weight: 600; color: #334155; }
  .page-header-right { font-size: 9px; color: #94a3b8; text-align: right; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #2563eb; display: inline-block; }
  .section-number { color: #2563eb; margin-right: 8px; }
  .exec-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px; margin-bottom: 24px; }
  .exec-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; }
  .exec-card-value { font-size: 28px; font-weight: 800; line-height: 1; margin-bottom: 4px; }
  .exec-card-label { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
  .risk-section { display: flex; gap: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
  .risk-gauge { text-align: center; min-width: 120px; }
  .risk-score-circle { width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; font-size: 28px; font-weight: 800; color: white; }
  .risk-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
  .risk-details { flex: 1; }
  .risk-details h4 { font-size: 13px; font-weight: 600; margin-bottom: 8px; color: #334155; }
  .risk-details p { font-size: 10px; color: #64748b; margin-bottom: 6px; }
  .risk-bar-container { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
  .risk-bar-label { font-size: 9px; color: #64748b; min-width: 80px; }
  .risk-bar { flex: 1; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
  .risk-bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
  .risk-bar-value { font-size: 9px; font-weight: 600; min-width: 30px; text-align: right; }
  .violation-card { border: 1px solid; border-radius: 10px; padding: 18px; margin-bottom: 16px; page-break-inside: avoid; }
  .violation-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
  .violation-title { font-size: 13px; font-weight: 700; flex: 1; }
  .severity-badge { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 4px 10px; border-radius: 4px; white-space: nowrap; }
  .violation-description { font-size: 10px; color: #334155; margin-bottom: 12px; line-height: 1.6; }
  .violation-box { background: rgba(255,255,255,0.8); border-radius: 6px; padding: 12px; margin-bottom: 10px; }
  .violation-box-label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 4px; }
  .violation-box-value { font-size: 10px; color: #1e293b; line-height: 1.5; }
  .violation-meta { display: flex; gap: 16px; font-size: 9px; color: #64748b; padding-top: 10px; border-top: 1px solid rgba(0,0,0,0.06); }
  .citations-table { width: 100%; border-collapse: collapse; font-size: 9px; margin-top: 8px; }
  .citations-table th { background: #f1f5f9; padding: 8px 10px; text-align: left; font-weight: 600; color: #334155; border-bottom: 2px solid #e2e8f0; font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
  .citations-table td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; color: #475569; vertical-align: top; }
  .citations-table tr:nth-child(even) td { background: #fafbfc; }
  .relevance-bar { display: inline-block; width: 40px; height: 4px; background: #e2e8f0; border-radius: 2px; overflow: hidden; vertical-align: middle; margin-right: 4px; }
  .relevance-bar-fill { height: 100%; background: #2563eb; border-radius: 2px; }
  .expert-tip { background: #eff6ff; border: 1px solid #bfdbfe; border-left: 4px solid #3b82f6; border-radius: 0 8px 8px 0; padding: 14px 16px; margin-bottom: 10px; font-size: 10px; color: #1e40af; line-height: 1.6; }
  .expert-tip-label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #2563eb; margin-bottom: 4px; }
  .info-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  .info-table td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 10px; }
  .info-table td:first-child { font-weight: 600; color: #64748b; width: 35%; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; }
  .signature-section { margin-top: 40px; padding-top: 24px; border-top: 2px solid #e2e8f0; }
  .signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 16px; }
  .signature-box { border-top: 2px solid #334155; padding-top: 8px; }
  .signature-name { font-size: 11px; font-weight: 600; color: #334155; }
  .signature-title { font-size: 9px; color: #64748b; }
  .disclaimer { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; font-size: 8px; color: #64748b; line-height: 1.6; margin-top: 24px; }
  .disclaimer-title { font-size: 9px; font-weight: 700; color: #334155; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px; }
  .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 100px; font-weight: 800; color: rgba(0,0,0,0.03); pointer-events: none; z-index: 0; white-space: nowrap; }
  .verification-badge { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .verification-badge.verified { background: #16a34a; color: white; }
  .verification-badge.pending { background: #fef3c7; color: #92400e; border: 1px solid #fbbf24; }
  .port-warning { background: #FEF3C7; border: 1px solid #f59e0b; border-left: 4px solid #d97706; border-radius: 0 8px 8px 0; padding: 14px 16px; margin-bottom: 10px; font-size: 10px; color: #92400e; line-height: 1.6; }
  .port-warning-label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #b45309; margin-bottom: 4px; }
  .tech-grid { display: grid; grid-template-columns: 1fr; gap: 16px; margin-bottom: 16px; }
  .tech-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; page-break-inside: avoid; width: 100%; }
  .tech-card-title { font-size: 10px; font-weight: 700; color: #334155; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
  .tech-card-badge { font-size: 8px; font-weight: 600; padding: 2px 8px; border-radius: 4px; background: #f1f5f9; color: #64748b; }
  .tech-item { padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 9px; }
  .tech-item:last-child { border-bottom: none; }
  .tech-item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
  .tech-item-type { font-weight: 600; color: #334155; text-transform: capitalize; }
  .tech-item-desc { color: #64748b; line-height: 1.5; }
  .tech-item-values { display: flex; gap: 12px; margin-top: 4px; font-size: 8px; }
  .data-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px; font-size: 10px; line-height: 1.6; color: #334155; }
  .data-box-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #2563eb; margin-bottom: 8px; }
  .summary-section { margin-bottom: 12px; }
  .summary-heading { font-size: 12px; font-weight: 700; color: #0f172a; margin: 10px 0 6px; }
  .summary-subheading { font-size: 11px; font-weight: 600; color: #334155; margin: 8px 0 4px; }
  .summary-text { font-size: 10px; color: #475569; line-height: 1.5; margin-bottom: 4px; }
  .summary-list-item { font-size: 10px; color: #475569; padding-left: 16px; line-height: 1.5; position: relative; }
  .summary-list-item::before { content: "\\2022"; position: absolute; left: 4px; color: #94a3b8; }
  .color-swatch { display: inline-block; width: 14px; height: 14px; border-radius: 3px; border: 1px solid #d1d5db; vertical-align: middle; margin-right: 4px; }
</style>
</head>
<body>

<!-- Download Bar -->
<div class="download-bar">
  <div class="download-bar-title">${L.downloadTitle} - ${escapeHtml(report.product_name || 'Label Analysis')}</div>
  <button class="download-btn" onclick="window.print()">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
    ${L.downloadBtn}
  </button>
</div>

<div class="page-content-wrapper">

<!-- COVER PAGE -->
<div class="page cover-page">
  <div class="cover-header">
    <div class="cover-logo">
      <div class="cover-logo-icon">V</div>
      <div>
        <div class="cover-logo-text">VEXIM</div>
        <div class="cover-logo-sub">Compliance AI</div>
      </div>
    </div>
    <div class="cover-badge">CONFIDENTIAL</div>
  </div>

  <div style="margin-top: 20px;">
    <div class="cover-title">${L.coverTitle}</div>
    <div class="cover-subtitle">${escapeHtml(report.product_name || L.defaultProduct)}</div>

    <div class="cover-meta" style="margin-top: 32px;">
      <div class="cover-meta-item">
        <div class="cover-meta-label">${L.reportId}</div>
        <div class="cover-meta-value">${escapeHtml(report.id.slice(0, 8).toUpperCase())}</div>
      </div>
      <div class="cover-meta-item">
        <div class="cover-meta-label">${L.dateCreated}</div>
        <div class="cover-meta-value">${formatDate(generatedAt, lang)}</div>
      </div>
      <div class="cover-meta-item">
        <div class="cover-meta-label">${L.result}</div>
        <div class="cover-meta-value" style="color: ${resultColor}; font-weight: 700;">${resultLabel}</div>
      </div>
      <div class="cover-meta-item">
        <div class="cover-meta-label">${L.riskScore}</div>
        <div class="cover-meta-value" style="color: ${getRiskColor(riskScore)}; font-weight: 700;">${riskScore.toFixed(1)} / 10</div>
      </div>
    </div>

    <!-- Quick Summary -->
    <div style="margin-top: 32px; padding: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">
      <div style="font-size: 11px; font-weight: 700; color: #0f172a; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px;">${L.quickSummary}</div>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 16px;">
        <div style="text-align: center;">
          <div style="font-size: 24px; font-weight: 800; color: #dc2626;">${criticalCount}</div>
          <div style="font-size: 9px; color: #64748b; text-transform: uppercase;">${L.critical}</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 24px; font-weight: 800; color: #f59e0b;">${warningCount}</div>
          <div style="font-size: 9px; color: #64748b; text-transform: uppercase;">${L.warning}</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 24px; font-weight: 800; color: #2563eb;">${infoCount}</div>
          <div style="font-size: 9px; color: #64748b; text-transform: uppercase;">${L.info}</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 24px; font-weight: 800; color: #6366f1;">${totalCitations}</div>
          <div style="font-size: 9px; color: #64748b; text-transform: uppercase;">${L.cfrCitations}</div>
        </div>
      </div>
      ${sortedViolations.length > 0 ? `
      <div style="border-top: 1px solid #e2e8f0; padding-top: 12px;">
        <div style="font-size: 9px; font-weight: 600; color: #64748b; margin-bottom: 8px; text-transform: uppercase;">${L.mainReasons}</div>
        ${sortedViolations.slice(0, 3).map(v => `
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: ${v.severity === 'critical' ? '#dc2626' : v.severity === 'warning' ? '#f59e0b' : '#2563eb'};"></span>
          <span style="font-size: 10px; color: #334155;">${escapeHtml(translateCategory(v.category, L))}</span>
        </div>`).join('')}
      </div>` : ''}
    </div>
  </div>

  <div class="cover-footer">
    <div>${companyInfo.name} | ${companyInfo.website}</div>
    <div>${L.generatedBy}: ${escapeHtml(generatedBy)}</div>
  </div>
</div>

<!-- EXECUTIVE SUMMARY PAGE -->
<div class="page content-page page-break">
  <div class="page-header">
    <div class="page-header-left">
      <div class="page-header-logo">V</div>
      <div class="page-header-brand">VEXIM Compliance AI</div>
    </div>
    <div class="page-header-right">
      ${L.reportId} ${escapeHtml(report.id.slice(0, 8).toUpperCase())}<br/>
      ${formatDate(generatedAt, lang)}
    </div>
  </div>

  <div class="section">
    <div class="section-title"><span class="section-number">01</span> ${L.overview}</div>
    <div class="exec-grid">
      <div class="exec-card"><div class="exec-card-value" style="color: #DC2626">${criticalCount}</div><div class="exec-card-label">${L.critical}</div></div>
      <div class="exec-card"><div class="exec-card-value" style="color: #F59E0B">${warningCount}</div><div class="exec-card-label">${L.warning}</div></div>
      <div class="exec-card"><div class="exec-card-value" style="color: #2563eb">${infoCount}</div><div class="exec-card-label">${L.info}</div></div>
      <div class="exec-card"><div class="exec-card-value" style="color: #6366f1">${totalCitations}</div><div class="exec-card-label">${L.cfrCitations}</div></div>
    </div>

    <div class="risk-section">
      <div class="risk-gauge">
        <div class="risk-score-circle" style="background: ${getRiskColor(riskScore)}">${riskScore.toFixed(1)}</div>
        <div class="risk-label" style="color: ${getRiskColor(riskScore)}">${getRiskLabel(riskScore, L)}</div>
        <div style="font-size: 8px; color: #94a3b8; margin-top: 4px;">${L.riskLevel}</div>
      </div>
      <div class="risk-details">
        <h4>${L.overallAssessment}</h4>
        <p>${report.risk_assessment || defaultAssessment}</p>
        <div class="risk-bar-container">
          <div class="risk-bar-label">${L.currentRisk}</div>
          <div class="risk-bar"><div class="risk-bar-fill" style="width: ${riskScore * 10}%; background: ${getRiskColor(riskScore)}"></div></div>
          <div class="risk-bar-value" style="color: ${getRiskColor(riskScore)}">${riskScore.toFixed(1)}</div>
        </div>
        <div class="risk-bar-container">
          <div class="risk-bar-label">${L.afterFix}</div>
          <div class="risk-bar"><div class="risk-bar-fill" style="width: ${projectedRisk * 10}%; background: ${getRiskColor(projectedRisk)}"></div></div>
          <div class="risk-bar-value" style="color: ${getRiskColor(projectedRisk)}">${projectedRisk.toFixed(1)}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Product Information -->
  <div class="section">
    <div class="section-title"><span class="section-number">02</span> ${L.productInfo}</div>
    <table class="info-table">
      ${report.product_name ? `<tr><td>${L.productName}</td><td>${escapeHtml(report.product_name)}</td></tr>` : ''}
      ${report.brand_name ? `<tr><td>${L.brandName}</td><td>${escapeHtml(report.brand_name)}</td></tr>` : ''}
      ${report.product_category ? `<tr><td>${L.category}</td><td>${escapeHtml(report.product_category)}</td></tr>` : ''}
      ${report.product_type ? `<tr><td>${L.productType}</td><td>${escapeHtml(report.product_type)}</td></tr>` : ''}
      ${report.packaging_format ? `<tr><td>${L.packageFormat}</td><td>${escapeHtml(report.packaging_format)}</td></tr>` : ''}
      ${report.net_content ? `<tr><td>${L.netContent}</td><td>${report.net_content.value} ${report.net_content.unit}</td></tr>` : ''}
      ${report.pdp_area_square_inches ? `<tr><td>${L.pdpArea}</td><td>${report.pdp_area_square_inches.toFixed(2)} sq in</td></tr>` : ''}
      ${report.manufacturer_info?.company_name ? `<tr><td>${L.manufacturer}</td><td>${escapeHtml(report.manufacturer_info.company_name)}</td></tr>` : ''}
      ${report.manufacturer_info?.country_of_origin ? `<tr><td>${L.origin}</td><td>${escapeHtml(report.manufacturer_info.country_of_origin)}</td></tr>` : ''}
      ${report.target_market ? `<tr><td>${L.targetMarket}</td><td>${escapeHtml(report.target_market)}</td></tr>` : ''}
      ${report.detected_languages && report.detected_languages.length > 0 ? `<tr><td>${L.detectedLangs}</td><td>${report.detected_languages.map((l: string) => escapeHtml(l)).join(', ')}</td></tr>` : ''}
      <tr><td>${L.analysisDate}</td><td>${formatDate(report.created_at, lang)}</td></tr>
      <tr><td>${L.aiConfidence}</td><td>${report.ocr_confidence ? Math.round(report.ocr_confidence * 100) + '%' : 'N/A'}</td></tr>
    </table>
  </div>

  ${report.allergen_declaration ? `
  <div class="section">
    <div class="section-title"><span class="section-number">03</span> ${L.allergenDeclaration}</div>
    <div style="background: #FEF3C7; border: 1px solid #FBBF24; border-radius: 8px; padding: 14px; font-size: 10px; color: #92400E;">
      <strong>${L.allergens}:</strong> ${escapeHtml(report.allergen_declaration)}
    </div>
  </div>` : ''}

  ${report.ingredient_list ? `
  <div class="section no-break">
    <div class="section-title"><span class="section-number">${report.allergen_declaration ? '03a' : '03'}</span> ${L.ingredientList}</div>
    <div class="data-box">
      <div class="data-box-label">${L.ingredientDetected}</div>
      ${escapeHtml(report.ingredient_list)}
    </div>
  </div>` : ''}

  ${report.nutrition_facts && !isCosmetic ? `
  <div class="section no-break">
    <div class="section-title"><span class="section-number">${report.allergen_declaration ? (report.ingredient_list ? '03b' : '03a') : (report.ingredient_list ? '03a' : '03')}</span> ${L.nutritionInfo}</div>
    <div class="data-box">
      <div class="data-box-label">${L.nutritionDetected}</div>
      <table class="info-table" style="margin: 0;">
        ${report.nutrition_facts.servingSize ? `<tr><td>${L.servingSize}</td><td>${escapeHtml(report.nutrition_facts.servingSize)}</td></tr>` : ''}
        ${report.nutrition_facts.servingsPerContainer ? `<tr><td>${L.servingsPerContainer}</td><td>${escapeHtml(String(report.nutrition_facts.servingsPerContainer))}</td></tr>` : ''}
        ${report.nutrition_facts.calories !== undefined ? `<tr><td>${L.calories}</td><td>${report.nutrition_facts.calories}</td></tr>` : ''}
        ${report.nutrition_facts.totalFat ? `<tr><td>${L.totalFat}</td><td>${escapeHtml(report.nutrition_facts.totalFat)}</td></tr>` : ''}
        ${report.nutrition_facts.saturatedFat ? `<tr><td>${L.saturatedFat}</td><td>${escapeHtml(report.nutrition_facts.saturatedFat)}</td></tr>` : ''}
        ${report.nutrition_facts.transFat ? `<tr><td>${L.transFat}</td><td>${escapeHtml(report.nutrition_facts.transFat)}</td></tr>` : ''}
        ${report.nutrition_facts.cholesterol ? `<tr><td>${L.cholesterol}</td><td>${escapeHtml(report.nutrition_facts.cholesterol)}</td></tr>` : ''}
        ${report.nutrition_facts.sodium ? `<tr><td>${L.sodium}</td><td>${escapeHtml(report.nutrition_facts.sodium)}</td></tr>` : ''}
        ${report.nutrition_facts.totalCarbohydrate ? `<tr><td>${L.totalCarb}</td><td>${escapeHtml(report.nutrition_facts.totalCarbohydrate)}</td></tr>` : ''}
        ${report.nutrition_facts.dietaryFiber ? `<tr><td>${L.dietaryFiber}</td><td>${escapeHtml(report.nutrition_facts.dietaryFiber)}</td></tr>` : ''}
        ${report.nutrition_facts.totalSugars ? `<tr><td>${L.totalSugars}</td><td>${escapeHtml(report.nutrition_facts.totalSugars)}</td></tr>` : ''}
        ${report.nutrition_facts.addedSugars ? `<tr><td>${L.addedSugars}</td><td>${escapeHtml(report.nutrition_facts.addedSugars)}</td></tr>` : ''}
        ${report.nutrition_facts.protein ? `<tr><td>${L.protein}</td><td>${escapeHtml(report.nutrition_facts.protein)}</td></tr>` : ''}
        ${report.nutrition_facts.vitaminD ? `<tr><td>${L.vitaminD}</td><td>${escapeHtml(report.nutrition_facts.vitaminD)}</td></tr>` : ''}
        ${report.nutrition_facts.calcium ? `<tr><td>${L.calcium}</td><td>${escapeHtml(report.nutrition_facts.calcium)}</td></tr>` : ''}
        ${report.nutrition_facts.iron ? `<tr><td>${L.iron}</td><td>${escapeHtml(report.nutrition_facts.iron)}</td></tr>` : ''}
        ${report.nutrition_facts.potassium ? `<tr><td>${L.potassium}</td><td>${escapeHtml(report.nutrition_facts.potassium)}</td></tr>` : ''}
      </table>
    </div>
  </div>` : ''}
</div>

<!-- FINDINGS PAGES -->
<div class="page content-page page-break">
  <div class="page-header">
    <div class="page-header-left"><div class="page-header-logo">V</div><div class="page-header-brand">VEXIM Compliance AI</div></div>
    <div class="page-header-right">${L.reportId} ${escapeHtml(report.id.slice(0, 8).toUpperCase())}<br/>${formatDate(generatedAt, lang)}</div>
  </div>

  <div class="section">
    <div class="section-title"><span class="section-number">04</span> ${L.findingsDetail}</div>
    ${sortedViolations.length === 0 ? `
      <div style="text-align: center; padding: 40px; color: #16a34a;">
        <div style="font-size: 48px; margin-bottom: 12px;">&#10003;</div>
        <div style="font-size: 16px; font-weight: 700;">${L.noViolations}</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 8px;">${L.noViolationsDesc}</div>
      </div>
    ` : sortedViolations.map((v, i) => {
      const colors = getSeverityColor(v.severity)
      return `
      <div class="violation-card no-break" style="border-color: ${colors.border}; background: ${colors.bg};">
        <div class="violation-header">
          <div class="violation-title" style="color: ${colors.text}">${i + 1}. ${escapeHtml(translateCategory(v.category, L))}</div>
          <span class="severity-badge" style="background: ${colors.text}; color: white;">${getSeverityLabel(v.severity, L)}</span>
        </div>
        <div class="violation-description">${escapeHtml(v.description)}</div>
        ${v.regulation_reference ? `
        <div class="violation-box" style="border-left: 3px solid ${colors.border};">
          <div class="violation-box-label">${L.legalBasis}</div>
          <div class="violation-box-value" style="font-family: monospace; color: #2563eb;">${escapeHtml(v.regulation_reference)}</div>
          ${v.legal_basis ? `<div class="violation-box-value" style="margin-top: 4px;">${escapeHtml(v.legal_basis)}</div>` : ''}
        </div>` : ''}
        ${v.suggested_fix ? `
        <div class="violation-box" style="background: rgba(34, 197, 94, 0.08); border-left: 3px solid #22c55e;">
          <div class="violation-box-label" style="color: #16a34a;">${L.fixGuidance}</div>
          <div class="violation-box-value">${escapeHtml(v.suggested_fix)}</div>
        </div>` : ''}
        ${v.enforcement_context ? `
        <div class="violation-box" style="background: rgba(239, 68, 68, 0.05); border-left: 3px solid #ef4444;">
          <div class="violation-box-label" style="color: #dc2626;">${L.enforcementHistory}</div>
          <div class="violation-box-value">${escapeHtml(v.enforcement_context)}</div>
        </div>` : ''}
        <div class="violation-meta">
          ${v.confidence_score !== undefined ? `<span>${L.aiConfidenceLabel}: ${Math.round(v.confidence_score * 100)}%</span>` : ''}
          ${v.risk_score !== undefined ? `<span>${L.riskScoreLabel}: ${v.risk_score.toFixed(1)}/10</span>` : ''}
          ${v.enforcement_frequency ? `<span>${L.enforcementFreq}: ${v.enforcement_frequency}x</span>` : ''}
          ${v.citations?.length ? `<span>${L.citationsLabel}: ${v.citations.length}</span>` : ''}
        </div>
        ${v.citations && v.citations.length > 0 ? `
        <table class="citations-table" style="margin-top: 12px;">
          <thead><tr><th>${L.cfrSection}</th><th>${L.citationContent}</th><th>${L.source}</th><th>${L.relevance}</th></tr></thead>
          <tbody>
            ${v.citations.map((c: Citation) => `
            <tr>
              <td style="font-family: monospace; white-space: nowrap;">${escapeHtml(c.section)}</td>
              <td>${escapeHtml(c.text.slice(0, 200))}${c.text.length > 200 ? '...' : ''}</td>
              <td>${escapeHtml(c.source)}</td>
              <td><span class="relevance-bar"><span class="relevance-bar-fill" style="width: ${Math.round(c.relevance_score * 100)}%"></span></span>${Math.round(c.relevance_score * 100)}%</td>
            </tr>`).join('')}
          </tbody>
        </table>` : ''}
      </div>`
    }).join('')}
  </div>
</div>

${importAlertViolations.length > 0 ? `
<!-- IMPORT ALERT PAGE -->
<div class="page content-page page-break">
  <div class="page-header">
    <div class="page-header-left"><div class="page-header-logo">V</div><div class="page-header-brand">VEXIM Compliance AI</div></div>
    <div class="page-header-right">${L.reportId} ${escapeHtml(report.id.slice(0, 8).toUpperCase())}<br/>${formatDate(generatedAt, lang)}</div>
  </div>
  <div class="section">
    <div class="section-title"><span class="section-number">05</span> ${L.importAlerts}</div>
    <div class="port-warning" style="background: #FEF3C7; border-left-color: #dc2626; margin-bottom: 20px;">
      <div class="port-warning-label" style="color: #dc2626;">${L.portRiskLabel}</div>
      ${L.portRiskDesc}
    </div>
    ${importAlertViolations.map((ia, i) => {
      const isEntityMatch = ia.severity === 'critical'
      return `
    <div class="violation-card no-break" style="border-color: ${isEntityMatch ? '#f87171' : '#fbbf24'}; background: ${isEntityMatch ? '#FEE2E2' : '#FEF3C7'};">
      <div class="violation-header">
        <div class="violation-title" style="color: ${isEntityMatch ? '#991B1B' : '#92400E'}">${i + 1}. ${escapeHtml(translateCategory(ia.category, L))}</div>
        <span class="severity-badge" style="background: ${isEntityMatch ? '#DC2626' : '#F59E0B'}; color: white;">${isEntityMatch ? L.dwpeRedList : L.categoryRisk}</span>
      </div>
      <div class="violation-description">${escapeHtml(ia.description)}</div>
      ${ia.regulation_reference ? `
      <div class="violation-box" style="border-left: 3px solid ${isEntityMatch ? '#f87171' : '#fbbf24'};">
        <div class="violation-box-label">${L.importAlertRef}</div>
        <div class="violation-box-value" style="font-family: monospace; color: #2563eb;">${escapeHtml(ia.regulation_reference)}</div>
        ${ia.import_alert_number ? `<div class="violation-box-value" style="margin-top: 4px; font-size: 9px;"><a href="https://www.accessdata.fda.gov/cms_ia/importalert_${escapeHtml(ia.import_alert_number.replace(/-/g, ''))}.html" style="color: #2563eb;">${L.viewOnFda} &rarr;</a></div>` : ''}
      </div>` : ''}
      ${ia.suggested_fix ? `
      <div class="violation-box" style="background: rgba(34, 197, 94, 0.08); border-left: 3px solid #22c55e;">
        <div class="violation-box-label" style="color: #16a34a;">${L.remediationSteps}</div>
        <div class="violation-box-value">${escapeHtml(ia.suggested_fix)}</div>
      </div>` : ''}
      <div class="violation-meta">
        <span>${L.matchConfidence}: ${ia.confidence_score !== undefined ? Math.round(ia.confidence_score * 100) + '%' : 'N/A'}</span>
        <span style="color: #64748b; font-style: italic;">${L.referenceOnly}</span>
      </div>
    </div>`
    }).join('')}
  </div>
</div>` : ''}

${((report.geometry_violations && report.geometry_violations.length > 0) ||
  (report.contrast_violations && report.contrast_violations.length > 0) ||
  (report.multilanguage_issues && report.multilanguage_issues.length > 0)) ? `
<!-- TECHNICAL CHECKS PAGE -->
<div class="page content-page page-break">
  <div class="page-header">
    <div class="page-header-left"><div class="page-header-logo">V</div><div class="page-header-brand">VEXIM Compliance AI</div></div>
    <div class="page-header-right">${L.reportId} ${escapeHtml(report.id.slice(0, 8).toUpperCase())}<br/>${formatDate(generatedAt, lang)}</div>
  </div>
  <div class="section">
    <div class="section-title"><span class="section-number">${importAlertViolations.length > 0 ? '05a' : '05'}</span> ${L.technicalChecks}</div>
    <div class="tech-grid">
      ${report.geometry_violations && report.geometry_violations.length > 0 ? `
      <div class="tech-card">
        <div class="tech-card-title">${L.geometryLayout}<span class="tech-card-badge">${report.geometry_violations.length} ${L.issueCount}</span></div>
        ${report.geometry_violations.map((gv: any) => `
        <div class="tech-item">
          <div class="tech-item-header">
            <span class="tech-item-type">${escapeHtml((gv.type || '').replace(/_/g, ' '))}</span>
            <span class="severity-badge" style="background: ${getSeverityColor(gv.severity).text}; color: white; font-size: 7px; padding: 2px 6px;">${getSeverityLabel(gv.severity || '', L)}</span>
          </div>
          <div class="tech-item-desc">${escapeHtml(gv.description || '')}</div>
          ${gv.regulation ? `<div style="font-family: monospace; font-size: 8px; color: #2563eb; margin-top: 3px;">${escapeHtml(gv.regulation)}</div>` : ''}
          ${(gv.expected || gv.actual) ? `
          <div class="tech-item-values">
            ${gv.expected ? `<span style="color: #16a34a;">${L.expected}: ${escapeHtml(String(gv.expected))}</span>` : ''}
            ${gv.actual ? `<span style="color: #dc2626;">${L.actual}: ${escapeHtml(String(gv.actual))}</span>` : ''}
          </div>` : ''}
        </div>`).join('')}
      </div>` : ''}
      ${report.contrast_violations && report.contrast_violations.length > 0 ? `
      <div class="tech-card">
        <div class="tech-card-title">${L.colorContrast}<span class="tech-card-badge">${report.contrast_violations.length} ${L.issueCount}</span></div>
        ${report.contrast_violations.map((cv: any) => `
        <div class="tech-item">
          <div class="tech-item-desc">${escapeHtml(cv.description || '')}</div>
          ${cv.ratio !== undefined ? `
          <div style="margin-top: 4px; font-size: 9px;">
            ${L.contrastRatio}: <strong style="color: ${cv.ratio >= 4.5 ? '#16a34a' : cv.ratio >= 3 ? '#f59e0b' : '#dc2626'}">${cv.ratio.toFixed(2)}:1</strong>
            <span style="color: #94a3b8;">(${L.minimum} 4.5:1)</span>
          </div>` : ''}
          ${cv.colors ? `
          <div style="margin-top: 4px; font-size: 8px; display: flex; align-items: center; gap: 8px;">
            <span><span class="color-swatch" style="background: ${cv.colors.foreground};"></span>${escapeHtml(cv.colors.foreground)}</span>
            <span style="color: #94a3b8;">${L.on}</span>
            <span><span class="color-swatch" style="background: ${cv.colors.background};"></span>${escapeHtml(cv.colors.background)}</span>
          </div>` : ''}
          ${cv.recommendation ? `<div style="margin-top: 4px; font-size: 8px; color: #16a34a;">${escapeHtml(cv.recommendation)}</div>` : ''}
        </div>`).join('')}
      </div>` : ''}
    </div>
    ${report.multilanguage_issues && report.multilanguage_issues.length > 0 ? `
    <div class="tech-card" style="margin-bottom: 16px;">
      <div class="tech-card-title">${L.multiLangCompliance}<span class="tech-card-badge">${report.multilanguage_issues.length} ${L.checks}</span></div>
      ${report.multilanguage_issues.map((ml: any) => `
      <div class="tech-item">
        <div class="tech-item-desc">${escapeHtml(ml.description || '')}</div>
        ${ml.detectedLanguages && ml.detectedLanguages.length > 0 ? `
        <div style="margin-top: 4px; font-size: 8px;">${L.detected}: ${ml.detectedLanguages.map((l: string) => `<span style="background: #f1f5f9; padding: 1px 6px; border-radius: 3px; margin-right: 4px;">${escapeHtml(l)}</span>`).join('')}</div>` : ''}
        ${ml.missingFields && ml.missingFields.length > 0 ? `
        <div style="margin-top: 4px; font-size: 8px; color: #dc2626;">${L.missingTranslations}: ${ml.missingFields.map((f: string) => escapeHtml(f)).join(', ')}</div>` : ''}
      </div>`).join('')}
    </div>` : ''}
  </div>
</div>` : ''}

${report.commercial_summary ? `
<!-- COMMERCIAL SUMMARY PAGE -->
<div class="page content-page page-break">
  <div class="page-header">
    <div class="page-header-left"><div class="page-header-logo">V</div><div class="page-header-brand">VEXIM Compliance AI</div></div>
    <div class="page-header-right">${L.reportId} ${escapeHtml(report.id.slice(0, 8).toUpperCase())}<br/>${formatDate(generatedAt, lang)}</div>
  </div>
  <div class="section">
    <div class="section-title"><span class="section-number">${importAlertViolations.length > 0 ? '05b' : '05a'}</span> ${L.commercialSummary}</div>
    <div class="summary-section">
      ${report.commercial_summary.split('\n').map((line: string) => {
        if (line.startsWith('### ')) {
          const headingText = line.replace(/^### /, '').replace(/\*+/g, '').trim()
          let headingColor = '#334155'; let headingBg = 'transparent'; let headingBorder = 'none'
          if (headingText.includes('NGHIÊM TRỌNG') || headingText.includes('LỖI NGHIÊM TRỌNG') || headingText.includes('CRITICAL')) {
            headingColor = '#991B1B'; headingBg = '#FEE2E2'; headingBorder = '2px solid #F87171'
          } else if (headingText.includes('CẢNH BÁO') || headingText.includes('WARNING')) {
            headingColor = '#92400E'; headingBg = '#FEF3C7'; headingBorder = '2px solid #FBBF24'
          } else if (headingText.includes('THÔNG TIN') || headingText.includes('INFO')) {
            headingColor = '#1E40AF'; headingBg = '#DBEAFE'; headingBorder = '2px solid #60A5FA'
          } else if (headingText.includes('LỜI KHUYÊN') || headingText.includes('ADVICE')) {
            headingColor = '#065F46'; headingBg = '#D1FAE5'; headingBorder = '2px solid #34D399'
          }
          return `<div class="summary-subheading" style="color: ${headingColor}; background: ${headingBg}; border: ${headingBorder}; border-radius: 6px; padding: 8px 12px; margin-top: 16px;">${escapeHtml(headingText)}</div>`
        }
        if (line.startsWith('## ')) return `<div class="summary-heading">${escapeHtml(line.replace(/^## /, '').replace(/\*+/g, ''))}</div>`
        if (line.startsWith('**') && line.endsWith('**')) return `<div class="summary-text" style="font-weight: 600;">${escapeHtml(line.replace(/\*\*/g, ''))}</div>`
        if (line.startsWith('- ')) return `<div class="summary-list-item">${escapeHtml(line.replace(/^- /, '').replace(/\*+/g, ''))}</div>`
        if (line.trim() === '') return ''
        return `<div class="summary-text">${escapeHtml(line.replace(/\*+/g, ''))}</div>`
      }).join('')}
    </div>
  </div>
</div>` : ''}

<!-- EXPERT RECOMMENDATIONS & SIGNATURE PAGE -->
<div class="page content-page page-break">
  <div class="page-header">
    <div class="page-header-left"><div class="page-header-logo">V</div><div class="page-header-brand">VEXIM Compliance AI</div></div>
    <div class="page-header-right">${L.reportId} ${escapeHtml(report.id.slice(0, 8).toUpperCase())}<br/>${formatDate(generatedAt, lang)}</div>
  </div>

  <div class="section">
    <div class="section-title"><span class="section-number">06</span> ${L.expertRecommendations}</div>
    ${report.expert_tips && report.expert_tips.length > 0 ? `
      ${report.expert_tips.map((tip: string, idx: number) => `
      <div class="expert-tip">
        <div class="expert-tip-label">${L.recommendation} ${idx + 1}</div>
        ${escapeHtml(tip)}
      </div>`).join('')}
    ` : `
      <div class="expert-tip">
        <div class="expert-tip-label">${L.veximAdvice}</div>
        ${defaultExpertTip}
      </div>
    `}

    ${criticalCount > 0 ? `
    <div class="port-warning">
      <div class="port-warning-label">${L.portWarning}</div>
      ${L.portWarningDesc}
    </div>` : ''}

    ${report.review_notes ? `
    <div class="expert-tip">
      <div class="expert-tip-label">${L.expertReviewNotes}</div>
      ${escapeHtml(report.review_notes)}
    </div>` : ''}
  </div>

  <!-- Action Items -->
  <div class="section">
    <div class="section-title"><span class="section-number">07</span> ${L.actionItems}</div>
    <table class="citations-table">
      <thead><tr><th>#</th><th>${L.actionSeverity}</th><th>${L.actionIssue}</th><th>${L.actionRequired}</th></tr></thead>
      <tbody>
        ${sortedViolations.map((v, i) => `
        <tr>
          <td>${i + 1}</td>
          <td><span class="severity-badge" style="background: ${getSeverityColor(v.severity).text}; color: white; font-size: 7px; padding: 2px 6px;">${getSeverityLabel(v.severity, L)}</span></td>
          <td>${escapeHtml(translateCategory(v.category, L))}</td>
          <td>${escapeHtml(v.suggested_fix?.slice(0, 120) || L.seeDetails)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <!-- Verification Status -->
  <div style="display: flex; justify-content: center; margin: 20px 0;">
    ${report.status === 'verified'
      ? `<div class="verification-badge verified"><span style="font-size: 14px;">&#10003;</span>${L.reportVerified}</div>`
      : `<div class="verification-badge pending"><span style="font-size: 14px;">&#9888;</span>${L.pendingVerification}</div>`
    }
  </div>

  ${report.status !== 'verified' ? `
  <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); border-radius: 12px; padding: 24px; margin: 24px 0; color: white; text-align: center;">
    <div style="font-size: 16px; font-weight: 700; margin-bottom: 8px;">${L.upgradeTitle}</div>
    <div style="font-size: 11px; opacity: 0.9; margin-bottom: 16px; line-height: 1.6;">${L.upgradeDesc}<br/>${L.upgradeDesc2}</div>
    <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;">
      <a href="https://vexim.global/pricing" style="display: inline-block; background: white; color: #1e40af; padding: 12px 24px; border-radius: 8px; font-size: 12px; font-weight: 700; text-decoration: none;">${L.requestVerification}</a>
      <a href="mailto:support@vexim.global" style="display: inline-block; background: rgba(255,255,255,0.2); color: white; padding: 12px 24px; border-radius: 8px; font-size: 12px; font-weight: 600; text-decoration: none; border: 1px solid rgba(255,255,255,0.3);">${L.contactConsulting}</a>
    </div>
    <div style="margin-top: 12px; font-size: 10px; opacity: 0.8;">Hotline: +1 (555) 123-4567 | Email: support@vexim.global</div>
  </div>` : ''}

  <!-- Signature Section -->
  <div class="signature-section">
    <div style="font-size: 11px; font-weight: 600; color: #334155; margin-bottom: 4px;">${L.certification}</div>
    <div style="font-size: 9px; color: #64748b; margin-bottom: 16px;">
      ${L.certificationDesc} ${report.status === 'verified' ? L.verifiedByExpert : L.pendingExpertVerification}.
      ${L.certificationDesc2}
    </div>
    <div class="signature-grid">
      <div class="signature-box">
        <div class="signature-name">${escapeHtml(generatedBy)}</div>
        <div class="signature-title">${report.status === 'verified' ? L.fdaComplianceExpert : L.veximAiSystem}</div>
        <div class="signature-title">${formatDate(generatedAt, lang)}</div>
      </div>
      <div class="signature-box">
        <div class="signature-name">${companyInfo.name}</div>
        <div class="signature-title">${L.certId}: ${companyInfo.certificationId}</div>
        <div class="signature-title">${companyInfo.website}</div>
      </div>
    </div>
  </div>

  <!-- Disclaimer -->
  <div class="disclaimer">
    <div class="disclaimer-title">${L.disclaimer}</div>
    <p>${L.disclaimerText}</p>
  </div>
</div>

<div class="watermark">VEXIM</div>

</div><!-- End page-content-wrapper -->

</body>
</html>`
}
