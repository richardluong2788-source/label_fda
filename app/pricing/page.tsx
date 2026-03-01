import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Zap, Shield, Crown, Star, MessageCircle, Users, FileText, Clock, CheckCircle, X, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import PricingClient from './pricing-client'

const PLAN_ICONS: Record<string, React.ElementType> = {
  free: Zap,
  starter: Shield,
  pro: Star,
  enterprise: Crown,
}

const POPULAR_PLAN = 'pro'

export default async function PricingPage() {
  const supabase = await createClient()

  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let currentPlanId: string | null = null
  if (user) {
    const { data: sub } = await supabase
      .from('user_subscriptions')
      .select('plan_id')
      .eq('user_id', user.id)
      .single()
    currentPlanId = sub?.plan_id ?? 'free'
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="rounded-lg bg-primary p-2">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Vexim Compliance AI</h1>
              <p className="text-xs text-muted-foreground">Vexim Global</p>
            </div>
          </Link>
          <div className="flex gap-2">
            {user ? (
              <Button asChild>
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/auth/login">Đăng nhập</Link>
                </Button>
                <Button asChild>
                  <Link href="/auth/sign-up">Dùng thử miễn phí</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-8 pb-16 max-w-6xl">
        {/* Back */}
        <Button variant="ghost" size="sm" className="gap-2 mb-6 -ml-2" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Quay lại Dashboard
          </Link>
        </Button>

        {/* Hero + Plans (Client Component with Toggle) */}
        <PricingClient
          plans={plans ?? []}
          currentPlanId={currentPlanId}
          isLoggedIn={!!user}
        />

        {/* Expert Review Section */}
        <div id="expert-review" className="mb-16 scroll-mt-24">
          <div className="text-center mb-10">
            <Badge variant="outline" className="mb-4 text-primary border-primary">
              <MessageCircle className="h-3 w-3 mr-1" />
              Dịch vụ Tư vấn Chuyên gia
            </Badge>
            <h2 className="text-3xl font-bold mb-3 text-balance">
              Expert Review bởi chuyên gia FDA Compliance
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-pretty">
              Nhận phân tích chuyên sâu, hướng dẫn sửa wording cụ thể, và xác nhận từ chuyên gia.
              Khác với AI report, Expert Review được thực hiện bởi người thật.
            </p>
          </div>

          {/* What's included in Expert Review */}
          <Card className="p-6 mb-8 border-primary/20 bg-gradient-to-br from-primary/5 to-blue-500/5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Expert Review bao gồm
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { icon: FileText, text: 'Phân tích bối cảnh sản phẩm cụ thể' },
                { icon: CheckCircle, text: 'Hướng dẫn sửa chi tiết + wording chính xác' },
                { icon: MessageCircle, text: 'Đề xuất sửa từng vi phạm riêng biệt' },
                { icon: Shield, text: 'Ký xác nhận & đóng dấu compliance' },
                { icon: Clock, text: 'SLA: phản hồi trong 48 giờ làm việc' },
                { icon: Users, text: 'Đội ngũ chuyên gia tuân thủ FDA' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-sm">
                  <Icon className="h-4 w-4 text-primary shrink-0" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Expert Review plan comparison */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans?.map((plan) => {
              const isFree = plan.id === 'free'
              const isStarter = plan.id === 'starter'
              const isPro = plan.id === 'pro'
              const isEnterprise = plan.id === 'enterprise'
              const hasExpertIncluded = (plan.expert_reviews_limit ?? 0) > 0 || plan.expert_reviews_limit === -1
              const expertPrice = plan.expert_review_price_vnd ?? 0
              const isCurrentPlan = currentPlanId === plan.id

              return (
                <Card
                  key={plan.id}
                  className={`p-5 flex flex-col ${
                    isPro ? 'border-primary border-2 shadow-md' : ''
                  }`}
                >
                  <div className="mb-3">
                    <p className="font-semibold text-sm">{plan.name}</p>
                    {isCurrentPlan && (
                      <Badge variant="secondary" className="text-[10px] mt-1">Gói hiện tại</Badge>
                    )}
                  </div>

                  {/* Expert review access */}
                  <div className="mb-4 flex-1">
                    {isFree && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <X className="h-4 w-4 text-muted-foreground/50" />
                          <span>Không bao gồm Expert Review</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Nâng cấp lên Starter trở lên để sử dụng.
                        </p>
                      </div>
                    )}
                    {isStarter && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <MessageCircle className="h-4 w-4 text-primary" />
                          <span>Mua thêm theo lần</span>
                        </div>
                        <p className="text-2xl font-bold">
                          {expertPrice.toLocaleString('vi-VN')}
                          <span className="text-sm font-normal text-muted-foreground ml-1">₫/lần</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Thanh toán riêng mỗi lần yêu cầu Expert Review.
                        </p>
                      </div>
                    )}
                    {isPro && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-green-700">Đã bao gồm trong gói</span>
                        </div>
                        <p className="text-2xl font-bold">
                          {plan.expert_reviews_limit}
                          <span className="text-sm font-normal text-muted-foreground ml-1">lượt/tháng</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Miễn phí {plan.expert_reviews_limit} lượt Expert Review mỗi tháng.
                        </p>
                      </div>
                    )}
                    {isEnterprise && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-green-700">Không giới hạn</span>
                        </div>
                        <p className="text-2xl font-bold">
                          Unlimited
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Expert Review không giới hạn + SLA riêng.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* CTA */}
                  {isCurrentPlan ? (
                    <Button variant="secondary" size="sm" className="w-full" disabled>
                      Gói hiện tại
                    </Button>
                  ) : isFree ? (
                    <Button variant="outline" size="sm" className="w-full" disabled>
                      Không khả dụng
                    </Button>
                  ) : isEnterprise ? (
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <a href="mailto:sales@vexim.io">Liên hệ Sales</a>
                    </Button>
                  ) : (
                    <Button
                      variant={isPro ? 'default' : 'outline'}
                      size="sm"
                      className="w-full"
                      asChild
                    >
                      <Link href={user ? `/checkout?plan=${plan.id}&amount=${plan.price_vnd}` : '/auth/sign-up'}>
                        {isPro ? 'Nâng cấp Pro' : `Nâng cấp ${plan.name}`}
                      </Link>
                    </Button>
                  )}
                </Card>
              )
            })}
          </div>
        </div>

        {/* FAQ / guarantee strip */}
        <Card className="p-8 bg-muted/50 border-border text-center">
          <h3 className="text-xl font-bold mb-2">
            Thanh toán an toàn qua QR ngân hàng Việt Nam
          </h3>
          <p className="text-muted-foreground mb-4 text-pretty max-w-lg mx-auto">
            Hỗ trợ tất cả ngân hàng nội địa (Vietcombank, BIDV, Techcombank,
            MB, VPBank, ...) qua chuẩn VietQR. Không lưu thông tin thẻ.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Check className="h-4 w-4 text-primary" />
              Kích hoạt ngay sau thanh toán
            </span>
            <span className="flex items-center gap-1">
              <Check className="h-4 w-4 text-primary" />
              Huỷ bất cứ lúc nào
            </span>
            <span className="flex items-center gap-1">
              <Check className="h-4 w-4 text-primary" />
              Hỗ trợ qua email 24/7
            </span>
          </div>
        </Card>
      </main>
    </div>
  )
}
