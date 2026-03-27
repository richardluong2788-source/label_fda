'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle, AlertTriangle, Plus, Eye, Trash2 } from 'lucide-react'
import Link from 'next/link'

interface PriorNotice {
  id: string
  pnrn: string
  productName: string
  shipper: {
    name: string
    country: string
  }
  consignee: {
    name: string
    state: string
  }
  estimatedArrivalDate: string
  complianceStatus: 'compliant' | 'non-compliant' | 'conditional'
  createdAt: string
}

export function PriorNoticeList() {
  const [notices, setNotices] = useState<PriorNotice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'compliant' | 'non-compliant' | 'conditional'>('all')

  useEffect(() => {
    loadNotices()
  }, [])

  async function loadNotices() {
    try {
      setLoading(true)
      const response = await fetch('/api/prior-notice/list')
      if (response.ok) {
        const data = await response.json()
        setNotices(data)
      }
    } catch (error) {
      console.error('Failed to load prior notices:', error)
    } finally {
      setLoading(false)
    }
  }

  async function deleteNotice(id: string) {
    if (!confirm('Are you sure you want to delete this prior notice?')) return
    
    try {
      const response = await fetch(`/api/prior-notice/${id}`, { method: 'DELETE' })
      if (response.ok) {
        setNotices(notices.filter(n => n.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete prior notice:', error)
    }
  }

  const filteredNotices = notices
    .filter(notice => {
      const matchesSearch = 
        notice.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notice.pnrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notice.shipper.name.toLowerCase().includes(searchTerm.toLowerCase())
      
      if (filterStatus === 'all') return matchesSearch
      return matchesSearch && notice.complianceStatus === filterStatus
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'non-compliant':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      case 'conditional':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'compliant':
        return <Badge className="bg-green-100 text-green-800">Compliant</Badge>
      case 'non-compliant':
        return <Badge className="bg-red-100 text-red-800">Non-Compliant</Badge>
      case 'conditional':
        return <Badge className="bg-yellow-100 text-yellow-800">Conditional</Badge>
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Prior Notices</h2>
          <p className="text-sm text-gray-600 mt-1">Manage FDA Prior Notice submissions</p>
        </div>
        <Link href="/dashboard/prior-notice">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New Prior Notice
          </Button>
        </Link>
      </div>

      <div className="space-y-3">
        <Input
          placeholder="Search by product name, PNRN, or shipper..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="flex gap-2">
          {['all', 'compliant', 'non-compliant', 'conditional'].map(status => (
            <Button
              key={status}
              variant={filterStatus === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus(status as any)}
              className="capitalize"
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      {filteredNotices.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {notices.length === 0
              ? 'No prior notices yet. Create one to get started.'
              : 'No prior notices match your search criteria.'}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4">
          {filteredNotices.map(notice => (
            <Card key={notice.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(notice.complianceStatus)}
                      <h3 className="font-semibold">{notice.productName}</h3>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>PNRN: {notice.pnrn}</p>
                      <p>Shipper: {notice.shipper.name} ({notice.shipper.country})</p>
                      <p>Arrival: {new Date(notice.estimatedArrivalDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(notice.complianceStatus)}
                    <div className="flex gap-1">
                      <Link href={`/dashboard/prior-notice/${notice.id}`}>
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteNotice(notice.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="text-sm text-gray-600">
        Showing {filteredNotices.length} of {notices.length} prior notices
      </div>
    </div>
  )
}
