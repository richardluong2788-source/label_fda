/**
 * Fix Embeddings Script
 * Re-generates all compliance_knowledge embeddings with text-embedding-3-small (1536 dims)
 * 
 * Current problem: embeddings have 19,161 dimensions (wrong model)
 * Required: 1,536 dimensions (text-embedding-3-small)
 * 
 * USAGE:
 * 1. First run SQL script 036_diagnose_and_fix_embeddings.sql in Supabase Dashboard
 * 2. Then run: node scripts/fix-embeddings.js
 */

const { createClient } = require('@supabase/supabase-js')
const OpenAI = require('openai').default

// Load .env.local if exists
try {
  require('dotenv').config({ path: '.env.local' })
} catch (e) {
  // dotenv not installed, skip
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const openaiKey = process.env.OPENAI_API_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

if (!openaiKey) {
  console.error('❌ Missing OPENAI_API_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const openai = new OpenAI({ apiKey: openaiKey })

const BATCH_SIZE = 100  // Process 100 records at a time
const DELAY_MS = 1000   // 1 second delay between batches to avoid rate limits

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8000),  // Truncate to avoid token limits
  })
  return response.data[0].embedding
}

async function fixEmbeddings() {
  console.log('🔧 Fix Embeddings Script')
  console.log('='.repeat(60))
  
  // 1. Get total count
  const { count, error: countError } = await supabase
    .from('compliance_knowledge')
    .select('*', { count: 'exact', head: true })
  
  if (countError) {
    console.error('❌ Failed to count records:', countError.message)
    process.exit(1)
  }
  
  console.log(`📊 Total records to re-embed: ${count}`)
  
  // 2. Check current embedding dimensions
  const { data: sample } = await supabase
    .from('compliance_knowledge')
    .select('id, embedding')
    .limit(1)
  
  if (sample && sample.length > 0) {
    const currentDims = sample[0].embedding?.length || 0
    console.log(`⚠️  Current embedding dimensions: ${currentDims}`)
    console.log(`✅ Target embedding dimensions: 1536`)
  }
  
  // 3. Process in batches
  let processed = 0
  let failed = 0
  let offset = 0
  
  console.log('\n🚀 Starting re-embedding...\n')
  
  while (offset < count) {
    // Fetch batch
    const { data: batch, error: fetchError } = await supabase
      .from('compliance_knowledge')
      .select('id, content')
      .range(offset, offset + BATCH_SIZE - 1)
      .order('id')
    
    if (fetchError) {
      console.error(`❌ Fetch error at offset ${offset}:`, fetchError.message)
      break
    }
    
    if (!batch || batch.length === 0) break
    
    // Generate embeddings for batch
    for (const record of batch) {
      try {
        const embedding = await generateEmbedding(record.content)
        
        // Update record
        const { error: updateError } = await supabase
          .from('compliance_knowledge')
          .update({ embedding })
          .eq('id', record.id)
        
        if (updateError) {
          console.error(`❌ Update failed for id ${record.id}:`, updateError.message)
          failed++
        } else {
          processed++
        }
      } catch (e) {
        console.error(`❌ Embedding failed for id ${record.id}:`, e.message)
        failed++
      }
      
      // Progress log every 10 records
      if ((processed + failed) % 10 === 0) {
        const pct = (((processed + failed) / count) * 100).toFixed(1)
        console.log(`   Progress: ${processed + failed}/${count} (${pct}%) - OK: ${processed}, Failed: ${failed}`)
      }
    }
    
    offset += BATCH_SIZE
    
    // Rate limit delay
    if (offset < count) {
      await sleep(DELAY_MS)
    }
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('📋 Summary')
  console.log('='.repeat(60))
  console.log(`   Total records: ${count}`)
  console.log(`   Successfully re-embedded: ${processed}`)
  console.log(`   Failed: ${failed}`)
  
  // 4. Verify
  const { data: verify } = await supabase
    .from('compliance_knowledge')
    .select('id, embedding')
    .limit(1)
  
  if (verify && verify.length > 0) {
    const newDims = verify[0].embedding?.length || 0
    console.log(`\n✅ Verified new embedding dimensions: ${newDims}`)
    if (newDims === 1536) {
      console.log('🎉 Embeddings fixed! RAG should now work correctly.')
    } else {
      console.log('⚠️  Dimensions still incorrect. Check OpenAI API key and model.')
    }
  }
}

fixEmbeddings().catch(console.error)
