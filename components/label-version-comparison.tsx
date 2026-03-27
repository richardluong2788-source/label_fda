'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { LabelVersion, Violation, GeometryViolation } from '@/lib/types'
import { AlertTriangle, CheckCircle2, XCircle, ArrowRight, FileText } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

interface LabelVersionComparisonProps {
  versionA: LabelVersion
  versionB: LabelVersion
  onClose?: () => void
}

export function LabelVersionComparison({
  versionA,
  versionB,
  onClose,
}: LabelVersionComparisonProps) {
  const [activeTab, setActiveTab] = useState<'visual' | 'violations' | 'geometry'>('visual')

  // Calculate differences
  const differences = calculateDifferences(versionA, versionB)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Version Comparison</h2>
          <p className="text-muted-foreground">
            Comparing Version {versionA.version_number} vs Version {versionB.version_number}
          </p>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Close Comparison
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('visual')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'visual'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Visual Comparison
        </button>
        <button
          onClick={() => setActiveTab('violations')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'violations'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Violations ({differences.new_violations.length} new, {differences.resolved_violations.length} resolved)
        </button>
        <button
          onClick={() => setActiveTab('geometry')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'geometry'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Geometry Analysis
        </button>
      </div>

      {/* Visual Comparison */}
      {activeTab === 'visual' && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Version {versionA.version_number}</h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(versionA.created_at).toLocaleDateString()}
                </p>
              </div>
              <Badge variant={versionA.overall_result === 'pass' ? 'default' : 'destructive'}>
                {versionA.overall_result}
              </Badge>
            </div>
            <div className="relative aspect-[3/4] bg-muted rounded-lg overflow-hidden">
              <Image
                src={versionA.label_image_url || "/placeholder.svg"}
                alt={`Version ${versionA.version_number}`}
                fill
                className="object-contain"
              />
            </div>
            <div className="mt-3 text-sm">
              <p className="text-muted-foreground">
                {versionA.findings.length} violations found
              </p>
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Version {versionB.version_number}</h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(versionB.created_at).toLocaleDateString()}
                </p>
              </div>
              <Badge variant={versionB.overall_result === 'pass' ? 'default' : 'destructive'}>
                {versionB.overall_result}
              </Badge>
            </div>
            <div className="relative aspect-[3/4] bg-muted rounded-lg overflow-hidden">
              <Image
                src={versionB.label_image_url || "/placeholder.svg"}
                alt={`Version ${versionB.version_number}`}
                fill
                className="object-contain"
              />
            </div>
            <div className="mt-3 text-sm">
              <p className="text-muted-foreground">
                {versionB.findings.length} violations found
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Violations Comparison */}
      {activeTab === 'violations' && (
        <div className="space-y-6">
          {/* Resolved Violations */}
          {differences.resolved_violations.length > 0 && (
            <Card className="p-6 border-green-200 bg-green-50">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-green-900">
                  Resolved Issues ({differences.resolved_violations.length})
                </h3>
              </div>
              <div className="space-y-3">
                {differences.resolved_violations.map((violation, index) => (
                  <div key={index} className="p-3 bg-white rounded-md border border-green-200">
                    <p className="font-medium text-green-900">{violation.description}</p>
                    <p className="text-sm text-green-700 mt-1">
                      {violation.regulation_reference}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* New Violations */}
          {differences.new_violations.length > 0 && (
            <Card className="p-6 border-red-200 bg-red-50">
              <div className="flex items-center gap-2 mb-4">
                <XCircle className="h-5 w-5 text-red-600" />
                <h3 className="font-semibold text-red-900">
                  New Issues ({differences.new_violations.length})
                </h3>
              </div>
              <div className="space-y-3">
                {differences.new_violations.map((violation, index) => (
                  <div key={index} className="p-3 bg-white rounded-md border border-red-200">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-red-900">{violation.description}</p>
                      <Badge variant="destructive">{violation.severity}</Badge>
                    </div>
                    <p className="text-sm text-red-700">{violation.regulation_reference}</p>
                    <div className="mt-2 p-2 bg-red-100 rounded text-sm text-red-800">
                      <strong>Suggested Fix:</strong> {violation.suggested_fix}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Modified Violations */}
          {differences.modified_violations.length > 0 && (
            <Card className="p-6 border-orange-200 bg-orange-50">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <h3 className="font-semibold text-orange-900">
                  Modified Issues ({differences.modified_violations.length})
                </h3>
              </div>
              <div className="space-y-3">
                {differences.modified_violations.map((violation, index) => (
                  <div key={index} className="p-3 bg-white rounded-md border border-orange-200">
                    <p className="font-medium text-orange-900">{violation.description}</p>
                    <p className="text-sm text-orange-700 mt-1">
                      {violation.regulation_reference}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* No changes */}
          {differences.new_violations.length === 0 &&
            differences.resolved_violations.length === 0 &&
            differences.modified_violations.length === 0 && (
              <Card className="p-6 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No changes in violations detected</p>
              </Card>
            )}
        </div>
      )}

      {/* Geometry Analysis */}
      {activeTab === 'geometry' && (
        <div className="space-y-6">
          {/* Resolved geometry issues */}
          {(differences.resolved_geometry?.length || 0) > 0 && (
            <Card className="p-6 border-green-200 bg-green-50">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-green-900">
                  Resolved Geometry Issues ({differences.resolved_geometry.length})
                </h3>
              </div>
              <div className="space-y-3">
                {differences.resolved_geometry.map((violation: GeometryViolation, index: number) => (
                  <div key={index} className="p-3 bg-white rounded-md border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-green-900">{violation.type}</span>
                      <Badge variant="outline">{violation.severity}</Badge>
                    </div>
                    <p className="text-sm text-green-800">{violation.description}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* New geometry issues */}
          {(differences.new_geometry?.length || 0) > 0 && (
            <Card className="p-6 border-red-200 bg-red-50">
              <div className="flex items-center gap-2 mb-4">
                <XCircle className="h-5 w-5 text-red-600" />
                <h3 className="font-semibold text-red-900">
                  New Geometry Issues ({differences.new_geometry.length})
                </h3>
              </div>
              <div className="space-y-3">
                {differences.new_geometry.map((violation: GeometryViolation, index: number) => (
                  <div key={index} className="p-3 bg-white rounded-md border border-red-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-red-900">{violation.type}</span>
                      <Badge variant="destructive">{violation.severity}</Badge>
                    </div>
                    <p className="text-sm text-red-800">{violation.description}</p>
                    <div className="mt-2 text-xs space-y-1">
                      <p><strong>Expected:</strong> {violation.expected}</p>
                      <p><strong>Actual:</strong> {violation.actual}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Side-by-side current geometry */}
          <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Version {versionA.version_number} - Geometry</h3>
            {versionA.geometry_violations.length > 0 ? (
              <div className="space-y-3">
                {versionA.geometry_violations.map((violation, index) => (
                  <div key={index} className="p-3 bg-muted rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{violation.type}</span>
                      <Badge variant="outline">{violation.severity}</Badge>
                    </div>
                    <p className="text-sm">{violation.description}</p>
                    <div className="mt-2 text-xs space-y-1">
                      <p>
                        <strong>Expected:</strong> {violation.expected}
                      </p>
                      <p>
                        <strong>Actual:</strong> {violation.actual}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No geometry violations</p>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Version {versionB.version_number} - Geometry</h3>
            {versionB.geometry_violations.length > 0 ? (
              <div className="space-y-3">
                {versionB.geometry_violations.map((violation, index) => (
                  <div key={index} className="p-3 bg-muted rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{violation.type}</span>
                      <Badge variant="outline">{violation.severity}</Badge>
                    </div>
                    <p className="text-sm">{violation.description}</p>
                    <div className="mt-2 text-xs space-y-1">
                      <p>
                        <strong>Expected:</strong> {violation.expected}
                      </p>
                      <p>
                        <strong>Actual:</strong> {violation.actual}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No geometry violations</p>
            )}
          </Card>
        </div>
        </div>
      )}

      {/* Summary Card */}
      <Card className="p-6 bg-primary/5">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <ArrowRight className="h-5 w-5" />
          Improvement Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Resolved Issues</p>
            <p className="text-2xl font-bold text-green-600">
              {differences.resolved_violations.length}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">New Issues</p>
            <p className="text-2xl font-bold text-red-600">
              {differences.new_violations.length}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Severity Changed</p>
            <p className="text-2xl font-bold text-orange-600">
              {differences.modified_violations.length}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Geometry Fixed</p>
            <p className="text-2xl font-bold text-green-600">
              {differences.resolved_geometry?.length || 0}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Overall Progress</p>
            <p className="text-2xl font-bold">
              {calculateProgressPercentage(differences)}%
            </p>
          </div>
        </div>
        {/* Net change summary */}
        <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
          <p>
            Version {versionA.version_number}: {versionA.findings.length} violations, {versionA.geometry_violations.length} geometry issues
            {' -> '}
            Version {versionB.version_number}: {versionB.findings.length} violations, {versionB.geometry_violations.length} geometry issues
            {' '}
            (net change: {versionB.findings.length - versionA.findings.length >= 0 ? '+' : ''}{versionB.findings.length - versionA.findings.length})
          </p>
        </div>
      </Card>
    </div>
  )
}

// Helper function to calculate differences using multi-field matching
function calculateDifferences(versionA: LabelVersion, versionB: LabelVersion) {
  // Create composite keys for more accurate matching
  // Using regulation_reference + category + severity as a composite identifier
  const makeKey = (v: Violation) => 
    `${v.regulation_reference}::${v.category}::${v.description.slice(0, 80).toLowerCase().trim()}`
  
  const keysA = new Map(versionA.findings.map(v => [makeKey(v), v]))
  const keysB = new Map(versionB.findings.map(v => [makeKey(v), v]))

  // Resolved: in A but not in B
  const resolved_violations = versionA.findings.filter(v => !keysB.has(makeKey(v)))
  
  // New: in B but not in A
  const new_violations = versionB.findings.filter(v => !keysA.has(makeKey(v)))
  
  // Modified: exists in both but severity changed
  const modified_violations = versionB.findings.filter(v => {
    const key = makeKey(v)
    const matchA = keysA.get(key)
    return matchA && matchA.severity !== v.severity
  })

  // Calculate geometry differences
  const geoKeysA = new Set(versionA.geometry_violations.map(g => `${g.type}::${g.regulation}`))
  const resolved_geometry = versionA.geometry_violations.filter(
    g => !new Set(versionB.geometry_violations.map(b => `${b.type}::${b.regulation}`)).has(`${g.type}::${g.regulation}`)
  )
  const new_geometry = versionB.geometry_violations.filter(
    g => !geoKeysA.has(`${g.type}::${g.regulation}`)
  )

  return {
    new_violations,
    resolved_violations,
    modified_violations,
    geometry_changes: versionB.geometry_violations,
    resolved_geometry,
    new_geometry,
  }
}

function calculateProgressPercentage(differences: any): number {
  const resolvedCount = differences.resolved_violations.length
  const newCount = differences.new_violations.length
  const resolvedGeo = differences.resolved_geometry?.length || 0
  const newGeo = differences.new_geometry?.length || 0
  
  const totalResolved = resolvedCount + resolvedGeo
  const totalNew = newCount + newGeo
  const total = totalResolved + totalNew
  
  if (total === 0) return 100
  return Math.round((totalResolved / total) * 100)
}
