import { createAdminClient } from '@/lib/supabase/admin'
import { fetchFDALetterListings, fetchLetterContent, isValidWarningLetterContent, classifyProductCategory } from '@/lib/fda-scraper'
import { NextResponse } from 'next/server'

/**
 * Cron job: Fetch new FDA Warning Letters automatically
 * 
 * Flow:
 *   1. Fetch recent Warning Letter listings from FDA website
 *   2. Check which letters are already in pending_warning_letters (dedup by letter_id)
 *   3. For new letters, fetch individual page content
 *   4. Insert into pending_warning_letters with status 'pending_review'
 *   5. Log the fetch run in fda_fetch_log
 * 
 * Admin then reviews and approves letters in the Admin Dashboard.
 * 
 * vercel.json cron config:
 * { "path": "/api/cron/fetch-warning-letters", "schedule": "0 6 * * *" }
 */

const DAYS_BACK = 30 // Look back 30 days
const MAX_LETTERS_PER_RUN = 20 // Don't fetch too many at once
const DELAY_BETWEEN_FETCHES_MS = 2000 // Be polite to FDA servers

export const maxDuration = 300 // 5 min timeout for Vercel Functions

export async function GET(request: Request) {
  const startTime = Date.now()

  try {
    // Verify cron secret (MANDATORY — blocks requests when CRON_SECRET is unset)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[FDA Cron] ========== FETCH WARNING LETTERS STARTING ==========')
    console.log(`[FDA Cron] Looking back ${DAYS_BACK} days, max ${MAX_LETTERS_PER_RUN} letters`)

    const supabase = createAdminClient()

    // Step 1: Fetch listings from FDA
    let listings
    try {
      listings = await fetchFDALetterListings(DAYS_BACK, MAX_LETTERS_PER_RUN)
    } catch (fetchError: any) {
      console.error('[FDA Cron] Failed to fetch FDA listings:', fetchError.message)
      
      // Log the failed run
      await supabase.from('fda_fetch_log').insert({
        letters_found: 0,
        letters_new: 0,
        letters_skipped: 0,
        letters_failed: 0,
        fetch_source: 'fda_listing_page',
        duration_ms: Date.now() - startTime,
        error: fetchError.message,
      })

      return NextResponse.json({
        success: false,
        error: `Failed to fetch FDA listings: ${fetchError.message}`,
      }, { status: 502 })
    }

    console.log(`[FDA Cron] Found ${listings.length} letters on FDA listing page`)

    if (listings.length === 0) {
      await supabase.from('fda_fetch_log').insert({
        letters_found: 0,
        letters_new: 0,
        letters_skipped: 0,
        letters_failed: 0,
        fetch_source: 'fda_listing_page',
        duration_ms: Date.now() - startTime,
      })

      return NextResponse.json({
        success: true,
        message: 'No letters found on FDA listing page',
        letters_found: 0,
        letters_new: 0,
      })
    }

    // Step 2: Check which letters already exist in our DB
    const letterIds = listings.map(l => l.letter_id)
    const { data: existingLetters } = await supabase
      .from('pending_warning_letters')
      .select('letter_id')
      .in('letter_id', letterIds)

    const existingIds = new Set((existingLetters || []).map(e => e.letter_id))
    const newListings = listings.filter(l => !existingIds.has(l.letter_id))

    console.log(`[FDA Cron] ${existingIds.size} already exist, ${newListings.length} are new`)

    const skippedCount = listings.length - newListings.length
    let newCount = 0
    let failedCount = 0
    const details: any[] = []

    // Step 3: Fetch content for each new letter
    for (const listing of newListings) {
      try {
        console.log(`[FDA Cron] Fetching content for: ${listing.company_name} (${listing.letter_id})`)

        const content = await fetchLetterContent(listing.fda_url)
        const contentLength = content.length
        const productType = classifyProductCategory(listing.issuing_office, listing.subject, content)

        if (contentLength < 100) {
          console.warn(`[FDA Cron] Content too short (${contentLength} chars) for ${listing.letter_id}, marking as fetch_failed`)
          
          await supabase.from('pending_warning_letters').insert({
            letter_id: listing.letter_id,
            company_name: listing.company_name,
            subject: listing.subject,
            issue_date: listing.issue_date || new Date().toISOString().split('T')[0],
            fda_url: listing.fda_url,
            issuing_office: listing.issuing_office,
            product_type: productType,
            extracted_content: content || null,
            content_length: contentLength,
            status: 'fetch_failed',
            fetch_method: 'auto_cron',
            fetch_error: `Content too short: ${contentLength} characters`,
          })

          failedCount++
          details.push({ letter_id: listing.letter_id, status: 'fetch_failed', reason: 'content_too_short' })
          continue
        }

        // Validate that this is an actual warning letter (not informational content)
        if (!isValidWarningLetterContent(content)) {
          console.warn(`[FDA Cron] Content validation failed for ${listing.letter_id} (likely informational page, not warning letter)`)
          
          await supabase.from('pending_warning_letters').insert({
            letter_id: listing.letter_id,
            company_name: listing.company_name,
            subject: listing.subject,
            issue_date: listing.issue_date || new Date().toISOString().split('T')[0],
            fda_url: listing.fda_url,
            issuing_office: listing.issuing_office,
            product_type: productType,
            extracted_content: content,
            content_length: contentLength,
            status: 'fetch_failed',
            fetch_method: 'auto_cron',
            fetch_error: 'Content validation failed - likely informational page, not actual warning letter',
          })

          failedCount++
          details.push({ letter_id: listing.letter_id, status: 'fetch_failed', reason: 'content_validation_failed' })
          continue
        }

        // Insert with pending_review status
        const { error: insertError } = await supabase.from('pending_warning_letters').insert({
          letter_id: listing.letter_id,
          company_name: listing.company_name,
          subject: listing.subject,
          issue_date: listing.issue_date || new Date().toISOString().split('T')[0],
          fda_url: listing.fda_url,
          issuing_office: listing.issuing_office,
          product_type: productType,
          extracted_content: content,
          content_length: contentLength,
          status: 'pending_review',
          fetch_method: 'auto_cron',
        })

        if (insertError) {
          // Could be a duplicate constraint violation from concurrent runs
          if (insertError.code === '23505') {
            console.log(`[FDA Cron] Duplicate detected for ${listing.letter_id}, skipping`)
            details.push({ letter_id: listing.letter_id, status: 'duplicate' })
          } else {
            throw insertError
          }
        } else {
          newCount++
          details.push({
            letter_id: listing.letter_id,
            company_name: listing.company_name,
            status: 'pending_review',
            content_length: contentLength,
          })
          console.log(`[FDA Cron] Saved: ${listing.company_name} (${contentLength} chars)`)
        }

        // Polite delay between requests
        if (newListings.indexOf(listing) < newListings.length - 1) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_FETCHES_MS))
        }
      } catch (letterError: any) {
        console.error(`[FDA Cron] Failed to fetch ${listing.letter_id}:`, letterError.message)
        failedCount++
        details.push({ letter_id: listing.letter_id, status: 'error', error: letterError.message })

        // Still insert with fetch_failed status so we don't retry indefinitely
        try {
          await supabase.from('pending_warning_letters').insert({
            letter_id: listing.letter_id,
            company_name: listing.company_name,
            subject: listing.subject,
            issue_date: listing.issue_date || new Date().toISOString().split('T')[0],
            fda_url: listing.fda_url,
            issuing_office: listing.issuing_office,
            product_type: classifyProductCategory(listing.issuing_office, listing.subject),
            status: 'fetch_failed',
            fetch_method: 'auto_cron',
            fetch_error: letterError.message,
          })
        } catch {
          // Ignore insert errors for failed fetches
        }
      }
    }

    const durationMs = Date.now() - startTime

    // Step 4: Log the fetch run
    await supabase.from('fda_fetch_log').insert({
      letters_found: listings.length,
      letters_new: newCount,
      letters_skipped: skippedCount,
      letters_failed: failedCount,
      fetch_source: 'fda_listing_page',
      duration_ms: durationMs,
      details,
    })

    console.log('[FDA Cron] ========== FETCH COMPLETE ==========')
    console.log(`[FDA Cron] Found: ${listings.length}, New: ${newCount}, Skipped: ${skippedCount}, Failed: ${failedCount}`)
    console.log(`[FDA Cron] Duration: ${durationMs}ms`)

    return NextResponse.json({
      success: true,
      letters_found: listings.length,
      letters_new: newCount,
      letters_skipped: skippedCount,
      letters_failed: failedCount,
      duration_ms: durationMs,
      details,
    })
  } catch (error: any) {
    const durationMs = Date.now() - startTime
    console.error('[FDA Cron] Fatal error:', error)

    // Try to log the error
    try {
      const supabase = createAdminClient()
      await supabase.from('fda_fetch_log').insert({
        letters_found: 0,
        letters_new: 0,
        letters_skipped: 0,
        letters_failed: 0,
        fetch_source: 'fda_listing_page',
        duration_ms: durationMs,
        error: error.message,
      })
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json(
      { error: error.message || 'FDA fetch failed' },
      { status: 500 }
    )
  }
}

// Allow POST for manual triggering from Admin Dashboard
export async function POST(request: Request) {
  return GET(request)
}
