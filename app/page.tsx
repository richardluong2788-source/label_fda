import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  FileText, Shield, Zap, CheckCircle, ArrowRight, AlertTriangle,
  TrendingUp, Clock, DollarSign, BookOpen, Award, Users, Target,
  ScanLine, Database, FlaskConical, Cpu, ChevronRight, Star,
  Package, Microscope, Pill, Sparkles, RefreshCw, Lock,
  ShipWheel, Truck, Ban, UserCheck,
} from 'lucide-react'
import Link from 'next/link'
import { LandingHeader } from '@/components/landing-header'

// ─── Data ────────────────────────────────────────────────────────────────────

const INDUSTRIES = [
  {
    icon: Package,
    label: 'Thực phẩm',
    regs: '21 CFR Part 101',
    detail: 'Nutrition Facts, Allergens, Net Weight, Ingredient List theo chuẩn FDA mới nhất 2016 Label Format.',
    count: '1.247 Warning Letters',
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    iconColor: 'text-blue-600',
  },
  {
    icon: Sparkles,
    label: 'Mỹ phẩm',
    regs: '21 CFR Part 701',
    detail: 'Ranh giới giữa "cosmetic" và "drug" rất mong manh. Chỉ một từ sai trên nhãn cũng có thể khiến sản phẩm bị xếp loại thuốc.',
    count: '312 Warning Letters',
    color: 'bg-purple-50 border-purple-200 text-purple-700',
    iconColor: 'text-purple-600',
  },
  {
    icon: Pill,
    label: 'Thực phẩm chức năng',
    regs: '21 CFR Part 111 + DSHEA',
    detail: 'Structure/Function Claims, Supplement Facts Panel, CGMP - lĩnh vực có tỷ lệ Warning Letter cao nhất.',
    count: '589 Warning Letters',
    color: 'bg-green-50 border-green-200 text-green-700',
    iconColor: 'text-green-600',
  },
  {
    icon: Microscope,
    label: 'Thiết bị y tế (OTC)',
    regs: '21 CFR Part 801',
    detail: 'Device Labeling, Intended Use, Directions for Use. Yêu cầu ghi nhãn đặc thù khác biệt hoàn toàn so với thực phẩm.',
    count: '198 Warning Letters',
    color: 'bg-orange-50 border-orange-200 text-orange-700',
    iconColor: 'text-orange-600',
  },
]

const RECALL_EXAMPLES = [
  {
    date: '03/2025',
    company: 'Landa Foods Co.',
    product: 'Instant Noodles — Mixed Vegetable',
    reason: 'Không khai báo chất gây dị ứng WHEAT (lúa mì) trong Ingredient List',
    cfr: '21 CFR 101.4',
    severity: 'Class I',
    severityColor: 'bg-red-100 text-red-700',
  },
  {
    date: '01/2025',
    company: 'Viet Herb Ltd.',
    product: 'Herbal Tea Supplement',
    reason: 'Structure/Function claim thiếu dòng disclaimer bắt buộc của FDA',
    cfr: '21 CFR 101.93',
    severity: 'Class II',
    severityColor: 'bg-amber-100 text-amber-700',
  },
  {
    date: '11/2024',
    company: 'Saigon Beauty Corp.',
    product: 'Whitening Face Cream',
    reason: 'Nhãn mỹ phẩm chứa drug claim ("brightens skin tone" = tác động cấu trúc da)',
    cfr: '21 CFR 701.3',
    severity: 'Class II',
    severityColor: 'bg-amber-100 text-amber-700',
  },
  {
    date: '09/2024',
    company: 'Delta Snack Inc.',
    product: 'Dried Mango Slices',
    reason: 'Net weight chỉ ghi đơn vị oz, thiếu đơn vị metric (gram) theo yêu cầu',
    cfr: '21 CFR 101.105',
    severity: 'Class III',
    severityColor: 'bg-blue-100 text-blue-700',
  },
]

