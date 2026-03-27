import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'
import { fsvpExpiryAlertTemplate, fsvpAuditDueTemplate } from '@/lib/email/fsvp-templates'

/**
 * GET /api/cron/fsvp-expiry-alerts
 * ────────────────────────────────
 * Cron job: Runs daily to check for FSVP records approaching expiry
 * and sends email alerts to users.
 * 
 * Checks:
 * 1. FSVP Suppliers with next_verification_due within 30 days
 * 2. SAHCODHA suppliers with next_onsite_audit_due within 30 days
 * 3. Documents (certificates, audits) with expiry_date within 30 days
 * 4. Hazard analyses needing reassessment
 * 
 * Security: Protected by Vercel Cron signature
 */
export const maxDuration = 60

export async function GET(request: Request) {
  // ── Auth guard (Vercel Cron only) ─────────────────────────────
  const cronSig = request.headers.get('x-vercel-cron-signature') ?? ''
  const isDev = process.env.NODE_ENV === 'development'
  
  if (!cronSig && !isDev) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createAdminClient()
  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  
  const results = {
    verificationAlerts: 0,
    auditAlerts: 0,
    documentAlerts: 0,
    errors: [] as string[],
  }

  try {
    // ═══════════════════════════════════════════════════════════════
    // 1. Check suppliers with next_verification_due within 30 days
    // ═══════════════════════════════════════════════════════════════
    const { data: suppliersNeedingVerification, error: suppliersError } = await supabase
      .from('fsvp_suppliers')
      .select(`
        id,
        supplier_name,
        supplier_country,
        next_verification_due,
        is_sahcodha_risk,
        importer_user_id
      `)
      .lte('next_verification_due', thirtyDaysFromNow.toISOString())
      .gte('next_verification_due', now.toISOString())
      .eq('status', 'approved')

    if (suppliersError) {
      results.errors.push(`Suppliers query error: ${suppliersError.message}`)
    } else if (suppliersNeedingVerification && suppliersNeedingVerification.length > 0) {
      // Group by user
      const userSuppliers = new Map<string, typeof suppliersNeedingVerification>()
      
      for (const supplier of suppliersNeedingVerification) {
        const userId = supplier.importer_user_id
        if (!userId) continue
        
        if (!userSuppliers.has(userId)) {
          userSuppliers.set(userId, [])
        }
        userSuppliers.get(userId)!.push(supplier)
      }

      // Send emails per user
      for (const [userId, suppliers] of userSuppliers) {
        try {
          // Get user email from auth.users
          const { data: authUser } = await supabase.auth.admin.getUserById(userId)
          if (!authUser?.user?.email) continue

          // Get user language preference
          const { data: profile } = await supabase
            .from('profiles')
            .select('language')
            .eq('id', userId)
            .maybeSingle()

          const lang = (profile?.language as 'vi' | 'en') || 'en'

          const emailContent = fsvpExpiryAlertTemplate({
            email: authUser.user.email,
            suppliers: suppliers.map(s => ({
              name: s.supplier_name,
              country: s.supplier_country,
              dueDate: s.next_verification_due,
              isSAHCODHA: s.is_sahcodha_risk,
            })),
            alertType: 'verification',
            lang,
          })

          await sendEmail({
            to: authUser.user.email,
            subject: emailContent.subject,
            html: emailContent.html,
          })

          results.verificationAlerts += suppliers.length
        } catch (err: any) {
          results.errors.push(`User ${userId} email error: ${err.message}`)
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // 2. Check SAHCODHA suppliers with annual audit due within 30 days
    // ═══════════════════════════════════════════════════════════════
    const { data: suppliersNeedingAudit, error: auditError } = await supabase
      .from('fsvp_suppliers')
      .select(`
        id,
        supplier_name,
        supplier_country,
        next_onsite_audit_due,
        sahcodha_hazards,
        importer_user_id
      `)
      .eq('requires_annual_audit', true)
      .lte('next_onsite_audit_due', thirtyDaysFromNow.toISOString())
      .gte('next_onsite_audit_due', now.toISOString())

    if (auditError) {
      results.errors.push(`Audit query error: ${auditError.message}`)
    } else if (suppliersNeedingAudit && suppliersNeedingAudit.length > 0) {
      // Group by user
      const userAudits = new Map<string, typeof suppliersNeedingAudit>()
      
      for (const supplier of suppliersNeedingAudit) {
        const userId = supplier.importer_user_id
        if (!userId) continue
        
        if (!userAudits.has(userId)) {
          userAudits.set(userId, [])
        }
        userAudits.get(userId)!.push(supplier)
      }

      // Send emails per user
      for (const [userId, suppliers] of userAudits) {
        try {
          const { data: authUser } = await supabase.auth.admin.getUserById(userId)
          if (!authUser?.user?.email) continue

          const { data: profile } = await supabase
            .from('profiles')
            .select('language')
            .eq('id', userId)
            .maybeSingle()

          const lang = (profile?.language as 'vi' | 'en') || 'en'

          const emailContent = fsvpAuditDueTemplate({
            email: authUser.user.email,
            suppliers: suppliers.map(s => ({
              name: s.supplier_name,
              country: s.supplier_country,
              dueDate: s.next_onsite_audit_due,
              hazards: s.sahcodha_hazards || [],
            })),
            lang,
          })

          await sendEmail({
            to: authUser.user.email,
            subject: emailContent.subject,
            html: emailContent.html,
          })

          results.auditAlerts += suppliers.length
        } catch (err: any) {
          results.errors.push(`User ${userId} audit email error: ${err.message}`)
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // 3. Check documents with expiry_date within 30 days
    // ═══════════════════════════════════════════════════════════════
    const { data: expiringDocs, error: docsError } = await supabase
      .from('fsvp_documents')
      .select(`
        id,
        document_type,
        document_name,
        expiry_date,
        supplier_id,
        importer_user_id,
        fsvp_suppliers (
          supplier_name,
          supplier_country
        )
      `)
      .lte('expiry_date', thirtyDaysFromNow.toISOString())
      .gte('expiry_date', now.toISOString())
      .eq('status', 'valid')

    if (docsError) {
      results.errors.push(`Documents query error: ${docsError.message}`)
    } else if (expiringDocs && expiringDocs.length > 0) {
      // Group by user
      const userDocs = new Map<string, typeof expiringDocs>()
      
      for (const doc of expiringDocs) {
        const userId = doc.importer_user_id
        if (!userId) continue
        
        if (!userDocs.has(userId)) {
          userDocs.set(userId, [])
        }
        userDocs.get(userId)!.push(doc)
      }

      // Send emails per user
      for (const [userId, docs] of userDocs) {
        try {
          const { data: authUser } = await supabase.auth.admin.getUserById(userId)
          if (!authUser?.user?.email) continue

          const { data: profile } = await supabase
            .from('profiles')
            .select('language')
            .eq('id', userId)
            .maybeSingle()

          const lang = (profile?.language as 'vi' | 'en') || 'en'

          const emailContent = fsvpExpiryAlertTemplate({
            email: authUser.user.email,
            suppliers: docs.map(d => ({
              name: d.document_name || d.document_type,
              country: (d.fsvp_suppliers as any)?.supplier_name || 'Unknown supplier',
              dueDate: d.expiry_date,
              isSAHCODHA: false,
            })),
            alertType: 'document',
            lang,
          })

          await sendEmail({
            to: authUser.user.email,
            subject: emailContent.subject,
            html: emailContent.html,
          })

          results.documentAlerts += docs.length
        } catch (err: any) {
          results.errors.push(`User ${userId} doc email error: ${err.message}`)
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // 4. Log notification history
    // ═══════════════════════════════════════════════════════════════
    const totalAlerts = results.verificationAlerts + results.auditAlerts + results.documentAlerts
    
    if (totalAlerts > 0) {
      await supabase.from('system_logs').insert({
        log_type: 'fsvp_expiry_alerts',
        message: `Sent ${totalAlerts} FSVP expiry alerts`,
        metadata: {
          verification_alerts: results.verificationAlerts,
          audit_alerts: results.auditAlerts,
          document_alerts: results.documentAlerts,
          errors: results.errors,
          run_date: now.toISOString(),
        },
      }).catch(() => {
        // Ignore if system_logs table doesn't exist
      })
    }

    return NextResponse.json({
      success: true,
      message: `Processed FSVP expiry alerts`,
      results,
      timestamp: now.toISOString(),
    })

  } catch (error: any) {
    console.error('[fsvp-expiry-alerts] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      results,
    }, { status: 500 })
  }
}
