import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Điều khoản Dịch vụ | Vexim Compliance AI',
  description: 'Điều khoản và điều kiện sử dụng dịch vụ Vexim Compliance AI',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại trang chủ
            </Button>
          </Link>
          <h1 className="text-3xl font-bold mb-2">Điều khoản Dịch vụ</h1>
          <p className="text-muted-foreground">
            Cập nhật lần cuối: 27 tháng 2, 2026
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4">1. Giới thiệu</h2>
            <p className="text-muted-foreground leading-relaxed">
              Chào mừng bạn đến với Vexim Compliance AI (&quot;Dịch vụ&quot;), được vận hành bởi Vexim Global (&quot;Công ty&quot;, &quot;chúng tôi&quot;). 
              Bằng việc truy cập hoặc sử dụng Dịch vụ, bạn đồng ý tuân thủ các Điều khoản Dịch vụ này.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">2. Mô tả Dịch vụ</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Vexim Compliance AI cung cấp dịch vụ kiểm tra tuân thủ nhãn thực phẩm theo quy định FDA (Cục Quản lý Thực phẩm và Dược phẩm Hoa Kỳ), bao gồm:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Phân tích nhãn sản phẩm bằng công nghệ AI</li>
              <li>Kiểm tra tuân thủ theo quy định 21 CFR</li>
              <li>Đề xuất sửa đổi và cải thiện nhãn</li>
              <li>Dịch vụ tư vấn chuyên gia (tùy gói dịch vụ)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">3. Tài khoản Người dùng</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Để sử dụng Dịch vụ, bạn cần:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Cung cấp thông tin chính xác khi đăng ký</li>
              <li>Bảo mật thông tin đăng nhập</li>
              <li>Thông báo ngay khi phát hiện truy cập trái phép</li>
              <li>Chịu trách nhiệm về mọi hoạt động dưới tài khoản của bạn</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">4. Gói Dịch vụ và Thanh toán</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Chúng tôi cung cấp nhiều gói dịch vụ với các tính năng và mức giá khác nhau:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Free Trial:</strong> 1 lượt phân tích miễn phí khi đăng ký</li>
              <li><strong>Starter, Business, Pro:</strong> Gói thuê bao hàng tháng/năm</li>
              <li><strong>Enterprise:</strong> Gói tùy chỉnh cho doanh nghiệp lớn</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Thanh toán được thực hiện qua VNPay hoặc chuyển khoản ngân hàng. 
              Phí dịch vụ không hoàn lại trừ trường hợp có thỏa thuận riêng.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">5. Giới hạn Trách nhiệm</h2>
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-amber-800 dark:text-amber-200 leading-relaxed">
                <strong>Quan trọng:</strong> Dịch vụ của chúng tôi chỉ mang tính chất tham khảo và không thay thế cho tư vấn pháp lý chuyên nghiệp. 
                Vexim Compliance AI sử dụng công nghệ AI và cơ sở dữ liệu quy định FDA, tuy nhiên:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-amber-800 dark:text-amber-200 mt-3">
                <li>Không đảm bảo độ chính xác 100%</li>
                <li>Quy định FDA có thể thay đổi</li>
                <li>Trách nhiệm tuân thủ cuối cùng thuộc về chủ sản phẩm</li>
                <li>Chúng tôi không chịu trách nhiệm cho bất kỳ thiệt hại nào phát sinh từ việc sử dụng báo cáo</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">6. Sở hữu Trí tuệ</h2>
            <p className="text-muted-foreground leading-relaxed">
              Tất cả nội dung, thiết kế, logo, và công nghệ của Vexim Compliance AI thuộc quyền sở hữu của Vexim Global. 
              Bạn không được sao chép, phân phối, hoặc sử dụng cho mục đích thương mại mà không có sự cho phép bằng văn bản.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">7. Quyền riêng tư</h2>
            <p className="text-muted-foreground leading-relaxed">
              Việc sử dụng Dịch vụ của bạn cũng chịu sự điều chỉnh của{' '}
              <Link href="/privacy" className="text-primary hover:underline">
                Chính sách Bảo mật
              </Link>{' '}
              của chúng tôi.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">8. Chấm dứt Dịch vụ</h2>
            <p className="text-muted-foreground leading-relaxed">
              Chúng tôi có quyền tạm ngừng hoặc chấm dứt tài khoản của bạn nếu vi phạm các Điều khoản này 
              hoặc có hành vi gây hại đến Dịch vụ hoặc người dùng khác.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">9. Thay đổi Điều khoản</h2>
            <p className="text-muted-foreground leading-relaxed">
              Chúng tôi có thể cập nhật các Điều khoản này theo thời gian. 
              Việc tiếp tục sử dụng Dịch vụ sau khi có thay đổi đồng nghĩa với việc bạn chấp nhận các điều khoản mới.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">10. Liên hệ</h2>
            <p className="text-muted-foreground leading-relaxed">
              Nếu có câu hỏi về Điều khoản Dịch vụ, vui lòng liên hệ:
            </p>
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="font-medium">Vexim Global</p>
              <p className="text-muted-foreground">Email: legal@vexim.global</p>
              <p className="text-muted-foreground">Website: vexim.global</p>
            </div>
          </section>
        </div>

        {/* Footer links */}
        <div className="mt-12 pt-8 border-t flex flex-wrap gap-4 text-sm text-muted-foreground">
          <Link href="/privacy" className="hover:text-primary">
            Chính sách Bảo mật
          </Link>
          <span>|</span>
          <Link href="/pricing" className="hover:text-primary">
            Bảng giá
          </Link>
          <span>|</span>
          <Link href="/" className="hover:text-primary">
            Trang chủ
          </Link>
        </div>
      </div>
    </div>
  )
}
