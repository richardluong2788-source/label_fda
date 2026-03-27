/**
 * Backfill product_type for existing pending_warning_letters rows
 * using issuing_office + subject classification.
 */
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/** Mirrors classifyProductCategory from lib/fda-scraper.ts */
function classifyProductCategory(issuingOffice = '', subject = '', contentSnippet = '') {
  const office = issuingOffice.toLowerCase()
  const sub    = subject.toLowerCase()
  const snip   = contentSnippet.toLowerCase().slice(0, 2000)

  if (office.includes('cfsan')) {
    if (['cosmetic','makeup','lotion','shampoo','cream','serum'].some(k => sub.includes(k) || snip.includes(k))) return 'cosmetic'
    return 'food'
  }
  if (office.includes('cder'))  return 'drug'
  if (office.includes('cdrh'))  return 'device'
  if (office.includes('ctp') || office.includes('tobacco')) return 'tobacco'
  if (office.includes('cvm') || office.includes('veterinary')) return 'veterinary'
  if (office.includes('cber') || office.includes('biologics')) return 'biologics'
  if (office.includes('food safety') || office.includes('nutrition')) return 'food'
  if (office.includes('drug'))        return 'drug'
  if (office.includes('device') || office.includes('radiological')) return 'device'

  const combined = `${sub} ${snip}`
  const TOBACCO_KW   = ['tobacco','cigarette','e-cigarette','vape','nicotine','cigar']
  const VET_KW       = ['veterinary','animal feed','animal drug','livestock','pet food']
  const BIOLOGICS_KW = ['biologic','vaccine','blood','tissue','gene therapy']
  const DEVICE_KW    = ['device','medical device','implant','diagnostic','510(k)','pma','instrument','sterilization','udi']
  const COSMETIC_KW  = ['cosmetic','makeup','lotion','shampoo','conditioner','moisturizer','sunscreen','lipstick','mascara','perfume','fragrance','personal care']
  const DRUG_KW      = ['drug','pharmaceutical','medication','tablet','capsule','injection','cgmp','usp','dosage form','otc','rx','prescription','active pharmaceutical']
  const FOOD_KW      = ['food','dietary supplement','nutrition','beverage','infant formula','seafood','produce','listeria','salmonella','e. coli','aflatoxin']

  const matches = (kws, text) => kws.some(k => text.includes(k))

  if (matches(TOBACCO_KW,   combined)) return 'tobacco'
  if (matches(VET_KW,       combined)) return 'veterinary'
  if (matches(BIOLOGICS_KW, combined)) return 'biologics'
  if (matches(DEVICE_KW,    combined)) return 'device'
  if (matches(COSMETIC_KW,  combined)) return 'cosmetic'
  if (matches(DRUG_KW,      combined)) return 'drug'
  if (matches(FOOD_KW,      combined)) return 'food'

  return 'unknown'
}

async function main() {
  console.log('[v0] Fetching all rows with product_type = unknown...')
  const { data: rows, error } = await supabase
    .from('pending_warning_letters')
    .select('id, issuing_office, subject, extracted_content')
    .eq('product_type', 'unknown')

  if (error) { console.error('[v0] Fetch error:', error.message); process.exit(1) }
  console.log(`[v0] Found ${rows.length} rows to backfill`)

  let updated = 0
  for (const row of rows) {
    const type = classifyProductCategory(
      row.issuing_office ?? '',
      row.subject ?? '',
      row.extracted_content ?? ''
    )
    const { error: upErr } = await supabase
      .from('pending_warning_letters')
      .update({ product_type: type })
      .eq('id', row.id)
    if (upErr) { console.error(`[v0] Update error for ${row.id}:`, upErr.message) }
    else {
      console.log(`[v0] ${row.id} → ${type} (office: "${row.issuing_office}", subject: "${row.subject?.slice(0,60)}")`)
      updated++
    }
  }

  console.log(`[v0] Backfill complete. Updated ${updated} / ${rows.length} rows.`)
}

main()
