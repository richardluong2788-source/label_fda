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

  // Check admin role
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
        <HistoryPageContent
          reports={auditReports as AuditReport[] | null}
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount || 0}
        />
      </main>
    </div>
  )
}

// Client wrapper for i18n
function HistoryPageContent({
  reports,
  currentPage,
  totalPages,
  totalCount,
}: {
  reports: AuditReport[] | null
  currentPage: number
  totalPages: number
  totalCount: number
}) {
  return (
    <HistoryPageClient
      reports={reports}
      currentPage={currentPage}
      totalPages={totalPages}
      totalCount={totalCount}
    />
  )
}

// We need a separate client component file for useTranslation
import { HistoryPageClient } from './history-client'
