/**
 * API Route: Check supplier recall history
 * Per 21 CFR 1.505: Supplier Evaluation requirements
 * 
 * POST /api/fsvp/suppliers/[id]/recall-check
 * - Searches FDA openFDA API for recalls matching this supplier
 * - Creates/updates fsvp_supplier_recall_matches records
 * - Updates supplier recall summary fields
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RecallMatch {
  recall_id: string | null
  recall_number: string
  recalling_firm: string
  product_description: string | null
  reason_for_recall: string | null
  recall_classification: string | null
  recall_initiation_date: string | null
  termination_date: string | null
  match_type: 'exact_name' | 'fuzzy_name' | 'manual' | 'product_match' | 'address_match'
  match_confidence: number
  matched_field: string
}

// Fuzzy string matching helper
function fuzzyMatch(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()
  
  // Exact match
  if (s1 === s2) return 1.0
  
  // One contains the other
  if (s1.includes(s2) || s2.includes(s1)) return 0.9
  
  // Split into words and check overlap
  const words1 = s1.split(/\s+/).filter(w => w.length > 2)
  const words2 = s2.split(/\s+/).filter(w => w.length > 2)
  
  const matches = words1.filter(w => words2.some(w2 => 
    w === w2 || w.includes(w2) || w2.includes(w)
  ))
  
  if (matches.length === 0) return 0
  
  const maxLen = Math.max(words1.length, words2.length)
  return matches.length / maxLen * 0.8
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: supplierId } = await params
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get supplier details
    const { data: supplier, error: supplierError } = await supabase
      .from('fsvp_suppliers')
      .select('id, supplier_name, country, city, address')
      .eq('id', supplierId)
      .single()
    
    if (supplierError || !supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }
    
    // Get body for optional custom search terms
    const body = await request.json().catch(() => ({}))
    const customSearchTerms: string[] = body.search_terms || []
    
    // Build search terms from supplier name
    const searchTerms = [
      supplier.supplier_name.toLowerCase(),
      ...supplier.supplier_name.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3),
      ...customSearchTerms.map(t => t.toLowerCase()),
    ].filter(Boolean)
    
    console.log(`[Recall Check] Searching for supplier: ${supplier.supplier_name}`)
    console.log(`[Recall Check] Search terms: ${searchTerms.join(', ')}`)
    
    // Query pending_recalls table for potential matches
    const { data: recalls, error: recallError } = await supabase
      .from('pending_recalls')
      .select('*')
      .eq('product_type', 'food')
      .in('status', ['approved', 'imported', 'pending_review'])
      .order('recall_initiation_date', { ascending: false })
      .limit(500)
    
    if (recallError) {
      console.error('[Recall Check] Error fetching recalls:', recallError)
      return NextResponse.json({ error: 'Failed to fetch recalls' }, { status: 500 })
    }
    
    // Get existing matches to avoid duplicates
    const { data: existingMatches } = await supabase
      .from('fsvp_supplier_recall_matches')
      .select('recall_number')
      .eq('supplier_id', supplierId)
    
    const existingRecallNumbers = new Set(
      (existingMatches || []).map(m => m.recall_number)
    )
    
    // Find matches
    const matches: RecallMatch[] = []
    
    for (const recall of (recalls || [])) {
      // Skip if already matched
      if (existingRecallNumbers.has(recall.recall_number)) {
        continue
      }
      
      const firmName = recall.recalling_firm || ''
      const confidence = fuzzyMatch(supplier.supplier_name, firmName)
      
      if (confidence >= 0.6) {
        matches.push({
          recall_id: recall.id,
          recall_number: recall.recall_number,
          recalling_firm: firmName,
          product_description: recall.product_description,
          reason_for_recall: recall.reason_for_recall,
          recall_classification: recall.classification,
          recall_initiation_date: recall.recall_initiation_date,
          termination_date: recall.termination_date,
          match_type: confidence === 1.0 ? 'exact_name' : 'fuzzy_name',
          match_confidence: confidence,
          matched_field: 'recalling_firm',
        })
      }
    }
    
    console.log(`[Recall Check] Found ${matches.length} potential matches`)
    
    // Insert new matches
    const newMatches = []
    for (const match of matches) {
      const { data: inserted, error: insertError } = await supabase
        .from('fsvp_supplier_recall_matches')
        .insert({
          supplier_id: supplierId,
          recall_id: match.recall_id,
          recall_number: match.recall_number,
          recalling_firm: match.recalling_firm,
          product_description: match.product_description,
          reason_for_recall: match.reason_for_recall,
          recall_classification: match.recall_classification,
          recall_initiation_date: match.recall_initiation_date,
          termination_date: match.termination_date,
          match_type: match.match_type,
          match_confidence: match.match_confidence,
          matched_field: match.matched_field,
          review_status: match.match_confidence >= 0.9 ? 'pending' : 'pending',
          risk_level: match.recall_classification === 'Class I' ? 'critical' :
                      match.recall_classification === 'Class II' ? 'high' :
                      match.recall_classification === 'Class III' ? 'medium' : 'low',
        })
        .select()
        .single()
      
      if (!insertError && inserted) {
        newMatches.push(inserted)
      }
    }
    
    // Log the check
    await supabase
      .from('fsvp_supplier_recall_check_log')
      .insert({
        supplier_id: supplierId,
        check_type: 'manual',
        search_terms: searchTerms,
        recalls_found: recalls?.length || 0,
        new_matches: newMatches.length,
        status: 'completed',
        checked_by: user.id,
      })
    
    // Update supplier recall summary (trigger should handle this, but ensure it's done)
    if (newMatches.length > 0) {
      const { data: allMatches } = await supabase
        .from('fsvp_supplier_recall_matches')
        .select('recall_classification, recall_initiation_date, review_status')
        .eq('supplier_id', supplierId)
        .in('review_status', ['confirmed', 'pending'])
      
      const recallCount = allMatches?.length || 0
      const hasClassI = allMatches?.some(m => m.recall_classification === 'Class I')
      const hasClassII = allMatches?.some(m => m.recall_classification === 'Class II')
      const hasClassIII = allMatches?.some(m => m.recall_classification === 'Class III')
      const lastRecallDate = allMatches?.reduce((max, m) => {
        if (!m.recall_initiation_date) return max
        return !max || m.recall_initiation_date > max ? m.recall_initiation_date : max
      }, null as string | null)
      
      await supabase
        .from('fsvp_suppliers')
        .update({
          has_recall_history: recallCount > 0,
          recall_count: recallCount,
          recall_severity: hasClassI ? 'class_i' : hasClassII ? 'class_ii' : hasClassIII ? 'class_iii' : 'none',
          last_recall_date: lastRecallDate,
          recall_last_checked_at: new Date().toISOString(),
        })
        .eq('id', supplierId)
    } else {
      // Just update the check timestamp
      await supabase
        .from('fsvp_suppliers')
        .update({
          recall_last_checked_at: new Date().toISOString(),
        })
        .eq('id', supplierId)
    }
    
    return NextResponse.json({
      success: true,
      supplier_id: supplierId,
      supplier_name: supplier.supplier_name,
      recalls_checked: recalls?.length || 0,
      new_matches_found: newMatches.length,
      matches: newMatches,
    })
    
  } catch (error: any) {
    console.error('[Recall Check] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET: Get recall matches for a supplier
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: supplierId } = await params
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get supplier with recall info
    const { data: supplier, error: supplierError } = await supabase
      .from('fsvp_suppliers')
      .select(`
        id, 
        supplier_name,
        has_recall_history,
        recall_count,
        recall_severity,
        last_recall_date,
        recall_last_checked_at
      `)
      .eq('id', supplierId)
      .single()
    
    if (supplierError || !supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }
    
    // Get recall matches
    const { data: matches, error: matchError } = await supabase
      .from('fsvp_supplier_recall_matches')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('recall_initiation_date', { ascending: false })
    
    if (matchError) {
      console.error('[Recall Check] Error fetching matches:', matchError)
      return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 })
    }
    
    // Build warning message based on severity
    let warning_message = null
    if (supplier.recall_severity === 'class_i') {
      warning_message = 'CRITICAL: This supplier has Class I recall history. Enhanced verification required per §1.505.'
    } else if (supplier.recall_severity === 'class_ii') {
      warning_message = 'WARNING: This supplier has Class II recall history. Additional supplier evaluation recommended.'
    } else if (supplier.recall_severity === 'class_iii') {
      warning_message = 'NOTICE: This supplier has Class III recall history. Consider in supplier evaluation.'
    } else if (supplier.recall_count > 0) {
      warning_message = 'INFO: This supplier has recall history. Review details in supplier evaluation.'
    }
    
    return NextResponse.json({
      supplier_id: supplierId,
      supplier_name: supplier.supplier_name,
      has_recall_history: supplier.has_recall_history,
      recall_count: supplier.recall_count,
      recall_severity: supplier.recall_severity,
      last_recall_date: supplier.last_recall_date,
      last_checked_at: supplier.recall_last_checked_at,
      warning_message,
      matches: matches || [],
    })
    
  } catch (error: any) {
    console.error('[Recall Check] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
