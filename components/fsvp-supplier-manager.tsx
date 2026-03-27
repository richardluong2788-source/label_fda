'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Plus, 
  Building2, 
  MapPin, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  FileText,
  Edit,
  Trash2,
  Download,
  RefreshCw,
  Shield,
  Globe
} from 'lucide-react'
import { validateDUNS, isSAHCODHACategory, getVerificationUrgency } from '@/lib/fsvp-validator'
import type { FSVPSupplier } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then(res => res.json())

// Country list for selection
const COUNTRIES = [
  'China', 'India', 'Vietnam', 'Thailand', 'Mexico', 'Indonesia', 
  'Bangladesh', 'Pakistan', 'Ecuador', 'Peru', 'Brazil', 'Argentina',
  'Chile', 'Colombia', 'Costa Rica', 'Guatemala', 'Honduras', 'Nicaragua',
  'Philippines', 'Malaysia', 'Taiwan', 'South Korea', 'Japan', 'Australia',
  'New Zealand', 'Canada', 'Italy', 'Spain', 'France', 'Germany', 'Netherlands',
  'Belgium', 'Poland', 'Turkey', 'Morocco', 'Egypt', 'South Africa', 'Kenya',
  'Other'
]

interface FSVPSupplierManagerProps {
  userId: string
}

