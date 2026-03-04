import { Metadata } from 'next'
import {
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  BarChart2,
  FlaskConical,
  FileText,
  Lightbulb,
  ChevronRight,
  Star,
  X,
  Camera,
  ZoomIn,
  Layers,
  Settings2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Hướng dẫn sử dụng | FDA Label Checker',
  description:
    'Hướng dẫn upload ảnh nhãn sản phẩm đúng cách để AI phân tích tuân thủ FDA chính xác nhất.',
}

const IMAGE_TYPES = [
  {
    id: 'pdp',
    icon: ImageIcon,
    label: 'Mặt trước (PDP)',
    subtitle: 'Principal Display Panel',
    badge: 'Bắt buộc',
    badgeVariant: 'destructive' as const,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description:
      'Mặt chính của bao bì sản phẩm, phần người tiêu dùng nhìn thấy đầu tiên khi mua hàng.',
    mustHave: [
      'Tên thương hiệu (Brand Name) rõ ràng',
      'Tên sản phẩm (Product Name)',
      'Khối lượng tịnh / Net Weight — ví dụ: "Net Wt 2 oz (56g)"',
      'Toàn bộ mặt trước, không bị che khuất',
    ],
    avoid: [
      'Ảnh chụp nghiêng, méo hoặc cong',
      'Góc chụp cắt mất phần Net Weight',
      'Ảnh bị bóng sáng chói lên chữ',
    ],
    tip: 'AI dùng ảnh này để xác định Brand Name, Product Name và Net Quantity Statement — 3 yếu tố bắt buộc theo 21 CFR 101.105.',
  },
  {
    id: 'nutrition',
    icon: BarChart2,
    label: 'Bảng Nutrition Facts',
    subtitle: 'Nutrition Facts Panel',
    badge: 'Bắt buộc',
    badgeVariant: 'destructive' as const,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    description:
      'Bảng thông tin dinh dưỡng tiêu chuẩn FDA — toàn bộ bảng phải hiển thị đầy đủ trong 1 ảnh.',
    mustHave: [
      'Toàn bộ bảng Nutrition Facts từ đầu đến cuối (*)',
      'Chữ phải đủ sắc nét để đọc được từng con số',
      'Serving Size, Calories, tất cả dòng dinh dưỡng đều trong khung hình',
      'Không bị che bởi tay, nhãn phụ, hoặc băng keo',
    ],
    avoid: [
      'Chụp cận quá, cắt mất dòng đầu hoặc cuối bảng',
      'Ảnh mờ khiến số bị nhòe (AI sẽ đọc sai giá trị)',
      'Bảng bị nhăn, gấp khiến chữ cong',
    ],
    tip: 'AI đọc từng con số trong bảng bằng OCR. Nếu ảnh mờ hoặc cắt mất dòng, giá trị dinh dưỡng sẽ bị trích xuất sai → kết quả phân tích không chính xác.',
  },
  {
    id: 'ingredients',
    icon: FlaskConical,
    label: 'Thành phần & Allergens',
    subtitle: 'Ingredient List + Allergen Statement',
    badge: 'Khuyến nghị',
    badgeVariant: 'secondary' as const,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    description:
      'Danh sách thành phần và cảnh báo dị ứng. Upload để AI kiểm tra đầy đủ 8 allergen bắt buộc theo FALCPA.',
    mustHave: [
      'Toàn bộ danh sách Ingredients (tất cả các dòng)',
      'Phần "Contains:" hoặc "Allergen warning" nếu có',
      'Chữ đủ rõ để AI nhận diện từng thành phần',
    ],
    avoid: [
      'Chỉ chụp một phần danh sách (AI sẽ bỏ sót thành phần cuối)',
      'Ảnh quá tối hoặc contrast thấp',
    ],
    tip: 'Nếu Ingredient List nằm chung bảng Nutrition Facts, bạn không cần upload riêng — AI tự trích xuất từ ảnh Nutrition.',
  },
  {
    id: 'other',
    icon: FileText,
    label: 'Mặt khác',
    subtitle: 'Other Panels / Back / Side',
    badge: 'Tùy chọn',
    badgeVariant: 'outline' as const,
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    description:
      'Các mặt còn lại của bao bì có chứa health claims, warning statements hoặc thông tin bổ sung.',
    mustHave: [
      'Mặt sau hoặc mặt bên nếu có health claims ("High in Protein", "Low Fat"...)',
      'Phần "Supplement Facts" nếu là thực phẩm bổ sung',
      '"Drug Facts" panel nếu là OTC drug',
    ],
    avoid: ['Upload ảnh trùng lặp cùng một mặt nhiều lần'],
    tip: 'Health claims như "Fat Free", "Low Sodium", "Excellent Source of..." đều được kiểm tra theo 21 CFR Part 101. Nếu có claims, nhất định phải upload mặt này.',
  },
]

