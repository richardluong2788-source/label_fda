import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { VersionHistoryView } from '@/components/version-history-view'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function VersionHistoryPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/auth/login')
  }

  // Get original report
  const { data: report, error: reportError } = await supabase
    .from('audit_reports')
    .select('*')
    .eq('id', id)
    .single()

  if (reportError || !report) {
    redirect('/dashboard')
  }

  // Check if user owns this report or is an admin
  const isOwner = report.user_id === user.id
  const { data: adminCheck } = await supabase
    .from('admin_users')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!isOwner && !adminCheck) {
    redirect('/dashboard')
  }

  // Get all versions
  const { data: versions, error: versionsError } = await supabase
    .from('label_versions')
    .select('*')
    .eq('original_report_id', id)
    .order('version_number', { ascending: false })

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <VersionHistoryView reportId={id} report={report} versions={versions || []} />
    </div>
  )
}
