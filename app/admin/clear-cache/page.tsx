'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ClearVisionCachePage() {
  const [reportId, setReportId] = useState('')
  const [loading, setLoading] = useState(false)
  const [reanalyzing, setReanalyzing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleReanalyze = async () => {
    if (!reportId.trim()) {
      setError('Vui lòng nhập Report ID')
      return
    }
    
    setError(null)
    setResult(null)
    setReanalyzing(true)

    try {
      // First delete the report to force re-analysis
      const deleteRes = await fetch('/api/admin/delete-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: reportId.trim() }),
      })
      
      if (!deleteRes.ok) {
        const data = await deleteRes.json()
        setError(data.error || 'Không thể xóa báo cáo')
        return
      }
      
      setResult({ 
        success: true, 
        message: 'Báo cáo đã được xóa. Vui lòng upload lại ảnh để phân tích mới với cache bị bỏ qua.',
        reportId: reportId.trim()
      })
      setReportId('')
    } catch (err) {
      setError(String(err))
    } finally {
      setReanalyzing(false)
    }
  }

  return (
    <div className="container py-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-4">Quản lý Phân tích</h1>
        <p className="text-muted-foreground mb-6">
          Xóa báo cáo để phân tích lại với logic mới (multi-column, v.v.)
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Report ID</label>
            <Input
              placeholder="VD: a23b042d-3e2c-449d-a7a0-e1b9470a9f39"
              value={reportId}
              onChange={(e) => setReportId(e.target.value)}
              disabled={loading || reanalyzing}
            />
          </div>

          <Button 
            onClick={handleReanalyze} 
            disabled={reanalyzing || !reportId.trim()} 
            className="w-full"
            variant="default"
          >
            {reanalyzing ? 'Đang xóa báo cáo...' : 'Xóa báo cáo & Phân tích lại'}
          </Button>
          
          <p className="text-xs text-muted-foreground">
            Lưu ý: Sau khi xóa, bạn cần upload lại ảnh sản phẩm để chạy phân tích mới.
          </p>

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded text-destructive">
              Lỗi: {error}
            </div>
          )}

          {result && (
            <div className="p-4 bg-green-50 border border-green-200 rounded text-green-700 space-y-2">
              <p className="font-medium">Thành công!</p>
              <p className="text-sm">{result.message}</p>
              {result.reportId && <p className="text-xs">Report ID: {result.reportId}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
