import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface GeneratePriorNoticeRequest {
  productName: string
  manufacturerName: string
  manufacturerCountry?: string
  intendedUse: string
  quantity: number
  unitOfMeasure: string
  importDate: string
  portOfEntry?: string
  commodityCode?: string
}

// Generate Prior Notice Reference Number (PNRN)
function generatePNRN(): string {
  // Format: PN + YYYYMMDD + 6-digit random
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
  const randomStr = Math.floor(Math.random() * 999999)
    .toString()
    .padStart(6, '0')
  return `PN${dateStr}${randomStr}`
}

// Get required documentation based on product type
function getRequiredDocuments(intendedUse: string): string[] {
  const baseDocuments = [
    'Certificate of Analysis (COA)',
    'Ingredient list with specifications',
    'Product label or packaging artwork',
  ]

  if (intendedUse === 'Human Food') {
    return [
      ...baseDocuments,
      'Health certificate from country of origin',
      'Allergen declaration',
      'Manufacturing facility registration (FDA)',
    ]
  }

  if (intendedUse === 'Dietary Supplement') {
    return [
      ...baseDocuments,
      'Supplement facts panel',
      'Stability data',
    ]
  }

  if (intendedUse === 'Pet Food') {
    return [
      ...baseDocuments,
      'Nutritional analysis',
      'Safety data sheet (if applicable)',
    ]
  }

  return baseDocuments
}

// Assessment guidance based on product
function getComplianceGuidance(productName: string, manufacturerCountry?: string): string {
  let guidance = `Prior Notice for "${productName}" has been generated.\n\n`

  guidance += 'NEXT STEPS:\n'
  guidance += '1. Verify all shipment details are accurate\n'
  guidance += '2. Gather required documentation listed above\n'
  guidance += '3. Submit this PNRN to FDA ePrior Notification system at least 15 calendar days BEFORE arrival\n'
  guidance += '4. Keep confirmation receipt for customs clearance\n\n'

  guidance += 'IMPORTANT REMINDERS:\n'
  guidance += '• FDA must receive Prior Notice at least 15 days before shipment arrival\n'
  guidance += '• Failure to provide timely notice may result in port detention\n'
  guidance += '• All documentation must be in English or include certified translations\n'

  if (manufacturerCountry) {
    guidance += `• Manufacturer country: ${manufacturerCountry} - ensure facility is FDA-registered if required\n`
  }

  guidance += '\nFor questions, contact your FDA import specialist or visit www.fda.gov/priornotice'

  return guidance
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as GeneratePriorNoticeRequest

    // Validation
    if (!body.productName?.trim() || !body.manufacturerName?.trim()) {
      return NextResponse.json(
        { error: 'Product name and manufacturer name are required' },
        { status: 400 }
      )
    }

    if (!body.importDate) {
      return NextResponse.json(
        { error: 'Import date is required' },
        { status: 400 }
      )
    }

    if (body.quantity <= 0) {
      return NextResponse.json(
        { error: 'Quantity must be greater than 0' },
        { status: 400 }
      )
    }

    // Generate PNRN
    const pnrn = generatePNRN()

    // Get required documents
    const requiredDocuments = getRequiredDocuments(body.intendedUse)

    // Get guidance
    const guidance = getComplianceGuidance(body.productName, body.manufacturerCountry)

    // Determine risk level (simplified assessment)
    let riskLevel: 'low' | 'medium' | 'high' = 'medium'
    
    // High-risk countries or products would increase risk
    const highRiskCountries = ['North Korea', 'Iran', 'Syria']
    if (body.manufacturerCountry && highRiskCountries.includes(body.manufacturerCountry)) {
      riskLevel = 'high'
    }

    // Ingredients products typically lower risk
    if (body.intendedUse === 'Food Additive' || body.commodityCode?.startsWith('21')) {
      riskLevel = 'low'
    }

    // Store in database
    const { data: priorNotice, error: insertError } = await supabase
      .from('prior_notices')
      .insert({
        user_id: user.id,
        product_name: body.productName,
        manufacturer_name: body.manufacturerName,
        manufacturer_country: body.manufacturerCountry,
        intended_use: body.intendedUse,
        quantity: body.quantity,
        unit_of_measure: body.unitOfMeasure,
        import_date: body.importDate,
        port_of_entry: body.portOfEntry,
        commodity_code: body.commodityCode,
        pnrn: pnrn,
        compliance_status: 'draft',
        risk_level: riskLevel,
        risk_factors: [],
      })
      .select()
      .single()

    if (insertError) {
      console.error('[v0] Prior Notice insert error:', insertError)
      throw new Error('Failed to create prior notice')
    }

    return NextResponse.json({
      success: true,
      data: {
        id: priorNotice?.id,
        pnrn: pnrn,
        productName: body.productName,
        manufacturerName: body.manufacturerName,
        importDate: body.importDate,
        complianceStatus: 'draft',
        riskLevel: riskLevel,
        requiredDocuments: requiredDocuments,
        guidance: guidance,
        submissionUrl: 'https://www.fda.gov/industry/importing-food-products-united-states/prior-notification',
      },
    })
  } catch (error) {
    console.error('[v0] Prior Notice generation error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate prior notice',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
