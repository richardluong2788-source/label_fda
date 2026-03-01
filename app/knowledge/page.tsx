import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BookOpen, FileText, Video, Shield, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function KnowledgeHubPage() {
  const categories = [
    {
      title: 'Quy định FDA cơ bản',
      icon: Shield,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      articles: [
        {
          title: 'Giới thiệu về FDA và vai trò quản lý thực phẩm',
          type: 'Bài viết',
          readTime: '5 phút',
        },
        {
          title: 'CFR 101.9 - Quy định về Nutrition Facts Label',
          type: 'Hướng dẫn',
          readTime: '10 phút',
        },
        {
          title: 'FALCPA - Luật ghi nhãn chất gây dị ứng',
          type: 'Bài viết',
          readTime: '7 phút',
        },
      ],
    },
    {
      title: 'Hướng dẫn ghi nhãn',
      icon: FileText,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      articles: [
        {
          title: 'Cách tính toán Nutrition Facts đúng quy định',
          type: 'Tutorial',
          readTime: '15 phút',
        },
        {
          title: 'Quy tắc làm tròn FDA - Tránh sai sót phổ biến',
          type: 'Hướng dẫn',
          readTime: '8 phút',
        },
        {
          title: 'Font size và Typography theo 21 CFR 101.15',
          type: 'Bài viết',
          readTime: '6 phút',
        },
      ],
    },
    {
      title: 'Video hướng dẫn',
      icon: Video,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      articles: [
        {
          title: 'Cách sử dụng Vexim Compliance AI',
          type: 'Video',
          readTime: '3 phút',
        },
        {
          title: 'Hiểu và sửa các vi phạm thường gặp',
          type: 'Video',
          readTime: '12 phút',
        },
        {
          title: 'So sánh phiên bản nhãn với Version Control',
          type: 'Video',
          readTime: '5 phút',
        },
      ],
    },
    {
      title: 'Case studies',
      icon: BookOpen,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      articles: [
        {
          title: 'Doanh nghiệp A xuất khẩu sữa hạt thành công',
          type: 'Case study',
          readTime: '10 phút',
        },
        {
          title: 'Tránh lỗi Health Claims với thực phẩm chức năng',
          type: 'Case study',
          readTime: '8 phút',
        },
        {
          title: 'Sửa 15 vi phạm trong 1 ngày với Vexim AI',
          type: 'Case study',
          readTime: '6 phút',
        },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="rounded-lg bg-primary p-2">
              <BookOpen className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Vexim Compliance AI</h1>
              <p className="text-xs text-muted-foreground">Knowledge Hub</p>
            </div>
          </Link>
          <div className="flex gap-2">
            <Button variant="ghost" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/sign-up">Bắt đầu</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16 max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Trung tâm kiến thức FDA</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Học hỏi về quy định FDA, hướng dẫn ghi nhãn và các best practices
            để đảm bảo tuân thủ
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {categories.map((category) => {
            const Icon = category.icon
            return (
              <Card key={category.title} className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`rounded-lg ${category.bgColor} p-3 flex items-center justify-center`}
                  >
                    <Icon className={`h-6 w-6 ${category.color}`} />
                  </div>
                  <h3 className="text-xl font-bold">{category.title}</h3>
                </div>

                <div className="space-y-3">
                  {category.articles.map((article, idx) => (
                    <button
                      key={idx}
                      className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h4 className="font-medium mb-1 group-hover:text-primary transition-colors">
                            {article.title}
                          </h4>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {article.type}
                            </Badge>
                            <span>{article.readTime}</span>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
                      </div>
                    </button>
                  ))}
                </div>
              </Card>
            )
          })}
        </div>

        <Card className="mt-12 p-8 bg-primary text-primary-foreground text-center">
          <h3 className="text-2xl font-bold mb-4">
            Không tìm thấy câu trả lời bạn cần?
          </h3>
          <p className="text-lg mb-6 opacity-90">
            Liên hệ với đội ngũ chuyên gia Vexim để được hỗ trợ trực tiếp
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/contact">Liên hệ hỗ trợ</Link>
          </Button>
        </Card>
      </main>
    </div>
  )
}
