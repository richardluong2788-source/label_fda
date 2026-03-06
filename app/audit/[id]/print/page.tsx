'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { AuditReport, Violation } from '@/lib/types'
import { Shield, AlertTriangle, CheckCircle, AlertCircle, Loader2, ArrowLeft, FileText, Calendar, Hash, Tag, Award, XCircle, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ────────────────────────────────────────────────────────────
// FDA Compliance Report - Print View (A4 Layout)
// Designed for professional PDF export via window.print()
// ────────────────────────────────────────────────────────────

export default function PrintReportPage() {
  const params = useParams()
  const router = useRouter()
  const [report, setReport] = useState<AuditReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadReport()
  }, [params.id])

  const loadReport = async () => {
    try {
      const res = await fetch(`/api/audit/${params.id}`)
      if (!res.ok) throw new Error('Failed to load report')
      const data = await res.json()
      setReport(data.report || data)
    } catch (err: any) {
      setError(err.message || 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    // Set custom title for PDF filename
    const originalTitle = document.title
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '')
    const productSlug = (report?.product_name || 'Report')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 30)
    document.title = `Bao_cao_FDA_${productSlug}_VeximGlobal_${dateStr}`
    
    window.print()
    
    setTimeout(() => {
      document.title = originalTitle
    }, 1000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading report...</p>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-slate-600 mb-4">{error || 'Report not found'}</p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  const currentDate = new Date().toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  const criticalViolations = report.violations?.filter(v => v.severity === 'critical') || []
  const warningViolations = report.violations?.filter(v => v.severity === 'warning') || []
  const infoViolations = report.violations?.filter(v => v.severity === 'info') || []

  const getRiskColor = (score: number) => {
    if (score <= 3) return '#22c55e' // green
    if (score <= 6) return '#f59e0b' // amber
    return '#ef4444' // red
  }

  const getRiskLabel = (score: number) => {
    if (score <= 3) return 'Thấp'
    if (score <= 6) return 'Trung bình'
    return 'Cao'
  }

  const overallRisk = report.overall_risk_score ?? 5

  return (
    <>
      {/* Print Controls - Hidden when printing */}
      <div className="print-controls bg-slate-800 text-white p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()} className="text-white hover:bg-slate-700">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </Button>
          <span className="text-slate-300">|</span>
          <span className="text-sm text-slate-300">Xem trước báo cáo PDF</span>
        </div>
        <Button onClick={handlePrint} className="bg-red-600 hover:bg-red-700">
          <FileText className="mr-2 h-4 w-4" />
          In / Tải PDF
        </Button>
      </div>

      {/* A4 Container */}
      <div className="print-wrapper bg-slate-200 min-h-screen py-8 print:bg-white print:py-0">
        <div className="a4-container">
          
          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* PAGE 1: Cover & Summary */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          
          {/* Header */}
          <header className="report-header">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">VEXIM GLOBAL</h1>
                <p className="text-xs text-slate-500 uppercase tracking-wider">FDA Compliance Solutions</p>
              </div>
            </div>
            
            <div className="text-right text-xs text-slate-500 space-y-0.5">
              <p className="flex items-center justify-end gap-1">
                <Hash className="h-3 w-3" />
                <span className="font-medium">Mã báo cáo:</span> {report.id.slice(0, 8).toUpperCase()}
              </p>
              <p className="flex items-center justify-end gap-1">
                <Calendar className="h-3 w-3" />
                <span className="font-medium">Ngày xuất:</span> {currentDate}
              </p>
              <p className="flex items-center justify-end gap-1">
                <Tag className="h-3 w-3" />
                <span className="font-medium">Dịch vụ:</span> {report.product_type === 'dietary_supplement' ? 'Dietary Supplement' : 'FDA Food Labeling'}
              </p>
            </div>
          </header>

          {/* Title Section */}
          <div className="text-center my-8 py-6 border-t border-b border-slate-200">
            <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-wide mb-2">
              BÁO CÁO KIỂM TRA NHÃN FDA
            </h2>
            <p className="text-lg text-blue-600 font-semibold">{report.product_name || 'Sản phẩm chưa đặt tên'}</p>
            {report.product_category && (
              <p className="text-sm text-slate-500 mt-1">Danh mục: {report.product_category}</p>
            )}
          </div>

          {/* Risk Summary Card */}
          <div className="risk-summary-card">
            <div className="flex items-center justify-between">
              {/* Risk Gauge */}
              <div className="flex items-center gap-6">
                <div className="relative w-24 h-24">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="8"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke={getRiskColor(overallRisk)}
                      strokeWidth="8"
                      strokeDasharray={`${(overallRisk / 10) * 251.2} 251.2`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold" style={{ color: getRiskColor(overallRisk) }}>
                      {overallRisk.toFixed(1)}
                    </span>
                    <span className="text-[10px] text-slate-500">/10</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Mức độ rủi ro</p>
                  <p className="text-xl font-bold" style={{ color: getRiskColor(overallRisk) }}>
                    {getRiskLabel(overallRisk)}
                  </p>
                </div>
              </div>

              {/* Violation Summary */}
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-2">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <p className="text-2xl font-bold text-red-600">{criticalViolations.length}</p>
                  <p className="text-xs text-slate-500">Nghiêm trọng</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-2">
                    <AlertTriangle className="h-6 w-6 text-amber-600" />
                  </div>
                  <p className="text-2xl font-bold text-amber-600">{warningViolations.length}</p>
                  <p className="text-xs text-slate-500">Cảnh báo</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
                    <Info className="h-6 w-6 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{infoViolations.length}</p>
                  <p className="text-xs text-slate-500">Gợi ý</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    {report.ocr_confidence ? `${Math.round(report.ocr_confidence * 100)}%` : 'N/A'}
                  </p>
                  <p className="text-xs text-slate-500">OCR</p>
                </div>
              </div>
            </div>
          </div>

          {/* Overall Assessment */}
          <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <Award className="h-4 w-4 text-blue-600" />
              Đánh giá tổng quan
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {report.commercial_summary || 
                (report.overall_result === 'pass' 
                  ? 'Nhãn sản phẩm đạt yêu cầu tuân thủ FDA. Không phát hiện vi phạm nghiêm trọng.'
                  : report.overall_result === 'warning'
                  ? 'Nhãn sản phẩm có một số điểm cần cải thiện. Vui lòng xem xét các cảnh báo bên dưới để tối ưu hóa tuân thủ.'
                  : 'Nhãn sản phẩm cần được sửa đổi trước khi phân phối. Vui lòng xem chi tiết các vi phạm bên dưới.'
                )
              }
            </p>
          </div>

          {/* Regulations Checked */}
          <div className="mt-6">
            <h3 className="font-semibold text-slate-900 mb-3">Quy định đã kiểm tra</h3>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200">
                21 CFR 101 - Food Labeling
              </span>
              {report.product_type === 'dietary_supplement' && (
                <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200">
                  21 CFR 101.36 - Supplement Facts
                </span>
              )}
              <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200">
                FD&C Act Section 403
              </span>
            </div>
          </div>

          {/* Page Break */}
          <div className="page-break" />

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* PAGE 2+: Violation Details */}
          {/* ═══════════════════════════════════════════════════════════════ */}

          <h2 className="text-lg font-bold text-slate-900 mb-4 pt-4 border-t border-slate-200">
            Chi tiết các phát hiện
          </h2>

          {/* Critical Violations */}
          {criticalViolations.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                LỖI NGHIÊM TRỌNG ({criticalViolations.length})
              </h3>
              <div className="space-y-3">
                {criticalViolations.map((v, i) => (
                  <ViolationCard key={i} violation={v} index={i + 1} />
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {warningViolations.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-amber-700 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                CẢNH BÁO ({warningViolations.length})
              </h3>
              <div className="space-y-3">
                {warningViolations.map((v, i) => (
                  <ViolationCard key={i} violation={v} index={i + 1} />
                ))}
              </div>
            </div>
          )}

          {/* Info */}
          {infoViolations.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
                <Info className="h-4 w-4" />
                GỢI Ý CẢI THIỆN ({infoViolations.length})
              </h3>
              <div className="space-y-3">
                {infoViolations.map((v, i) => (
                  <ViolationCard key={i} violation={v} index={i + 1} />
                ))}
              </div>
            </div>
          )}

          {/* No violations */}
          {report.violations?.length === 0 && (
            <div className="text-center py-12 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-green-700 mb-2">Không phát hiện vi phạm</h3>
              <p className="text-sm text-green-600">Nhãn sản phẩm đạt yêu cầu tuân thủ FDA.</p>
            </div>
          )}

          {/* Page Break */}
          <div className="page-break" />

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* FINAL PAGE: Signature & Disclaimer */}
          {/* ═══════════════════════════════════════════════════════════════ */}

          {/* Expert Tips */}
          {report.expert_tips && report.expert_tips.length > 0 && (
            <div className="mb-6 pt-4 border-t border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-3">Khuyến nghị từ chuyên gia</h3>
              <ul className="space-y-2">
                {report.expert_tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Signature Section */}
          <div className="mt-8 pt-6 border-t-2 border-slate-300">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm text-slate-500 mb-1">Báo cáo được tạo bởi</p>
                <p className="text-lg font-bold text-slate-900">Vexim Global AI</p>
                <p className="text-xs text-slate-500">FDA Compliance Automation Platform</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500 mb-1">Ngày xuất báo cáo</p>
                <p className="text-lg font-semibold text-slate-900">{currentDate}</p>
                {report.reviewed_by && (
                  <p className="text-xs text-green-600 mt-1">
                    Đã xác nhận bởi: {report.reviewed_by}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mt-6 p-4 bg-slate-100 rounded-lg text-xs text-slate-500 leading-relaxed">
            <p className="font-medium text-slate-600 mb-1">Tuyên bố miễn trừ trách nhiệm</p>
            <p>
              Báo cáo này được tạo bởi hệ thống AI của Vexim Global dựa trên phân tích hình ảnh nhãn sản phẩm 
              và cơ sở dữ liệu quy định FDA. Kết quả chỉ mang tính chất tham khảo và không thay thế cho tư vấn 
              pháp lý chuyên nghiệp. Vexim Global không chịu trách nhiệm cho bất kỳ quyết định nào được đưa ra 
              dựa trên báo cáo này. Để đảm bảo tuân thủ đầy đủ, vui lòng tham khảo ý kiến chuyên gia pháp lý 
              hoặc cơ quan quản lý có thẩm quyền.
            </p>
          </div>

          {/* Footer */}
          <footer className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-center text-xs text-slate-400">
            <span>© 2026 Vexim Global. All rights reserved.</span>
            <span>www.vexim.com | support@vexim.com</span>
          </footer>

        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          
          body {
            margin: 0;
            padding: 0;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .print-controls {
            display: none !important;
          }
          
          .print-wrapper {
            background: white !important;
            padding: 0 !important;
            min-height: auto !important;
          }
          
          .a4-container {
            width: 210mm;
            min-height: 297mm;
            padding: 15mm 20mm;
            margin: 0;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          
          .page-break {
            page-break-before: always;
            break-before: page;
            margin-top: 0;
            padding-top: 0;
          }
          
          .violation-card {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          .risk-summary-card {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
        
        @media screen {
          .a4-container {
            width: 210mm;
            min-height: 297mm;
            padding: 20mm;
            margin: 0 auto;
            background: white;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
            border-radius: 4px;
          }
          
          .page-break {
            margin-top: 32px;
            padding-top: 32px;
            border-top: 1px dashed #e2e8f0;
          }
        }
        
        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 16px;
          border-bottom: 2px solid #2563eb;
        }
        
        .risk-summary-card {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 24px;
          margin-top: 24px;
        }
        
        .violation-card {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 16px;
          background: white;
        }
        
        .violation-card.critical {
          border-left: 4px solid #ef4444;
        }
        
        .violation-card.warning {
          border-left: 4px solid #f59e0b;
        }
        
        .violation-card.info {
          border-left: 4px solid #3b82f6;
        }
      `}</style>
    </>
  )
}

// ────────────────────────────────────────────────────────────
// Violation Card Component
// ────────────────────────────────────────────────────────────

function ViolationCard({ violation, index }: { violation: Violation; index: number }) {
  const severityClass = violation.severity === 'critical' ? 'critical' : violation.severity === 'warning' ? 'warning' : 'info'
  const severityColor = violation.severity === 'critical' ? 'text-red-700' : violation.severity === 'warning' ? 'text-amber-700' : 'text-blue-700'
  const severityBg = violation.severity === 'critical' ? 'bg-red-50' : violation.severity === 'warning' ? 'bg-amber-50' : 'bg-blue-50'

  return (
    <div className={`violation-card ${severityClass}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${severityBg} ${severityColor}`}>
            #{index}
          </span>
          <span className="text-sm font-semibold text-slate-900">{violation.category}</span>
        </div>
        <span className="text-xs text-slate-500 font-mono">{violation.regulation_reference}</span>
      </div>
      
      <p className="text-sm text-slate-700 mb-3">{violation.description}</p>
      
      <div className={`p-3 rounded ${severityBg}`}>
        <p className="text-xs font-medium text-slate-600 mb-1">Hướng dẫn sửa lỗi:</p>
        <p className="text-sm text-slate-700">{violation.suggested_fix}</p>
      </div>
      
      {violation.confidence_score && (
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
          <span>Độ tin cậy AI: {Math.round(violation.confidence_score * 100)}%</span>
          {violation.risk_score && (
            <>
              <span>•</span>
              <span>Risk score: {violation.risk_score}/10</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
