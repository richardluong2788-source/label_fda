/**
 * Sprint 2 Diagnostic Script
 * Checks: RAG database, Redis cache, and identifies issues
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnose() {
  console.log('🔍 Sprint 2 Diagnostic Report\n')
  console.log('='.repeat(60))

  // 1. Check regulations table
  console.log('\n📊 Priority 1: RAG Database Check')
  console.log('-'.repeat(40))
  
  const { count: regCount, error: regError } = await supabase
    .from('regulations')
    .select('*', { count: 'exact', head: true })
  
  if (regError) {
    console.log(`❌ regulations table error: ${regError.message}`)
  } else {
    console.log(`   regulations count: ${regCount}`)
    if (regCount === 0) {
      console.log('   ⚠️  CRITICAL: regulations table is EMPTY!')
      console.log('   → RAG search will always return 0 results')
    }
  }

  // 2. Check compliance_knowledge table (the actual RAG table)
  const { count: ckCount, error: ckError } = await supabase
    .from('compliance_knowledge')
    .select('*', { count: 'exact', head: true })
  
  if (ckError) {
    console.log(`❌ compliance_knowledge table error: ${ckError.message}`)
  } else {
    console.log(`   compliance_knowledge count: ${ckCount}`)
    if (ckCount === 0) {
      console.log('   ⚠️  CRITICAL: compliance_knowledge table is EMPTY!')
      console.log('   → This is the RAG vector table - no embeddings to search!')
    }
  }

  // 3. Check embedding dimensions
  const { data: sample, error: sampleError } = await supabase
    .from('compliance_knowledge')
    .select('id, embedding')
    .limit(1)
  
  if (!sampleError && sample && sample.length > 0) {
    const embeddingLength = sample[0].embedding?.length || 0
    console.log(`   embedding dimensions: ${embeddingLength}`)
    if (embeddingLength !== 1536) {
      console.log(`   ⚠️  Expected 1536 dims for text-embedding-3-small, got ${embeddingLength}`)
    }
  }

  // 4. Check warning_letters
  const { count: wlCount, error: wlError } = await supabase
    .from('warning_letters')
    .select('*', { count: 'exact', head: true })
  
  console.log(`   warning_letters count: ${wlCount ?? 'N/A'} ${wlError ? `(${wlError.message})` : ''}`)

  // 5. Check recalls
  const { count: recallCount, error: recallError } = await supabase
    .from('recalls')
    .select('*', { count: 'exact', head: true })
  
  console.log(`   recalls count: ${recallCount ?? 'N/A'} ${recallError ? `(${recallError.message})` : ''}`)

  // 6. Check RPC function exists
  console.log('\n🔧 RPC Functions Check')
  console.log('-'.repeat(40))
  
  // Test if match_compliance_knowledge exists by calling with dummy embedding
  const dummyEmbedding = new Array(1536).fill(0)
  const { data: rpcData, error: rpcError } = await supabase.rpc('match_compliance_knowledge', {
    query_embedding: dummyEmbedding,
    match_threshold: 0.01,
    match_count: 1,
  })
  
  if (rpcError) {
    console.log(`   ❌ match_compliance_knowledge RPC error: ${rpcError.message}`)
    if (rpcError.message.includes('does not exist')) {
      console.log('   → RPC function not created! Need to run migration.')
    }
  } else {
    console.log(`   ✅ match_compliance_knowledge RPC exists, returned ${rpcData?.length || 0} results`)
  }

  // 7. Check Redis
  console.log('\n📦 Priority 2: Redis Cache Check')
  console.log('-'.repeat(40))
  
  const redisUrl = process.env.KV_REST_API_URL
  const redisToken = process.env.KV_REST_API_TOKEN
  
  if (!redisUrl || !redisToken) {
    console.log('   ⚠️  Redis not configured (KV_REST_API_URL or KV_REST_API_TOKEN missing)')
    console.log('   → Embedding cache will always MISS')
  } else {
    console.log(`   ✅ Redis configured: ${redisUrl.substring(0, 30)}...`)
    
    // Try to ping Redis
    try {
      const { Redis } = await import('@upstash/redis')
      const redis = new Redis({ url: redisUrl, token: redisToken })
      const pong = await redis.ping()
      console.log(`   ✅ Redis ping: ${pong}`)
      
      // Check cache keys
      const keys = await redis.keys('emb:v1:*')
      console.log(`   📊 Embedding cache entries: ${keys.length}`)
      
      const visionKeys = await redis.keys('vision:v1:*')
      console.log(`   📊 Vision cache entries: ${visionKeys.length}`)
    } catch (e) {
      console.log(`   ❌ Redis error: ${e.message}`)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📋 Summary & Recommendations')
  console.log('='.repeat(60))
  
  if (ckCount === 0) {
    console.log('\n🚨 CRITICAL: compliance_knowledge table is empty!')
    console.log('   The RAG system has no data to search.')
    console.log('   Action: Run knowledge base seeding scripts.')
  }
  
  if (!redisUrl || !redisToken) {
    console.log('\n⚠️  Redis not configured - embedding cache disabled')
    console.log('   Action: Add Upstash Redis integration')
  }
  
  console.log('\n✅ Diagnostic complete')
}

diagnose().catch(console.error)
