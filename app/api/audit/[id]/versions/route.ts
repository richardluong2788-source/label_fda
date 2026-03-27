import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/audit/[id]/versions - List all versions for a report
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify report ownership or admin
  const { data: report } = await supabase
    .from('audit_reports')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  const isOwner = report.user_id === user.id
  const { data: adminCheck } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .single()

  if (!isOwner && !adminCheck) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get all versions
  const { data: versions, error } = await supabase
    .from('label_versions')
    .select('*')
    .eq('original_report_id', id)
    .order('version_number', { ascending: false })

  if (error) {
    console.error('[v0] Error fetching versions:', error)
    return NextResponse.json({ error: 'Failed to fetch versions' }, { status: 500 })
  }

  return NextResponse.json({ versions: versions || [] })
}

/**
 * POST /api/audit/[id]/versions - Create a new version manually
 * Used when user uploads a revised label for re-analysis
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get current report
  const { data: report } = await supabase
    .from('audit_reports')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  const body = await request.json()
  const { label_image_url, version_notes } = body

  if (!label_image_url) {
    return NextResponse.json({ error: 'label_image_url is required' }, { status: 400 })
  }

  // Save current report state as a version before updating
  const currentVersionNumber = report.version_number || 1

  const { error: versionError } = await supabase
    .from('label_versions')
    .insert({
      original_report_id: id,
      version_number: currentVersionNumber,
      label_image_url: report.label_image_url,
      status: report.status,
      overall_result: report.overall_result,
      findings: report.findings || [],
      geometry_violations: report.geometry_violations || [],
      created_by: user.id,
      version_notes: 'Auto-saved before new version upload',
    })

  if (versionError) {
    // Might be a duplicate version number - try to continue
    console.error('[v0] Error saving version:', versionError)
  }

  // Update the report with new image and reset for re-analysis
  const { error: updateError } = await supabase
    .from('audit_reports')
    .update({
      label_image_url,
      status: 'pending',
      overall_result: null,
      findings: [],
      geometry_violations: [],
      version_number: currentVersionNumber + 1,
      version_notes: version_notes || null,
      is_latest_version: true,
    })
    .eq('id', id)

  if (updateError) {
    console.error('[v0] Error updating report:', updateError)
    return NextResponse.json({ error: 'Failed to create new version' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    version_number: currentVersionNumber + 1,
    message: 'New version created. Run analysis to get compliance results.',
  })
}
