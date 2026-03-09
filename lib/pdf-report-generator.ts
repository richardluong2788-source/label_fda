import type { AuditReport, Violation, Citation } from './types'

// PDF generation using pure server-side HTML template
// This generates a professional FDA compliance report HTML that is converted to PDF

type SupportedLang = 'vi' | 'en'

interface ExpertReviewData {
  id: string
  status: string
  created_at: string
  expert_summary?: string
  violation_reviews?: Array<{
    violation_index: number
    confirmed: boolean
    wording_fix?: string
    legal_note?: string
  }>
  recommended_actions?: Array<{
    action: string
    priority: string
    cfr_reference?: string
  }>
  sign_off_name?: string
  sign_off_at?: string
}

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
  expertReview?: ExpertReviewData | null
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
    overallAssessment: 'Đánh Giá Tổng Thể Từ Vexim Global AI',
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
  contrastDesignNote: 'Đây là gợi ý thiết kế để cải thiện khả năng đọc. FDA chỉ yêu cầu văn bản "dễ nhận biết" (§101.2), không quy định tỷ lệ tương phản cụ thể.',
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
    actionPriority: 'Ưu tiên',
    seeDetails: 'Xem chi tiết',
    reportVerified: 'Báo cáo đã xác minh bởi chuyên gia',
    pendingVerification: 'Chờ xác minh chuyên gia',
    upgradeTitle: 'Nâng cao độ tin cậy của báo cáo',
    upgradeDesc: 'Để chuyên gia tuân thủ FDA có năng lực đánh giá và xác minh báo cáo này.',
    upgradeDesc2: 'Xác minh chuyên gia tăng độ tin cậy và cung cấp khuyến nghị chi tiết hơn.',
    requestVerification: 'Yêu cầu xác minh chuyên gia',
    contactConsulting: 'Liên hệ tư vấn',
    certification: 'Chứng nhận',
    certificationDesc: 'Báo cáo này được tạo bởi AI Label Pro (Vexim Global) và',
    verifiedByExpert: 'đã được xác minh bởi chuyên gia tuân thủ FDA',
    pendingExpertVerification: 'đang chờ xác minh chuyên gia',
    certificationDesc2: 'Các phát hiện dựa trên phân tích tự động nhãn đã gửi so với các quy định FDA hiện hành (21 CFR) và tiền lệ xử phạt.',
    fdaComplianceExpert: 'Chuyên gia tuân thủ FDA',
    veximAiSystem: 'Hệ thống phân tích AI Label Pro (Vexim Global)',
    certId: 'Mã chứng nhận',
    disclaimer: 'Tuyên bố miễn trừ trách nhiệm',
    disclaimerText: 'Báo cáo này được tạo theo 21 CFR đã sửa đổi ngày 1 tháng 4, 2025. Báo cáo có hiệu lực trong 12 tháng kể từ ngày phát hành; cần xem xét lại nếu quy định thay đổi. Báo cáo này chỉ bao gồm nhãn sản phẩm và KHÔNG cấu thành đánh giá về công thức sản phẩm, thực hành sản xuất (GMP), hay tuyên bố lâm sàng. Không nên sử dụng thay thế cho tư vấn với chuyên gia quản lý quy định FDA có trình độ. Các phát hiện Import Alert chỉ là tín hiệu rủi ro và không cấu thành vi phạm quy định hoặc trích dẫn pháp lý. Vexim Global không chịu trách nhiệm pháp lý cho bất kỳ quyết định nào được đưa ra dựa trên báo cáo này.',
    defaultRiskHigh: (score: string, critical: number) => `Nhãn sản phẩm có điểm rủi ro ${score}/10. Các vấn đề nghiêm trọng cần được khắc phục trước khi phân phối.`,
    defaultRiskLow: (score: string) => `Nhãn sản phẩm có điểm rủi ro ${score}/10. Không phát hiện vấn đề nghiêm trọng, nhưng cần cải thiện một số điểm.`,
    expertTipCritical: 'Nhãn sản phẩm này có các vấn đề tuân thủ FDA nghiêm trọng cần được khắc phục trước khi phân phối tại thị trường Hoa Kỳ. Không tuân thủ có thể dẫn đến Import Alert, hàng bị giữ tại cảng, hoặc Thư cảnh báo FDA.',
    expertTipWarning: 'Nhãn sản phẩm này đáp ứng yêu cầu FDA tối thiểu nhưng có các điểm cần cải thiện. Khắc phục các cảnh báo sẽ giảm rủi ro bị xử phạt và tăng niềm tin của người tiêu dùng.',
    expertTipPass: 'Nhãn sản phẩm này thể hiện sự tuân thủ FDA tốt. Tiếp tục theo dõi các cập nhật quy định và duy trì các tiêu chuẩn ghi nhãn hiện tại.',
    riskHigh: 'Cao',
    riskMedHigh: 'Trung bình - Cao',
    riskMed: 'Trung bình',
    riskLow: 'Thấp',
    sevCritical: 'NGHIÊM TRỌNG',
    sevWarning: 'CẢNH BÁO',
    sevInfo: 'THÔNG TIN',
    // New labels
    tableOfContents: 'Mục Lục',
    confidenceMetrics: 'Độ Tin Cậy Phân Tích',
    ocrConfidence: 'OCR (Đọc văn bản)',
    extractionConfidence: 'Trích xuất dữ liệu',
    legalConfidence: 'Phân tích pháp lý',
    healthClaims: 'Tuyên Bố Sức Khỏe',
    healthClaimsWarning: 'Tuyên bố bệnh bị cấm theo 21 CFR 101.93',
    specialClaims: 'Tuyên Bố Đặc Biệt',
    enforcementInsights: 'Xu Hướng Xử Phạt FDA',
    consequencesTitle: 'HẬU QUẢ NẾU KHÔNG KHẮC PHỤC',
    consequenceDetention: 'Giữ hàng tại cảng (DWPE)',
    consequenceDetentionDesc: 'Phí lưu container $150-500/ngày, phí trễ tàu',
    consequenceRelabeling: 'Chi phí dán nhãn lại',
    consequenceRelabelingDesc: 'In nhãn mới, dán lại tại Mỹ: $2,000-15,000',
    consequenceRecall: 'Thu hồi bắt buộc (Recall)',
    consequenceRecallDesc: 'Thu hồi toàn bộ sản phẩm: $10,000-500,000+',
    pageFooter: 'Tài liệu mật',
    priorityImmediate: 'NGAY LẬP TỨC',
    priorityHigh: 'CAO',
    priorityMedium: 'TRUNG BÌNH',
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
    productImages: 'Hình Ảnh Sản Phẩm',
    imageTypePdp: 'Mặt trước (PDP)',
    imageTypeNutrition: 'Bảng dinh dưỡng',
    imageTypeIngredients: 'Thành phần',
    imageTypeOther: 'Khác',
    // Expert Consultation Section
    expertConsultation: 'Tư Vấn Chuyên Gia Vexim',
    expertConsultationSubtitle: 'Đánh giá và hướng dẫn từ chuyên gia tuân thủ FDA',
    expertOverview: 'Tổng quan đánh giá chuyên gia',
    violationFixGuide: 'Hướng dẫn khắc phục từng vi phạm',
    violationConfirmed: 'Xác nhận - cần sửa',
    violationNotConfirmed: 'Không nghiêm trọng',
    suggestedWording: 'Văn bản đề xuất:',
    expertPriorityActions: 'Hành động ưu tiên',
    priorityUrgent: 'Khẩn cấp',
    signedOffBy: 'Ký xác nhận bởi',
    requestSentAt: 'Yêu cầu gửi lúc',
    resultsAvailable: 'Kết quả sẵn sàng',
    // Audit Scope
    auditScope: 'Phạm Vi Kiểm Tra',
    auditScopeRegulations: 'Quy định đã kiểm tra',
    auditScopePanels: 'Mặt nhãn đã xem xét',
    auditScopeImages: 'Hình ảnh đã phân tích',
    auditScopeOcrMethod: 'Phương pháp OCR',
    auditScopeReviewDate: 'Ngày kiểm tra',
    auditScopeCfrVersion: 'Phiên bản CFR',
    auditScopeCfrVersionValue: '21 CFR sửa đổi ngày 1 tháng 4, 2025',
    auditScopeOcrMethodValue: 'GPT-4o Vision (AI Vision Analysis)',
    auditScopePanelsValue: 'PDP (Principal Display Panel), Information Panel, Nutrition Facts Panel',
    // Multi-column NF
    multiColumnNF: 'Bảng Dinh Dưỡng Đa Cột',
    multiColumnNFDesc: 'Sản phẩm có nhiều biến thể — mỗi cột tương ứng một sản phẩm riêng biệt.',
    multiColumnVariant: 'Biến thể',
    multiColumnServingSize: 'Khẩu phần',
    // FDA Enforcement History
    fdaEnforcementHistory: 'Lịch Sử Xử Phạt FDA',
    warningLetters: 'Thư Cảnh Báo',
    recalls: 'Thu Hồi Sản Phẩm',
    importAlertsLabel: 'Cảnh Báo Nhập Khẩu',
    none: 'Không có',
    regulationsChecked: 'Quy Định Đã Kiểm Tra',
    overallAssessmentVexim: 'Đánh Giá Tổng Thể Từ Vexim Global',
    conclusionLabel: 'Kết Luận',
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
    overallAssessment: 'Overall Assessment by Vexim Global AI',
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
    referenceOnly: 'Reference only \u2014 not a legal violation',
    dwpeRedList: 'DWPE \u2014 Red List',
    categoryRisk: 'Category risk',
    technicalChecks: 'Technical & Visual Checks',
    geometryLayout: 'Geometry & Layout',
    issueCount: 'issues',
    expected: 'Required',
    actual: 'Actual',
