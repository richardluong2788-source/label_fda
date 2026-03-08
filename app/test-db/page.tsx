'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestDBPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)

  const testConnection = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/test-db')
      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to test connection')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Database Connection Test</CardTitle>
          <CardDescription>
            Click the button below to test the connection to your Supabase database
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={testConnection} disabled={loading}>
            {loading ? 'Testing...' : 'Test Database Connection'}
          </Button>

          {error && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
              <strong>Error:</strong> {error}
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                <strong>Status:</strong> {result.success ? 'Connected Successfully!' : 'Connection Failed'}
              </div>

              {result.supabase_url && (
                <div className="p-4 bg-muted rounded-lg">
                  <strong>Supabase URL:</strong> {String(result.supabase_url)}
                </div>
              )}

              {result.data && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Database Statistics:</h3>
                  <pre className="p-4 bg-muted rounded-lg overflow-auto text-sm">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              )}

              {result.errors && Object.values(result.errors as Record<string, unknown>).some(e => e) && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg text-amber-600">Errors/Warnings:</h3>
                  <pre className="p-4 bg-amber-50 rounded-lg overflow-auto text-sm text-amber-800">
                    {JSON.stringify(result.errors, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
