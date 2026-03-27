'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ManualEntryRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/dashboard/draft')
  }, [router])
  
  return null
}