colorContrast: 'Color Contrast',
  contrastDesignNote: 'This is a design suggestion to improve readability. FDA only requires text be "conspicuous" (§101.2) — no specific contrast ratio is mandated.',
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
    actionPriority: 'Priority',
    seeDetails: 'See details',
    reportVerified: 'Report verified by expert',
    pendingVerification: 'Pending expert verification',
    upgradeTitle: 'Enhance report confidence',
    upgradeDesc: 'Have a qualified FDA compliance expert review and verify this report.',
    upgradeDesc2: 'Expert verification increases confidence and provides more detailed recommendations.',
    requestVerification: 'Request expert verification',
    contactConsulting: 'Contact consulting',
    certification: 'Certification',
    certificationDesc: 'This report was generated by AI Label Pro (Vexim Global) and',
    verifiedByExpert: 'has been verified by an FDA compliance expert',
    pendingExpertVerification: 'is pending expert verification',
    certificationDesc2: 'Findings are based on automated analysis of the submitted label against current FDA regulations (21 CFR) and enforcement precedent.',
    fdaComplianceExpert: 'FDA Compliance Expert',
    veximAiSystem: 'AI Label Pro Analysis System (Vexim Global)',
    certId: 'Certification ID',
    disclaimer: 'Disclaimer',
    disclaimerText: 'Report generated against 21 CFR revised April 1, 2025. This report is valid for 12 months from issue date; re-review if regulations change. This report covers label artwork only and does NOT constitute review of product formulation, manufacturing practices (GMP), or clinical claims. It should not be used as a substitute for consultation with qualified FDA regulatory professionals. Import Alert findings are risk signals only and do not constitute regulatory violations or legal citations. Vexim Global bears no legal liability for any decisions made based on this report.',
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
    // New labels
    tableOfContents: 'Table of Contents',
    confidenceMetrics: 'Analysis Confidence',
    ocrConfidence: 'OCR (Text reading)',
    extractionConfidence: 'Data extraction',
    legalConfidence: 'Legal analysis',
    healthClaims: 'Health Claims',
    healthClaimsWarning: 'Prohibited disease claims under 21 CFR 101.93',
    specialClaims: 'Special Claims',
    enforcementInsights: 'FDA Enforcement Trends',
    consequencesTitle: 'CONSEQUENCES OF NON-COMPLIANCE',
    consequenceDetention: 'Port Detention (DWPE)',
    consequenceDetentionDesc: 'Container storage $150-500/day, demurrage fees',
    consequenceRelabeling: 'Relabeling Cost',
    consequenceRelabelingDesc: 'New labels, re-application in US: $2,000-15,000',
    consequenceRecall: 'Mandatory Recall',
    consequenceRecallDesc: 'Full product recall: $10,000-500,000+',
    pageFooter: 'Confidential',
    priorityImmediate: 'IMMEDIATE',
    priorityHigh: 'HIGH',
    priorityMedium: 'MEDIUM',
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
    productImages: 'Product Images',
    imageTypePdp: 'Front (PDP)',
    imageTypeNutrition: 'Nutrition Facts',
    imageTypeIngredients: 'Ingredients',
    imageTypeOther: 'Other',
    // Expert Consultation Section
    expertConsultation: 'Vexim Expert Consultation',
    expertConsultationSubtitle: 'Review and guidance from FDA compliance experts',
    expertOverview: 'Expert overview assessment',
    violationFixGuide: 'Fix guidance per violation',
    violationConfirmed: 'Confirmed - needs fix',
    violationNotConfirmed: 'Not serious',
    suggestedWording: 'Suggested wording:',
    expertPriorityActions: 'Priority actions',
    priorityUrgent: 'Urgent',
    signedOffBy: 'Signed off by',
    requestSentAt: 'Request sent at',
    resultsAvailable: 'Results available',
    // Audit Scope
    auditScope: 'Audit Scope',
    auditScopeRegulations: 'Regulations checked',
    auditScopePanels: 'Label panels reviewed',
    auditScopeImages: 'Images analyzed',
    auditScopeOcrMethod: 'OCR method',
    auditScopeReviewDate: 'Review date',
    auditScopeCfrVersion: 'CFR version',
    auditScopeCfrVersionValue: '21 CFR revised April 1, 2025',
    auditScopeOcrMethodValue: 'GPT-4o Vision (AI Vision Analysis)',
    auditScopePanelsValue: 'PDP (Principal Display Panel), Information Panel, Nutrition Facts Panel',
    // Multi-column NF
    multiColumnNF: 'Multi-Column Nutrition Facts',
    multiColumnNFDesc: 'Product contains multiple variants — each column represents a separate product.',
    multiColumnVariant: 'Variant',
    multiColumnServingSize: 'Serving Size',
    // FDA Enforcement History
    fdaEnforcementHistory: 'FDA Enforcement History',
    warningLetters: 'Warning Letters',
    recalls: 'Recalls',
    importAlertsLabel: 'Import Alerts',
    none: 'None',
    regulationsChecked: 'Regulations Checked',
    overallAssessmentVexim: 'Overall Assessment by Vexim Global',
    conclusionLabel: 'Conclusion',
  },
}

// ── Utilities ─────────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Formats a nutrition field value for display in the PDF.
 * Handles merged OCR strings like "0mg0", "11g14", "0.1mcg0"
 * Returns clean HTML like "11g <span>(14%)</span>"
 */
function formatNutrientValue(rawValue: any): string {
  if (rawValue == null) return '—'
  const str = String(rawValue)
  // Pattern: number + unit + number (merged DV) e.g. "0g0", "11g14", "630mg27"
  const mergedMatch = str.match(/^(\d+(?:\.\d+)?)\s*(mg|g|mcg|kcal|cal)\s*(\d+)$/i)
  if (mergedMatch) {
    const [, val, unit, dv] = mergedMatch
    return dv === '0'
      ? `${val}${unit} <span style="color:#94a3b8;font-size:8px;">(0%)</span>`
      : `${val}${unit} <span style="color:#94a3b8;font-size:8px;">(${dv}%)</span>`
  }
  return escapeHtml(str)
}