export function FSVPSupplierManager({ userId }: FSVPSupplierManagerProps) {
  const { data: suppliers, error, mutate } = useSWR<FSVPSupplier[]>(
    `/api/fsvp/suppliers`,
    fetcher
  )
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<FSVPSupplier | null>(null)
  const [formData, setFormData] = useState({
    supplier_name: '',
    supplier_country: '',
    supplier_address: '',
    supplier_fei: '',
    supplier_duns: '',
    supplier_contact_name: '',
    supplier_contact_email: '',
    supplier_contact_phone: '',
    product_categories: [] as string[]
  })
  const [dunsError, setDunsError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Filter suppliers by status
  const [statusFilter, setStatusFilter] = useState<string>('all')
  
  const filteredSuppliers = suppliers?.filter(s => 
    statusFilter === 'all' || s.status === statusFilter
  ) || []
  
  // Count suppliers by urgency
  const urgencyCounts = {
    overdue: suppliers?.filter(s => getVerificationUrgency(s) === 'overdue').length || 0,
    critical: suppliers?.filter(s => getVerificationUrgency(s) === 'critical').length || 0,
    warning: suppliers?.filter(s => getVerificationUrgency(s) === 'warning').length || 0
  }
  
  const resetForm = () => {
    setFormData({
      supplier_name: '',
      supplier_country: '',
      supplier_address: '',
      supplier_fei: '',
      supplier_duns: '',
      supplier_contact_name: '',
      supplier_contact_email: '',
      supplier_contact_phone: '',
      product_categories: []
    })
    setDunsError(null)
    setEditingSupplier(null)
  }
  
  const handleOpenAddDialog = () => {
    resetForm()
    setIsAddDialogOpen(true)
  }
  
  const handleOpenEditDialog = (supplier: FSVPSupplier) => {
    setEditingSupplier(supplier)
    setFormData({
      supplier_name: supplier.supplier_name,
      supplier_country: supplier.supplier_country,
      supplier_address: supplier.supplier_address || '',
      supplier_fei: supplier.supplier_fei || '',
      supplier_duns: supplier.supplier_duns || '',
      supplier_contact_name: supplier.supplier_contact_name || '',
      supplier_contact_email: supplier.supplier_contact_email || '',
      supplier_contact_phone: supplier.supplier_contact_phone || '',
      product_categories: supplier.product_categories || []
    })
    setIsAddDialogOpen(true)
  }
  
  const handleDunsChange = (value: string) => {
    setFormData(prev => ({ ...prev, supplier_duns: value }))
    if (value) {
      const result = validateDUNS(value)
      setDunsError(result.valid ? null : result.error || 'Invalid DUNS')
    } else {
      setDunsError(null)
    }
  }
  
  const handleSubmit = async () => {
    if (!formData.supplier_name || !formData.supplier_country) {
      return
    }
    
    setIsSubmitting(true)
    try {
      const method = editingSupplier ? 'PUT' : 'POST'
      const url = editingSupplier 
        ? `/api/fsvp/suppliers/${editingSupplier.id}`
        : '/api/fsvp/suppliers'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        mutate()
        setIsAddDialogOpen(false)
        resetForm()
      }
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleDelete = async (supplierId: string) => {
    if (!confirm('Are you sure you want to remove this supplier?')) return
    
    const response = await fetch(`/api/fsvp/suppliers/${supplierId}`, {
      method: 'DELETE'
    })
    
    if (response.ok) {
      mutate()
    }
  }
  
  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      'approved': { variant: 'default', label: 'Approved' },
      'conditionally_approved': { variant: 'secondary', label: 'Conditional' },
      'pending_review': { variant: 'outline', label: 'Pending' },
      'suspended': { variant: 'destructive', label: 'Suspended' },
      'removed': { variant: 'destructive', label: 'Removed' }
    }
    const config = variants[status] || { variant: 'outline' as const, label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }
  
  const getUrgencyBadge = (supplier: FSVPSupplier) => {
    const urgency = getVerificationUrgency(supplier)
    switch (urgency) {
      case 'overdue':
        return <Badge variant="destructive" className="bg-red-600">Overdue</Badge>
      case 'critical':
        return <Badge variant="destructive">Due Soon</Badge>
      case 'warning':
        return <Badge className="bg-yellow-500">Upcoming</Badge>
      default:
        return null
    }
  }
  
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      {/* Header with alerts */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Foreign Suppliers</h2>
          <p className="text-muted-foreground">Manage your FSVP supplier records</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleOpenAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Supplier
          </Button>
        </div>
      </div>
      
      {/* Urgency Alerts */}
      {(urgencyCounts.overdue > 0 || urgencyCounts.critical > 0) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Verification Action Required</AlertTitle>
          <AlertDescription>
            {urgencyCounts.overdue > 0 && (
              <span className="mr-4">{urgencyCounts.overdue} supplier(s) overdue for verification</span>
            )}
            {urgencyCounts.critical > 0 && (
              <span>{urgencyCounts.critical} supplier(s) due within 7 days</span>
            )}
          </AlertDescription>
        </Alert>
      )}
      
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{suppliers?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Total Suppliers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {suppliers?.filter(s => s.status === 'approved').length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">
                  {suppliers?.filter(s => s.is_sahcodha_risk).length || 0}
                </p>
                <p className="text-sm text-muted-foreground">SAHCODHA Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{urgencyCounts.overdue}</p>
                <p className="text-sm text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Suppliers Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Supplier List</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="conditionally_approved">Conditional</SelectItem>
                <SelectItem value="pending_review">Pending</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-red-500">Failed to load suppliers</p>
          ) : !suppliers ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No suppliers found</p>
              <Button className="mt-4" onClick={handleOpenAddDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Supplier
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Last Verification</TableHead>
                  <TableHead>Next Due</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{supplier.supplier_name}</p>
                        {supplier.supplier_fei && (
                          <p className="text-sm text-muted-foreground">FEI: {supplier.supplier_fei}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        {supplier.supplier_country}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(supplier.status)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {supplier.is_sahcodha_risk && (
                          <Badge variant="destructive" className="w-fit">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            SAHCODHA
                          </Badge>
                        )}
                        {getUrgencyBadge(supplier)}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(supplier.last_verification_date)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(supplier.next_verification_due)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleOpenEditDialog(supplier)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDelete(supplier.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? 'Edit Supplier' : 'Add Foreign Supplier'}
            </DialogTitle>
            <DialogDescription>
              Enter the foreign supplier information for FSVP compliance.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="basic" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic Information</TabsTrigger>
              <TabsTrigger value="contact">Contact Details</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier_name">Supplier Name *</Label>
                  <Input
                    id="supplier_name"
                    value={formData.supplier_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, supplier_name: e.target.value }))}
                    placeholder="Company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier_country">Country *</Label>
                  <Select 
                    value={formData.supplier_country}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, supplier_country: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map(country => (
                        <SelectItem key={country} value={country}>{country}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="supplier_address">Address</Label>
                <Textarea
                  id="supplier_address"
                  value={formData.supplier_address}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier_address: e.target.value }))}
                  placeholder="Full address"
                  rows={2}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier_fei">FDA Establishment Identifier (FEI)</Label>
                  <Input
                    id="supplier_fei"
                    value={formData.supplier_fei}
                    onChange={(e) => setFormData(prev => ({ ...prev, supplier_fei: e.target.value }))}
                    placeholder="10-digit FEI number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier_duns">DUNS Number</Label>
                  <Input
                    id="supplier_duns"
                    value={formData.supplier_duns}
                    onChange={(e) => handleDunsChange(e.target.value)}
                    placeholder="9-digit DUNS"
                    className={dunsError ? 'border-red-500' : ''}
                  />
                  {dunsError && <p className="text-sm text-red-500">{dunsError}</p>}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="contact" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="supplier_contact_name">Contact Name</Label>
                <Input
                  id="supplier_contact_name"
                  value={formData.supplier_contact_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier_contact_name: e.target.value }))}
                  placeholder="Primary contact person"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier_contact_email">Email</Label>
                  <Input
                    id="supplier_contact_email"
                    type="email"
                    value={formData.supplier_contact_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, supplier_contact_email: e.target.value }))}
                    placeholder="contact@supplier.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier_contact_phone">Phone</Label>
                  <Input
                    id="supplier_contact_phone"
                    value={formData.supplier_contact_phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, supplier_contact_phone: e.target.value }))}
                    placeholder="+1 234 567 8900"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!formData.supplier_name || !formData.supplier_country || isSubmitting}
            >
              {isSubmitting ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Add Supplier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
