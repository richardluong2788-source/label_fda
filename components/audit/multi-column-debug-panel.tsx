'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'

interface MultiColumnDebugProps {
  report: any
}

export function MultiColumnDebugPanel({ report }: MultiColumnDebugProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  const isMultiColumn = report.is_multi_column_nutrition
  const columns = report.nutrition_facts_columns
  const nutrition = report.nutrition_facts
  
  if (!isMultiColumn && !columns && nutrition?.length <= 1) {
    return null
  }

  // Check if data looks like variety pack even if not detected
  const suspiciousSign = nutrition?.length > 0 && (
    report.product_name?.toLowerCase().includes('variety') ||
    report.product_name?.toLowerCase().includes('pack') ||
    nutrition[0]?.value < 200  // Multi-column panels often have lower calories per variant
  )

  return (
    <Card className="bg-amber-50 border border-amber-200 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-amber-100/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <div className="text-left">
            <h3 className="font-semibold text-sm text-amber-900">
              Multi-Column Detection Debug
            </h3>
            <p className="text-xs text-amber-700">
              {isMultiColumn 
                ? `Multi-column detected: ${columns?.length || 0} variants`
                : suspiciousSign
                  ? 'Possible variety pack but not detected as multi-column'
                  : 'Single-column or standard format'
              }
            </p>
          </div>
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4 text-amber-600" /> : <ChevronDown className="h-4 w-4 text-amber-600" />}
      </button>

      {isOpen && (
        <div className="border-t border-amber-200 p-4 space-y-4 bg-white/50">
          <div className="space-y-2 text-sm">
            <div>
              <p className="font-medium text-slate-700">Detection Status:</p>
              <p className="text-xs text-slate-600">
                {isMultiColumn ? (
                  <Badge className="bg-green-100 text-green-800">✓ Multi-Column Detected</Badge>
                ) : (
                  <Badge variant="secondary">Single Column (or not detected)</Badge>
                )}
              </p>
            </div>

            <div>
              <p className="font-medium text-slate-700">Product Name:</p>
              <p className="text-xs text-slate-600 font-mono">{report.product_name || 'N/A'}</p>
            </div>

            <div>
              <p className="font-medium text-slate-700">Nutrition Facts Array:</p>
              <div className="text-xs text-slate-600 font-mono bg-slate-50 p-2 rounded max-h-32 overflow-y-auto">
                {nutrition && nutrition.length > 0 ? (
                  <pre>{JSON.stringify(nutrition.slice(0, 3), null, 2)}...</pre>
                ) : (
                  'Empty'
                )}
              </div>
            </div>

            {isMultiColumn && columns && columns.length > 0 && (
              <div>
                <p className="font-medium text-slate-700">Columns Detected:</p>
                <div className="space-y-2">
                  {columns.map((col: any, idx: number) => (
                    <div key={idx} className="bg-slate-50 p-2 rounded border border-slate-200">
                      <p className="font-semibold text-slate-800">{col.columnName}</p>
                      <p className="text-xs text-slate-600">Size: {col.servingSize}</p>
                      <p className="text-xs text-slate-600">Items: {col.nutritionFacts?.length || 0}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {suspiciousSign && !isMultiColumn && (
              <div className="bg-amber-100 border border-amber-300 rounded p-3 mt-2">
                <p className="text-xs font-semibold text-amber-900 mb-1">⚠ Possible Issue:</p>
                <p className="text-xs text-amber-800">
                  This looks like a variety pack but wasn't detected as multi-column. 
                  Try uploading a clearer image of the nutrition label or the packaging showing all variants.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 text-xs"
                  onClick={() => window.location.href = '/admin/clear-cache'}
                >
                  Clear Cache & Re-analyze
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
