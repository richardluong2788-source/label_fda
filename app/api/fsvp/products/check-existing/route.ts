import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/fsvp/products/check-existing
 * Check if a product with similar brand + name already exists
 * This helps prevent duplicate FSVP records for the same product
 * (e.g., when scanning multiple packaging levels of the same product)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const brandName = searchParams.get('brandName')?.trim() || ''
    const productName = searchParams.get('productName')?.trim() || ''
    
    // Need at least one identifier
    if (!brandName && !productName) {
      return NextResponse.json({ existingProduct: null })
    }
    
    // Build query to find matching products
    // Search in fsvp_hazard_analyses first (has more data from label scans)
    let query = supabase
      .from('fsvp_hazard_analyses')
      .select(`
        id,
        product_name,
        brand_name,
        supplier_id,
        status,
        created_at,
        fsvp_suppliers (
          id,
          supplier_name
        )
      `)
      .or(`importer_user_id.eq.${user.id},analyzed_by.eq.${user.id}`)
    
    // Build search conditions
    const conditions: string[] = []
    
    if (brandName && productName) {
      // Both brand and product name - exact match (case insensitive)
      conditions.push(`and(brand_name.ilike.${brandName},product_name.ilike.${productName})`)
    } else if (productName) {
      // Only product name - fuzzy match
      conditions.push(`product_name.ilike.%${productName}%`)
    } else if (brandName) {
      // Only brand name - fuzzy match
      conditions.push(`brand_name.ilike.%${brandName}%`)
    }
    
    // Apply OR conditions
    if (conditions.length > 0) {
      query = query.or(conditions.join(','))
    }
    
    // Order by most recent and limit
    const { data: hazardAnalyses, error } = await query
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (error) {
      console.error('[Check Existing] Error querying hazard analyses:', error)
      return NextResponse.json({ existingProduct: null })
    }
    
    // Find best match
    if (hazardAnalyses && hazardAnalyses.length > 0) {
      // Score matches - exact brand+name match gets highest score
      const scoredMatches = hazardAnalyses.map(ha => {
        let score = 0
        const haBrand = (ha.brand_name || '').toLowerCase()
        const haProduct = (ha.product_name || '').toLowerCase()
        const searchBrand = brandName.toLowerCase()
        const searchProduct = productName.toLowerCase()
        
        // Exact brand match
        if (haBrand === searchBrand) score += 50
        // Brand contains search
        else if (haBrand.includes(searchBrand) || searchBrand.includes(haBrand)) score += 25
        
        // Exact product name match
        if (haProduct === searchProduct) score += 50
        // Product contains search
        else if (haProduct.includes(searchProduct) || searchProduct.includes(haProduct)) score += 25
        
        return { ...ha, matchScore: score }
      })
      
      // Sort by score descending
      scoredMatches.sort((a, b) => b.matchScore - a.matchScore)
      
      // Only return if score is high enough (at least partial match)
      const bestMatch = scoredMatches[0]
      if (bestMatch.matchScore >= 50) {
        // Count how many labels/scans are linked to this product
        const { count: labelCount } = await supabase
          .from('audit_reports')
          .select('id', { count: 'exact', head: true })
          .eq('fsvp_hazard_analysis_id', bestMatch.id)
        
        return NextResponse.json({
          existingProduct: {
            id: bestMatch.id,
            product_name: bestMatch.product_name,
            brand_name: bestMatch.brand_name,
            label_count: (labelCount || 0) + 1, // +1 for the original
            hazard_analysis_id: bestMatch.id,
            supplier_name: bestMatch.fsvp_suppliers?.supplier_name || null,
            status: bestMatch.status,
            matchScore: bestMatch.matchScore,
          }
        })
      }
    }
    
    // Also check fsvp_products table
    let productQuery = supabase
      .from('fsvp_products')
      .select(`
        id,
        product_name,
        brand_name,
        supplier_id,
        status,
        created_at,
        fsvp_suppliers (
          id,
          supplier_name
        )
      `)
    
    // Apply similar search
    if (brandName && productName) {
      productQuery = productQuery
        .ilike('brand_name', brandName)
        .ilike('product_name', productName)
    } else if (productName) {
      productQuery = productQuery.ilike('product_name', `%${productName}%`)
    } else if (brandName) {
      productQuery = productQuery.ilike('brand_name', `%${brandName}%`)
    }
    
    const { data: products, error: productError } = await productQuery
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (productError) {
      console.error('[Check Existing] Error querying products:', productError)
      return NextResponse.json({ existingProduct: null })
    }
    
    if (products && products.length > 0) {
      const product = products[0]
      
      // Count labels for this product
      const { count: labelCount } = await supabase
        .from('fsvp_product_labels')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', product.id)
      
      return NextResponse.json({
        existingProduct: {
          id: product.id,
          product_name: product.product_name,
          brand_name: product.brand_name,
          label_count: labelCount || 0,
          supplier_name: product.fsvp_suppliers?.supplier_name || null,
          status: product.status,
        }
      })
    }
    
    // No match found
    return NextResponse.json({ existingProduct: null })
    
  } catch (error) {
    console.error('[Check Existing] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
