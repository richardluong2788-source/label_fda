import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppHeader } from '@/components/app-header'
import { AuditHistory } from '@/components/audit-history'
import type { AuditReport } from '@/lib/types'

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: { page?: string }
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check admin role — dùng cùng nguồn admin_users để đồng nhất với /analyze
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  const isAdmin =
    adminUser?.role === 'admin' ||
    adminUser?.role === 'superadmin' ||
    adminUser?.role === 'expert'

  const currentPage = Number(searchParams.page) || 1
  const pageSize = 10

  // Fetch audit reports with pagination
  const { data: auditReports, count: totalCount } = await supabase
    .from('audit_reports')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range((currentPage - 1) * pageSize, currentPage * pageSize - 1)

  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 0

  return (
    <div className="min-h-screen bg-background">
      <AppHeader email={user.email ?? ''} isAdmin={isAdmin} />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Lịch sử Phân tích</h1>
          <p className="text-muted-foreground">
            Xem lại tất cả các báo cáo phân tích nhãn FDA của bạn
          </p>
        </div>

        {auditReports && auditReports.length > 0 ? (
          <AuditHistory
            reports={auditReports as AuditReport[]}
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount || 0}
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Bạn chưa có báo cáo phân tích nào</p>
            <a
              href="/analyze"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              Bắt đầu Phân tích
            </a>
          </div>
        )}
      </main>
    </div>
  )
}
