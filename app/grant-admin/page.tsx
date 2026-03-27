'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function GrantAdminPage() {
  const [granting, setGranting] = useState(false)
  const [result, setResult] = useState('')

  const grantAdmin = async () => {
    setGranting(true)
    setResult('')
    
    try {
      const response = await fetch('/api/admin/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: '2e89bd83-6c7b-43c1-9df6-323688d73519' 
        }),
      })

      const data = await response.json()
      
      if (response.ok) {
        setResult('✅ Admin privileges granted successfully! Please refresh the page.')
      } else {
        setResult(`❌ Error: ${data.error}`)
      }
    } catch (error: any) {
      setResult(`❌ Error: ${error.message}`)
    } finally {
      setGranting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">Grant Admin Access</h1>
        <p className="text-muted-foreground mb-6">
          Click the button below to grant superadmin privileges to:<br />
          <code className="text-xs bg-muted px-2 py-1 rounded mt-2 inline-block">
            hocluongvan88@gmail.com
          </code>
        </p>
        
        <Button 
          onClick={grantAdmin} 
          disabled={granting}
          className="w-full"
          size="lg"
        >
          {granting ? 'Granting...' : 'Grant Superadmin Access'}
        </Button>

        {result && (
          <div className="mt-4 p-4 rounded-lg bg-muted text-sm">
            {result}
          </div>
        )}
      </Card>
    </div>
  )
}
