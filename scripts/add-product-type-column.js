import postgres from 'postgres'

const sql = postgres(process.env.POSTGRES_URL, { ssl: 'require' })

async function main() {
  console.log('[v0] Adding product_type column to pending_warning_letters...')

  await sql`
    ALTER TABLE pending_warning_letters
    ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'unknown'
  `
  console.log('[v0] Column added (or already exists).')

  const result = await sql`
    UPDATE pending_warning_letters
    SET product_type = CASE
      WHEN issuing_office ILIKE '%food safety%' OR issuing_office ILIKE '%CFSAN%' THEN 'food'
      WHEN issuing_office ILIKE '%drug evaluation%' OR issuing_office ILIKE '%CDER%' THEN 'drug'
      WHEN issuing_office ILIKE '%devices%' OR issuing_office ILIKE '%radiological%' OR issuing_office ILIKE '%CDRH%' THEN 'device'
      WHEN issuing_office ILIKE '%veterinary%' OR issuing_office ILIKE '%CVM%' THEN 'veterinary'
      WHEN issuing_office ILIKE '%tobacco%' OR issuing_office ILIKE '%CTP%' THEN 'tobacco'
      WHEN issuing_office ILIKE '%cosmetic%' THEN 'cosmetic'
      ELSE 'unknown'
    END
    WHERE product_type = 'unknown' OR product_type IS NULL
  `
  console.log('[v0] Backfill complete. Rows updated:', result.count)

  const rows = await sql`SELECT product_type, COUNT(*) FROM pending_warning_letters GROUP BY product_type`
  console.log('[v0] Current distribution:', rows)

  await sql.end()
}

main().catch((err) => {
  console.error('[v0] Migration error:', err)
  process.exit(1)
})
