'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ClearVisionCachePage() {
  const [reportId, setReportId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleClearCache = async () => {
    setError(null)
    setResult(null)
    setLoading(true)

    try {
      const response = await fetch('/api/admin/clear-vision-cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reportId }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to clear cache')
      } else {
        setResult(data)
        setReportId('')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-8">
      <div className="max-w-md">
        <h1 className="text-2xl font-bold mb-4">Xóa Vision Cache</h1>
        <p className="text-gray-600 mb-6">
          Nhập Report ID để xóa cache phân tích vision và buộc re-analyze
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Report ID</label>
            <Input
              placeholder="Nhập Report ID"
              value={reportId}
              onChange={(e) => setReportId(e.target.value)}
              disabled={loading}
            />
          </div>

          <Button onClick={handleClearCache} disabled={loading || !reportId} className="w-full">
            {loading ? 'Đang xóa...' : 'Xóa Cache'}
          </Button>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
              Lỗi: {error}
            </div>
          )}

          {result && (
            <div className="p-4 bg-green-50 border border-green-200 rounded text-green-700 space-y-2">
              <p className="font-medium">✓ Cache đã xóa thành công!</p>
              <p className="text-sm">Report ID: {result.reportId}</p>
              {result.message && <p className="text-sm">{result.message}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
