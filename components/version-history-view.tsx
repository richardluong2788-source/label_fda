'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { AuditReport, LabelVersion } from '@/lib/types'
import { LabelVersionComparison } from './label-version-comparison'
import { Clock, FileText, GitCompare, ArrowLeft, Upload, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

interface VersionHistoryViewProps {
  reportId: string
  report: AuditReport
  versions: LabelVersion[]
}

export function VersionHistoryView({ reportId, report, versions }: VersionHistoryViewProps) {
  const [selectedVersions, setSelectedVersions] = useState<string[]>([])
  const [showComparison, setShowComparison] = useState(false)

  // Build "current report" as a pseudo LabelVersion for comparison
  const currentAsVersion: LabelVersion = {
    id: report.id,
    original_report_id: report.id,
    version_number: report.version_number || 1,
    label_image_url: report.label_image_url,
    status: report.status,
    overall_result: report.overall_result,
    findings: (report as any).findings || report.violations || [],
    geometry_violations: report.geometry_violations || [],
    created_at: report.updated_at,
    created_by: report.user_id,
    version_notes: report.version_notes,
  }

  // All selectable items: current + previous versions
  const allSelectableVersions = [currentAsVersion, ...versions]

  const handleVersionSelect = (versionId: string) => {
    if (selectedVersions.includes(versionId)) {
      setSelectedVersions(selectedVersions.filter((id) => id !== versionId))
    } else if (selectedVersions.length < 2) {
      setSelectedVersions([...selectedVersions, versionId])
    }
  }

  const handleCompare = () => {
    if (selectedVersions.length === 2) {
      setShowComparison(true)
    }
  }

  const versionA = allSelectableVersions.find((v) => v.id === selectedVersions[0])
  const versionB = allSelectableVersions.find((v) => v.id === selectedVersions[1])

  // Ensure versionA is the older version for consistent diff direction
  const sortedA = versionA && versionB && versionA.version_number > versionB.version_number ? versionB : versionA
  const sortedB = versionA && versionB && versionA.version_number > versionB.version_number ? versionA : versionB

  if (showComparison && sortedA && sortedB) {
    return (
      <LabelVersionComparison
        versionA={sortedA}
        versionB={sortedB}
        onClose={() => setShowComparison(false)}
      />
    )
  }

  // Calculate trend indicators for each version transition
  const getTrend = (currentCount: number, previousCount: number) => {
    if (currentCount < previousCount) return { icon: TrendingDown, color: 'text-green-600', label: 'Improved' }
    if (currentCount > previousCount) return { icon: TrendingUp, color: 'text-red-600', label: 'Regressed' }
    return { icon: Minus, color: 'text-muted-foreground', label: 'No change' }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2">
            <Link href={`/audit/${reportId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Report
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Version History</h1>
          <p className="text-muted-foreground">
            Track changes and improvements to your label over time
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedVersions.length === 2 && (
            <Button onClick={handleCompare}>
              <GitCompare className="h-4 w-4 mr-2" />
              Compare Selected
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href={`/analyze?resubmit=${reportId}`}>
              <Upload className="h-4 w-4 mr-2" />
              Upload New Version
            </Link>
          </Button>
        </div>
      </div>

      {selectedVersions.length > 0 && selectedVersions.length < 2 && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-900">
            Select one more version to compare (
            {selectedVersions.length}/2 selected). You can select the current version or any previous version.
          </p>
        </Card>
      )}

      {/* Current Version */}
      <Card 
        className={`p-6 border-primary cursor-pointer transition-all hover:shadow-md ${
          selectedVersions.includes(report.id) ? 'ring-2 ring-primary bg-primary/5' : ''
        }`}
        onClick={() => handleVersionSelect(report.id)}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary p-2">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">
                Current Version (v{report.version_number || 1})
              </h3>
              <p className="text-sm text-muted-foreground">
                {new Date(report.updated_at).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedVersions.includes(report.id) && (
              <Badge variant="secondary">Selected</Badge>
            )}
            <Badge>{report.status}</Badge>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <div className="md:col-span-1">
            <div className="relative aspect-[3/4] bg-muted rounded-lg overflow-hidden">
              <Image
                src={report.label_image_url || "/placeholder.svg"}
                alt="Current version"
                fill
                className="object-contain"
              />
            </div>
          </div>
          <div className="md:col-span-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Overall Result:</span>
                <Badge
                  variant={
                    report.overall_result === 'pass'
                      ? 'default'
                      : report.overall_result === 'fail'
                        ? 'destructive'
                        : 'secondary'
                  }
                >
                  {report.overall_result}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Violations:</span>
                <span className="font-medium">{(report as any).findings?.length || report.violations?.length || 0}</span>
              </div>
              {report.geometry_violations && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Geometry Issues:</span>
                  <span className="font-medium">{report.geometry_violations.length}</span>
                </div>
              )}
              {report.version_notes && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium mb-1">Notes:</p>
                  <p className="text-sm text-muted-foreground">{report.version_notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Previous Versions */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Previous Versions ({versions.length})
        </h2>

        {versions.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              No previous versions yet. Upload a revised label to create version history.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {versions.map((version) => (
              <Card
                key={version.id}
                className={`p-4 transition-all cursor-pointer hover:border-primary ${
                  selectedVersions.includes(version.id) ? 'border-primary bg-primary/5' : ''
                }`}
                onClick={() => handleVersionSelect(version.id)}
              >
                <div className="grid md:grid-cols-6 gap-4">
                  <div className="md:col-span-1">
                    <div className="relative aspect-[3/4] bg-muted rounded-lg overflow-hidden">
                      <Image
                        src={version.label_image_url || "/placeholder.svg"}
                        alt={`Version ${version.version_number}`}
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">Version {version.version_number}</h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(version.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedVersions.includes(version.id) && (
                          <Badge variant="secondary">Selected</Badge>
                        )}
                        <Badge
                          variant={
                            version.overall_result === 'pass'
                              ? 'default'
                              : version.overall_result === 'fail'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {version.overall_result}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Violations</p>
                        <p className="font-medium">{version.findings.length}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Geometry Issues</p>
                        <p className="font-medium">{version.geometry_violations.length}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Status</p>
                        <p className="font-medium capitalize">{version.status}</p>
                      </div>
                    </div>

                    {version.version_notes && (
                      <div className="mt-3 p-2 bg-muted rounded text-sm">
                        <strong>Notes:</strong> {version.version_notes}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
