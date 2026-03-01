'use client'

import { useEffect, useState } from 'react'

export function FormatDate({ date }: { date: string }) {
  const [formatted, setFormatted] = useState('')

  useEffect(() => {
    setFormatted(new Date(date).toLocaleString('vi-VN', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }))
  }, [date])

  if (!formatted) {
    // Return a placeholder during SSR
    return <span>Loading...</span>
  }

  return <span>{formatted}</span>
}
