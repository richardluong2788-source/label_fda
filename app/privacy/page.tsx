import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Shield, Lock, Eye, Database, Globe, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Chính sách Bảo mật | Vexim Compliance AI',
  description: 'Chính sách bảo mật và quyền riêng tư của Vexim Compliance AI',
}

export default function PrivacyPage() {
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
          <h1 className="text-3xl font-bold mb-2">Chính sách Bảo mật</h1>
          <p className="text-muted-foreground">
            Cập nhật lần cuối: 27 tháng 2, 2026
          </p>
        </div>

        {/* Privacy Highlights */}
        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          <Card className="p-4 text-center">
            <Shield className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="font-medium text-sm">Bảo mật Dữ liệu</p>
            <p className="text-xs text-muted-foreground">Mã hóa SSL/TLS</p>
          </Card>
          <Card className="p-4 text-center">
            <Lock className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="font-medium text-sm">Không Chia sẻ</p>
            <p className="text-xs text-muted-foreground">Dữ liệu của bạn là của bạn</p>
          </Card>
          <Card className="p-4 text-center">
            <Eye className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="font-medium text-sm">Minh bạch</p>
            <p className="text-xs text-muted-foreground">Rõ ràng về việc thu thập</p>
          </Card>
        </div>

        {/* Content */}
        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              1. Thông tin Chúng tôi Thu thập
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Khi bạn sử dụng Vexim Compliance AI, chúng tôi có thể thu thập các loại thông tin sau:
            </p>
            
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-medium mb-2">Thông tin Tài khoản</h3>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground text-sm">
                  <li>Họ tên, địa chỉ email</li>
                  <li>Tên công ty (nếu có)</li>
                  <li>Số điện thoại liên hệ</li>
                  <li>Thông tin thanh toán</li>
                </ul>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-medium mb-2">Dữ liệu Sản phẩm</h3>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground text-sm">
                  <li>Hình ảnh nhãn sản phẩm bạn tải lên</li>
                  <li>Thông tin dinh dưỡng và thành phần</li>
                  <li>Tên sản phẩm và thương hiệu</li>
                  <li>Kết quả phân tích và báo cáo</li>
                </ul>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-medium mb-2">Dữ liệu Kỹ thuật</h3>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground text-sm">
                  <li>Địa chỉ IP và thông tin trình duyệt</li>
                  <li>Cookies và dữ liệu phiên làm việc</li>
                  <li>Lịch sử truy cập và sử dụng dịch vụ</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              2. Cách Chúng tôi Sử dụng Thông tin
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Chúng tôi sử dụng thông tin thu thập được để:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Cung cấp và vận hành dịch vụ phân tích nhãn FDA</li>
              <li>Xử lý thanh toán và quản lý gói đăng ký</li>
              <li>Gửi thông báo về dịch vụ và cập nhật quy định FDA</li>
              <li>Cải thiện và phát triển tính năng mới</li>
              <li>Hỗ trợ khách hàng và giải quyết vấn đề kỹ thuật</li>
              <li>Phát hiện và ngăn chặn gian lận hoặc lạm dụng</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              3. Bảo mật Dữ liệu
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Chúng tôi áp dụng các biện pháp bảo mật tiêu chuẩn ngành:
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="p-4 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
                <h3 className="font-medium text-green-800 dark:text-green-200 mb-2">Mã hóa</h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  SSL/TLS 256-bit cho mọi kết nối. Dữ liệu được mã hóa khi truyền tải và lưu trữ.
                </p>
              </Card>
              <Card className="p-4 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
                <h3 className="font-medium text-green-800 dark:text-green-200 mb-2">Truy cập Hạn chế</h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Chỉ nhân viên được ủy quyền mới có quyền truy cập dữ liệu người dùng.
                </p>
              </Card>
              <Card className="p-4 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
                <h3 className="font-medium text-green-800 dark:text-green-200 mb-2">Sao lưu</h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Dữ liệu được sao lưu định kỳ và lưu trữ trên hạ tầng cloud bảo mật.
                </p>
              </Card>
              <Card className="p-4 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
                <h3 className="font-medium text-green-800 dark:text-green-200 mb-2">Giám sát</h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Hệ thống giám sát 24/7 để phát hiện và ngăn chặn các mối đe dọa.
                </p>
              </Card>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">4. Chia sẻ Thông tin</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Chúng tôi <strong>KHÔNG</strong> bán hoặc chia sẻ thông tin cá nhân của bạn cho bên thứ ba vì mục đích tiếp thị. 
              Thông tin chỉ được chia sẻ trong các trường hợp sau:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Nhà cung cấp dịch vụ:</strong> Thanh toán (VNPay), hosting (Vercel, Supabase)</li>
              <li><strong>Chuyên gia tư vấn:</strong> Khi bạn yêu cầu Expert Review</li>
              <li><strong>Yêu cầu pháp lý:</strong> Khi có yêu cầu từ cơ quan có thẩm quyền</li>
              <li><strong>Bảo vệ quyền lợi:</strong> Để bảo vệ quyền, tài sản của chúng tôi</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">5. Lưu trữ và Xóa Dữ liệu</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Thời gian lưu trữ dữ liệu phụ thuộc vào gói dịch vụ của bạn:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="border p-3 text-left">Gói dịch vụ</th>
                    <th className="border p-3 text-left">Thời gian lưu báo cáo</th>
                    <th className="border p-3 text-left">Sau khi hủy</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr>
                    <td className="border p-3">Free Trial</td>
                    <td className="border p-3">7 ngày</td>
                    <td className="border p-3">Xóa sau 30 ngày</td>
                  </tr>
                  <tr>
                    <td className="border p-3">Starter</td>
                    <td className="border p-3">60 ngày</td>
                    <td className="border p-3">Xóa sau 60 ngày</td>
                  </tr>
                  <tr>
                    <td className="border p-3">Business / Pro</td>
                    <td className="border p-3">Vĩnh viễn</td>
                    <td className="border p-3">Xóa sau 90 ngày</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Bạn có thể yêu cầu xóa toàn bộ dữ liệu bất kỳ lúc nào bằng cách liên hệ privacy@vexim.global.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">6. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Chúng tôi sử dụng cookies để:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Cookies cần thiết:</strong> Duy trì phiên đăng nhập và bảo mật</li>
              <li><strong>Cookies phân tích:</strong> Hiểu cách người dùng tương tác với dịch vụ</li>
              <li><strong>Cookies chức năng:</strong> Ghi nhớ tùy chọn của bạn</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Bạn có thể tắt cookies trong cài đặt trình duyệt, nhưng một số tính năng có thể không hoạt động.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              7. Quyền của Bạn
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Bạn có các quyền sau đối với dữ liệu cá nhân:
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { title: 'Quyền truy cập', desc: 'Xem dữ liệu chúng tôi lưu về bạn' },
                { title: 'Quyền sửa đổi', desc: 'Cập nhật thông tin không chính xác' },
                { title: 'Quyền xóa', desc: 'Yêu cầu xóa dữ liệu cá nhân' },
                { title: 'Quyền di chuyển', desc: 'Xuất dữ liệu của bạn' },
                { title: 'Quyền phản đối', desc: 'Từ chối xử lý dữ liệu' },
                { title: 'Quyền hạn chế', desc: 'Giới hạn việc xử lý dữ liệu' },
              ].map((right) => (
                <div key={right.title} className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                  <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{right.title}</p>
                    <p className="text-xs text-muted-foreground">{right.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">8. Cập nhật Chính sách</h2>
            <p className="text-muted-foreground leading-relaxed">
              Chúng tôi có thể cập nhật Chính sách Bảo mật này theo thời gian. 
              Khi có thay đổi quan trọng, chúng tôi sẽ thông báo qua email hoặc trên website.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">9. Liên hệ</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Nếu có câu hỏi về Chính sách Bảo mật hoặc muốn thực hiện các quyền của bạn:
            </p>
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium">Vexim Global - Data Protection</p>
              <p className="text-muted-foreground">Email: privacy@vexim.global</p>
              <p className="text-muted-foreground">Website: vexim.global</p>
            </div>
          </section>
        </div>

        {/* Footer links */}
        <div className="mt-12 pt-8 border-t flex flex-wrap gap-4 text-sm text-muted-foreground">
          <Link href="/terms" className="hover:text-primary">
            Điều khoản Dịch vụ
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
