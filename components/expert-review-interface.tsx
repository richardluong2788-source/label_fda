'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  FileText,
  Save,
  Send,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface ExpertReviewInterfaceProps {
  report: any
  adminUser: any
}

export function ExpertReviewInterface({
  report,
  adminUser,
}: ExpertReviewInterfaceProps) {
  const router = useRouter()
  const [findings, setFindings] = useState(report.findings || [])
  const [reviewNotes, setReviewNotes] = useState(report.review_notes || '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleApprove = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/admin/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: report.id,
          action: 'approve',
          findings,
          reviewNotes,
        }),
      })

      if (response.ok) {
        router.push('/admin')
      }
    } catch (error) {
      console.error('[v0] Approve error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/admin/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: report.id,
          action: 'reject',
          reviewNotes,
        }),
      })

      if (response.ok) {
        router.push('/admin')
      }
    } catch (error) {
      console.error('[v0] Reject error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateFinding = (index: number, field: string, value: any) => {
    const updated = [...findings]
    updated[index] = { ...updated[index], [field]: value }
    setFindings(updated)
  }

  const deleteFinding = (index: number) => {
    setFindings(findings.filter((_: any, i: number) => i !== index))
  }

  const addFinding = () => {
    setFindings([
      ...findings,
      {
        category: 'New Finding',
        severity: 'warning',
        description: '',
        regulation_reference: '',
        suggested_fix: '',
        citations: [],
        confidence_score: 1.0,
      },
    ])
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Link>
              </Button>
              <div className="h-6 w-px bg-border" />
              <div>
                <h1 className="text-xl font-bold">Expert Review</h1>
                <p className="text-xs text-muted-foreground">
                  {report.file_name || 'Unnamed Report'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={report.needs_expert_review ? 'destructive' : 'secondary'}>
                {report.needs_expert_review ? 'Requires Review' : 'AI Completed'}
              </Badge>
              <Badge variant="outline">{report.citation_count || 0} Citations</Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-8">
          <div>
            <Card className="p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Label Image</h2>
              <div className="relative aspect-[3/4] bg-slate-100 rounded-lg overflow-hidden">
                <Image
                  src={report.file_url || '/placeholder.svg'}
                  alt="Food label"
                  fill
                  className="object-contain"
                />
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Review Notes</h2>
              <Textarea
                placeholder="Add your expert notes here..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={6}
                className="mb-4"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleApprove}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve & Publish
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={isSubmitting}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              </div>
            </Card>
          </div>

          <div>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Findings ({findings.length})</h2>
                <Button onClick={addFinding} size="sm" variant="outline">
                  Add Finding
                </Button>
              </div>

              <div className="space-y-6 max-h-[calc(100vh-16rem)] overflow-y-auto">
                {findings.map((finding: any, index: number) => (
                  <Card key={index} className="p-4 bg-slate-50">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <Label className="text-xs">Category</Label>
                          <input
                            type="text"
                            value={finding.category}
                            onChange={(e) =>
                              updateFinding(index, 'category', e.target.value)
                            }
                            className="w-full px-3 py-2 border rounded-md text-sm mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Severity</Label>
                          <select
                            value={finding.severity}
                            onChange={(e) =>
                              updateFinding(index, 'severity', e.target.value)
                            }
                            className="px-3 py-2 border rounded-md text-sm mt-1"
                          >
                            <option value="critical">Critical</option>
                            <option value="warning">Warning</option>
                            <option value="info">Info</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs">Description</Label>
                        <Textarea
                          value={finding.description}
                          onChange={(e) =>
                            updateFinding(index, 'description', e.target.value)
                          }
                          rows={2}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-xs">Regulation Reference</Label>
                        <input
                          type="text"
                          value={finding.regulation_reference}
                          onChange={(e) =>
                            updateFinding(index, 'regulation_reference', e.target.value)
                          }
                          className="w-full px-3 py-2 border rounded-md text-sm mt-1"
                          placeholder="e.g., 21 CFR 101.9"
                        />
                      </div>

                      <div>
                        <Label className="text-xs">Suggested Fix</Label>
                        <Textarea
                          value={finding.suggested_fix}
                          onChange={(e) =>
                            updateFinding(index, 'suggested_fix', e.target.value)
                          }
                          rows={2}
                          className="mt-1"
                        />
                      </div>

                      {finding.citations && finding.citations.length > 0 && (
                        <div className="pt-2 border-t">
                          <Label className="text-xs text-muted-foreground">
                            Citations ({finding.citations.length})
                          </Label>
                          {finding.citations.map((citation: any, citIndex: number) => (
                            <div
                              key={citIndex}
                              className="mt-2 p-2 bg-white rounded text-xs"
                            >
                              <div className="font-medium">{citation.regulation_id}</div>
                              <div className="text-muted-foreground mt-1">
                                {citation.text}
                              </div>
                              <Badge variant="outline" className="text-xs mt-1">
                                Relevance: {(citation.relevance_score * 100).toFixed(0)}%
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-xs text-muted-foreground">
                          Confidence: {((finding.confidence_score || 1) * 100).toFixed(0)}%
                        </span>
                        <Button
                          onClick={() => deleteFinding(index)}
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