const DO_DONT = [
  {
    good: 'Ảnh chụp thẳng, vuông góc với bề mặt nhãn',
    bad: 'Ảnh chụp nghiêng, bị méo hình thang',
  },
  {
    good: 'Ánh sáng đều, không có bóng đổ lên chữ',
    bad: 'Đèn flash chói tạo vùng sáng trắng trên bảng số',
  },
  {
    good: 'Độ phân giải tối thiểu 800×800px',
    bad: 'Ảnh zoom từ xa, chữ bé hơn 1mm trên màn hình',
  },
  {
    good: 'Toàn bộ mặt nhãn nằm trong khung hình',
    bad: 'Cạnh nhãn bị cắt mất góc',
  },
  {
    good: 'Tên file không dấu, không khoảng trắng: label-front.jpg',
    bad: 'Tên file tiếng Việt có dấu: ảnh nhãn trước.jpg',
  },
]

const ADVANCED_TIPS = [
  {
    icon: Settings2,
    title: 'Chọn đúng danh mục sản phẩm',
    desc: 'Vào "Tùy chọn nâng cao" và chọn đúng Product Category (Food, Beverage, Dietary Supplement, Cosmetic...). AI sẽ áp dụng bộ quy định FDA đúng với loại sản phẩm của bạn thay vì dùng mặc định.',
  },
  {
    icon: ZoomIn,
    title: 'Nhập kích thước vật lý của nhãn',
    desc: 'Đo chiều rộng × chiều cao của bề mặt nhãn (cm) và nhập vào ô Kích thước vật lý. AI dùng thông tin này để kiểm tra font size có đạt chuẩn tối thiểu 21 CFR 101.105 hay không.',
  },
  {
    icon: Layers,
    title: 'Khai báo ngôn ngữ phụ',
    desc: 'Nếu nhãn có song ngữ (Anh + Việt), bật "Nhãn này có chữ ngoài tiếng Anh" và chọn ngôn ngữ. AI sẽ kiểm tra xem tất cả thông tin bắt buộc đã dịch đầy đủ chưa theo 21 CFR 101.15.',
  },
  {
    icon: Camera,
    title: 'Cách chụp ảnh chất lượng cao',
    desc: 'Đặt sản phẩm lên nền trắng, chụp bằng điện thoại ở chế độ ban ngày tự nhiên hoặc đèn trắng. Giữ điện thoại song song với mặt nhãn. Không dùng zoom số.',
  },
]