/** Convert markdown text to styled HTML. Handles ## / ### headings, **bold**, *italic*, - bullets, 1. numbered lists. */
function markdownToHtml(md: string | undefined | null): string {
  if (!md) return ''
  const lines = md.split('\n')
  const out: string[] = []
  let inUl = false
  let inOl = false

  const closeList = () => {
    if (inUl) { out.push('</ul>'); inUl = false }
    if (inOl) { out.push('</ol>'); inOl = false }
  }

  const inlineFmt = (t: string): string => {
    let s = escapeHtml(t)
    // **bold**
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // *italic*
    s = s.replace(/\*(.+?)\*/g, '<em>$1</em>')
    return s
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) { closeList(); continue }

    // ### subheading
    const h3 = line.match(/^###\s+(.+)/)
    if (h3) {
      closeList()
      const txt = h3[1].replace(/#+$/, '').trim()
      // Detect severity for color coding
      let style = 'color:#334155;'
      if (/NGHIÊM TRỌNG|CRITICAL|LỖI NGHIÊM TRỌNG/i.test(txt)) style = 'color:#991B1B;background:#FEE2E2;border:1px solid #F87171;border-radius:6px;padding:6px 10px;'
      else if (/CẢNH BÁO|WARNING/i.test(txt)) style = 'color:#92400E;background:#FEF3C7;border:1px solid #FBBF24;border-radius:6px;padding:6px 10px;'
      else if (/THÔNG TIN|INFO/i.test(txt)) style = 'color:#1E40AF;background:#DBEAFE;border:1px solid #60A5FA;border-radius:6px;padding:6px 10px;'
      else if (/LỜI KHUYÊN|ADVICE|KHUYẾN NGHỊ|RECOMMENDATION/i.test(txt)) style = 'color:#065F46;background:#D1FAE5;border:1px solid #34D399;border-radius:6px;padding:6px 10px;'
      out.push(`<div style="font-size:11px;font-weight:600;margin:12px 0 6px;${style}">${inlineFmt(txt)}</div>`)
      continue
    }

    // ## heading
    const h2 = line.match(/^##\s+(.+)/)
    if (h2) {
      closeList()
      out.push(`<div style="font-size:12px;font-weight:700;color:#0f172a;margin:14px 0 6px;">${inlineFmt(h2[1].replace(/#+$/, '').trim())}</div>`)
      continue
    }

    // # heading
    const h1 = line.match(/^#\s+(.+)/)
    if (h1) {
      closeList()
      out.push(`<div style="font-size:13px;font-weight:700;color:#0f172a;margin:14px 0 6px;">${inlineFmt(h1[1].replace(/#+$/, '').trim())}</div>`)
      continue
    }

    // - bullet
    const ul = line.match(/^[-*]\s+(.+)/)
    if (ul) {
      if (inOl) { out.push('</ol>'); inOl = false }
      if (!inUl) { out.push('<ul style="margin:4px 0 4px 16px;padding:0;list-style:disc;">'); inUl = true }
      out.push(`<li style="font-size:10px;color:#475569;line-height:1.6;margin-bottom:2px;">${inlineFmt(ul[1])}</li>`)
      continue
    }

    // 1. numbered
    const ol = line.match(/^\d+[.)]\s+(.+)/)
    if (ol) {
      if (inUl) { out.push('</ul>'); inUl = false }
      if (!inOl) { out.push('<ol style="margin:4px 0 4px 16px;padding:0;list-style:decimal;">'); inOl = true }
      out.push(`<li style="font-size:10px;color:#475569;line-height:1.6;margin-bottom:2px;">${inlineFmt(ol[1])}</li>`)
      continue
    }

    // Regular paragraph
    closeList()
    out.push(`<div style="font-size:10px;color:#475569;line-height:1.6;margin-bottom:4px;">${inlineFmt(line)}</div>`)
  }
  closeList()
  return out.join('\n')
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

function confidenceBar(label: string, value: number | undefined | null): string {
  if (value === undefined || value === null) return ''
  const pct = Math.round(value * 100)
  const color = pct >= 80 ? '#16a34a' : pct >= 60 ? '#f59e0b' : '#dc2626'
  return `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
      <div style="font-size:9px;color:#64748b;min-width:120px;">${label}</div>
      <div style="flex:1;height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:${color};border-radius:4px;"></div>
      </div>
      <div style="font-size:9px;font-weight:600;min-width:32px;text-align:right;color:${color};">${pct}%</div>
    </div>`
}

function translateImageType(type: string, L: Record<string, string>): string {
  const map: Record<string, string> = {
    pdp: L.imageTypePdp,
    nutrition: L.imageTypeNutrition,
    ingredients: L.imageTypeIngredients,
    other: L.imageTypeOther,
  }
  return map[type] || L.imageTypeOther
}

function pageHeader(L: Record<string, string>, reportId: string, dateStr: string): string {
  return `
  <div class="page-header">
    <div class="page-header-left">
      <div class="page-header-logo">V</div>
      <div class="page-header-brand">VEXIM Compliance AI</div>
    </div>
    <div class="page-header-right">
      ${L.reportId} ${escapeHtml(reportId)}<br/>${dateStr}
    </div>
  </div>`
}

// ── Main Generator ────────────────────────────────────────────────────

export function generatePDFReportHTML(data: PDFReportData): string {
  const { report, violations, generatedAt, generatedBy, companyInfo, lang = 'vi', expertReview } = data
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

  // ── Report Reference Number (VXG-[TYPE]-[YEAR]-[SEQ]) ────────────────
  // Format: VXG = Vexim Global, TYPE = FD/DS/CP/OTC, YEAR = year, SEQ = last 4 of ID
  const domainTypeCode = (() => {
    const cat = (report.product_category || report.product_type || '').toLowerCase()
    if (cat.includes('supplement') || cat.includes('vitamin') || cat.includes('thực phẩm chức năng')) return 'DS'
    if (cat.includes('cosmetic') || cat.includes('mỹ phẩm') || cat.includes('skincare')) return 'CP'
    if (cat.includes('otc') || cat.includes('drug') || cat.includes('thuốc')) return 'OTC'
    return 'FD' // Food (default)
  })()
  const reportYear = new Date(generatedAt).getFullYear()
  const reportSeq = report.id.slice(-4).toUpperCase()
  const reportRefNumber = `VXG-${domainTypeCode}-${reportYear}-${reportSeq}`

  const shortId = reportRefNumber
  const dateFormatted = formatDate(generatedAt, lang)

  // Data from report (with safe access)
  const healthClaims = (report as any).health_claims as string[] | undefined
  const specialClaims = report.special_claims || []
  const enforcementInsights = report.enforcement_insights || []

  // Dynamic section numbering
  let sectionNum = 0
  const nextSection = () => { sectionNum++; return String(sectionNum).padStart(2, '0') }

  // Table of Contents entries
  const tocEntries: { num: string; label: string }[] = []
  const toc = (label: string) => { const num = nextSection(); tocEntries.push({ num, label }); return num }

  // Pre-calculate section numbers
  const secOverview = toc(L.overview)
  const secProduct = toc(L.productInfo)
  const secAuditScope = toc(L.auditScope)
  const secFindings = toc(L.findingsDetail)
  const secImportAlerts = importAlertViolations.length > 0 ? toc(L.importAlerts) : null
  const hasTech = (report.geometry_violations && report.geometry_violations.length > 0) ||
    (report.contrast_violations && report.contrast_violations.length > 0) ||
    (report.multilanguage_issues && report.multilanguage_issues.length > 0)
  const secTechnical = hasTech ? toc(L.technicalChecks) : null
  const secCommercial = toc(L.commercialSummary) // Always show commercial summary with fallback
  const secExpert = toc(L.expertRecommendations)
  const secAction = toc(L.actionItems)

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${L.downloadTitle} - ${escapeHtml(report.product_name || 'Label Analysis')}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; color: #1a1a2e; background: #ffffff; line-height: 1.6; font-size: 10pt; overflow-wrap: break-word; word-wrap: break-word; word-break: break-word; }
  
  /* Download bar */
  .download-bar { position: fixed; top: 0; left: 0; right: 0; background: #0f172a; padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; z-index: 1000; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
  .download-bar-title { color: #ffffff; font-size: 14px; font-weight: 600; }
  .download-btn { display: inline-flex; align-items: center; gap: 8px; background: #2563eb; color: white; padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; border: none; cursor: pointer; transition: background 0.2s; }
  .download-btn:hover { background: #1d4ed8; }
  .download-btn svg { width: 18px; height: 18px; }
  .page-content-wrapper { padding-top: 60px; }
  @media print { .download-bar { display: none !important; } .page-content-wrapper { padding-top: 0; } }

  /* Page layout */
  .page { width: 210mm; min-height: auto; margin: 0 auto; padding: 0; background: white; overflow: hidden; }
  @media print { body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .page { margin: 0; padding: 0; width: 100%; box-shadow: none; min-height: auto; overflow: hidden; } .page-break { page-break-before: always; } .no-break { page-break-inside: avoid; } .content-page { min-height: auto; } }
  /* Use @page-level margins so PDF engines (Chrome, wkhtmltopdf, Puppeteer) respect them.
     Do NOT rely on padding-only when margin:0 — content can be clipped. */
  @page { size: A4 portrait; margin: 12mm 15mm; }

  /* Cover page */
  .cover-page { min-height: auto; display: flex; flex-direction: column; position: relative; background: #ffffff; color: #0f172a; padding: 15mm 20mm; overflow: hidden; }
  .cover-accent { position: absolute; top: 0; left: 0; right: 0; height: 6px; background: linear-gradient(90deg, #1e40af 0%, #2563eb 40%, #3b82f6 70%, #60a5fa 100%); }
  .cover-header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 12px; border-bottom: 2px solid #e2e8f0; margin-bottom: 16px; }
  .cover-logo { display: flex; align-items: center; gap: 12px; }
  .cover-logo-icon { width: 48px; height: 48px; background: #1e40af; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 20px; color: white; }
  .cover-logo-text { font-size: 24px; font-weight: 700; letter-spacing: -0.5px; color: #0f172a; }
  .cover-logo-sub { font-size: 11px; color: #64748b; font-weight: 400; letter-spacing: 2px; text-transform: uppercase; }
  .cover-badge { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 16px; font-size: 11px; color: #475569; font-weight: 600; }
  .cover-title { font-size: 28px; font-weight: 800; line-height: 1.3; margin-bottom: 10px; letter-spacing: -0.5px; color: #0f172a; overflow-wrap: break-word; }
  .cover-subtitle { font-size: 15px; color: #64748b; font-weight: 500; margin-bottom: 20px; overflow-wrap: break-word; }
  .cover-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 16px; }
  .cover-meta-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; overflow: hidden; }
  .cover-meta-label { font-size: 8px; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px; }
  .cover-meta-value { font-size: 13px; font-weight: 600; color: #0f172a; overflow-wrap: break-word; }
  .cover-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 8px; color: #64748b; }

  /* Content pages */
  .content-page { padding: 12mm 18mm; min-height: auto; overflow: hidden; }
  .page-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 2px solid #e2e8f0; margin-bottom: 24px; }
  .page-header-left { display: flex; align-items: center; gap: 8px; }
  .page-header-logo { width: 28px; height: 28px; background: #1e40af; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; color: white; }
  .page-header-brand { font-size: 12px; font-weight: 600; color: #334155; }
  .page-header-right { font-size: 9px; color: #94a3b8; text-align: right; }
  .page-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 7.5px; color: #94a3b8; }

  /* Sections */
  .section { margin-bottom: 16px; }
  .section-title { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 14px; padding-bottom: 6px; border-bottom: 3px solid #1e40af; display: flex; align-items: center; gap: 8px; }
  .section-number { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 6px; background: #1e40af; color: white; font-size: 10px; font-weight: 700; flex-shrink: 0; }

  /* Executive summary */
  .exec-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; margin-bottom: 20px; }
  .exec-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; text-align: center; }
  .exec-card-value { font-size: 24px; font-weight: 800; line-height: 1; margin-bottom: 4px; }
  .exec-card-label { font-size: 8px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }

  /* Risk section */
  .risk-section { display: flex; gap: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px; }
  .risk-gauge { text-align: center; min-width: 100px; }
  .risk-score-circle { width: 70px; height: 70px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 6px; font-size: 24px; font-weight: 800; color: white; }
  .risk-label { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
  .risk-details { flex: 1; min-width: 0; }
  .risk-details h4 { font-size: 12px; font-weight: 600; margin-bottom: 6px; color: #334155; }
  .risk-details p { font-size: 9.5px; color: #64748b; margin-bottom: 6px; overflow-wrap: break-word; }

  /* Violation cards */
  .violation-card { border: 1px solid; border-radius: 10px; padding: 16px; margin-bottom: 14px; page-break-inside: avoid; overflow: hidden; }
  .violation-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 10px; gap: 8px; }
  .violation-title { font-size: 12px; font-weight: 700; flex: 1; min-width: 0; overflow-wrap: break-word; }
  .severity-badge { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 3px 8px; border-radius: 4px; white-space: nowrap; flex-shrink: 0; }
  .violation-description { font-size: 9.5px; color: #334155; margin-bottom: 10px; line-height: 1.6; overflow-wrap: break-word; word-break: break-word; }
  .violation-box { background: rgba(255,255,255,0.8); border-radius: 6px; padding: 10px; margin-bottom: 8px; overflow: hidden; }
  .violation-box-label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 4px; }
  .violation-box-value { font-size: 9.5px; color: #1e293b; line-height: 1.5; overflow-wrap: break-word; word-break: break-word; }
  .violation-meta { display: flex; gap: 12px; font-size: 8px; color: #64748b; padding-top: 8px; border-top: 1px solid rgba(0,0,0,0.06); flex-wrap: wrap; }

  /* Tables */
  .citations-table { width: 100%; border-collapse: collapse; font-size: 8px; margin-top: 8px; table-layout: fixed; }
  .citations-table th { background: #f1f5f9; padding: 6px 8px; text-align: left; font-weight: 600; color: #334155; border-bottom: 2px solid #e2e8f0; font-size: 7px; text-transform: uppercase; letter-spacing: 0.5px; }
  .citations-table td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; color: #475569; vertical-align: top; overflow-wrap: break-word; word-break: break-word; }
  .citations-table tr:nth-child(even) td { background: #fafbfc; }
  .relevance-bar { display: inline-block; width: 30px; height: 4px; background: #e2e8f0; border-radius: 2px; overflow: hidden; vertical-align: middle; margin-right: 3px; }
  .relevance-bar-fill { height: 100%; background: #2563eb; border-radius: 2px; }
  .info-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; table-layout: fixed; }
  .info-table td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; font-size: 9.5px; overflow-wrap: break-word; word-break: break-word; }
  .info-table td:first-child { font-weight: 600; color: #64748b; width: 32%; font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.5px; }

  /* Callout boxes */
  .expert-tip { background: #eff6ff; border: 1px solid #bfdbfe; border-left: 4px solid #3b82f6; border-radius: 0 8px 8px 0; padding: 12px 14px; margin-bottom: 10px; font-size: 9.5px; color: #1e40af; line-height: 1.6; overflow-wrap: break-word; word-break: break-word; }
  .expert-tip-label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #2563eb; margin-bottom: 4px; }
  .port-warning { background: #FEF3C7; border: 1px solid #f59e0b; border-left: 4px solid #d97706; border-radius: 0 8px 8px 0; padding: 12px 14px; margin-bottom: 10px; font-size: 9.5px; color: #92400e; line-height: 1.6; overflow-wrap: break-word; word-break: break-word; }
  .port-warning-label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #b45309; margin-bottom: 4px; }
  .consequence-box { background: #FEF2F2; border: 2px solid #FCA5A5; border-radius: 10px; padding: 16px; margin-bottom: 20px; page-break-inside: avoid; }
  .consequence-title { font-size: 10px; font-weight: 800; color: #991B1B; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
  .consequence-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
  .consequence-item { background: white; border: 1px solid #FECACA; border-radius: 8px; padding: 10px; text-align: center; }
  .consequence-item-icon { font-size: 18px; margin-bottom: 4px; }
  .consequence-item-title { font-size: 9px; font-weight: 700; color: #991B1B; margin-bottom: 3px; }
  .consequence-item-desc { font-size: 7.5px; color: #64748b; line-height: 1.4; }

  /* Health claims */
  .health-claim-tag { display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 9px; font-weight: 600; margin: 2px 4px 2px 0; }
  .health-claim-danger { background: #FEE2E2; color: #991B1B; border: 1px solid #FCA5A5; }
  .health-claim-normal { background: #FEF3C7; color: #92400E; border: 1px solid #FDE68A; }
  .special-claim-tag { display: inline-block; background: #EFF6FF; color: #1E40AF; border: 1px solid #BFDBFE; padding: 3px 10px; border-radius: 4px; font-size: 9px; font-weight: 600; margin: 2px 4px 2px 0; }

  /* Technical checks */
  .tech-grid { display: grid; grid-template-columns: 1fr; gap: 14px; margin-bottom: 14px; }
  .tech-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; page-break-inside: avoid; width: 100%; overflow: hidden; }
  .tech-card-title { font-size: 9.5px; font-weight: 700; color: #334155; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
  .tech-card-badge { font-size: 7.5px; font-weight: 600; padding: 2px 6px; border-radius: 4px; background: #f1f5f9; color: #64748b; }
  .tech-item { padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 8.5px; }
  .tech-item:last-child { border-bottom: none; }
  .tech-item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px; }
  .tech-item-type { font-weight: 600; color: #334155; text-transform: capitalize; }
  .tech-item-desc { color: #64748b; line-height: 1.5; overflow-wrap: break-word; }
  .tech-item-values { display: flex; gap: 10px; margin-top: 3px; font-size: 7.5px; }
  .color-swatch { display: inline-block; width: 14px; height: 14px; border-radius: 3px; border: 1px solid #d1d5db; vertical-align: middle; margin-right: 4px; }

  /* Data boxes */
  .data-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 14px; font-size: 9.5px; line-height: 1.6; color: #334155; overflow-wrap: break-word; word-break: break-word; overflow: hidden; }
  .data-box-label { font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #2563eb; margin-bottom: 6px; }

  /* Signature */
  .signature-section { margin-top: 24px; padding-top: 16px; border-top: 2px solid #e2e8f0; }
  .signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 16px; }
  .signature-box { border-top: 2px solid #334155; padding-top: 8px; }
  .signature-name { font-size: 11px; font-weight: 600; color: #334155; }
  .signature-title { font-size: 9px; color: #64748b; }
  .disclaimer { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; font-size: 7.5px; color: #64748b; line-height: 1.6; margin-top: 20px; overflow-wrap: break-word; word-break: break-word; }
  .disclaimer-title { font-size: 8px; font-weight: 700; color: #334155; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px; }

  /* Verification */
  .verification-badge { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .verification-badge.verified { background: #16a34a; color: white; }
  .verification-badge.pending { background: #fef3c7; color: #92400e; border: 1px solid #fbbf24; }

  /* Watermark */
  .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 100px; font-weight: 800; color: rgba(0,0,0,0.02); pointer-events: none; z-index: 0; white-space: nowrap; }

  /* TOC */
  .toc-entry { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
  .toc-num { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 4px; background: #1e40af; color: white; font-size: 10px; font-weight: 700; flex-shrink: 0; }
  .toc-label { font-size: 11px; color: #334155; font-weight: 500; }

  /* Action table severity rows */
  .action-row-critical { background: #FEF2F2; }
  .action-row-warning { background: #FFFBEB; }
  .action-row-info { background: #F0F9FF; }

  /* Product images layout */
  .product-layout { display: flex; gap: 20px; margin-bottom: 16px; }
  .product-images { flex: 0 0 180px; min-width: 0; }
  .product-details { flex: 1; min-width: 0; }
  .product-image-card { border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #f8fafc; }
  .product-image-wrapper { width: 100%; aspect-ratio: 3/4; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #ffffff; padding: 8px; }
  .product-image-wrapper img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 4px; }
  .product-image-label { padding: 6px 10px; background: #f1f5f9; border-top: 1px solid #e2e8f0; font-size: 7.5px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; text-align: center; }
  .product-thumbs { display: flex; gap: 6px; margin-top: 8px; }
  .product-thumb { width: 50px; height: 50px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; background: #ffffff; display: flex; align-items: center; justify-content: center; padding: 3px; }
  .product-thumb img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .product-thumb-label { font-size: 6px; color: #94a3b8; text-align: center; margin-top: 2px; text-transform: uppercase; }
  @media print { .product-image-wrapper img, .product-thumb img { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
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

<!-- ═════════════��═���═══════ COVER PAGE ═══════════════════════ -->
<div class="page cover-page">
  <div class="cover-accent"></div>
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

  <div style="margin-top: 10px;">
    <div class="cover-title">${L.coverTitle}</div>
    <div class="cover-subtitle">${escapeHtml(report.product_name || L.defaultProduct)}</div>

    <div class="cover-meta" style="margin-top: 24px;">
      <div class="cover-meta-item">
        <div class="cover-meta-label">${L.reportId}</div>
        <div class="cover-meta-value">${escapeHtml(shortId)}</div>
      </div>
      <div class="cover-meta-item">
        <div class="cover-meta-label">${L.dateCreated}</div>
        <div class="cover-meta-value">${dateFormatted}</div>
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
    <div style="margin-top: 24px; padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">
      <div style="font-size: 10px; font-weight: 700; color: #0f172a; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;">${L.quickSummary}</div>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 12px;">
        <div style="text-align: center;">
          <div style="font-size: 20px; font-weight: 800; color: #dc2626;">${criticalCount}</div>
          <div style="font-size: 8px; color: #64748b; text-transform: uppercase;">${L.critical}</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 20px; font-weight: 800; color: #f59e0b;">${warningCount}</div>
          <div style="font-size: 8px; color: #64748b; text-transform: uppercase;">${L.warning}</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 20px; font-weight: 800; color: #2563eb;">${infoCount}</div>
          <div style="font-size: 8px; color: #64748b; text-transform: uppercase;">${L.info}</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 20px; font-weight: 800; color: #6366f1;">${totalCitations > 0 ? totalCitations : '—'}</div>
          <div style="font-size: 8px; color: #64748b; text-transform: uppercase;">${L.cfrCitations}</div>
        </div>
      </div>
      ${sortedViolations.length > 0 ? `
      <div style="border-top: 1px solid #e2e8f0; padding-top: 10px;">
        <div style="font-size: 8px; font-weight: 600; color: #64748b; margin-bottom: 6px; text-transform: uppercase;">${L.mainReasons}</div>
        ${sortedViolations.slice(0, 3).map(v => `
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
          <span style="width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; background: ${v.severity === 'critical' ? '#dc2626' : v.severity === 'warning' ? '#f59e0b' : '#2563eb'};"></span>
          <span style="font-size: 9px; color: #334155;">${escapeHtml(translateCategory(v.category, L))}</span>
        </div>`).join('')}
      </div>` : ''}
    </div>

    <!-- Table of Contents -->
    <div style="margin-top: 20px; padding: 14px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
      <div style="font-size: 10px; font-weight: 700; color: #0f172a; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">${L.tableOfContents}</div>
      ${tocEntries.map(e => `
      <div class="toc-entry">
        <span class="toc-num">${e.num}</span>
        <span class="toc-label">${escapeHtml(e.label)}</span>
      </div>`).join('')}
    </div>
  </div>

  <div class="cover-footer">
    <div>${companyInfo.name} | ${companyInfo.website}</div>
    <div>${L.generatedBy}: ${escapeHtml(generatedBy)}</div>
  </div>
</div>

<!-- ═══════════════════════ EXECUTIVE SUMMARY PAGE ═══════════════════════ -->
<div class="page content-page page-break">
  ${pageHeader(L, shortId, dateFormatted)}

  <div class="section">
    <div class="section-title"><span class="section-number">${secOverview}</span>${L.overview}</div>
    <div class="exec-grid">
      <div class="exec-card"><div class="exec-card-value" style="color: #DC2626">${criticalCount}</div><div class="exec-card-label">${L.critical}</div></div>
      <div class="exec-card"><div class="exec-card-value" style="color: #F59E0B">${warningCount}</div><div class="exec-card-label">${L.warning}</div></div>
      <div class="exec-card"><div class="exec-card-value" style="color: #2563eb">${infoCount}</div><div class="exec-card-label">${L.info}</div></div>
      <div class="exec-card"><div class="exec-card-value" style="color: #6366f1">${totalCitations}</div><div class="exec-card-label">${L.cfrCitations}</div></div>
    </div>

    <!-- Risk Gauge -->
    <div class="risk-section">
      <div class="risk-gauge">
        <div class="risk-score-circle" style="background: ${getRiskColor(riskScore)}">${riskScore.toFixed(1)}</div>
        <div class="risk-label" style="color: ${getRiskColor(riskScore)}">${getRiskLabel(riskScore, L)}</div>
        <div style="font-size: 8px; color: #94a3b8; margin-top: 4px;">${L.riskLevel}</div>
      </div>
      <div class="risk-details">
        <h4>${L.overallAssessment}</h4>
        <p>${escapeHtml(report.risk_assessment || defaultAssessment)}</p>
        <div style="display:flex;align-items:center;gap:8px;margin-top:12px;">
          <div style="font-size:9px;color:#64748b;min-width:80px;">${L.currentRisk}</div>
          <div style="flex:1;height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;"><div style="height:100%;width:${riskScore * 10}%;background:${getRiskColor(riskScore)};border-radius:4px;"></div></div>
          <div style="font-size:9px;font-weight:600;min-width:30px;text-align:right;color:${getRiskColor(riskScore)};">${riskScore.toFixed(1)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:6px;">
          <div style="font-size:9px;color:#64748b;min-width:80px;">${L.afterFix}</div>
          <div style="flex:1;height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;"><div style="height:100%;width:${projectedRisk * 10}%;background:${getRiskColor(projectedRisk)};border-radius:4px;"></div></div>
          <div style="font-size:9px;font-weight:600;min-width:30px;text-align:right;color:${getRiskColor(projectedRisk)};">${projectedRisk.toFixed(1)}</div>
        </div>
      </div>
    </div>

    <!-- Confidence Metrics -->
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:20px;">
      <div style="font-size:10px;font-weight:700;color:#334155;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;">${L.confidenceMetrics}</div>
      ${confidenceBar(L.ocrConfidence, report.ocr_confidence)}
      ${confidenceBar(L.extractionConfidence, report.extraction_confidence)}
      ${confidenceBar(L.legalConfidence, report.legal_reasoning_confidence)}
    </div>

    <!-- Consequences Banner (only if critical issues exist) -->
    ${criticalCount > 0 ? `
    <div class="consequence-box">
      <div class="consequence-title">
        <span style="font-size:16px;">&#9888;</span>
        ${L.consequencesTitle}
      </div>
      <div class="consequence-grid">
        <div class="consequence-item">
          <div class="consequence-item-icon">&#128274;</div>
          <div class="consequence-item-title">${L.consequenceDetention}</div>
          <div class="consequence-item-desc">${L.consequenceDetentionDesc}</div>
        </div>
        <div class="consequence-item">
          <div class="consequence-item-icon">&#128196;</div>
          <div class="consequence-item-title">${L.consequenceRelabeling}</div>
          <div class="consequence-item-desc">${L.consequenceRelabelingDesc}</div>
        </div>
        <div class="consequence-item">
          <div class="consequence-item-icon">&#9888;</div>
          <div class="consequence-item-title">${L.consequenceRecall}</div>
          <div class="consequence-item-desc">${L.consequenceRecallDesc}</div>
        </div>
      </div>
    </div>` : ''}
  </div>

  <!-- ═══════════════ PRODUCT INFO (inline section) ═══════════════ -->
  <div class="section">
    <div class="section-title"><span class="section-number">${secProduct}</span>${L.productInfo}</div>
    ${(() => {
      // Gather all available images
      const allImages: { url: string; type: string }[] = []
      if (report.label_images && report.label_images.length > 0) {
        report.label_images.forEach(img => allImages.push({ url: img.url, type: img.type }))
      } else if (report.label_image_url) {
        allImages.push({ url: report.label_image_url, type: 'pdp' })
      }
      const primaryImage = allImages[0]
      const thumbImages = allImages.slice(1)

      const imagesHTML = primaryImage ? `
        <div class="product-images">
          <div class="product-image-card">
            <div class="product-image-wrapper">
              <img src="${escapeHtml(primaryImage.url)}" alt="${escapeHtml(report.product_name || 'Product')}" crossorigin="anonymous" />
            </div>
            <div class="product-image-label">${translateImageType(primaryImage.type, L)}</div>
          </div>
          ${thumbImages.length > 0 ? `
          <div class="product-thumbs">
            ${thumbImages.map(img => `
            <div style="text-align:center;">
              <div class="product-thumb">
                <img src="${escapeHtml(img.url)}" alt="${translateImageType(img.type, L)}" crossorigin="anonymous" />
              </div>
              <div class="product-thumb-label">${translateImageType(img.type, L)}</div>
            </div>`).join('')}
          </div>` : ''}
        </div>` : ''

      const infoTableHTML = `
        <div class="${primaryImage ? 'product-details' : ''}">
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
          </table>
        </div>`

      if (primaryImage) {
        return `<div class="product-layout">${imagesHTML}${infoTableHTML}</div>`
      }
      return infoTableHTML
    })()}
  </div>

  <!-- Allergen Declaration -->
  ${report.allergen_declaration ? `
  <div class="section">
    <div style="font-size:10px;font-weight:700;color:#92400E;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">${L.allergenDeclaration}</div>
    <div style="background: #FEF3C7; border: 1px solid #FBBF24; border-radius: 8px; padding: 12px; font-size: 9.5px; color: #92400E; overflow-wrap: break-word;">
      <strong>${L.allergens}:</strong> ${escapeHtml(report.allergen_declaration)}
    </div>
  </div>` : ''}

  <!-- Health Claims -->
  ${healthClaims && healthClaims.length > 0 ? `
  <div class="section">
    <div style="font-size:10px;font-weight:700;color:#991B1B;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">${L.healthClaims}</div>
    <div style="background:#FEF2F2;border:1px solid #FCA5A5;border-radius:8px;padding:12px;overflow-wrap:break-word;">${healthClaims.map((claim: string) => {
        const isDanger = /prevent|cure|treat|disease|diagnos/i.test(claim)
        return `<span class="health-claim-tag ${isDanger ? 'health-claim-danger' : 'health-claim-normal'}">${isDanger ? '&#9888; ' : ''}${escapeHtml(claim)}</span>`
      }).join('')}
      ${healthClaims.some((c: string) => /prevent|cure|treat|disease|diagnos/i.test(c)) ? `
      <div style="margin-top:10px;font-size:8px;color:#991B1B;font-weight:600;border-top:1px solid #FECACA;padding-top:8px;">&#9888; ${L.healthClaimsWarning}</div>` : ''}
    </div>
  </div>` : ''}

  <!-- Special Claims -->
  ${specialClaims.length > 0 ? `
  <div class="section">
    <div style="font-size:10px;font-weight:700;color:#1E40AF;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">${L.specialClaims}</div>
    <div style="padding:4px 0;">
      ${specialClaims.map((claim: string) => `<span class="special-claim-tag">${escapeHtml(claim)}</span>`).join('')}
    </div>
  </div>` : ''}

  <!-- Ingredient List -->
  ${report.ingredient_list ? `
  <div class="section">
    <div style="font-size:10px;font-weight:700;color:#334155;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">${L.ingredientList}</div>
    <div class="data-box">
      <div class="data-box-label">${L.ingredientDetected}</div>
      ${escapeHtml(report.ingredient_list)}
    </div>
  </div>` : ''}

  <!-- Nutrition Facts - show multi-column OR single-column, not both -->
  ${!isCosmetic ? (() => {
    const hasMultiColumn = (report as any).nutrition_facts_columns && (report as any).nutrition_facts_columns.length > 1
    if (hasMultiColumn) {
      // Multi-column NF: render table in Product Info section
      const allColumns: any[] = (report as any).nutrition_facts_columns
      const nutrientNames = Array.from(
        new Set(allColumns.flatMap((col: any) => (col.nutritionFacts || []).map((n: any) => n.name as string)))
      )
      return `
  <div class="section">
    <div style="font-size:11px;font-weight:700;color:#0f172a;margin-bottom:6px;padding-bottom:4px;border-bottom:2px solid #e2e8f0;">${L.multiColumnNF}</div>
    <div style="font-size:9px;color:#64748b;margin-bottom:10px;">${L.multiColumnNFDesc}</div>
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:8.5px;table-layout:fixed;">
        <colgroup>
          <col style="width:22%;" />
          ${allColumns.map(() => '<col style="width:' + Math.floor(78 / allColumns.length) + '%;" />').join('')}
        </colgroup>
        <thead>
          <tr style="background:#1e40af;color:white;">
            <th style="padding:7px 8px;text-align:left;font-weight:700;">Nutrient</th>
            ${allColumns.map((col: any) => '<th style="padding:7px 8px;text-align:center;font-weight:700;font-size:8px;">' + escapeHtml(col.columnName || col.name || L.multiColumnVariant) + '</th>').join('')}
          </tr>
          <tr style="background:#dbeafe;">
            <td style="padding:5px 8px;font-size:7.5px;font-weight:600;color:#334155;">${L.multiColumnServingSize}</td>
            ${allColumns.map((col: any) => '<td style="padding:5px 8px;text-align:center;font-size:7.5px;color:#475569;">' + escapeHtml(col.servingSize || '—') + '</td>').join('')}
          </tr>
        </thead>
        <tbody>
          ${nutrientNames.map((nutrientName, rowIdx) => {
            const bg = rowIdx % 2 === 0 ? 'background:#f8fafc;' : ''
            return '<tr style="' + bg + '">' +
              '<td style="padding:5px 8px;font-weight:600;color:#334155;font-size:8px;text-transform:capitalize;">' + escapeHtml(nutrientName) + '</td>' +
              allColumns.map((col: any) => {
                const fact = (col.nutritionFacts || []).find((n: any) => n.name === nutrientName)
                const val = fact ? (fact.value ?? '') + (fact.unit ? fact.unit : '') + (fact.dailyValue != null ? ' <span style="color:#94a3b8;">(' + fact.dailyValue + '%)</span>' : '') : '<span style="color:#d1d5db;">—</span>'
                return '<td style="padding:5px 8px;text-align:center;color:#475569;font-size:8px;">' + val + '</td>'
              }).join('') +
            '</tr>'
          }).join('')}
        </tbody>
      </table>
    </div>
  </div>`
    } else {
      // Single-column NF or fallback
      return `
  <div class="section">
    <div style="font-size:10px;font-weight:700;color:#334155;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">${L.nutritionInfo}</div>
    <div class="data-box">
      <div class="data-box-label">${L.nutritionDetected}</div>
      ${report.nutrition_facts ? `
      <table class="info-table" style="margin: 0;">
        ${report.nutrition_facts.servingSize ? '<tr><td>' + L.servingSize + '</td><td>' + escapeHtml(report.nutrition_facts.servingSize) + '</td></tr>' : ''}
        ${report.nutrition_facts.servingsPerContainer ? '<tr><td>' + L.servingsPerContainer + '</td><td>' + escapeHtml(String(report.nutrition_facts.servingsPerContainer)) + '</td></tr>' : ''}
        ${report.nutrition_facts.calories !== undefined ? '<tr><td>' + L.calories + '</td><td>' + formatNutrientValue(report.nutrition_facts.calories) + '</td></tr>' : ''}
        ${report.nutrition_facts.totalFat ? '<tr><td>' + L.totalFat + '</td><td>' + formatNutrientValue(report.nutrition_facts.totalFat) + '</td></tr>' : ''}
        ${report.nutrition_facts.saturatedFat ? '<tr><td>' + L.saturatedFat + '</td><td>' + formatNutrientValue(report.nutrition_facts.saturatedFat) + '</td></tr>' : ''}
        ${report.nutrition_facts.transFat ? '<tr><td>' + L.transFat + '</td><td>' + formatNutrientValue(report.nutrition_facts.transFat) + '</td></tr>' : ''}
        ${report.nutrition_facts.cholesterol ? '<tr><td>' + L.cholesterol + '</td><td>' + formatNutrientValue(report.nutrition_facts.cholesterol) + '</td></tr>' : ''}
        ${report.nutrition_facts.sodium ? '<tr><td>' + L.sodium + '</td><td>' + formatNutrientValue(report.nutrition_facts.sodium) + '</td></tr>' : ''}
        ${report.nutrition_facts.totalCarbohydrate ? '<tr><td>' + L.totalCarb + '</td><td>' + formatNutrientValue(report.nutrition_facts.totalCarbohydrate) + '</td></tr>' : ''}
        ${report.nutrition_facts.dietaryFiber ? '<tr><td>' + L.dietaryFiber + '</td><td>' + formatNutrientValue(report.nutrition_facts.dietaryFiber) + '</td></tr>' : ''}
        ${report.nutrition_facts.totalSugars ? '<tr><td>' + L.totalSugars + '</td><td>' + formatNutrientValue(report.nutrition_facts.totalSugars) + '</td></tr>' : ''}
        ${report.nutrition_facts.addedSugars ? '<tr><td>' + L.addedSugars + '</td><td>' + formatNutrientValue(report.nutrition_facts.addedSugars) + '</td></tr>' : ''}
        ${report.nutrition_facts.protein ? '<tr><td>' + L.protein + '</td><td>' + formatNutrientValue(report.nutrition_facts.protein) + '</td></tr>' : ''}
        ${report.nutrition_facts.vitaminD ? '<tr><td>' + L.vitaminD + '</td><td>' + formatNutrientValue(report.nutrition_facts.vitaminD) + '</td></tr>' : ''}
        ${report.nutrition_facts.calcium ? '<tr><td>' + L.calcium + '</td><td>' + formatNutrientValue(report.nutrition_facts.calcium) + '</td></tr>' : ''}
        ${report.nutrition_facts.iron ? '<tr><td>' + L.iron + '</td><td>' + formatNutrientValue(report.nutrition_facts.iron) + '</td></tr>' : ''}
        ${report.nutrition_facts.potassium ? '<tr><td>' + L.potassium + '</td><td>' + formatNutrientValue(report.nutrition_facts.potassium) + '</td></tr>' : ''}
      </table>` : `
      <div style="padding:12px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;color:#92400e;font-size:8.5px;text-align:center;">
        ${lang === 'vi'
          ? 'Không thể đọc bảng dinh dưỡng từ hình ảnh. Vui lòng upload ảnh Nutrition Facts rõ hơn.'
          : 'Could not extract nutrition facts from the provided image. Please upload a clearer Nutrition Facts panel image.'}
      </div>`}
    </div>
  </div>`
    }
  })() : ''}

  <!-- ═══════════════ AUDIT SCOPE (inline section) ═══════════════ -->
  <div class="section">
    <div class="section-title"><span class="section-number">${secAuditScope}</span>${L.auditScope}</div>

    <table class="info-table" style="margin-bottom:12px;">
      <tr><td>${L.auditScopeReviewDate}</td><td>${dateFormatted}</td></tr>
      <tr><td>${L.auditScopeCfrVersion}</td><td>${L.auditScopeCfrVersionValue}</td></tr>
      <tr><td>${L.auditScopeOcrMethod}</td><td>${L.auditScopeOcrMethodValue}</td></tr>
      <tr><td>${L.auditScopePanels}</td><td>${L.auditScopePanelsValue}</td></tr>
      <tr><td>${L.auditScopeImages}</td><td>${((report.label_images && report.label_images.length > 0) ? report.label_images.length : 1)} image(s) analyzed</td></tr>
      <tr>
        <td>${L.auditScopeRegulations}</td>
        <td>
          <span style="display:inline-block;background:#EFF6FF;color:#1E40AF;border:1px solid #BFDBFE;padding:2px 8px;border-radius:4px;font-size:8.5px;font-weight:600;margin:2px 4px 2px 0;">21 CFR §101 — Food Labeling</span>
          ${!isCosmetic ? `<span style="display:inline-block;background:#EFF6FF;color:#1E40AF;border:1px solid #BFDBFE;padding:2px 8px;border-radius:4px;font-size:8.5px;font-weight:600;margin:2px 4px 2px 0;">21 CFR §101.9 — Nutrition Facts</span>
          <span style="display:inline-block;background:#EFF6FF;color:#1E40AF;border:1px solid #BFDBFE;padding:2px 8px;border-radius:4px;font-size:8.5px;font-weight:600;margin:2px 4px 2px 0;">21 CFR §101.4 — Ingredient Listing</span>
          <span style="display:inline-block;background:#EFF6FF;color:#1E40AF;border:1px solid #BFDBFE;padding:2px 8px;border-radius:4px;font-size:8.5px;font-weight:600;margin:2px 4px 2px 0;">21 CFR §101.2 — Mandatory Label Statements</span>
          <span style="display:inline-block;background:#EFF6FF;color:#1E40AF;border:1px solid #BFDBFE;padding:2px 8px;border-radius:4px;font-size:8.5px;font-weight:600;margin:2px 4px 2px 0;">FD&amp;C Act §403 — Misbranding</span>` : ''}
          ${isCosmetic ? `<span style="display:inline-block;background:#EFF6FF;color:#1E40AF;border:1px solid #BFDBFE;padding:2px 8px;border-radius:4px;font-size:8.5px;font-weight:600;margin:2px 4px 2px 0;">21 CFR §701 — Cosmetic Labeling</span>` : ''}
        </td>
      </tr>
    </table>

    <!-- What was NOT checked (scope boundaries) -->
    <div style="background:#FEF3C7;border:1px solid #FDE68A;border-left:4px solid #F59E0B;border-radius:0 8px 8px 0;padding:10px 12px;font-size:8.5px;color:#92400E;line-height:1.5;">
      <div style="font-size:7.5px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;color:#B45309;">Out of Scope — Not Reviewed</div>
      <ul style="margin:0 0 0 12px;padding:0;list-style:disc;">
        <li>Product formulation and ingredient safety</li>
        <li>Manufacturing practices (GMP / 21 CFR §111)</li>
        <li>Clinical or structure/function claim substantiation</li>
        <li>Supply chain and distribution compliance</li>
        <li>State/local labeling requirements (California Prop 65, etc.)</li>
      </ul>
    </div>
  </div>


  <!-- ═══════════════ FINDINGS DETAIL (inline section) ═══════════════ -->
  <div class="section">
    <div class="section-title"><span class="section-number">${secFindings}</span>${L.findingsDetail}</div>
    ${sortedViolations.length === 0 ? `
      <div style="text-align: center; padding: 30px; color: #16a34a;">
        <div style="font-size: 36px; margin-bottom: 10px;">&#10003;</div>
        <div style="font-size: 14px; font-weight: 700;">${L.noViolations}</div>
        <div style="font-size: 10px; color: #64748b; margin-top: 6px;">${L.noViolationsDesc}</div>
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
          <div class="violation-box-value" style="font-family: monospace; color: #2563eb; font-size: 9px; overflow-wrap: break-word;">${escapeHtml(v.regulation_reference)}</div>
          ${v.legal_basis ? `<div class="violation-box-value" style="margin-top: 4px;">${escapeHtml(v.legal_basis)}</div>` : ''}
        </div>` : ''}
        ${v.suggested_fix ? `
        <div class="violation-box" style="background: rgba(34, 197, 94, 0.08); border-left: 3px solid #22c55e;">
          <div class="violation-box-label" style="color: #16a34a;">${L.fixGuidance}</div>
          <div class="violation-box-value">${markdownToHtml(v.suggested_fix)}</div>
        </div>` : ''}
        ${v.enforcement_context ? `
        <div class="violation-box" style="background: rgba(239, 68, 68, 0.05); border-left: 3px solid #ef4444;">
          <div class="violation-box-label" style="color: #dc2626;">${L.enforcementHistory}</div>
          <div class="violation-box-value">${markdownToHtml(v.enforcement_context)}</div>
        </div>` : ''}
        <div class="violation-meta">
          ${v.confidence_score !== undefined ? `<span>${L.aiConfidenceLabel}: ${Math.round(v.confidence_score * 100)}%</span>` : ''}
          ${v.risk_score !== undefined ? `<span>${L.riskScoreLabel}: ${v.risk_score.toFixed(1)}/10</span>` : ''}
          ${v.enforcement_frequency ? `<span>${L.enforcementFreq}: ${v.enforcement_frequency}x</span>` : ''}
          ${v.citations?.length ? `<span>${L.citationsLabel}: ${v.citations.length}</span>` : ''}
        </div>
        ${v.citations && v.citations.length > 0 ? `
        <table class="citations-table" style="margin-top: 10px; table-layout: fixed; width: 100%;">
          <colgroup>
            <col style="width:18%;" />
            <col style="width:48%;" />
            <col style="width:18%;" />
            <col style="width:16%;" />
          </colgroup>
          <thead><tr><th>${L.cfrSection}</th><th>${L.citationContent}</th><th>${L.source}</th><th>${L.relevance}</th></tr></thead>
          <tbody>
            ${v.citations.map((c: Citation) => `
            <tr>
              <td style="font-family: monospace; font-size: 7.5px; overflow-wrap: break-word;">${escapeHtml(c.section)}</td>
              <td style="overflow-wrap: break-word; word-break: break-word;">${escapeHtml(c.text.slice(0, 150))}${c.text.length > 150 ? '...' : ''}</td>
              <td style="overflow-wrap: break-word;">${escapeHtml(c.source)}</td>
              <td><span class="relevance-bar"><span class="relevance-bar-fill" style="width: ${Math.round(c.relevance_score * 100)}%"></span></span>${Math.round(c.relevance_score * 100)}%</td>
            </tr>`).join('')}
          </tbody>
        </table>` : ''}
      </div>`
    }).join('')}
  </div>

  ${importAlertViolations.length > 0 ? `
  <!-- ═══════════════ IMPORT ALERTS (inline section) ═══════════════ -->
  <div class="section">
    <div class="section-title"><span class="section-number">${secImportAlerts}</span>${L.importAlerts}</div>
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
        <div class="violation-box-value">${markdownToHtml(ia.suggested_fix)}</div>
      </div>` : ''}
      <div class="violation-meta">
        <span>${L.matchConfidence}: ${ia.confidence_score !== undefined ? Math.round(ia.confidence_score * 100) + '%' : 'N/A'}</span>
        <span style="color: #64748b; font-style: italic;">${L.referenceOnly}</span>
      </div>
    </div>`
    }).join('')}
  </div>` : ''}

  ${hasTech ? `
  <!-- ═══════════════ TECHNICAL CHECKS (inline section) ═══════════════ -->
  <div class="section">
    <div class="section-title"><span class="section-number">${secTechnical}</span>${L.technicalChecks}</div>
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
            ${L.contrastRatio}: <strong style="color: ${cv.ratio >= (cv.requiredMinRatio || 4.5) ? '#16a34a' : cv.ratio >= 3 ? '#f59e0b' : '#dc2626'}">${cv.ratio.toFixed(2)}:1</strong>
            <span style="color: #94a3b8;">(${L.minimum} ${(cv.requiredMinRatio || 3.0).toFixed(1)}:1${cv.textSize === 'large' ? ' — large text' : ''}${cv.elementRole === 'brand' ? ' — brand/decorative' : ''})</span>
          </div>` : ''}
          ${cv.colors ? `
          <div style="margin-top: 4px; font-size: 8px; display: flex; align-items: center; gap: 8px;">
            <span><span class="color-swatch" style="background: ${cv.colors.foreground};"></span>${escapeHtml(cv.colors.foreground)}</span>
            <span style="color: #94a3b8;">${L.on}</span>
            <span><span class="color-swatch" style="background: ${cv.colors.background};"></span>${escapeHtml(cv.colors.background)}</span>
          </div>` : ''}
          ${cv.recommendation ? `<div style="margin-top: 4px; font-size: 8px; color: #16a34a;">${escapeHtml(cv.recommendation)}</div>` : ''}
        </div>`).join('')}
        <div style="margin-top:10px;padding:8px;background:#fefce8;border:1px solid #fde68a;border-radius:6px;font-size:8px;color:#92400e;">
          ${L.contrastDesignNote}
        </div>
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
  </div>` : ''}

${(() => {
  // Only show commercial summary if it has meaningful content
  const rawSummary = report.commercial_summary?.trim() || ''
  // Skip generic boilerplate like "FDA LABEL COMPLIANCE REPORT - VEXIM GLOBAL"
  const isBoilerplate = rawSummary.length < 50 || /^FDA LABEL|^VEXIM/i.test(rawSummary)
  
  if (isBoilerplate && !report.commercial_summary) {
    // Generate contextual fallback based on result
    const fallbackContent = (report.overall_result === 'pass' || report.overall_result === 'approved')
      ? (lang === 'vi'
        ? 'Nhãn sản phẩm đáp ứng các yêu cầu ghi nhãn FDA theo 21 CFR Part 101. Không phát hiện vi phạm nghiêm trọng. Sản phẩm có thể phân phối tại thị trường Hoa Kỳ với rủi ro pháp lý thấp.'
        : 'The product label meets FDA labeling requirements under 21 CFR Part 101. No critical violations detected. The product may be distributed in the US market with low legal risk.')
      : (lang === 'vi'
        ? 'Phát hiện một số vấn đề tuân thủ cần được khắc phục trước khi phân phối. Vui lòng xem Chi Tiết Phát Hiện và Danh Sách Hành Động bên dưới.'
        : 'Compliance issues were identified that require remediation before distribution. Please review the Findings Detail and Action Items sections.')
    
    return `<!-- ═══════════════ COMMERCIAL SUMMARY (inline section) ═══════════════ -->
  <div class="section">
    <div class="section-title"><span class="section-number">${secCommercial}</span>${L.commercialSummary}</div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;overflow-wrap:break-word;">
      ${markdownToHtml(fallbackContent)}
      
      <!-- FDA Enforcement History Section -->
      <div style="margin-top:16px;padding-top:16px;border-top:1px solid #e2e8f0;">
        <div style="font-size:10px;font-weight:700;color:#334155;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;">${L.fdaEnforcementHistory}</div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <div style="flex:1;min-width:100px;background:white;border:1px solid #e2e8f0;border-radius:8px;padding:10px;">
            <div style="font-size:8px;color:#64748b;margin-bottom:4px;display:flex;align-items:center;gap:4px;">
              <span style="font-size:10px;">&#9993;</span> ${L.warningLetters}
            </div>
            <div style="font-size:11px;font-weight:700;color:#16a34a;">${L.none}</div>
          </div>
          <div style="flex:1;min-width:100px;background:white;border:1px solid #e2e8f0;border-radius:8px;padding:10px;">
            <div style="font-size:8px;color:#64748b;margin-bottom:4px;display:flex;align-items:center;gap:4px;">
              <span style="font-size:10px;">&#128260;</span> ${L.recalls}
            </div>
            <div style="font-size:11px;font-weight:700;color:#16a34a;">${L.none}</div>
          </div>
          <div style="flex:1;min-width:100px;background:white;border:1px solid #e2e8f0;border-radius:8px;padding:10px;">
            <div style="font-size:8px;color:#64748b;margin-bottom:4px;display:flex;align-items:center;gap:4px;">
              <span style="font-size:10px;">&#128274;</span> ${L.importAlertsLabel}
            </div>
            <div style="font-size:11px;font-weight:700;color:${importAlertViolations.length > 0 ? '#f59e0b' : '#16a34a'};">${importAlertViolations.length > 0 ? importAlertViolations.length : L.none}</div>
          </div>
        </div>
      </div>
    </div>
  </div>`
  }
  
  // Has real content - render inline without page wrapper
  return `<!-- ═══════════════ COMMERCIAL SUMMARY (inline section) ═══════════════ -->
  <div class="section">
    <div class="section-title"><span class="section-number">${secCommercial}</span>${L.commercialSummary}</div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;overflow-wrap:break-word;">
      ${markdownToHtml(rawSummary)}
      
      <!-- FDA Enforcement History Section -->
      <div style="margin-top:16px;padding-top:16px;border-top:1px solid #e2e8f0;">
        <div style="font-size:10px;font-weight:700;color:#334155;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;">${L.fdaEnforcementHistory}</div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <div style="flex:1;min-width:100px;background:white;border:1px solid #e2e8f0;border-radius:8px;padding:10px;">
            <div style="font-size:8px;color:#64748b;margin-bottom:4px;display:flex;align-items:center;gap:4px;">
              <span style="font-size:10px;">&#9993;</span> ${L.warningLetters}
            </div>
            <div style="font-size:11px;font-weight:700;color:#16a34a;">${L.none}</div>
          </div>
          <div style="flex:1;min-width:100px;background:white;border:1px solid #e2e8f0;border-radius:8px;padding:10px;">
            <div style="font-size:8px;color:#64748b;margin-bottom:4px;display:flex;align-items:center;gap:4px;">
              <span style="font-size:10px;">&#128260;</span> ${L.recalls}
            </div>
            <div style="font-size:11px;font-weight:700;color:#16a34a;">${L.none}</div>
          </div>
          <div style="flex:1;min-width:100px;background:white;border:1px solid #e2e8f0;border-radius:8px;padding:10px;">
            <div style="font-size:8px;color:#64748b;margin-bottom:4px;display:flex;align-items:center;gap:4px;">
              <span style="font-size:10px;">&#128274;</span> ${L.importAlertsLabel}
            </div>
            <div style="font-size:11px;font-weight:700;color:${importAlertViolations.length > 0 ? '#f59e0b' : '#16a34a'};">${importAlertViolations.length > 0 ? importAlertViolations.length : L.none}</div>
          </div>
        </div>
      </div>
    </div>
  </div>`
})()} 

  ${expertReview && expertReview.status === 'completed' ? `
  <!-- ═══════════════════════ EXPERT CONSULTATION (flows from previous) ════════════���══════════ -->
<div class="page content-page"><!-- No page-break: flows naturally -->
  ${pageHeader(L, shortId, dateFormatted)}

  <!-- Expert Consultation Header -->
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;padding:14px 18px;background:linear-gradient(90deg, #1e3a8a 0%, #2563eb 100%);border-radius:10px;color:white;">
    <div style="display:flex;align-items:center;gap:12px;">
      <div style="width:40px;height:40px;background:rgba(255,255,255,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;">&#128101;</div>
      <div>
        <div style="font-size:14px;font-weight:700;">${L.expertConsultation}</div>
        <div style="font-size:9px;opacity:0.85;">${L.requestSentAt}: ${formatDate(expertReview.created_at, lang)}</div>
      </div>
    </div>
    <div style="background:rgba(255,255,255,0.2);padding:6px 12px;border-radius:6px;font-size:9px;font-weight:600;">&#10003; ${L.resultsAvailable}</div>
  </div>

  <!-- Expert Overview Assessment -->
  ${expertReview.expert_summary ? `
  <div class="section">
    <div style="font-size:11px;font-weight:700;color:#1e40af;margin-bottom:10px;display:flex;align-items:center;gap:6px;">
      <span style="font-size:14px;">&#10024;</span> ${L.expertOverview}
    </div>
    <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:16px;font-size:10px;color:#1e40af;line-height:1.7;overflow-wrap:break-word;">
      ${escapeHtml(expertReview.expert_summary)}
    </div>
  </div>` : ''}

  <!-- Fix Guidance per Violation -->
  ${expertReview.violation_reviews && expertReview.violation_reviews.length > 0 ? `
  <div class="section">
    <div style="font-size:11px;font-weight:700;color:#334155;margin-bottom:12px;display:flex;align-items:center;gap:6px;">
      <span style="font-size:14px;">&#128221;</span> ${L.violationFixGuide}
    </div>
    <div style="space-y:10px;">
      ${expertReview.violation_reviews.map((vr) => {
        const isConfirmed = vr.confirmed
        const bgColor = isConfirmed ? '#FEF2F2' : '#F0FDF4'
        const borderColor = isConfirmed ? '#FECACA' : '#BBF7D0'
        const iconColor = isConfirmed ? '#DC2626' : '#16A34A'
        const icon = isConfirmed ? '&#9888;' : '&#10003;'
        return `
      <div style="background:${bgColor};border:1px solid ${borderColor};border-radius:8px;padding:14px;margin-bottom:10px;page-break-inside:avoid;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
          <span style="color:${iconColor};font-size:12px;">${icon}</span>
          <span style="font-size:10px;font-weight:600;color:#334155;">
            Violation #${vr.violation_index + 1} — ${isConfirmed ? L.violationConfirmed : L.violationNotConfirmed}
          </span>
        </div>
        ${vr.wording_fix ? `
        <div style="margin-top:8px;">
          <div style="font-size:8px;color:#64748b;margin-bottom:4px;">${L.suggestedWording}</div>
          <div style="background:white;border:1px solid #e2e8f0;border-radius:6px;padding:10px;font-size:10px;color:#0f172a;line-height:1.6;overflow-wrap:break-word;">
            ${escapeHtml(vr.wording_fix)}
          </div>
        </div>` : ''}
        ${vr.legal_note ? `
        <div style="margin-top:8px;font-size:9px;color:#64748b;font-style:italic;overflow-wrap:break-word;">
          ${escapeHtml(vr.legal_note)}
        </div>` : ''}
      </div>`
      }).join('')}
    </div>
  </div>` : ''}

  <!-- Priority Actions -->
  ${expertReview.recommended_actions && expertReview.recommended_actions.length > 0 ? `
  <div class="section">
    <div style="font-size:11px;font-weight:700;color:#334155;margin-bottom:12px;display:flex;align-items:center;gap:6px;">
      <span style="font-size:14px;">&#10145;</span> ${L.expertPriorityActions}
    </div>
    <div>
      ${expertReview.recommended_actions.map((ra) => {
        const priorityColor = ra.priority === 'high' ? '#DC2626' : ra.priority === 'medium' ? '#F59E0B' : '#64748B'
        const priorityBg = ra.priority === 'high' ? '#FEE2E2' : ra.priority === 'medium' ? '#FEF3C7' : '#F1F5F9'
        const priorityLabel = ra.priority === 'high' ? L.priorityUrgent : ra.priority === 'medium' ? L.priorityHigh : L.priorityMedium
        return `
      <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid #f1f5f9;">
        <span style="font-size:8px;font-weight:700;color:${priorityColor};background:${priorityBg};padding:3px 8px;border-radius:4px;white-space:nowrap;">${priorityLabel}</span>
        <span style="font-size:10px;color:#334155;flex:1;overflow-wrap:break-word;">${escapeHtml(ra.action)}</span>
        ${ra.cfr_reference ? `<span style="font-size:8px;color:#64748b;white-space:nowrap;">(${escapeHtml(ra.cfr_reference)})</span>` : ''}
      </div>`
      }).join('')}
    </div>
  </div>` : ''}

  <!-- Sign Off -->
  ${expertReview.sign_off_name ? `
  <div style="margin-top:20px;padding-top:14px;border-top:1px solid #e2e8f0;display:flex;align-items:center;gap:8px;font-size:9px;color:#64748b;">
    <span style="font-size:12px;">&#128100;</span>
    <span>${L.signedOffBy} <strong style="color:#0f172a;">${escapeHtml(expertReview.sign_off_name)}</strong></span>
    <span>•</span>
    <span>${formatDate(expertReview.sign_off_at || expertReview.created_at, lang)}</span>
  </div>` : ''}

  <div class="page-footer">
    <div>${L.pageFooter} | ${companyInfo.name}</div>
    <div>${L.reportId}: ${escapeHtml(shortId)}</div>
  </div>
</div>` : ''}

  <!-- ═══════════════ EXPERT RECOMMENDATIONS (inline section) ═══════════════ -->
  <div class="section">
    <div class="section-title"><span class="section-number">${secExpert}</span>${L.expertRecommendations}</div>
    <!-- Only show default expert tip if no tips already exist in commercial_summary -->
    ${report.expert_tips && report.expert_tips.length > 0 && !report.commercial_summary?.includes('Vexim Tip') ? `
      ${report.expert_tips.map((tip: string, idx: number) => `
      <div class="expert-tip">
        <div class="expert-tip-label">${L.recommendation} ${idx + 1}</div>
        ${markdownToHtml(tip)}
      </div>`).join('')}
    ` : !report.commercial_summary?.includes('Vexim Tip') ? `
      <div class="expert-tip">
        <div class="expert-tip-label">${L.veximAdvice}</div>
        ${defaultExpertTip}
      </div>
    ` : `
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;font-size:9px;color:#166534;">
        ${lang === 'vi' ? 'Xem khuyến nghị chuyên gia trong phần Tóm Tắt Phân Tích Thương Mại ở trên.' : 'See expert recommendations in the Commercial Analysis Summary section above.'}
      </div>
    `}

    <!-- Enforcement Insights -->
    ${enforcementInsights.length > 0 ? `
    <div style="margin-top:12px;">
      <div style="font-size:9px;font-weight:700;color:#b45309;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">${L.enforcementInsights}</div>
      ${enforcementInsights.map((insight: string) => `
      <div class="port-warning" style="margin-bottom:6px;">
        ${markdownToHtml(insight)}
      </div>`).join('')}
    </div>` : ''}

    ${criticalCount > 0 ? `
    <div class="port-warning">
      <div class="port-warning-label">${L.portWarning}</div>
      ${L.portWarningDesc}
    </div>` : ''}

    ${report.review_notes ? `
    <div class="expert-tip">
      <div class="expert-tip-label">${L.expertReviewNotes}</div>
      ${markdownToHtml(report.review_notes)}
    </div>` : ''}
  </div>

  <div class="page-footer">
    <div>${L.pageFooter} | ${companyInfo.name}</div>
    <div>${L.reportId}: ${escapeHtml(shortId)}</div>
  </div>
</div>

<!-- ═══════════════════════ ACTION ITEMS & SIGNATURE PAGE ═══════════════════════ -->
<div class="page content-page page-break">
  ${pageHeader(L, shortId, dateFormatted)}

  <!-- Action Items -->
  <div class="section">
    <div class="section-title"><span class="section-number">${secAction}</span>${L.actionItems}</div>
    <table class="citations-table" style="table-layout:fixed;width:100%;">
      <colgroup>
        <col style="width:5%;" />
        <col style="width:10%;" />
        <col style="width:12%;" />
        <col style="width:20%;" />
        <col style="width:53%;" />
      </colgroup>
      <thead><tr><th>#</th><th>${L.actionPriority}</th><th>${L.actionSeverity}</th><th>${L.actionIssue}</th><th>${L.actionRequired}</th></tr></thead>
      <tbody>
        ${sortedViolations.map((v, i) => {
          const rowClass = v.severity === 'critical' ? 'action-row-critical' : v.severity === 'warning' ? 'action-row-warning' : 'action-row-info'
          const priority = v.severity === 'critical' ? L.priorityImmediate : v.severity === 'warning' ? L.priorityHigh : L.priorityMedium
          const priorityColor = v.severity === 'critical' ? '#dc2626' : v.severity === 'warning' ? '#f59e0b' : '#2563eb'
          return `
        <tr class="${rowClass}">
          <td style="font-weight:600;">${i + 1}</td>
          <td><span style="font-size:7px;font-weight:700;color:${priorityColor};text-transform:uppercase;">${priority}</span></td>
          <td><span class="severity-badge" style="background: ${getSeverityColor(v.severity).text}; color: white; font-size: 7px; padding: 2px 6px;">${getSeverityLabel(v.severity, L)}</span></td>
          <td style="overflow-wrap:break-word;word-break:break-word;">${escapeHtml(translateCategory(v.category, L))}</td>
          <td style="overflow-wrap:break-word;word-break:break-word;">${(() => {
            // Clean markdown from suggested_fix for table display
            const rawFix = v.suggested_fix || L.seeDetails
            const cleanFix = rawFix
              .replace(/\*\*(.+?)\*\*/g, '$1')  // Remove **bold**
              .replace(/\*(.+?)\*/g, '$1')      // Remove *italic*
              .replace(/[①②③④⑤⑥⑦⑧⑨⑩]/g, '')  // Remove circled numbers
              .replace(/⚠️?/g, '')              // Remove warning emoji
              .trim()
            return escapeHtml(cleanFix.slice(0, 120)) + (cleanFix.length > 120 ? '...' : '')
          })()}</td>
        </tr>`
        }).join('')}
        ${sortedViolations.length === 0 ? `
        <tr>
          <td colspan="5" style="text-align:center;padding:20px;color:#16a34a;font-size:9px;font-weight:600;">
            <span style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 24px;">
              ✓ ${lang === 'vi' ? 'Không có hành động nào cần thực hiện. Duy trì tiêu chuẩn ghi nhãn hiện tại.' : 'No actions required. Maintain current labeling standards.'}
            </span>
          </td>
        </tr>` : ''}
      </tbody>
    </table>
  </div>

  <!-- Verification Status - Only show "verified" badge if expert review was actually completed -->
  <div style="display: flex; justify-content: center; margin: 14px 0;">
    ${expertReview && expertReview.status === 'completed'
      ? `<div class="verification-badge verified"><span style="font-size: 14px;">&#10003;</span>${L.reportVerified}</div>`
      : `<div class="verification-badge pending"><span style="font-size: 14px;">&#9888;</span>${L.pendingVerification}</div>`
    }
  </div>

  ${!(expertReview && expertReview.status === 'completed') ? `
  <div style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 40%, #2563eb 100%); border-radius: 12px; padding: 20px; margin: 16px 0; color: white; text-align: center;">
    <div style="font-size: 14px; font-weight: 700; margin-bottom: 6px;">${L.upgradeTitle}</div>
    <div style="font-size: 10px; opacity: 0.9; margin-bottom: 12px; line-height: 1.6;">${L.upgradeDesc}<br/>${L.upgradeDesc2}</div>
    <div style="display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
      <a href="https://vexim.global/pricing" style="display: inline-block; background: white; color: #1e40af; padding: 10px 20px; border-radius: 8px; font-size: 11px; font-weight: 700; text-decoration: none;">${L.requestVerification}</a>
      <a href="mailto:support@vexim.global" style="display: inline-block; background: rgba(255,255,255,0.2); color: white; padding: 10px 20px; border-radius: 8px; font-size: 11px; font-weight: 600; text-decoration: none; border: 1px solid rgba(255,255,255,0.3);">${L.contactConsulting}</a>
    </div>
    <div style="margin-top: 8px; font-size: 9px; opacity: 0.8;">Hotline: +1 (555) 123-4567 | Email: support@vexim.global</div>
  </div>` : ''}

  <!-- Signature Section -->
  <div class="signature-section">
    <div style="font-size: 10px; font-weight: 600; color: #334155; margin-bottom: 4px;">${L.certification}</div>
    <div style="font-size: 8px; color: #64748b; margin-bottom: 12px; overflow-wrap: break-word;">
      ${L.certificationDesc} ${expertReview && expertReview.status === 'completed' ? L.verifiedByExpert : L.pendingExpertVerification}.
      ${L.certificationDesc2}
    </div>
    <div class="signature-grid">
      <div class="signature-box">
        <div class="signature-name">${escapeHtml(generatedBy)}</div>
        <div class="signature-title">${expertReview && expertReview.status === 'completed' ? L.fdaComplianceExpert : L.veximAiSystem}</div>
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

  <div class="page-footer">
    <div>${L.pageFooter} | ${companyInfo.name}</div>
    <div>${L.reportId}: ${escapeHtml(shortId)}</div>
  </div>
</div>

<div class="watermark">VEXIM</div>

</div><!-- End page-content-wrapper -->

</body>
</html>`
}
