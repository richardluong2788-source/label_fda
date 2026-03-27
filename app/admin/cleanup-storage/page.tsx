'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Trash2, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

export default function CleanupStoragePage() {
  const [cleaning, setCleaning] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCleanup = async () => {
    setCleaning(true)
    setError(null)
    setResult(null)

    try {
      console.log('[v0] Manual cleanup triggered')

      const response = await fetch('/api/cron/cleanup-bulk-imports', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Cleanup failed')
      }

      setResult(data)
      console.log('[v0] Cleanup complete:', data)

    } catch (err: any) {
      console.error('[v0] Cleanup error:', err)
      setError(err.message)
    } finally {
      setCleaning(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Storage Cleanup</CardTitle>
          <CardDescription>
            Xóa các file tạm trong thư mục bulk-imports đã quá 24 giờ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Cron job tự động chạy mỗi ngày lúc 2:00 AM. Bạn chỉ cần dùng nút này nếu muốn cleanup thủ công.
            </AlertDescription>
          </Alert>

          <Button 
            onClick={handleCleanup} 
            disabled={cleaning}
            className="w-full"
          >
            {cleaning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang xóa file...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Cleanup ngay bây giờ
              </>
            )}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">{result.message}</p>
                  <div className="text-sm text-muted-foreground">
                    <p>Tổng file: {result.total_files}</p>
                    <p>Đã xóa: {result.deleted_count}</p>
                  </div>
                  {result.deleted_files && result.deleted_files.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm">Xem chi tiết file đã xóa</summary>
                      <ul className="mt-2 text-xs space-y-1">
                        {result.deleted_files.map((file: string, i: number) => (
                          <li key={i} className="truncate">{file}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
