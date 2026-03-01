import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Verify user authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the audit report
    const { data: report, error: reportError } = await supabase
      .from('audit_reports')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (reportError || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // Check if already paid
    if (report.payment_status === 'paid' || report.report_unlocked) {
      return NextResponse.json(
        { error: 'Report already unlocked' },
        { status: 400 }
      )
    }

    // TODO: Integrate with Stripe
    // For now, create a demo checkout session
    
    const STRIPE_KEY = process.env.STRIPE_SECRET_KEY
    
    if (STRIPE_KEY && STRIPE_KEY.startsWith('sk_')) {
      // Stripe integration (when configured)
      try {
        const stripe = require('stripe')(STRIPE_KEY)
        
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: 'usd',
                product_data: {
                  name: 'FDA Compliance Full Report',
                  description: `Report ID: ${params.id}`,
                },
                unit_amount: 2900, // $29.00
              },
              quantity: 1,
            },
          ],
          mode: 'payment',
          success_url: `${process.env.NEXT_PUBLIC_APP_URL}/audit/${params.id}?payment=success`,
          cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/audit/${params.id}/checkout?payment=cancelled`,
          metadata: {
            report_id: params.id,
            user_id: user.id,
          },
        })

        return NextResponse.json({ checkoutUrl: session.url })
      } catch (stripeError) {
        console.error('Stripe error:', stripeError)
        return NextResponse.json(
          { error: 'Payment processing failed' },
          { status: 500 }
        )
      }
    }

    // Demo mode: Generate unlock token and mark as paid
    const unlockToken = `demo_${Date.now()}_${Math.random().toString(36).substring(7)}`
    
    const { error: updateError } = await supabase
      .from('audit_reports')
      .update({
        payment_status: 'paid',
        payment_amount: 29.00,
        payment_method: 'demo',
        payment_id: `demo_${Date.now()}`,
        paid_at: new Date().toISOString(),
        report_unlocked: true,
        unlock_token: unlockToken,
      })
      .eq('id', params.id)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to unlock report' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Report unlocked (demo mode)',
      checkoutUrl: null, // No redirect in demo mode
    })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
