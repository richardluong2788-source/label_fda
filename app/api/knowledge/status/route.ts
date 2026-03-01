import { NextResponse } from 'next/server'
import { checkKnowledgeBaseStatus } from '@/lib/knowledge-base-check'

export async function GET() {
  try {
    const status = await checkKnowledgeBaseStatus()
    return NextResponse.json(status)
  } catch (error) {
    console.error('[v0] KB status check error:', error)
    return NextResponse.json({
      available: false,
      totalDocuments: 0,
      warningLetterCount: 0,
      regulationCount: 0,
      recallCount: 0,
    })
  }
}
