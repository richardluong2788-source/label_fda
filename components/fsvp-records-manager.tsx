'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { 
  Plus, 
  Package,
  Building2,
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  FileText,
  Edit,
  Trash2,
  Eye,
  Shield,
  Calendar,
  ChevronDown,
  ChevronUp,
  Activity,
  ClipboardCheck,
  RefreshCw,
  ArrowRight,
  Image as ImageIcon
} from 'lucide-react'
import type { FSVPRecord, FSVPSupplier, FSVPProductWithSupplier } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then(res => res.json())

// Risk level configuration
const RISK_LEVELS = [
  { value: 'low', label: 'Low Risk', color: 'bg-green-500' },
  { value: 'medium', label: 'Medium Risk', color: 'bg-yellow-500' },
  { value: 'high', label: 'High Risk', color: 'bg-orange-500' },
  { value: 'sahcodha', label: 'SAHCODHA', color: 'bg-red-600' }
]

// Verification frequencies
const VERIFICATION_FREQUENCIES = [
  { value: 'annual', label: 'Annual' },
  { value: 'semi-annual', label: 'Semi-Annual' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'as-needed', label: 'As Needed' }
]

interface FSVPRecordsManagerProps {
  userId: string
}

export function FSVPRecordsManager({ userId }: FSVPRecordsManagerProps) {
  const { data: records, error: recordsError, mutate: mutateRecords } = useSWR<FSVPRecord[]>(
    `/api/fsvp/records`,
    fetcher
  )
  
  const { data: suppliers } = useSWR<FSVPSupplier[]>(
    `/api/fsvp/suppliers`,
    fetcher
  )
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [viewingRecord, setViewingRecord] = useState<FSVPRecord | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Step-based form: 1 = Select Supplier, 2 = Select Product, 3 = Configure Record
  const [formStep, setFormStep] = useState(1)
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [riskFilter, setRiskFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Form state - now references product from catalog
  const [selectedSupplierId, setSelectedSupplierId] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<FSVPProductWithSupplier | null>(null)
  const [formData, setFormData] = useState({
    verification_frequency: 'annual',
    notes: ''
  })
  
  // Fetch products for selected supplier
  const { data: supplierProducts, mutate: mutateProducts } = useSWR<FSVPProductWithSupplier[]>(
    selectedSupplierId ? `/api/fsvp/products?supplier_id=${selectedSupplierId}` : null,
    fetcher
  )
  
  // Reset form when dialog closes
  useEffect(() => {
    if (!isAddDialogOpen) {
      setFormStep(1)
      setSelectedSupplierId('')
      setSelectedProductId('')
      setSelectedProduct(null)
      setFormData({
        verification_frequency: 'annual',
        notes: ''
      })
    }
  }, [isAddDialogOpen])
  
  // Update selected product when ID changes
  useEffect(() => {
    if (selectedProductId && supplierProducts) {
      const product = supplierProducts.find(p => p.id === selectedProductId)
      setSelectedProduct(product || null)
    } else {
      setSelectedProduct(null)
    }
  }, [selectedProductId, supplierProducts])
  
  // Filter records
  const filteredRecords = records?.filter(record => {
    if (statusFilter !== 'all' && record.compliance_status !== statusFilter) return false
    if (riskFilter !== 'all' && record.risk_level !== riskFilter) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        record.product_name.toLowerCase().includes(query) ||
        record.supplier_name?.toLowerCase().includes(query) ||
        record.product_category?.toLowerCase().includes(query)
      )
    }
    return true
  }) || []
  
  // Stats
  const stats = {
    total: records?.length || 0,
    active: records?.filter(r => r.compliance_status === 'active').length || 0,
    pending: records?.filter(r => r.compliance_status === 'pending' || r.compliance_status === 'draft').length || 0,
    needsReview: records?.filter(r => r.compliance_status === 'needs_review').length || 0,
    sahcodha: records?.filter(r => r.is_sahcodha).length || 0,
    avgCompliance: records?.length 
      ? Math.round(records.reduce((sum, r) => sum + r.compliance_score, 0) / records.length) 
      : 0
  }
  
  const handleSubmit = async () => {
    if (!selectedSupplierId || !selectedProductId || !selectedProduct) return
    
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/fsvp/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: selectedSupplierId,
          product_id: selectedProductId,
          // Product info from catalog
          product_name: selectedProduct.product_name,
          product_description: selectedProduct.product_description || '',
          product_category: selectedProduct.product_category || '',
          fda_product_code: selectedProduct.fda_product_code || '',
          hs_code: selectedProduct.hs_code || '',
          // Risk from product
          risk_level: selectedProduct.default_risk_level,
          is_sahcodha: selectedProduct.is_sahcodha,
          hazard_types: selectedProduct.known_hazards || [],
          // User input
          verification_frequency: formData.verification_frequency,
          notes: formData.notes
        })
      })
      
      if (response.ok) {
        mutateRecords()
        setIsAddDialogOpen(false)
      }
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleDelete = async (recordId: string) => {
    if (!confirm('Are you sure you want to delete this FSVP record? This cannot be undone.')) return
    
    const response = await fetch(`/api/fsvp/records/${recordId}`, {
      method: 'DELETE'
    })
    
    if (response.ok) {
      mutateRecords()
    }
  }
  
  const handleViewDetails = async (record: FSVPRecord) => {
    const response = await fetch(`/api/fsvp/records/${record.id}`)
    if (response.ok) {
      const fullRecord = await response.json()
      setViewingRecord(fullRecord)
      setIsDetailDialogOpen(true)
    }
  }
  
  const getStatusBadge = (status: string) => {
    const configs: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      'draft': { variant: 'outline', label: 'Draft' },
      'pending': { variant: 'secondary', label: 'Pending' },
      'active': { variant: 'default', label: 'Active' },
      'needs_review': { variant: 'destructive', label: 'Needs Review' },
      'suspended': { variant: 'destructive', label: 'Suspended' },
      'archived': { variant: 'outline', label: 'Archived' }
    }
    const config = configs[status] || { variant: 'outline' as const, label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }
  
  const getRiskBadge = (riskLevel: string, isSahcodha: boolean) => {
    if (isSahcodha || riskLevel === 'sahcodha') {
      return <Badge variant="destructive" className="bg-red-600">SAHCODHA</Badge>
    }
    const config = RISK_LEVELS.find(r => r.value === riskLevel)
    if (!config) return null
    return (
      <Badge variant="outline" className={`border-${config.color.replace('bg-', '')} text-${config.color.replace('bg-', '')}`}>
        {config.label}
      </Badge>
    )
  }
  
  const getSelectedSupplier = () => {
    return suppliers?.find(s => s.id === selectedSupplierId)
  }
  
  if (recordsError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Failed to load FSVP records. Please try again.</AlertDescription>
      </Alert>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription>Total Records</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription>Active</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center gap-2 text-2xl font-bold text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              {stats.active}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription>Pending</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center gap-2 text-2xl font-bold text-yellow-600">
              <Clock className="h-5 w-5" />
              {stats.pending}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription>Needs Review</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center gap-2 text-2xl font-bold text-red-600">
              <AlertTriangle className="h-5 w-5" />
              {stats.needsReview}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription>SAHCODHA Products</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center gap-2 text-2xl font-bold text-red-700">
              <Shield className="h-5 w-5" />
              {stats.sahcodha}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription>Avg Compliance</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{stats.avgCompliance}%</div>
            <Progress value={stats.avgCompliance} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>
      
      {/* Records Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>FSVP Records</CardTitle>
              <CardDescription>
                Manage product-specific FSVP compliance records per 21 CFR Part 1 Subpart L
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Record
            </Button>
          </div>
          
          {/* Filters */}
          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              placeholder="Search products, suppliers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="needs_review">Needs Review</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk Levels</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="sahcodha">SAHCODHA</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => mutateRecords()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!records ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">No FSVP records found</p>
              <p className="mb-4 text-sm text-muted-foreground">
                Create FSVP records to track compliance for each product-supplier combination
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Record
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Compliance</TableHead>
                    <TableHead>Next Verification</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{record.product_name}</p>
                            {record.product_category && (
                              <p className="text-xs text-muted-foreground">{record.product_category}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm">{record.supplier_name || 'Unknown'}</p>
                            {record.supplier_country && (
                              <p className="text-xs text-muted-foreground">{record.supplier_country}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getRiskBadge(record.risk_level, record.is_sahcodha)}</TableCell>
                      <TableCell>{getStatusBadge(record.compliance_status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={record.compliance_score} className="h-2 w-16" />
                          <span className="text-sm">{record.compliance_score}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.next_verification_due ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            {new Date(record.next_verification_due).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDetails(record)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(record.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Add Record Dialog - Step-based */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create FSVP Record</DialogTitle>
            <DialogDescription>
              {formStep === 1 && "Step 1: Select a supplier"}
              {formStep === 2 && "Step 2: Select a product from the supplier's catalog"}
              {formStep === 3 && "Step 3: Configure verification settings"}
            </DialogDescription>
          </DialogHeader>
          
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 py-4">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
              formStep >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}>
              1
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
              formStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}>
              2
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
              formStep >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}>
              3
            </div>
          </div>
          
          {/* Step 1: Select Supplier */}
          {formStep === 1 && (
            <div className="space-y-4 py-4">
              <Label>Select Supplier</Label>
              {!suppliers || suppliers.length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No suppliers found. Please add suppliers first in the "Nhà cung cấp" tab.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid gap-3">
                  {suppliers.map((supplier) => (
                    <Card 
                      key={supplier.id}
                      className={`cursor-pointer transition-colors hover:bg-accent ${
                        selectedSupplierId === supplier.id ? 'border-primary bg-accent' : ''
                      }`}
                      onClick={() => setSelectedSupplierId(supplier.id)}
                    >
                      <CardContent className="flex items-center gap-4 p-4">
                        <Building2 className="h-8 w-8 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="font-medium">{supplier.supplier_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {supplier.supplier_country} {supplier.is_sahcodha && '• SAHCODHA'}
                          </p>
                        </div>
                        {selectedSupplierId === supplier.id && (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Step 2: Select Product */}
          {formStep === 2 && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <Label>Select Product from {getSelectedSupplier()?.supplier_name}</Label>
              </div>
              
              {!supplierProducts ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  Loading products...
                </div>
              ) : supplierProducts.length === 0 ? (
                <Alert>
                  <Package className="h-4 w-4" />
                  <AlertDescription>
                    No products found for this supplier. Please add products first in the "Sản phẩm" tab.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid gap-3">
                  {supplierProducts.map((product) => (
                    <Card 
                      key={product.id}
                      className={`cursor-pointer transition-colors hover:bg-accent ${
                        selectedProductId === product.id ? 'border-primary bg-accent' : ''
                      }`}
                      onClick={() => setSelectedProductId(product.id)}
                    >
                      <CardContent className="flex items-center gap-4 p-4">
                        {product.current_label_image_url ? (
                          <img 
                            src={product.current_label_image_url} 
                            alt={product.product_name}
                            className="h-12 w-12 rounded object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{product.product_name}</p>
                            {product.is_sahcodha && (
                              <Badge variant="destructive" className="bg-red-600 text-xs">SAHCODHA</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {product.product_category || 'Uncategorized'}
                            {product.brand_name && ` • ${product.brand_name}`}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            {getRiskBadge(product.default_risk_level, product.is_sahcodha)}
                            {product.current_label_version > 0 && (
                              <span className="text-xs text-muted-foreground">
                                Label v{product.current_label_version}
                              </span>
                            )}
                          </div>
                        </div>
                        {selectedProductId === product.id && (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Step 3: Configure Record */}
          {formStep === 3 && selectedProduct && (
            <div className="space-y-6 py-4">
              {/* Selected Product Summary */}
              <Card className="border-primary bg-accent/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {selectedProduct.current_label_image_url ? (
                      <img 
                        src={selectedProduct.current_label_image_url} 
                        alt={selectedProduct.product_name}
                        className="h-16 w-16 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded bg-muted">
                        <Package className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-semibold">{selectedProduct.product_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {getSelectedSupplier()?.supplier_name} • {selectedProduct.product_category || 'Uncategorized'}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {getRiskBadge(selectedProduct.default_risk_level, selectedProduct.is_sahcodha)}
                        {selectedProduct.known_hazards?.map((hazard, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {hazard}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* SAHCODHA Warning */}
              {selectedProduct.is_sahcodha && (
                <Alert className="border-red-200 bg-red-50">
                  <Shield className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    This is a SAHCODHA product requiring annual onsite audits per 21 CFR 1.506(d)(2).
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Verification Settings */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Verification Frequency</Label>
                  <Select
                    value={formData.verification_frequency}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, verification_frequency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VERIFICATION_FREQUENCIES.map((freq) => (
                        <SelectItem key={freq.value} value={freq.value}>
                          {freq.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedProduct.is_sahcodha && (
                    <p className="text-xs text-muted-foreground">
                      Note: SAHCODHA products require at minimum annual verification regardless of selection.
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes for this FSVP record..."
                    rows={3}
                  />
                </div>
              </div>
              
              {/* Product Details Summary */}
              <div className="rounded-lg border p-4">
                <h4 className="mb-3 font-medium">Product Details (from catalog)</h4>
                <div className="grid gap-2 text-sm">
                  {selectedProduct.fda_product_code && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">FDA Product Code</span>
                      <span>{selectedProduct.fda_product_code}</span>
                    </div>
                  )}
                  {selectedProduct.hs_code && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">HS Code</span>
                      <span>{selectedProduct.hs_code}</span>
                    </div>
                  )}
                  {selectedProduct.country_of_origin && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Country of Origin</span>
                      <span>{selectedProduct.country_of_origin}</span>
                    </div>
                  )}
                  {selectedProduct.allergens && selectedProduct.allergens.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Allergens</span>
                      <span>{selectedProduct.allergens.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            {formStep > 1 && (
              <Button variant="outline" onClick={() => setFormStep(formStep - 1)}>
                Back
              </Button>
            )}
            {formStep < 3 ? (
              <Button 
                onClick={() => setFormStep(formStep + 1)}
                disabled={
                  (formStep === 1 && !selectedSupplierId) ||
                  (formStep === 2 && !selectedProductId)
                }
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create FSVP Record'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* View Details Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>FSVP Record Details</DialogTitle>
            <DialogDescription>
              {viewingRecord?.product_name} - {viewingRecord?.supplier_name}
            </DialogDescription>
          </DialogHeader>
          
          {viewingRecord && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="checklist">Checklist</TabsTrigger>
                <TabsTrigger value="activities">Activities</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Product</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="font-medium">{viewingRecord.product_name}</p>
                      <p className="text-sm text-muted-foreground">{viewingRecord.product_category}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Supplier</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="font-medium">{viewingRecord.supplier_name}</p>
                      <p className="text-sm text-muted-foreground">{viewingRecord.supplier_country}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Risk Level</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {getRiskBadge(viewingRecord.risk_level, viewingRecord.is_sahcodha)}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Compliance Score</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Progress value={viewingRecord.compliance_score} className="h-2 flex-1" />
                        <span className="font-medium">{viewingRecord.compliance_score}%</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {viewingRecord.hazard_types && viewingRecord.hazard_types.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Identified Hazards</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {viewingRecord.hazard_types.map((hazard, idx) => (
                          <Badge key={idx} variant="outline">{hazard}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              <TabsContent value="checklist">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-center text-muted-foreground py-8">
                      Compliance checklist will be displayed here
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="activities">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-center text-muted-foreground py-8">
                      Activity log will be displayed here
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
