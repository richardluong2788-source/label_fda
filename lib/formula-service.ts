import { createClient } from '@supabase/supabase-js'
import type { CustomerFormula, FormulaReviewAssignment, FormulaLabelComparison } from '@/lib/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

// Create a new formula submission
export async function createFormula(
  userId: string,
  data: Partial<CustomerFormula>
): Promise<{ success: boolean; formula?: CustomerFormula; error?: string }> {
  try {
    const { data: formula, error } = await supabase
      .from('customer_formulas')
      .insert({
        user_id: userId,
        product_name: data.product_name,
        product_type: data.product_type,
        product_description: data.product_description,
        brand_name: data.brand_name,
        batch_number: data.batch_number,
        formula_version: data.formula_version,
        total_percentage: data.total_percentage,
        ingredients: data.ingredients || [],
        ingredient_count: data.ingredients?.length || 0,
        uploaded_file_url: data.uploaded_file_url,
        file_name: data.file_name,
        file_type: data.file_type || 'manual',
        parsed_by_ai: data.parsed_by_ai || false,
        parsing_confidence: data.parsing_confidence,
        ai_suggestions: data.ai_suggestions || {},
        parsing_errors: data.parsing_errors || [],
        status: 'draft',
        approval_status: 'pending',
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    return { success: true, formula: formula as CustomerFormula }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// Get formula by ID
export async function getFormulaById(id: string): Promise<CustomerFormula | null> {
  const { data, error } = await supabase
    .from('customer_formulas')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('[v0] Get formula error:', error)
    return null
  }

  return data as CustomerFormula
}

// Get all formulas for a user
export async function getUserFormulas(
  userId: string,
  status?: string
): Promise<CustomerFormula[]> {
  let query = supabase.from('customer_formulas').select('*').eq('user_id', userId)

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('[v0] Get user formulas error:', error)
    return []
  }

  return (data || []) as CustomerFormula[]
}

// Update formula
export async function updateFormula(
  id: string,
  data: Partial<CustomerFormula>
): Promise<{ success: boolean; formula?: CustomerFormula; error?: string }> {
  try {
    const { data: formula, error } = await supabase
      .from('customer_formulas')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    return { success: true, formula: formula as CustomerFormula }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// Submit formula for review
export async function submitFormula(
  id: string,
  auditReportId?: string
): Promise<{ success: boolean; formula?: CustomerFormula; error?: string }> {
  return updateFormula(id, {
    status: 'submitted',
    submission_date: new Date().toISOString(),
    audit_report_id: auditReportId,
  } as Partial<CustomerFormula>)
}

// Get formulas pending review
export async function getPendingFormulas(
  limit: number = 50,
  offset: number = 0
): Promise<CustomerFormula[]> {
  const { data, error } = await supabase
    .from('customer_formulas')
    .select('*')
    .eq('status', 'submitted')
    .order('submission_date', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('[v0] Get pending formulas error:', error)
    return []
  }

  return (data || []) as CustomerFormula[]
}

// Assign formula to reviewer
export async function assignFormulaReview(
  formulaId: string,
  assignedToUserId: string,
  assignedByUserId: string,
  reviewType: string = 'initial_review',
  priority: string = 'normal',
  dueDate?: string
): Promise<{ success: boolean; assignment?: FormulaReviewAssignment; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('formula_review_assignments')
      .insert({
        formula_id: formulaId,
        assigned_to: assignedToUserId,
        assigned_by: assignedByUserId,
        review_type: reviewType,
        priority,
        due_date: dueDate,
        status: 'assigned',
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    // Update formula status
    await updateFormula(formulaId, { status: 'under_review' } as Partial<CustomerFormula>)

    return { success: true, assignment: data as FormulaReviewAssignment }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// Get review queue for a consultant
export async function getReviewQueue(
  userId: string,
  status: string = 'assigned'
): Promise<Array<{ assignment: FormulaReviewAssignment; formula: CustomerFormula }>> {
  const { data, error } = await supabase
    .from('formula_review_assignments')
    .select('id, formula_id, assigned_to, assigned_by, priority, review_type, status, due_date, assigned_at, started_at, completed_at, completion_notes, created_at, updated_at')
    .eq('assigned_to', userId)
    .eq('status', status)
    .order('priority', { ascending: false })
    .order('due_date', { ascending: true })

  if (error) {
    console.error('[v0] Get review queue error:', error)
    return []
  }

  const assignments = data as FormulaReviewAssignment[]
  const results = []

  for (const assignment of assignments) {
    const formula = await getFormulaById(assignment.formula_id)
    if (formula) {
      results.push({ assignment, formula })
    }
  }

  return results
}

// Update review assignment status
export async function updateReviewAssignment(
  id: string,
  status: string,
  completionNotes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = { status }

    if (status === 'in_progress') {
      updateData.started_at = new Date().toISOString()
    } else if (status === 'completed') {
      updateData.completed_at = new Date().toISOString()
      updateData.completion_notes = completionNotes
      if (updateData.started_at) {
        // Calculate duration
        const start = new Date(updateData.started_at)
        const end = new Date()
        updateData.completion_time_minutes = Math.round((end.getTime() - start.getTime()) / 60000)
      }
    }

    const { error } = await supabase
      .from('formula_review_assignments')
      .update(updateData)
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// Create formula-label comparison
export async function createComparison(
  formulaId: string,
  labelIngredients: any[],
  formulaIngredients: any[]
): Promise<{ success: boolean; comparison?: FormulaLabelComparison; error?: string }> {
  try {
    // Analyze differences
    const analysis = analyzeFormulaVsLabel(labelIngredients, formulaIngredients)

    const { data, error } = await supabase
      .from('formula_label_comparisons')
      .insert({
        formula_id: formulaId,
        label_ingredients: labelIngredients,
        formula_ingredients: formulaIngredients,
        ingredients_match: analysis.ingredientsMatch,
        order_correct: analysis.orderCorrect,
        critical_issues: analysis.criticalIssues,
        warnings: analysis.warnings,
        status: 'pending',
        approval_status: 'pending',
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    return { success: true, comparison: data as FormulaLabelComparison }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// Get comparison results
export async function getComparison(id: string): Promise<FormulaLabelComparison | null> {
  const { data, error } = await supabase
    .from('formula_label_comparisons')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('[v0] Get comparison error:', error)
    return null
  }

  return data as FormulaLabelComparison
}

// Approve formula
export async function approveFormula(
  formulaId: string,
  approvedByUserId: string,
  approvalStatus: string = 'approved',
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('customer_formulas')
      .update({
        status: 'approved',
        approval_status: approvalStatus,
        reviewed_by: approvedByUserId,
        review_completed_at: new Date().toISOString(),
        review_notes: notes,
      })
      .eq('id', formulaId)

    if (error) return { success: false, error: error.message }

    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// Reject formula
export async function rejectFormula(
  formulaId: string,
  rejectedByUserId: string,
  reason: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('customer_formulas')
      .update({
        status: 'revision_needed',
        approval_status: 'rejected',
        reviewed_by: rejectedByUserId,
        review_completed_at: new Date().toISOString(),
        rejection_reason: reason,
        review_notes: notes,
      })
      .eq('id', formulaId)

    if (error) return { success: false, error: error.message }

    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// Helper function to analyze formula vs label
function analyzeFormulaVsLabel(
  labelIngredients: any[],
  formulaIngredients: any[]
): {
  ingredientsMatch: boolean
  orderCorrect: boolean
  criticalIssues: any[]
  warnings: any[]
} {
  const criticalIssues = []
  const warnings = []

  // Check if all label ingredients are in formula
  for (const labelIng of labelIngredients) {
    const found = formulaIngredients.some(f => f.name?.toLowerCase() === labelIng.name?.toLowerCase())
    if (!found) {
      criticalIssues.push({
        type: 'missing_ingredient',
        description: `Ingredient "${labelIng.name}" is on label but not in formula`,
        ingredient: labelIng.name,
      })
    }
  }

  // Check if all formula ingredients are on label
  for (const formulaIng of formulaIngredients) {
    const found = labelIngredients.some(l => l.name?.toLowerCase() === formulaIng.name?.toLowerCase())
    if (!found) {
      warnings.push({
        type: 'extra_ingredient',
        description: `Ingredient "${formulaIng.name}" is in formula but not on label`,
      })
    }
  }

  // Check order
  let orderCorrect = true
  for (let i = 0; i < Math.min(labelIngredients.length, formulaIngredients.length); i++) {
    if (labelIngredients[i].name?.toLowerCase() !== formulaIngredients[i].name?.toLowerCase()) {
      orderCorrect = false
      break
    }
  }

  const ingredientsMatch = criticalIssues.length === 0 && labelIngredients.length === formulaIngredients.length

  return {
    ingredientsMatch,
    orderCorrect,
    criticalIssues,
    warnings,
  }
}