export default function GuidePage() {
  return (
    <main className="min-h-screen bg-background font-sans">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
              Dashboard
            </Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Hướng dẫn sử dụng</span>
          </div>
          <Link href="/dashboard">
            <Button variant="outline" size="sm">Quay lại Dashboard</Button>
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-16">

        {/* Hero */}
        <div className="text-center space-y-4">
          <Badge variant="secondary" className="text-xs px-3 py-1">Hướng dẫn sử dụng</Badge>
          <h1 className="text-4xl font-bold tracking-tight text-balance">
            Upload ảnh nhãn đúng cách để AI phân tích chính xác
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto text-pretty">
            AI phân tích nhãn bằng OCR (nhận dạng ký tự quang học). Chất lượng ảnh đầu vào
            quyết định trực tiếp độ chính xác của kết quả. Đọc hướng dẫn dưới đây trước khi bắt đầu.
          </p>
        </div>

        {/* How it works */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-1">Hệ thống hoạt động như thế nào?</h2>
            <p className="text-muted-foreground">Hiểu cách AI đọc nhãn giúp bạn chuẩn bị ảnh tốt hơn.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                step: '01',
                title: 'Phân tích từng ảnh riêng biệt',
                desc: 'Mỗi ảnh được AI GPT-4o Vision xử lý độc lập. Ảnh PDP trích xuất Brand/Product/Net Weight. Ảnh Nutrition Facts trích xuất tất cả giá trị dinh dưỡng. Ảnh Ingredients trích xuất danh sách thành phần và allergens.',
              },
              {
                step: '02',
                title: 'Ghép dữ liệu từ tất cả ảnh',
                desc: 'Hệ thống tổng hợp thông tin từ tất cả ảnh bạn upload. Ảnh nào thiếu sẽ dẫn đến thiếu dữ liệu phân tích — đặc biệt là PDP và Nutrition Facts là hai ảnh bắt buộc không thể thiếu.',
              },
              {
                step: '03',
                title: 'Đối chiếu với Knowledge Base FDA',
                desc: 'Dữ liệu trích xuất được so sánh với cơ sở dữ liệu gồm 21 CFR, Warning Letters thực tế, Recalls và Import Alerts để phát hiện vi phạm và đề xuất cách sửa.',
              },
            ].map((item) => (
              <Card key={item.step} className="p-6 space-y-3">
                <div className="text-3xl font-bold text-primary/20">{item.step}</div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Image type guide */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-1">4 loại ảnh cần upload</h2>
            <p className="text-muted-foreground">
              Hệ thống chia nhãn thành 4 khu vực. Mỗi khu vực phục vụ mục đích phân tích khác nhau.
            </p>
          </div>

          <div className="space-y-6">
            {IMAGE_TYPES.map((type) => {
              const Icon = type.icon
              return (
                <Card key={type.id} id={type.id} className={`border-2 ${type.borderColor} overflow-hidden scroll-mt-8`}>
                  <div className={`${type.bgColor} px-6 py-4 flex items-start gap-4`}>
                    <div className={`rounded-lg bg-background p-2 shadow-sm`}>
                      <Icon className={`h-6 w-6 ${type.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-lg">{type.label}</h3>
                        <span className="text-sm text-muted-foreground">— {type.subtitle}</span>
                        <Badge variant={type.badgeVariant}>{type.badge}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
                    </div>
                  </div>

                  <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold flex items-center gap-1.5 text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Ảnh phải có đủ
                      </p>
                      <ul className="space-y-1.5">
                        {type.mustHave.map((item, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex gap-2">
                            <span className="text-emerald-500 mt-0.5 shrink-0">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold flex items-center gap-1.5 text-destructive">
                        <X className="h-4 w-4" />
                        Tránh những lỗi này
                      </p>
                      <ul className="space-y-1.5">
                        {type.avoid.map((item, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex gap-2">
                            <span className="text-destructive mt-0.5 shrink-0">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className={`${type.bgColor} border-t ${type.borderColor} px-6 py-3 flex gap-2`}>
                    <Lightbulb className={`h-4 w-4 mt-0.5 shrink-0 ${type.color}`} />
                    <p className="text-sm text-muted-foreground">{type.tip}</p>
                  </div>
                </Card>
              )
            })}
          </div>
        </section>

        {/* Do & Don't */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-1">Tiêu chuẩn chất lượng ảnh</h2>
            <p className="text-muted-foreground">Áp dụng cho tất cả các loại ảnh upload lên hệ thống.</p>
          </div>
          <Card className="overflow-hidden">
            <div className="grid grid-cols-2 border-b">
              <div className="px-5 py-3 bg-emerald-50 flex items-center gap-2 border-r">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-700">Nên làm</span>
              </div>
              <div className="px-5 py-3 bg-red-50 flex items-center gap-2">
                <X className="h-4 w-4 text-destructive" />
                <span className="text-sm font-semibold text-destructive">Tránh làm</span>
              </div>
            </div>
            {DO_DONT.map((row, i) => (
              <div key={i} className={`grid grid-cols-2 ${i < DO_DONT.length - 1 ? 'border-b' : ''}`}>
                <div className="px-5 py-4 flex gap-2.5 border-r">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-foreground">{row.good}</span>
                </div>
                <div className="px-5 py-4 flex gap-2.5">
                  <X className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">{row.bad}</span>
                </div>
              </div>
            ))}
          </Card>
        </section>

        {/* Advanced tips */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-1">Tùy chọn nâng cao để tăng độ chính xác</h2>
            <p className="text-muted-foreground">
              Những thông tin bổ sung này giúp AI áp dụng đúng bộ quy định cho sản phẩm của bạn.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ADVANCED_TIPS.map((tip, i) => {
              const Icon = tip.icon
              return (
                <Card key={i} className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-md bg-primary/10 p-2">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="font-semibold text-sm">{tip.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{tip.desc}</p>
                </Card>
              )
            })}
          </div>
        </section>

        {/* Common mistakes */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-1">Lỗi phổ biến khiến kết quả không chính xác</h2>
          </div>
          <div className="space-y-3">
            {[
              {
                issue: 'Upload 1 ảnh duy nhất chụp toàn bộ hộp sản phẩm',
                fix: 'Tách riêng từng mặt: mặt trước PDP và bảng Nutrition Facts phải là 2 ảnh riêng. AI phân tích tốt nhất khi mỗi ảnh chỉ chứa 1 loại thông tin.',
              },
              {
                issue: 'Ảnh Nutrition Facts bị cắt mất dòng đầu hoặc dòng cuối',
                fix: 'Toàn bộ bảng từ dòng "Nutrition Facts" đến dòng cuối cùng (thường là Vitamin/Mineral) phải nằm trong một ảnh. Lùi máy ảnh ra xa hơn nếu cần.',
              },
              {
                issue: 'Không upload ảnh Ingredients riêng khi ingredient list ở mặt khác bảng Nutrition',
                fix: 'Nếu danh sách thành phần nằm ở mặt sau hoặc mặt bên, upload thêm 1 ảnh phân loại "Thành phần & Allergens". Không upload = AI không kiểm tra được allergen.',
              },
              {
                issue: 'Để mặc định không chọn Product Category',
                fix: 'Bật "Tùy chọn nâng cao" và chọn đúng danh mục. Beverage, Dietary Supplement, Infant Food đều có bộ quy định CFR riêng — AI sẽ kiểm tra sai nếu để mặc định.',
              },
              {
                issue: 'Ảnh tên file có dấu tiếng Việt (ảnh nhãn.jpg)',
                fix: 'Đổi tên file về không dấu trước khi upload: label-front.jpg, nutrition-facts.jpg. Hệ thống đã tự xử lý nhưng để chắc chắn nên đổi tên từ trước.',
              },
            ].map((item, i) => (
              <Card key={i} className="p-5">
                <div className="flex gap-4">
                  <div className="shrink-0">
                    <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center">
                      <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{item.issue}</p>
                    <div className="flex gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.fix}</p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Quick checklist */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Checklist trước khi nhấn Phân tích</h2>
          <Card className="p-6 space-y-3">
            {[
              'Ảnh PDP (mặt trước) đã upload — thấy rõ Brand Name, Product Name, Net Weight',
              'Ảnh Nutrition Facts đã upload — toàn bộ bảng nằm trong 1 ảnh, không bị cắt',
              'Nếu Ingredients ở mặt riêng: đã upload ảnh "Thành phần & Allergens"',
              'Nếu có Health Claims trên nhãn: đã upload ảnh "Mặt khác" chứa claims đó',
              'Đã chọn đúng Product Category trong Tùy chọn nâng cao',
              'Ảnh đủ sáng, không mờ, chữ đọc được rõ ràng',
              'Nhãn song ngữ: đã bật và khai báo ngôn ngữ phụ',
            ].map((item, i) => (
              <label key={i} className="flex items-start gap-3 cursor-pointer group">
                <div className="mt-0.5 w-4 h-4 rounded border-2 border-muted-foreground/30 group-hover:border-primary transition-colors shrink-0" />
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{item}</span>
              </label>
            ))}
          </Card>
        </section>

        {/* CTA */}
        <div className="text-center space-y-4 py-8 border-t">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            <span className="text-sm">Upload đúng = Kết quả phân tích chính xác hơn đến 40%</span>
          </div>
          <h2 className="text-2xl font-bold">Sẵn sàng kiểm tra nhãn?</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Áp dụng hướng dẫn trên rồi bắt đầu upload nhãn để AI phân tích tuân thủ FDA.
          </p>
          <Link href="/dashboard">
            <Button size="lg" className="mt-2">
              Bắt đầu kiểm tra nhãn
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </main>
  )
}
