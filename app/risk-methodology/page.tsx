'use client'

import { AppHeader } from '@/components/app-header'
import { useTranslation } from '@/lib/i18n'
import { 
  AlertTriangle, 
  Shield, 
  ShipIcon,
  FileWarning, 
  Package, 
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowRight,
  Banknote,
  Clock,
  Scale,
  ShieldCheck,
  Lightbulb,
  ArrowDown,
  BadgeCheck
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function RiskMethodologyPage() {
  const { locale } = useTranslation()
  const isVi = locale === 'vi'

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3">
            {isVi ? 'Điểm Rủi Ro FDA - Ý Nghĩa & Hành Động' : 'FDA Risk Score - What It Means & What To Do'}
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {isVi 
              ? 'Hiểu điểm rủi ro ảnh hưởng thế nào đến việc nhập khẩu hàng hóa của bạn vào Mỹ và cách khắc phục'
              : 'Understand how risk scores affect your product imports to the US and how to fix issues'}
          </p>
        </div>

        {/* What does each risk level mean */}
        <Card className="mb-8 overflow-hidden">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              {isVi ? 'Điểm Rủi Ro Nghĩa Là Gì?' : 'What Does Each Risk Score Mean?'}
            </CardTitle>
            <CardDescription>
              {isVi 
                ? 'Mỗi mức điểm cho biết khả năng sản phẩm bị FDA xử lý khi nhập khẩu vào Mỹ'
                : 'Each score level indicates the likelihood of FDA action when importing into the US'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {/* Low Risk - Green */}
            <div className="flex items-stretch border-b">
              <div className="w-24 md:w-32 bg-green-500 flex flex-col items-center justify-center p-4 text-white">
                <span className="text-2xl font-bold">0 - 2.4</span>
                <span className="text-xs mt-1">{isVi ? 'Thấp' : 'Low'}</span>
              </div>
              <div className="flex-1 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-green-800">
                    {isVi ? 'An toàn - Sẵn sàng xuất khẩu' : 'Safe - Export Ready'}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {isVi 
                    ? 'Nhãn sản phẩm tuân thủ tốt quy định FDA. Khả năng bị kiểm tra hoặc giữ hàng rất thấp.'
                    : 'Product label complies well with FDA regulations. Very low chance of inspection or detention.'}
                </p>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1 text-green-700">
                    <ShipIcon className="h-3.5 w-3.5" />
                    {isVi ? 'Thông quan nhanh' : 'Fast clearance'}
                  </span>
                  <span className="flex items-center gap-1 text-green-700">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {isVi ? 'Không cần sửa đổi' : 'No changes needed'}
                  </span>
                </div>
              </div>
            </div>

            {/* Low-Medium Risk */}
            <div className="flex items-stretch border-b">
              <div className="w-24 md:w-32 bg-lime-500 flex flex-col items-center justify-center p-4 text-white">
                <span className="text-2xl font-bold">2.5 - 3.9</span>
                <span className="text-xs mt-1">{isVi ? 'Thấp-TB' : 'Low-Med'}</span>
              </div>
              <div className="flex-1 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-5 w-5 text-lime-600" />
                  <h3 className="font-semibold text-lime-800">
                    {isVi ? 'Có thể cải thiện' : 'Room for Improvement'}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {isVi 
                    ? 'Nhãn có một số lỗi nhỏ không ảnh hưởng đến an toàn. Nên sửa để tăng tính chuyên nghiệp.'
                    : 'Label has minor issues that don\'t affect safety. Fix them to improve professionalism.'}
                </p>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1 text-lime-700">
                    <Clock className="h-3.5 w-3.5" />
                    {isVi ? 'Có thể delay nhẹ' : 'May cause slight delay'}
                  </span>
                </div>
              </div>
            </div>

            {/* Medium Risk - Yellow */}
            <div className="flex items-stretch border-b">
              <div className="w-24 md:w-32 bg-yellow-500 flex flex-col items-center justify-center p-4 text-white">
                <span className="text-2xl font-bold">4.0 - 5.4</span>
                <span className="text-xs mt-1">{isVi ? 'Trung bình' : 'Medium'}</span>
              </div>
              <div className="flex-1 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <h3 className="font-semibold text-yellow-800">
                    {isVi ? 'Cần sửa trước khi xuất' : 'Fix Before Shipping'}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {isVi 
                    ? 'Có các lỗi nhãn cần được sửa. FDA có thể yêu cầu kiểm tra hoặc gửi cảnh báo.'
                    : 'There are labeling errors that need fixing. FDA may request inspection or send advisory.'}
                </p>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1 text-yellow-700">
                    <FileWarning className="h-3.5 w-3.5" />
                    {isVi ? 'Có thể nhận Advisory Letter' : 'May receive Advisory Letter'}
                  </span>
                </div>
              </div>
            </div>

            {/* Medium-High Risk - Orange */}
            <div className="flex items-stretch border-b">
              <div className="w-24 md:w-32 bg-orange-500 flex flex-col items-center justify-center p-4 text-white">
                <span className="text-2xl font-bold">5.5 - 6.9</span>
                <span className="text-xs mt-1">{isVi ? 'TB-Cao' : 'Med-High'}</span>
              </div>
              <div className="flex-1 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <h3 className="font-semibold text-orange-800">
                    {isVi ? 'Rủi ro đáng kể - Sửa ngay' : 'Significant Risk - Fix Now'}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {isVi 
                    ? 'Nhãn có vấn đề nghiêm trọng. Khả năng cao bị FDA kiểm tra chi tiết hoặc yêu cầu giải trình.'
                    : 'Label has serious issues. High chance of FDA detailed inspection or request for explanation.'}
                </p>
                <div className="flex items-center gap-4 text-xs flex-wrap gap-y-1">
                  <span className="flex items-center gap-1 text-orange-700">
                    <Clock className="h-3.5 w-3.5" />
                    {isVi ? 'Delay 2-4 tuần' : '2-4 week delay'}
                  </span>
                  <span className="flex items-center gap-1 text-orange-700">
                    <Banknote className="h-3.5 w-3.5" />
                    {isVi ? 'Chi phí lưu kho' : 'Storage fees'}
                  </span>
                </div>
              </div>
            </div>

            {/* High Risk - Red */}
            <div className="flex items-stretch border-b">
              <div className="w-24 md:w-32 bg-red-500 flex flex-col items-center justify-center p-4 text-white">
                <span className="text-2xl font-bold">7.0 - 8.4</span>
                <span className="text-xs mt-1">{isVi ? 'Cao' : 'High'}</span>
              </div>
              <div className="flex-1 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <h3 className="font-semibold text-red-800">
                    {isVi ? 'Nguy hiểm - Có thể bị giữ hàng' : 'Dangerous - May Be Detained'}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {isVi 
                    ? 'Nhãn vi phạm nghiêm trọng quy định FDA. Rất có thể bị giữ hàng tại cảng (Detention) và yêu cầu sửa đổi.'
                    : 'Label seriously violates FDA regulations. Likely to be detained at port and required to make corrections.'}
                </p>
                <div className="flex items-center gap-4 text-xs flex-wrap gap-y-1">
                  <span className="flex items-center gap-1 text-red-700">
                    <Package className="h-3.5 w-3.5" />
                    {isVi ? 'Detention tại cảng' : 'Port detention'}
                  </span>
                  <span className="flex items-center gap-1 text-red-700">
                    <Banknote className="h-3.5 w-3.5" />
                    {isVi ? '$500-5,000 phí lưu kho' : '$500-5,000 storage fees'}
                  </span>
                </div>
              </div>
            </div>

            {/* Critical Risk - Dark Red */}
            <div className="flex items-stretch">
              <div className="w-24 md:w-32 bg-red-700 flex flex-col items-center justify-center p-4 text-white">
                <span className="text-2xl font-bold">8.5 - 10</span>
                <span className="text-xs mt-1">{isVi ? 'Nghiêm trọng' : 'Critical'}</span>
              </div>
              <div className="flex-1 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-red-700" />
                  <h3 className="font-semibold text-red-900">
                    {isVi ? 'Cực kỳ nghiêm trọng - Không xuất hàng' : 'Critical - Do NOT Ship'}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {isVi 
                    ? 'Nhãn có vi phạm nghiêm trọng về an toàn (thiếu cảnh báo dị ứng, tuyên bố bệnh). Hàng SẼ bị giữ và có thể bị tiêu hủy.'
                    : 'Label has serious safety violations (missing allergen warnings, disease claims). Goods WILL be detained and may be destroyed.'}
                </p>
                <div className="flex items-center gap-4 text-xs flex-wrap gap-y-1">
                  <span className="flex items-center gap-1 text-red-700">
                    <XCircle className="h-3.5 w-3.5" />
                    {isVi ? 'Bắt buộc bị Detention' : 'Guaranteed Detention'}
                  </span>
                  <span className="flex items-center gap-1 text-red-700">
                    <Banknote className="h-3.5 w-3.5" />
                    {isVi ? 'Mất hàng hoặc hoàn trả' : 'Loss or return'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What causes high risk */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {isVi ? 'Những Lỗi Nào Gây Điểm Rủi Ro Cao?' : 'What Causes High Risk Scores?'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Critical Issues */}
              <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="destructive">{isVi ? 'NGHIÊM TRỌNG' : 'CRITICAL'}</Badge>
                  <span className="text-sm text-red-700 font-medium">+8.0 {isVi ? 'điểm' : 'points'}</span>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium text-red-800">{isVi ? 'Thiếu cảnh báo dị ứng' : 'Missing allergen warnings'}</span>
                      <p className="text-red-600 text-xs mt-0.5">
                        {isVi 
                          ? 'FDA coi đây là mối nguy an toàn - hàng sẽ bị giữ ngay lập tức'
                          : 'FDA considers this a safety hazard - goods will be detained immediately'}
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium text-red-800">{isVi ? 'Tuyên bố chữa bệnh (Disease claim)' : 'Disease claims'}</span>
                      <p className="text-red-600 text-xs mt-0.5">
                        {isVi 
                          ? '"Chữa tiểu đường", "Điều trị ung thư" - vi phạm luật liên bang, có thể bị phạt hình sự'
                          : '"Cures diabetes", "Treats cancer" - federal law violation, possible criminal penalties'}
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium text-red-800">{isVi ? 'Khai báo sai thành phần' : 'Misrepresented ingredients'}</span>
                      <p className="text-red-600 text-xs mt-0.5">
                        {isVi 
                          ? 'Ghi sai thành phần chính hoặc số lượng - có thể dẫn đến recall'
                          : 'Wrong main ingredients or quantities - may lead to recall'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Warning Issues */}
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-amber-500">{isVi ? 'CẢNH BÁO' : 'WARNING'}</Badge>
                  <span className="text-sm text-amber-700 font-medium">+2.5 - 3.5 {isVi ? 'điểm' : 'points'}</span>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium text-amber-800">{isVi ? 'Thiếu DSHEA disclaimer (Thực phẩm chức năng)' : 'Missing DSHEA disclaimer (Supplements)'}</span>
                      <p className="text-amber-600 text-xs mt-0.5">
                        {isVi 
                          ? 'Bắt buộc có dòng "These statements have not been evaluated by FDA..."'
                          : 'Required statement: "These statements have not been evaluated by FDA..."'}
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium text-amber-800">{isVi ? 'Sai format Nutrition Facts' : 'Wrong Nutrition Facts format'}</span>
                      <p className="text-amber-600 text-xs mt-0.5">
                        {isVi 
                          ? 'Sai font, kích thước, thứ tự các chất dinh dưỡng'
                          : 'Wrong font, size, or nutrient order'}
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium text-amber-800">{isVi ? 'Lỗi làm tròn số liệu' : 'Rounding errors'}</span>
                      <p className="text-amber-600 text-xs mt-0.5">
                        {isVi 
                          ? 'FDA có quy tắc làm tròn cụ thể cho từng chất dinh dưỡng'
                          : 'FDA has specific rounding rules for each nutrient'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Info Issues */}
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-blue-500">{isVi ? 'LƯU Ý' : 'INFO'}</Badge>
                  <span className="text-sm text-blue-700 font-medium">+1.0 {isVi ? 'điểm' : 'point'}</span>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium text-blue-800">{isVi ? 'Gợi ý cải thiện' : 'Improvement suggestions'}</span>
                      <p className="text-blue-600 text-xs mt-0.5">
                        {isVi 
                          ? 'Không bắt buộc nhưng nên làm để tăng tính chuyên nghiệp'
                          : 'Not required but recommended for professionalism'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What happens when detained */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-red-500" />
              {isVi ? 'Nếu Bị Giữ Hàng (Detention) Thì Sao?' : 'What Happens If Your Goods Are Detained?'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Consequences */}
              <div>
                <h3 className="font-semibold mb-3 text-red-800 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  {isVi ? 'Hậu quả' : 'Consequences'}
                </h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    <span>
                      <strong>{isVi ? 'Chi phí lưu kho:' : 'Storage fees:'}</strong>{' '}
                      {isVi ? '$50-200/ngày tại cảng' : '$50-200/day at port'}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    <span>
                      <strong>{isVi ? 'Thời gian:' : 'Time:'}</strong>{' '}
                      {isVi ? '2-8 tuần để giải quyết' : '2-8 weeks to resolve'}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    <span>
                      <strong>{isVi ? 'Thuê luật sư/FDA agent:' : 'Lawyer/FDA agent:'}</strong>{' '}
                      {isVi ? '$2,000-10,000' : '$2,000-10,000'}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    <span>
                      <strong>{isVi ? 'Worst case:' : 'Worst case:'}</strong>{' '}
                      {isVi ? 'Hàng bị tiêu hủy hoặc hoàn trả về nước' : 'Goods destroyed or returned to origin'}
                    </span>
                  </li>
                </ul>
              </div>

              {/* How to avoid */}
              <div>
                <h3 className="font-semibold mb-3 text-green-800 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  {isVi ? 'Cách phòng tránh' : 'How to Avoid'}
                </h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span>{isVi ? 'Kiểm tra nhãn với Vexim AI trước khi xuất hàng' : 'Check labels with Vexim AI before shipping'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span>{isVi ? 'Sửa tất cả lỗi CRITICAL và WARNING' : 'Fix all CRITICAL and WARNING issues'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span>{isVi ? 'Đạt điểm rủi ro dưới 4.0 trước khi xuất' : 'Achieve risk score below 4.0 before export'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span>{isVi ? 'Tham khảo chuyên gia Vexim nếu điểm trên 5.0' : 'Consult Vexim expert if score above 5.0'}</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How to reduce score */}
        <Card className="mb-8 border-green-200 bg-green-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <ArrowDown className="h-5 w-5" />
              {isVi ? 'Làm Sao Giảm Điểm Rủi Ro?' : 'How To Reduce Your Risk Score?'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-white border">
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">7.5</div>
                  <div className="text-xs text-muted-foreground">{isVi ? 'Trước' : 'Before'}</div>
                </div>
                <ArrowRight className="h-6 w-6 text-green-600" />
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">2.1</div>
                  <div className="text-xs text-muted-foreground">{isVi ? 'Sau' : 'After'}</div>
                </div>
                <div className="flex-1 ml-4">
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">-72%</Badge>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isVi 
                      ? 'Ví dụ: Sau khi sửa 2 lỗi critical và 3 lỗi warning'
                      : 'Example: After fixing 2 critical and 3 warning issues'}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="p-3 rounded-lg bg-white border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-xs font-bold">1</div>
                    <span className="font-medium text-sm">{isVi ? 'Sửa lỗi CRITICAL' : 'Fix CRITICAL'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isVi 
                      ? 'Mỗi lỗi critical sửa được giảm ~6-8 điểm'
                      : 'Each critical fix reduces ~6-8 points'}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-white border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-xs font-bold">2</div>
                    <span className="font-medium text-sm">{isVi ? 'Sửa lỗi WARNING' : 'Fix WARNING'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isVi 
                      ? 'Mỗi lỗi warning sửa được giảm ~2-3 điểm'
                      : 'Each warning fix reduces ~2-3 points'}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-white border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs font-bold">3</div>
                    <span className="font-medium text-sm">{isVi ? 'Kiểm tra lại' : 'Re-analyze'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isVi 
                      ? 'Upload nhãn mới và phân tích lại để xác nhận'
                      : 'Upload new label and re-analyze to confirm'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-primary" />
              {isVi ? 'Câu Hỏi Thường Gặp' : 'Frequently Asked Questions'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-50">
                <h4 className="font-medium mb-2">
                  {isVi ? 'Điểm bao nhiêu thì an toàn để xuất hàng?' : 'What score is safe to ship?'}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {isVi 
                    ? 'Dưới 4.0 là an toàn. Từ 4.0-5.5 nên cân nhắc sửa. Trên 5.5 thì BẮT BUỘC sửa trước khi xuất.'
                    : 'Below 4.0 is safe. 4.0-5.5 should consider fixing. Above 5.5 MUST fix before shipping.'}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50">
                <h4 className="font-medium mb-2">
                  {isVi ? 'Tại sao điểm của tôi cao dù chỉ có 1 lỗi?' : 'Why is my score high with only 1 issue?'}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {isVi 
                    ? 'Một lỗi CRITICAL (như thiếu cảnh báo dị ứng) có thể đẩy điểm lên 8.0+ vì đây là mối nguy an toàn.'
                    : 'One CRITICAL issue (like missing allergen warning) can push score to 8.0+ because it\'s a safety hazard.'}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50">
                <h4 className="font-medium mb-2">
                  {isVi ? 'Điểm này có bảo đảm hàng không bị giữ?' : 'Does this score guarantee no detention?'}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {isVi 
                    ? 'Không. Điểm rủi ro là DỰ ĐOÁN dựa trên dữ liệu FDA. FDA có thể kiểm tra bất kỳ lô hàng nào, nhưng điểm thấp giảm đáng kể khả năng bị kiểm tra.'
                    : 'No. Risk score is a PREDICTION based on FDA data. FDA can inspect any shipment, but low scores significantly reduce inspection likelihood.'}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50">
                <h4 className="font-medium mb-2">
                  {isVi ? 'Tôi cần hỗ trợ sửa nhãn, làm sao?' : 'I need help fixing labels, what should I do?'}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {isVi 
                    ? 'Trong báo cáo phân tích, bạn có thể yêu cầu "Tư vấn chuyên gia Vexim" để nhận hướng dẫn chi tiết từ chuyên gia FDA của chúng tôi.'
                    : 'In the analysis report, you can request "Vexim Expert Consultation" to receive detailed guidance from our FDA experts.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center p-8 rounded-xl bg-primary/5 border">
          <h2 className="text-xl font-bold mb-2">
            {isVi ? 'Sẵn sàng kiểm tra nhãn sản phẩm?' : 'Ready to check your product label?'}
          </h2>
          <p className="text-muted-foreground mb-4">
            {isVi 
              ? 'Upload hình ảnh nhãn sản phẩm để nhận báo cáo phân tích chi tiết'
              : 'Upload your product label image to receive a detailed analysis report'}
          </p>
          <Link href="/dashboard">
            <Button size="lg">
              {isVi ? 'Bắt đầu phân tích' : 'Start Analysis'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </main>
    </div>
  )
}