const FLOW_STEPS = [
  {
    step: '01',
    icon: ScanLine,
    title: 'Tải nhãn lên hệ thống',
    desc: 'Chụp ảnh hoặc tải file nhãn sản phẩm. AI Vision OCR trích xuất toàn bộ nội dung, bố cục và cấu trúc hình ảnh với độ chính xác cao.',
    detail: 'Hỗ trợ JPG, PNG, PDF - tối đa 4 mặt nhãn cùng lúc.',
  },
  {
    step: '02',
    icon: Database,
    title: 'Đối chiếu dữ liệu thực tế',
    desc: 'Từng yếu tố trên nhãn được đối chiếu trực tiếp với 5.346 Warning Letters, Recall, Alerts và toàn bộ 21 CFR liên quan.',
    detail: 'Cơ sở dữ liệu cập nhật hàng tuần từ FDA.gov.',
  },
  {
    step: '03',
    icon: Cpu,
    title: 'Phân tích chuyên sâu',
    desc: 'Mô hình AI chuyên biệt xác định từng điểm vi phạm, trích dẫn mã CFR cụ thể và đánh giá mức độ nghiêm trọng.',
    detail: 'Phân loại: Critical / Major / Minor - Hoàn thành trong ~2 phút.',
  },
  {
    step: '04',
    icon: FlaskConical,
    title: 'Chuyên gia rà soát',
    desc: 'FDA Compliance Specialist rà soát báo cáo AI và bổ sung nhận định chuyên sâu dựa trên kinh nghiệm thực tế.',
    detail: 'Thời gian rà soát: 4–24 giờ làm việc.',
  },
  {
    step: '05',
    icon: FileText,
    title: 'Báo cáo & Chứng nhận',
    desc: 'Báo cáo đầy đủ kèm trích dẫn CFR, hướng dẫn khắc phục từng lỗi, Risk Score tổng thể và xác nhận tuân thủ.',
    detail: 'Xuất PDF chuyên nghiệp - dùng để đàm phán với buyer và importer.',
  },
]

const PERSONAS = [
  {
    icon: Truck,
    situation: '"Tôi đang chuẩn bị xuất lô hàng đầu tiên sang Mỹ"',
    pain: 'Không biết nhãn sản phẩm đã đạt chuẩn FDA chưa. Sợ hàng đến cảng bị giữ lại mà không rõ lý do.',
    solution: 'AI của Vexim sẽ quét nhãn trong 2 phút, chỉ ra chính xác điểm nào cần sửa trước khi xuất hàng.',
  },
  {
    icon: Ban,
    situation: '"Lô hàng của tôi vừa bị FDA detention"',
    pain: 'Đang bị giữ hàng tại cảng, chi phí lưu container tăng mỗi ngày. Cần biết ngay lỗi gì để sửa.',
    solution: 'Chuyên gia của Vexim phân tích nguyên nhân vi phạm, cung cấp hướng dẫn khắc phục và hồ sơ để nộp cho FDA.',
  },
  {
    icon: UserCheck,
    situation: '"Buyer Mỹ yêu cầu Compliance Certificate"',
    pain: 'Đối tác nhập khẩu yêu cầu chứng nhận tuân thủ FDA trước khi ký hợp đồng. Không biết lấy ở đâu.',
    solution: 'Vexim cấp Certification Letter khi nhãn đạt chuẩn - có giá trị để trình cho buyer và importer.',
  },
  {
    icon: RefreshCw,
    situation: '"Tôi cần kiểm tra lại nhãn trước khi in ấn số lượng lớn"',
    pain: 'Đã thiết kế xong nhãn nhưng không chắc chắn đã tuân thủ đầy đủ quy định. In sai thì phải hủy toàn bộ.',
    solution: 'Tải nhãn lên kiểm tra trước khi đặt in. Sửa sớm - tiết kiệm chi phí in lại hàng chục nghìn USD.',
  },
]

const TESTIMONIALS = [
  {
    name: 'Nguyễn Thành Trung',
    title: 'Giám đốc Xuất khẩu — Công ty TNHH Thực phẩm Hòa Bình',
    quote: 'Hai container bánh kẹo bị FDA giữ tại cảng Los Angeles vì khai báo chất gây dị ứng sai. Sau khi sử dụng Vexim, chúng tôi phát hiện lỗi tương tự trên 3 sản phẩm khác TRƯỚC khi xuất hàng. Ước tính tiết kiệm ít nhất 60.000 USD.',
    stars: 5,
  },
  {
    name: 'Trần Thị Minh Hằng',
    title: 'Trưởng phòng QA — Viet Herb & Supplement Co.',
    quote: 'Thực phẩm chức năng có quy định cực kỳ phức tạp. Vexim phát hiện lỗi Structure/Function claim mà cả đội QA nội bộ 5 người đều bỏ sót. Báo cáo chi tiết đến từng mã CFR — rất chuyên nghiệp.',
    stars: 5,
  },
  {
    name: 'Lê Quang Khải',
    title: 'Tổng Giám đốc — Saigon Organic Foods',
    quote: 'Trước đây mỗi lần xuất hàng là một lần lo lắng. Từ khi dùng Vexim, quy trình đã được chuẩn hóa hoàn toàn. 12 tháng liên tiếp zero FDA detention. Đây là khoản đầu tư có tỷ suất sinh lời cao nhất trong công ty.',
    stars: 5,
  },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function Page() {
  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Sticky Header ── */}
      <LandingHeader />

      <main className="max-w-6xl mx-auto px-4">

        {/* ══════════════════════════════════════════════
            HERO
        ══════════════════════════════════════════════ */}
        <section className="py-20 text-center">
          <Badge variant="destructive" className="mb-6 gap-1.5">
            <AlertTriangle className="h-3 w-3" />
            FDA đã ban hành 5.346 Warning Letters &amp; Recall trong 5 năm gần nhất
          </Badge>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-balance leading-tight">
            Lô hàng của bạn<br />
            <span className="text-primary">có vượt qua FDA không?</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-10 text-pretty max-w-3xl mx-auto leading-relaxed">
            <strong className="text-foreground">85% doanh nghiệp Việt Nam</strong> xuất khẩu lần đầu bị detention vì lỗi nhãn dán.
            Vexim đối chiếu nhãn sản phẩm với{' '}
            <strong className="text-foreground">5.346 vi phạm thực tế từ FDA</strong> —
            trả kết quả trong <strong className="text-foreground">2 phút</strong>,
            giúp bạn phát hiện lỗi trước khi mất{' '}
            <strong className="text-foreground">15.000–50.000 USD mỗi lô hàng</strong>.
          </p>

          <div className="flex flex-wrap gap-4 justify-center mb-12">
            <Button size="lg" asChild>
              <Link href="/auth/sign-up">
                <Shield className="mr-2 h-5 w-5" />
                Kiểm tra nhãn của bạn ngay
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/knowledge">
                <BookOpen className="mr-2 h-5 w-5" />
                Xem các trường hợp vi phạm thực tế
              </Link>
            </Button>
          </div>

          {/* Trust bar */}
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8 text-sm border rounded-2xl bg-muted/30 px-6 md:px-8 py-5">
            {[
              { num: '5.346', label: 'Vi phạm FDA trong cơ sở dữ liệu' },
              { num: '4 ngành', label: 'Thực phẩm · Mỹ phẩm · TPCN · OTC' },
              { num: '~2 phút', label: 'Thời gian nhận kết quả' },
              { num: '99,5%', label: 'Tỷ lệ thông quan sau khi sửa' },
              { num: '200+', label: 'Doanh nghiệp Việt Nam tin dùng' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-bold text-primary">{s.num}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            AI NÊN DÙNG VEXIM?
        ══════════════════════════════════════════════ */}
        <section className="py-16">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-3">Dành cho ai?</Badge>
            <h2 className="text-3xl font-bold mb-3 text-balance">Bạn đang ở trong tình huống nào?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Dù đang chuẩn bị xuất khẩu lần đầu hay đã từng bị FDA cảnh cáo - Vexim đều có giải pháp phù hợp.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {PERSONAS.map((p) => {
              const Icon = p.icon
              return (
                <Card key={p.situation} className="p-6 flex gap-4 items-start">
                  <div className="p-3 rounded-xl bg-primary/10 shrink-0">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-base">{p.situation}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{p.pain}</p>
                    <p className="text-sm font-medium text-primary flex items-start gap-1.5">
                      <ArrowRight className="h-4 w-4 mt-0.5 shrink-0" />
                      {p.solution}
                    </p>
                  </div>
                </Card>
              )
            })}
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            NGÀNH NGHỀ HỖ TRỢ
        ══════════════════════════════════════════════ */}
        <section className="py-16">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-3">Phạm vi hỗ trợ</Badge>
            <h2 className="text-3xl font-bold mb-3 text-balance">4 ngành hàng do FDA kiểm soát - Vexim hỗ trợ toàn bộ</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Mỗi ngành có bộ quy định riêng biệt. AI của Vexim được huấn luyện chuyên sâu trên từng nhóm 21 CFR tương ứng.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {INDUSTRIES.map((ind) => {
              const Icon = ind.icon
              return (
                <Card key={ind.label} className={`p-5 border-2 ${ind.color} bg-opacity-50`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-white/70">
                      <Icon className={`h-5 w-5 ${ind.iconColor}`} />
                    </div>
                    <h3 className="font-bold">{ind.label}</h3>
                  </div>
                  <div className="text-xs font-mono font-semibold mb-2 opacity-80">{ind.regs}</div>
                  <p className="text-xs leading-relaxed mb-3 opacity-90">{ind.detail}</p>
                  <Badge variant="outline" className="text-xs border-current opacity-70">{ind.count}</Badge>
                </Card>
              )
            })}
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            FDA RECALL DATABASE
        ══════════════════════════════════════════════ */}
        <section className="py-16">
          <Card className="p-6 md:p-8 border-2 border-red-200 bg-gradient-to-br from-red-50 to-orange-50">
            <div className="flex items-start gap-4 mb-8">
              <div className="p-3 bg-red-600 rounded-xl shrink-0">
                <Database className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">Cơ sở dữ liệu vi phạm FDA thực tế</h2>
                <p className="text-muted-foreground">
                  Đây không phải lý thuyết - mỗi dòng dữ liệu dưới đây là một doanh nghiệp đã phải trả giá đắt vì lỗi nhãn dán.
                </p>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border bg-white mb-6">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 border-b">
                  <tr>
                    <th className="text-left p-3 font-semibold text-muted-foreground">Ngày</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground">Sản phẩm</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground">Vi phạm</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground">Mã CFR</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground">Phân loại</th>
                  </tr>
                </thead>
                <tbody>
                  {RECALL_EXAMPLES.map((r, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-muted/20'}>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">{r.date}</td>
                      <td className="p-3">
                        <div className="font-medium">{r.product}</div>
                        <div className="text-xs text-muted-foreground">{r.company}</div>
                      </td>
                      <td className="p-3 text-sm max-w-xs">{r.reason}</td>
                      <td className="p-3 font-mono text-xs text-primary">{r.cfr}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${r.severityColor}`}>
                          {r.severity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border p-4 text-center">
                <div className="text-2xl font-bold text-red-600 mb-1">Class I</div>
                <div className="text-sm font-medium mb-1">Mức nguy hiểm cao nhất</div>
                <p className="text-xs text-muted-foreground">Có thể gây hại sức khỏe nghiêm trọng hoặc tử vong. Phải thu hồi toàn bộ ngay lập tức.</p>
              </div>
              <div className="bg-white rounded-xl border p-4 text-center">
                <div className="text-2xl font-bold text-amber-600 mb-1">Class II</div>
                <div className="text-sm font-medium mb-1">Nguy cơ gây hại tạm thời</div>
                <p className="text-xs text-muted-foreground">Có thể gây hiểu nhầm nghiêm trọng hoặc ảnh hưởng sức khỏe tạm thời. Chiếm đa số vi phạm nhãn.</p>
              </div>
              <div className="bg-white rounded-xl border p-4 text-center">
                <div className="text-2xl font-bold text-blue-600 mb-1">Class III</div>
                <div className="text-sm font-medium mb-1">Vi phạm kỹ thuật</div>
                <p className="text-xs text-muted-foreground">Không gây hại trực tiếp, nhưng hàng vẫn bị giữ tại cảng và từ chối nhập khẩu vào Mỹ.</p>
              </div>
            </div>
          </Card>
        </section>

        {/* ══════════════════════════════════════════════
            LUỒNG PHÂN TÍCH AI
        ══════════════════════════════════════════════ */}
        <section className="py-16">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-3">Quy trình hoạt động</Badge>
            <h2 className="text-3xl font-bold mb-3 text-balance">Nhận báo cáo chỉ trong 5 bước</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Minh bạch, chính xác, có thể kiểm chứng với chuyên gia. Mỗi vi phạm đều kèm mã CFR và hướng dẫn khắc phục cụ thể.
            </p>
          </div>

          <div className="relative">
            {/* connector line */}
            <div className="hidden lg:block absolute top-8 left-[10%] right-[10%] h-0.5 bg-border z-0" />

            <div className="grid lg:grid-cols-5 gap-6 relative z-10">
              {FLOW_STEPS.map((s) => {
                const Icon = s.icon
                return (
                  <div key={s.step} className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-md">
                      <Icon className="h-7 w-7 text-primary-foreground" />
                    </div>
                    <div className="text-xs font-bold text-primary mb-1">BƯỚC {s.step}</div>
                    <h3 className="font-bold mb-2">{s.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-2">{s.desc}</p>
                    <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">{s.detail}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Sample result card */}
          <Card className="mt-12 p-6 border-2 border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2 mb-4">
              <Cpu className="h-5 w-5 text-primary" />
              <h3 className="font-bold">Ví dụ kết quả phân tích thực tế</h3>
              <Badge variant="secondary" className="ml-auto">Mẫu minh họa</Badge>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-red-700 mb-0.5">NGHIÊM TRỌNG - 21 CFR 101.4(b)(2)</div>
                    <p className="text-sm text-red-800">Chất gây dị ứng MILK (sữa) không được khai báo trong Allergen Statement. Phải bổ sung dòng "Contains: Milk" hoặc in đậm trong danh sách thành phần.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-amber-700 mb-0.5">QUAN TRỌNG - 21 CFR 101.9(c)(7)</div>
                    <p className="text-sm text-amber-800">Added Sugars (đường bổ sung) chưa được khai báo riêng trong bảng Nutrition Facts. Bắt buộc theo định dạng mới từ 01/01/2021.</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-amber-700 mb-0.5">QUAN TRỌNG - 21 CFR 101.105(a)</div>
                    <p className="text-sm text-amber-800">Khối lượng tịnh chỉ ghi "8 oz", thiếu đơn vị hệ mét (226g). FDA yêu cầu ghi đồng thời cả hai hệ đơn vị.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-green-700 mb-0.5">ĐẠT CHUẨN - 21 CFR 101.2(b)</div>
                    <p className="text-sm text-green-800">Mặt hiển thị chính có đầy đủ Tên sản phẩm, Khối lượng tịnh, Nhãn hiệu. Kích thước chữ đạt yêu cầu tối thiểu.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4 pt-4 border-t">
              <div className="text-sm"><span className="text-muted-foreground">Điểm rủi ro:</span> <strong className="text-red-600 text-lg">7,8/10</strong></div>
              <div className="text-sm"><span className="text-muted-foreground">Nghiêm trọng:</span> <strong className="text-red-600">1</strong></div>
              <div className="text-sm"><span className="text-muted-foreground">Quan trọng:</span> <strong className="text-amber-600">2</strong></div>
              <div className="text-sm"><span className="text-muted-foreground">Nhẹ:</span> <strong className="text-blue-600">1</strong></div>
              <div className="ml-auto">
                <Badge variant="destructive">Cần khắc phục trước khi xuất hàng</Badge>
              </div>
            </div>
          </Card>
        </section>

        {/* ══════════════════════════════════════════════
            AI TRAINING DATA
        ══════════════════════════════════════════════ */}
        <section className="py-16">
          <Card className="p-6 md:p-8 border-2 border-primary/20">
            <div className="flex items-start gap-4 mb-8">
              <div className="p-3 bg-primary rounded-xl shrink-0">
                <Target className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">Tại sao kết quả của Vexim lại đáng tin cậy?</h2>
                <p className="text-muted-foreground">AI của Vexmim được huấn luyện trực tiếp trên dữ liệu cưỡng chế thực tế của FDA - không chỉ lý thuyết sách vở.</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                {[
                  {
                    title: '5.346 FDA Warning Letters & Recalls (2021–2025)',
                    desc: 'Toàn bộ vi phạm thực tế trên cả 4 ngành. AI học từ chính những lỗi mà doanh nghiệp đã bị FDA xử phạt.',
                  },
                  {
                    title: '21 CFR Part 101, 111, 701, 801',
                    desc: 'Toàn bộ quy định ghi nhãn cho Thực phẩm, TPCN, Mỹ phẩm và Thiết bị y tế. Cập nhật theo Federal Register.',
                  },
                  {
                    title: 'Tài liệu hướng dẫn của FDA (Draft + Final)',
                    desc: 'Draft Guidance, CPG, Import Alerts và Q&A - các tài liệu diễn giải quy định được FDA sử dụng trong thực tế.',
                  },
                  {
                    title: 'Dữ liệu cảnh báo nhập khẩu (Alerts FDA)',
                    desc: 'Hồ sơ các lô hàng bị từ chối tại cảng Mỹ - giúp AI hiểu pattern vi phạm phổ biến nhất theo từng loại sản phẩm.',
                  },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold mb-0.5">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                  <p className="font-semibold text-amber-900 mb-3">Các vi phạm phổ biến nhất theo ngành:</p>
                  <div className="space-y-2 text-sm text-amber-800">
                    {[
                      ['Thực phẩm', 'Sai đơn vị khối lượng tịnh', '31%', '1.187 vụ'],
                      ['Thực phẩm', 'Sai định dạng Nutrition Facts 2016', '24%', '894 vụ'],
                      ['TP/TPCN', 'Không khai báo chất gây dị ứng', '17%', '618 vụ'],
                      ['TPCN', 'Thiếu disclaimer cho claim chức năng', '22%', '429 vụ'],
                      ['Mỹ phẩm', 'Nhãn chứa tuyên bố dược phẩm', '34%', '306 vụ'],
                    ].map(([cat, vio, pct, cnt]) => (
                      <div key={vio} className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs border-amber-400 text-amber-700 shrink-0">{cat}</Badge>
                        <span className="flex-1">{vio}</span>
                        <span className="font-bold shrink-0">{pct}</span>
                        <span className="text-xs opacity-60 shrink-0">{cnt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-muted/40 rounded-xl p-5 flex items-start gap-3">
                  <RefreshCw className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold mb-1">Cơ sở dữ liệu được cập nhật hàng tuần</p>
                    <p className="text-sm text-muted-foreground">
                      Mỗi Warning Letter mới từ FDA.gov được đội ngũ kỹ thuật Vexim xử lý và đưa vào hệ thống trong vòng 7 ngày.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* ══════════════════════════════════════════════
            QUY TRÌNH FDA TẠI CẢNG + URGENCY
        ══════════════════════════════════════════════ */}
        <section className="py-16">
          <Card className="p-6 md:p-8 border-2 border-red-200 bg-gradient-to-br from-red-50 to-orange-50">
            <div className="flex items-start gap-4 mb-8">
              <div className="p-3 bg-red-600 rounded-xl shrink-0">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">Điều gì xảy ra khi hàng đến cảng Mỹ? Bạn nên biết</h2>
                <p className="text-muted-foreground">FDA sử dụng hệ thống AI PREDICT 2.0 từ năm 2024 - tự động phát hiện lô hàng rủi ro cao.</p>
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-4 mb-8">
              {[
                { step: '1', color: 'border-l-blue-500', badge: 'text-blue-700', title: 'Khai báo nhập khẩu', desc: 'Container đến cảng, nhà nhập khẩu nộp hồ sơ khai báo cho Hải quan Mỹ (CBP).' },
                { step: '2', color: 'border-l-amber-500', badge: 'text-amber-700', title: 'FDA sàng lọc tự động', desc: 'Hệ thống AI PREDICT của FDA quét tự động, đánh dấu sản phẩm có rủi ro cao.' },
                { step: '3', color: 'border-l-red-500', badge: 'text-red-700', title: 'Kiểm tra vật lý', desc: 'FDA lấy mẫu kiểm tra nhãn. Phát hiện vi phạm → Giữ hàng (Detention Notice).' },
                { step: '4', color: 'border-l-green-500', badge: 'text-green-700', title: 'Thông quan hoặc từ chối', desc: 'Đạt → hàng được thông quan. Không đạt → từ chối nhập khẩu, phải vận chuyển về hoặc tiêu hủy.' },
              ].map((s) => (
                <div key={s.step} className={`bg-white p-4 rounded-xl border-l-4 ${s.color}`}>
                  <div className={`text-xs font-bold mb-1 ${s.badge}`}>BƯỚC {s.step}</div>
                  <h4 className="font-bold mb-2 text-sm">{s.title}</h4>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <Card className="p-5 border-l-4 border-l-red-500 bg-white">
                <div className="flex items-center gap-2 mb-2"><DollarSign className="h-5 w-5 text-red-600" /><h5 className="font-bold text-sm">Chi phí giữ hàng</h5></div>
                <div className="text-2xl font-bold text-red-600 mb-1">$5.000–15.000</div>
                <p className="text-xs text-muted-foreground">Phí container, phí lưu bãi, phí trễ tàu — tăng theo từng ngày bị giữ.</p>
              </Card>
              <Card className="p-5 border-l-4 border-l-orange-500 bg-white">
                <div className="flex items-center gap-2 mb-2"><Clock className="h-5 w-5 text-orange-600" /><h5 className="font-bold text-sm">Thời gian chậm trễ</h5></div>
                <div className="text-2xl font-bold text-orange-600 mb-1">2–4 tuần</div>
                <p className="text-xs text-muted-foreground">Chờ sửa nhãn hoặc vận chuyển về. Mất suất lên kệ siêu thị, mất buyer.</p>
              </Card>
              <Card className="p-5 border-l-4 border-l-red-500 bg-white">
                <div className="flex items-center gap-2 mb-2"><AlertTriangle className="h-5 w-5 text-red-600" /><h5 className="font-bold text-sm">Tổn hại uy tín</h5></div>
                <div className="text-2xl font-bold text-red-600 mb-1">Khó phục hồi</div>
                <p className="text-xs text-muted-foreground">FDA lưu hồ sơ vi phạm vĩnh viễn. Các lô hàng tiếp theo chắc chắn sẽ bị kiểm tra kỹ hơn.</p>
              </Card>
            </div>

            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 text-center">
              <h3 className="text-lg md:text-xl font-bold text-green-900 mb-2 text-balance">
                Kiểm tra TRƯỚC khi gửi hàng = Tiết kiệm 15.000–50.000 USD mỗi lô
              </h3>
              <p className="text-green-800 mb-4">
                Chi phí sử dụng Vexim chỉ từ <strong>499.000đ/tháng</strong>. Chỉ cần tránh được 1 lần bị từ chối - tỷ suất sinh lời lên đến <strong>100–1.000 lần</strong>.
              </p>
              <Button size="lg" className="bg-green-600 hover:bg-green-700" asChild>
                <Link href="/auth/sign-up">
                  Kiểm tra nhãn miễn phí ngay
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </Card>
        </section>

        {/* ══════════════════════════════════════════════
            VEXIM VS TƯ VẤN TRUYỀN THỐNG
        ══════════════════════════════════════════════ */}
        <section className="py-16">
          <Card className="p-6 md:p-8">
            <div className="flex items-start gap-4 mb-8">
              <div className="p-3 bg-green-600 rounded-xl shrink-0">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">Vexim so với dịch vụ tư vấn truyền thống</h2>
                <p className="text-muted-foreground">Nhanh hơn, chính xác hơn, tiết kiệm hơn - và không phụ thuộc vào kiến thức cá nhân của một chuyên gia.</p>
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-semibold">Tiêu chí so sánh</th>
                    <th className="text-left p-3 font-semibold text-primary">Vexim AI Platform</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground">Tư vấn truyền thống</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Thời gian phân tích', '2–3 phút', '3–7 ngày làm việc'],
                    ['Chi phí', '299.000đ–899.000đ/tháng', '$500–2.000 mỗi lần kiểm tra'],
                    ['Phạm vi ngành', 'Thực phẩm, Mỹ phẩm, TPCN, OTC', 'Thường chuyên sâu 1 ngành duy nhất'],
                    ['Nguồn dữ liệu', '2.346 Warning Letters + toàn bộ 21 CFR', 'Dựa vào kinh nghiệm cá nhân'],
                    ['Tính nhất quán', '100% nhất quán giữa các lần kiểm tra', 'Phụ thuộc trạng thái chuyên gia'],
                    ['Kiểm tra lại sau khi sửa', 'Miễn phí, không giới hạn', 'Tính thêm phí mỗi lần'],
                    ['Báo cáo chi tiết', 'PDF kèm mã CFR + ảnh chụp nhãn', 'File Word hoặc email tóm tắt'],
                    ['Hỗ trợ sau phân tích', 'Chuyên gia rà soát + tư vấn 1-1', 'Hạn chế hoặc không có'],
                  ].map(([crit, vexim, trad], i) => (
                    <tr key={crit} className={i % 2 === 0 ? 'bg-white' : 'bg-muted/20'}>
                      <td className="p-3 font-medium">{crit}</td>
                      <td className="p-3 text-primary font-medium">{vexim}</td>
                      <td className="p-3 text-muted-foreground">{trad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        {/* ══════════════════════════════════════════════
            KHÁCH HÀNG NÓI GÌ
        ══════════════════════════════════════════════ */}
        <section className="py-16">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-3">Phản hồi từ khách hàng</Badge>
            <h2 className="text-3xl font-bold mb-3 text-balance">Hơn 200 doanh nghiệp Việt Nam đã kiểm chứng hiệu quả</h2>
            <p className="text-muted-foreground">Tỷ lệ thông quan FDA đạt 99,5% sau khi sử dụng Vexim.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <Card key={i} className="p-6 flex flex-col gap-4">
                <div className="flex gap-0.5">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">{`"${t.quote}"`}</p>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.title}</div>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">{t.result}</Badge>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            BẠN NHẬN ĐƯỢC GÌ
        ══════════════════════════════════════════════ */}
        <section className="py-16">
          <Card className="p-6 md:p-8 border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
            <div className="flex items-start gap-4 mb-8">
              <div className="p-3 bg-blue-600 rounded-xl shrink-0">
                <Award className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">Bạn nhận được gì khi sử dụng Vexim?</h2>
                <p className="text-muted-foreground">Cam kết từ đội ngũ FDA Compliance Specialist với hơn 10 năm kinh nghiệm thực chiến.</p>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              {[
                {
                  title: 'Báo cáo AI chuyên sâu',
                  items: [
                    'Quét toàn bộ nhãn bằng OCR + Vision AI',
                    'Phát hiện vi phạm kèm trích dẫn mã CFR cụ thể',
                    'Phân loại mức độ: Nghiêm trọng / Quan trọng / Nhẹ',
                    'Hướng dẫn khắc phục chi tiết từng điểm vi phạm',
                  ],
                },
                {
                  title: 'Tư vấn bởi chuyên gia',
                  items: [
                    'Rà soát bởi FDA Compliance Specialist',
                    'Tư vấn trực tiếp 1-1 qua call hoặc email',
                    'Đánh giá rủi ro bị từ chối tại cảng Mỹ',
                    'Hỗ trợ chỉnh sửa file thiết kế nhãn',
                  ],
                },
                {
                  title: 'Đảm bảo & Chứng nhận',
                  items: [
                    'Cấp Certification Letter khi nhãn đạt chuẩn',
                    'Kiểm tra lại miễn phí khi có thay đổi nhỏ',
                    'Hỗ trợ khi FDA yêu cầu giải trình bổ sung',
                    'Cam kết bồi thường nếu sai sót thuộc về Vexim',
                  ],
                },
              ].map((col) => (
                <div key={col.title} className="bg-white p-5 rounded-xl border">
                  <div className="text-xl font-bold text-primary mb-3">{col.title}</div>
                  <ul className="space-y-2">
                    {col.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="bg-white border border-blue-300 rounded-xl p-5 flex items-start gap-3">
              <Users className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-blue-900 mb-1">Cam kết từ đội ngũ Vexim Compliance:</p>
                <p className="text-sm text-blue-800">
                  {'"'}Vexim Global kết hợp công nghệ AI với đội ngũ chuyên gia tuân thủ FDA, phân tích dữ liệu cưỡng chế thực tế
                  (Regulation — Warning Letter — Recall) nhằm đánh giá rủi ro nhãn dán và hồ sơ xuất khẩu.
                  Chúng tôi đã đồng hành cùng hàng trăm doanh nghiệp Việt Nam chuẩn hóa nhãn sản phẩm trước khi xuất khẩu sang Mỹ,
                  tập trung giảm thiểu nguy cơ bị giữ hàng, ghi nhãn sai quy cách và thu hồi sản phẩm.{'"'}
                </p>
              </div>
            </div>
          </Card>
        </section>

        {/* ══════════════════════════════════════════════
            CTA CUỐI TRANG
        ══════════════════════════════════════════════ */}
        <section className="py-16">
          <Card className="p-8 md:p-12 bg-primary text-primary-foreground text-center">
            <Lock className="h-10 w-10 mx-auto mb-4 opacity-80" />
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-balance">
              Đừng để lô hàng tiếp theo trở thành bài học đắt giá
            </h2>
            <p className="text-base md:text-lg mb-8 opacity-90 text-pretty max-w-2xl mx-auto">
              Hơn 200 doanh nghiệp Việt Nam đã sử dụng Vexim để bảo vệ lô hàng, giữ vững uy tín thương hiệu
              và đảm bảo hợp đồng xuất khẩu không bị gián đoạn.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/auth/sign-up">
                  <Shield className="mr-2 h-5 w-5" />
                  Kiểm tra nhãn miễn phí — Bắt đầu trong 2 phút
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="bg-white/10 border-white/30 hover:bg-white/20 text-primary-foreground" asChild>
                <Link href="/pricing">
                  Xem bảng giá chi tiết
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Card>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className="border-t bg-muted/30 mt-8">
        <div className="container mx-auto px-4 py-10 max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="rounded-lg bg-primary p-1.5">
                  <FileText className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-bold">Vexim Global</span>
              </div>
              <p className="text-sm text-muted-foreground">Nền tảng kiểm tra tuân thủ FDA bằng AI dành cho doanh nghiệp Việt Nam xuất khẩu sang thị trường Mỹ.</p>
            </div>
            <div>
              <h4 className="font-bold mb-3">Sản phẩm</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/analyze" className="hover:text-foreground transition-colors">Phân tích nhãn sản phẩm</Link></li>
                <li><Link href="/pricing" className="hover:text-foreground transition-colors">Bảng giá dịch vụ</Link></li>
                <li><Link href="/knowledge" className="hover:text-foreground transition-colors">Cơ sở kiến thức FDA</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-3">Công ty</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground transition-colors">Về Vexim Global</Link></li>
                <li><Link href="/contact" className="hover:text-foreground transition-colors">Liên hệ hợp tác</Link></li>
                <li><Link href="/terms" className="hover:text-foreground transition-colors">Điều khoản dịch vụ</Link></li>
                <li><Link href="/privacy" className="hover:text-foreground transition-colors">Chính sách bảo mật</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-3">Hỗ trợ khách hàng</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Email: support@veximglobal.com</li>
                <li>Hotline: +84 344 591 641</li>
              </ul>
            </div>
          </div>
          <div className="text-center text-sm text-muted-foreground border-t pt-6">
            &copy; 2026 Vexim Global. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  )
}
