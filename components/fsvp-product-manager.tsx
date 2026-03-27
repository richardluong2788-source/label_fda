'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Plus, 
  Package, 
  Building2,
  Edit,
  Trash2,
  Image as ImageIcon,
  History,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Upload,
  Eye,
  Tag,
  FileText
} from 'lucide-react'
import type { FSVPProduct, FSVPProductWithSupplier, FSVPProductLabel, FSVPSupplier, FSVPProductFormData } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then(res => res.json())

// Common allergens for selection
const ALLERGENS = [
  'Milk', 'Eggs', 'Fish', 'Crustacean shellfish', 'Tree nuts', 
  'Peanuts', 'Wheat', 'Soybeans', 'Sesame'
]

// Common certifications
const CERTIFICATIONS = [
  'HACCP', 'BRC', 'FSSC 22000', 'SQF', 'IFS', 'ISO 22000',
  'USDA Organic', 'Non-GMO', 'Halal', 'Kosher', 'Fair Trade'
]

// Risk levels
const RISK_LEVELS = [
  { value: 'low', label: 'Low Risk', color: 'bg-green-500' },
  { value: 'medium', label: 'Medium Risk', color: 'bg-yellow-500' },
  { value: 'high', label: 'High Risk', color: 'bg-orange-500' },
  { value: 'sahcodha', label: 'SAHCODHA', color: 'bg-red-500' }
]

// Product categories
const PRODUCT_CATEGORIES = [
  'Seafood - Fish', 'Seafood - Shellfish', 'Seafood - Processed',
  'Dairy - Cheese', 'Dairy - Milk Products', 'Dairy - Other',
  'Meat - Beef', 'Meat - Pork', 'Meat - Poultry', 'Meat - Processed',
  'Produce - Fruits', 'Produce - Vegetables', 'Produce - Leafy Greens',
  'Grains - Cereals', 'Grains - Flour', 'Grains - Rice',
  'Nuts & Seeds', 'Spices & Herbs', 'Oils & Fats',
  'Beverages', 'Confectionery', 'Bakery Products',
  'Canned Foods', 'Frozen Foods', 'Ready-to-Eat',
  'Dietary Supplements', 'Infant Formula', 'Other'
]

// Initial data from label scan for pre-filling product form
export interface LabelScanInitialData {
  productName?: string
  brandName?: string
  productCategory?: string
  ingredientList?: string
  allergenDeclaration?: string
  netWeight?: string
  countryOfOrigin?: string
  labelImageUrl?: string
  productDescription?: string
  isSahcodha?: boolean
}

interface FSVPProductManagerProps {
  userId: string
  supplierId?: string // Optional: filter by supplier
  role?: 'importer' | 'supplier'
  // Initial data from label scan for pre-filling the Add Product dialog
  initialData?: LabelScanInitialData
  // Auto-open Add Product dialog when initialData is provided
  autoOpenDialog?: boolean
  // Callback when dialog is closed (used when opened via label scan)
  onDialogClose?: () => void
}

const emptyFormData: FSVPProductFormData = {
  supplier_id: '',
  product_name: '',
  product_name_local: '',
  brand_name: '',
  sku: '',
  upc: '',
  product_description: '',
  product_category: '',
  fda_product_code: '',
  hs_code: '',
  packaging_format: '',
  net_weight: '',
  units_per_case: undefined,
  shelf_life_days: undefined,
  storage_requirements: '',
  ingredient_list: '',
  allergens: [],
  country_of_origin: '',
  manufacturing_facility: '',
  facility_fda_registration: '',
  default_risk_level: 'medium',
  is_sahcodha: false,
  known_hazards: [],
  certifications: [],
  notes: '',
  tags: []
}

export function FSVPProductManager({ 
  userId, 
  supplierId, 
  role = 'importer',
  initialData,
  autoOpenDialog = false,
  onDialogClose,
}: FSVPProductManagerProps) {
  // Fetch products
  const productUrl = supplierId 
    ? `/api/fsvp/products?supplier_id=${supplierId}` 
    : '/api/fsvp/products'
  const { data: products, error: productsError, mutate: mutateProducts } = useSWR<FSVPProductWithSupplier[]>(
    productUrl,
    fetcher
  )
  
  // Fetch suppliers for dropdown
  const { data: suppliers } = useSWR<FSVPSupplier[]>(
    role === 'importer' ? '/api/fsvp/suppliers' : null,
    fetcher
  )
  
  // State
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isLabelDialogOpen, setIsLabelDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<FSVPProductWithSupplier | null>(null)
  const [selectedProductLabels, setSelectedProductLabels] = useState<FSVPProductLabel[]>([])
  const [editingProduct, setEditingProduct] = useState<FSVPProductWithSupplier | null>(null)
  const [formData, setFormData] = useState<FSVPProductFormData>(emptyFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  
  // Label upload state
  const [labelImageUrl, setLabelImageUrl] = useState('')
  const [labelChangeReason, setLabelChangeReason] = useState('')
  
  // Track if we've already processed initialData to prevent infinite loops
  const [hasProcessedInitialData, setHasProcessedInitialData] = useState(false)
  
  // Auto-open dialog and pre-fill form when initialData is provided
  React.useEffect(() => {
    if (initialData && autoOpenDialog && !hasProcessedInitialData) {
      // Parse allergens from allergenDeclaration string
      const parsedAllergens: string[] = []
      if (initialData.allergenDeclaration) {
        const allergenText = initialData.allergenDeclaration.toLowerCase()
        ALLERGENS.forEach(allergen => {
          if (allergenText.includes(allergen.toLowerCase())) {
            parsedAllergens.push(allergen)
          }
        })
      }
      
      // Pre-fill form with label scan data
      setFormData({
        ...emptyFormData,
        supplier_id: supplierId || '',
        product_name: initialData.productName || '',
        brand_name: initialData.brandName || '',
        product_category: initialData.productCategory || '',
        product_description: initialData.productDescription || '',
        ingredient_list: initialData.ingredientList || '',
        allergens: parsedAllergens,
        country_of_origin: initialData.countryOfOrigin || '',
        net_weight: initialData.netWeight || '',
        is_sahcodha: initialData.isSahcodha || false,
        default_risk_level: initialData.isSahcodha ? 'sahcodha' : 'medium',
      })
      
      // If label image URL is provided, store it for later use
      if (initialData.labelImageUrl) {
        setLabelImageUrl(initialData.labelImageUrl)
      }
      
      setIsAddDialogOpen(true)
      setHasProcessedInitialData(true)
    }
  }, [initialData, autoOpenDialog, hasProcessedInitialData, supplierId])
  
  // Filter products
  const filteredProducts = products?.filter(p => {
    const matchesSearch = !searchQuery || 
      p.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    const matchesCategory = categoryFilter === 'all' || p.product_category === categoryFilter
    
    return matchesSearch && matchesStatus && matchesCategory
  }) || []
  
  // Stats
  const stats = {
    total: products?.length || 0,
    active: products?.filter(p => p.status === 'active').length || 0,
    sahcodha: products?.filter(p => p.is_sahcodha).length || 0,
    withLabels: products?.filter(p => p.current_label_id).length || 0
  }
  
  const resetForm = () => {
    setFormData({
      ...emptyFormData,
      supplier_id: supplierId || ''
    })
    setEditingProduct(null)
  }
  
  const handleOpenAddDialog = () => {
    resetForm()
    setIsAddDialogOpen(true)
  }
  
  const handleOpenEditDialog = (product: FSVPProductWithSupplier) => {
    setEditingProduct(product)
    setFormData({
      supplier_id: product.supplier_id,
      product_name: product.product_name,
      product_name_local: product.product_name_local || '',
      brand_name: product.brand_name || '',
      sku: product.sku || '',
      upc: product.upc || '',
      product_description: product.product_description || '',
      product_category: product.product_category || '',
      fda_product_code: product.fda_product_code || '',
      hs_code: product.hs_code || '',
      packaging_format: product.packaging_format || '',
      net_weight: product.net_weight || '',
      units_per_case: product.units_per_case,
      shelf_life_days: product.shelf_life_days,
      storage_requirements: product.storage_requirements || '',
      ingredient_list: product.ingredient_list || '',
      allergens: product.allergens || [],
      country_of_origin: product.country_of_origin || '',
      manufacturing_facility: product.manufacturing_facility || '',
      facility_fda_registration: product.facility_fda_registration || '',
      default_risk_level: product.default_risk_level || 'medium',
      is_sahcodha: product.is_sahcodha,
      known_hazards: product.known_hazards || [],
      certifications: product.certifications || [],
      notes: product.notes || '',
      tags: product.tags || []
    })
    setIsAddDialogOpen(true)
  }
  
  const handleViewProduct = async (product: FSVPProductWithSupplier) => {
    setSelectedProduct(product)
    
    // Fetch label history
    try {
      const res = await fetch(`/api/fsvp/products/${product.id}/labels`)
      if (res.ok) {
        const labels = await res.json()
        setSelectedProductLabels(labels)
      }
    } catch (e) {
      console.error('Failed to fetch labels:', e)
    }
    
    setIsViewDialogOpen(true)
  }
  
  const handleOpenLabelDialog = (product: FSVPProductWithSupplier) => {
    setSelectedProduct(product)
    setLabelImageUrl('')
    setLabelChangeReason('')
    setIsLabelDialogOpen(true)
  }
  
  const handleAllergenToggle = (allergen: string) => {
    setFormData(prev => ({
      ...prev,
      allergens: prev.allergens.includes(allergen)
        ? prev.allergens.filter(a => a !== allergen)
        : [...prev.allergens, allergen]
    }))
  }
  
  const handleCertificationToggle = (cert: string) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.includes(cert)
        ? prev.certifications.filter(c => c !== cert)
        : [...prev.certifications, cert]
    }))
  }
  
  const handleSubmit = async () => {
    if (!formData.supplier_id || !formData.product_name) {
      return
    }
    
    setIsSubmitting(true)
    try {
      const method = editingProduct ? 'PATCH' : 'POST'
      const url = editingProduct 
        ? `/api/fsvp/products/${editingProduct.id}`
        : '/api/fsvp/products'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          created_by_role: role
        })
      })
      
      if (response.ok) {
        mutateProducts()
        setIsAddDialogOpen(false)
        resetForm()
      }
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleUploadLabel = async () => {
    if (!selectedProduct || !labelImageUrl) return
    
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/fsvp/products/${selectedProduct.id}/labels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label_image_url: labelImageUrl,
          change_reason: labelChangeReason || 'Label update'
        })
      })
      
      if (response.ok) {
        mutateProducts()
        setIsLabelDialogOpen(false)
        setLabelImageUrl('')
        setLabelChangeReason('')
      }
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return
    
    const response = await fetch(`/api/fsvp/products/${productId}`, {
      method: 'DELETE'
    })
    
    if (response.ok) {
      mutateProducts()
    }
  }
  
  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      'active': { variant: 'default', label: 'Active' },
      'draft': { variant: 'outline', label: 'Draft' },
      'discontinued': { variant: 'secondary', label: 'Discontinued' },
      'archived': { variant: 'destructive', label: 'Archived' }
    }
    const config = variants[status] || { variant: 'outline' as const, label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }
  
  const getRiskBadge = (level: string, isSahcodha: boolean) => {
    if (isSahcodha) {
      return <Badge variant="destructive" className="bg-red-600">SAHCODHA</Badge>
    }
    const riskConfig = RISK_LEVELS.find(r => r.value === level)
    if (!riskConfig) return null
    return (
      <Badge variant="outline" className={`${riskConfig.color} text-white`}>
        {riskConfig.label}
      </Badge>
    )
  }
  
  if (productsError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Failed to load products. Please try again.</AlertDescription>
      </Alert>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">In catalog</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Ready for FSVP</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SAHCODHA Products</CardTitle>
            <Shield className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sahcodha}</div>
            <p className="text-xs text-muted-foreground">Require annual audit</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Labels</CardTitle>
            <ImageIcon className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withLabels}</div>
            <p className="text-xs text-muted-foreground">Label uploaded</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Product Catalog</CardTitle>
              <CardDescription>
                {role === 'supplier' 
                  ? 'Manage your product catalog and labels'
                  : 'Manage products from your suppliers'}
              </CardDescription>
            </div>
            <Button onClick={handleOpenAddDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="mb-4 flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="discontinued">Discontinued</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {PRODUCT_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Products Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No products found. Add your first product to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{product.product_name}</span>
                          {product.brand_name && (
                            <span className="text-xs text-muted-foreground">{product.brand_name}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{product.supplier_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{product.product_category || '-'}</span>
                      </TableCell>
                      <TableCell>
                        {getRiskBadge(product.default_risk_level, product.is_sahcodha)}
                      </TableCell>
                      <TableCell>
                        {product.current_label_id ? (
                          <div className="flex items-center gap-1">
                            <ImageIcon className="h-4 w-4 text-green-500" />
                            <span className="text-xs">v{product.current_label_version}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No label</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(product.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewProduct(product)}
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenLabelDialog(product)}
                            title="Upload label"
                          >
                            <Upload className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEditDialog(product)}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(product.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {/* Add/Edit Product Dialog */}
      <Dialog 
        open={isAddDialogOpen} 
        onOpenChange={(open) => {
          setIsAddDialogOpen(open)
          // Call onDialogClose callback when dialog is closed (e.g., from label scan)
          if (!open && onDialogClose) {
            onDialogClose()
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
            <DialogDescription>
              {editingProduct 
                ? 'Update the product information below.'
                : initialData && hasProcessedInitialData
                ? 'Product information has been pre-filled from label scan. Review and complete the details below.'
                : 'Enter the product details. This will be added to your product catalog.'}
            </DialogDescription>
            {initialData && hasProcessedInitialData && (
              <Alert className="mt-3 border-blue-200 bg-blue-50">
                <AlertDescription className="text-blue-700 text-sm">
                  Data pre-filled from label scan. Please select a Supplier and verify all information before saving.
                </AlertDescription>
              </Alert>
            )}
          </DialogHeader>
          
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="safety">Safety</TabsTrigger>
              <TabsTrigger value="certifications">Certifications</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4 pt-4">
              {role === 'importer' && !supplierId && (
                <div className="space-y-2">
                  <Label>Supplier *</Label>
                  <Select
                    value={formData.supplier_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, supplier_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers?.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.supplier_name} ({supplier.supplier_country})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Product Name *</Label>
                  <Input
                    value={formData.product_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, product_name: e.target.value }))}
                    placeholder="e.g., Frozen Pangasius Fillet"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Local Name</Label>
                  <Input
                    value={formData.product_name_local}
                    onChange={(e) => setFormData(prev => ({ ...prev, product_name_local: e.target.value }))}
                    placeholder="e.g., Cá Tra Fillet Đông Lạnh"
                  />
                </div>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Brand Name</Label>
                  <Input
                    value={formData.brand_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, brand_name: e.target.value }))}
                    placeholder="e.g., Ocean Fresh"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Product Category</Label>
                  <Select
                    value={formData.product_category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, product_category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Product Description</Label>
                <Textarea
                  value={formData.product_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, product_description: e.target.value }))}
                  placeholder="Detailed product description..."
                  rows={3}
                />
              </div>
              
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>SKU</Label>
                  <Input
                    value={formData.sku}
                    onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                    placeholder="Internal SKU"
                  />
                </div>
                <div className="space-y-2">
                  <Label>UPC/Barcode</Label>
                  <Input
                    value={formData.upc}
                    onChange={(e) => setFormData(prev => ({ ...prev, upc: e.target.value }))}
                    placeholder="UPC code"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Country of Origin</Label>
                  <Input
                    value={formData.country_of_origin}
                    onChange={(e) => setFormData(prev => ({ ...prev, country_of_origin: e.target.value }))}
                    placeholder="e.g., Vietnam"
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="details" className="space-y-4 pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>FDA Product Code</Label>
                  <Input
                    value={formData.fda_product_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, fda_product_code: e.target.value }))}
                    placeholder="e.g., 16 DFI"
                  />
                </div>
                <div className="space-y-2">
                  <Label>HS Code</Label>
                  <Input
                    value={formData.hs_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, hs_code: e.target.value }))}
                    placeholder="e.g., 0304.62"
                  />
                </div>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Packaging Format</Label>
                  <Input
                    value={formData.packaging_format}
                    onChange={(e) => setFormData(prev => ({ ...prev, packaging_format: e.target.value }))}
                    placeholder="e.g., Frozen IQF, 10kg box"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Net Weight</Label>
                  <Input
                    value={formData.net_weight}
                    onChange={(e) => setFormData(prev => ({ ...prev, net_weight: e.target.value }))}
                    placeholder="e.g., 500g"
                  />
                </div>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Units per Case</Label>
                  <Input
                    type="number"
                    value={formData.units_per_case || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      units_per_case: e.target.value ? parseInt(e.target.value) : undefined 
                    }))}
                    placeholder="e.g., 12"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Shelf Life (days)</Label>
                  <Input
                    type="number"
                    value={formData.shelf_life_days || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      shelf_life_days: e.target.value ? parseInt(e.target.value) : undefined 
                    }))}
                    placeholder="e.g., 365"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Storage Requirements</Label>
                  <Input
                    value={formData.storage_requirements}
                    onChange={(e) => setFormData(prev => ({ ...prev, storage_requirements: e.target.value }))}
                    placeholder="e.g., Frozen -18°C"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Ingredient List</Label>
                <Textarea
                  value={formData.ingredient_list}
                  onChange={(e) => setFormData(prev => ({ ...prev, ingredient_list: e.target.value }))}
                  placeholder="List all ingredients..."
                  rows={3}
                />
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Manufacturing Facility</Label>
                  <Input
                    value={formData.manufacturing_facility}
                    onChange={(e) => setFormData(prev => ({ ...prev, manufacturing_facility: e.target.value }))}
                    placeholder="Facility name and address"
                  />
                </div>
                <div className="space-y-2">
                  <Label>FDA Registration Number</Label>
                  <Input
                    value={formData.facility_fda_registration}
                    onChange={(e) => setFormData(prev => ({ ...prev, facility_fda_registration: e.target.value }))}
                    placeholder="e.g., 12345678"
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="safety" className="space-y-4 pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Risk Level</Label>
                  <Select
                    value={formData.default_risk_level}
                    onValueChange={(value: 'low' | 'medium' | 'high' | 'sahcodha') => {
                      setFormData(prev => ({ 
                        ...prev, 
                        default_risk_level: value,
                        is_sahcodha: value === 'sahcodha'
                      }))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RISK_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${level.color}`} />
                            {level.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {formData.is_sahcodha && (
                <Alert className="border-red-200 bg-red-50">
                  <Shield className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    SAHCODHA products require annual onsite audits per 21 CFR 1.506(d).
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label>Allergens</Label>
                <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-3">
                  {ALLERGENS.map((allergen) => (
                    <div key={allergen} className="flex items-center gap-2">
                      <Checkbox
                        id={`allergen-${allergen}`}
                        checked={formData.allergens.includes(allergen)}
                        onCheckedChange={() => handleAllergenToggle(allergen)}
                      />
                      <label htmlFor={`allergen-${allergen}`} className="cursor-pointer text-sm">
                        {allergen}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Known Hazards</Label>
                <Textarea
                  value={formData.known_hazards.join(', ')}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    known_hazards: e.target.value.split(',').map(h => h.trim()).filter(Boolean)
                  }))}
                  placeholder="e.g., Salmonella, Listeria, Heavy metals (comma-separated)"
                  rows={2}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="certifications" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Certifications</Label>
                <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-3">
                  {CERTIFICATIONS.map((cert) => (
                    <div key={cert} className="flex items-center gap-2">
                      <Checkbox
                        id={`cert-${cert}`}
                        checked={formData.certifications.includes(cert)}
                        onCheckedChange={() => handleCertificationToggle(cert)}
                      />
                      <label htmlFor={`cert-${cert}`} className="cursor-pointer text-sm">
                        {cert}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes about this product..."
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Tags</Label>
                <Input
                  value={formData.tags.join(', ')}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                  }))}
                  placeholder="e.g., premium, organic, new (comma-separated)"
                />
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !formData.product_name || !formData.supplier_id}>
              {isSubmitting ? 'Saving...' : (editingProduct ? 'Update Product' : 'Add Product')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Upload Label Dialog */}
      <Dialog open={isLabelDialogOpen} onOpenChange={setIsLabelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Label</DialogTitle>
            <DialogDescription>
              Upload a new label version for {selectedProduct?.product_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Label Image URL *</Label>
              <Input
                value={labelImageUrl}
                onChange={(e) => setLabelImageUrl(e.target.value)}
                placeholder="https://..."
              />
              <p className="text-xs text-muted-foreground">
                Paste the URL of the label image
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Change Reason</Label>
              <Textarea
                value={labelChangeReason}
                onChange={(e) => setLabelChangeReason(e.target.value)}
                placeholder="Why is this label being updated?"
                rows={2}
              />
            </div>
            
            {selectedProduct?.current_label_version && selectedProduct.current_label_version > 0 && (
              <Alert>
                <History className="h-4 w-4" />
                <AlertDescription>
                  This will create version {(selectedProduct.current_label_version || 0) + 1}. 
                  Previous versions will be preserved for audit history.
                </AlertDescription>
              </Alert>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLabelDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUploadLabel} disabled={isSubmitting || !labelImageUrl}>
              {isSubmitting ? 'Uploading...' : 'Upload Label'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* View Product Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {selectedProduct?.product_name}
            </DialogTitle>
            <DialogDescription>
              {selectedProduct?.brand_name && `Brand: ${selectedProduct.brand_name}`}
            </DialogDescription>
          </DialogHeader>
          
          {selectedProduct && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">Information</TabsTrigger>
                <TabsTrigger value="safety">Safety & Risk</TabsTrigger>
                <TabsTrigger value="labels">Label History</TabsTrigger>
              </TabsList>
              
              <TabsContent value="info" className="space-y-4 pt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-muted-foreground">Supplier</Label>
                    <p className="font-medium">{selectedProduct.supplier_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Category</Label>
                    <p className="font-medium">{selectedProduct.product_category || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Country of Origin</Label>
                    <p className="font-medium">{selectedProduct.country_of_origin || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">FDA Product Code</Label>
                    <p className="font-medium">{selectedProduct.fda_product_code || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">HS Code</Label>
                    <p className="font-medium">{selectedProduct.hs_code || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Net Weight</Label>
                    <p className="font-medium">{selectedProduct.net_weight || '-'}</p>
                  </div>
                </div>
                
                {selectedProduct.ingredient_list && (
                  <div>
                    <Label className="text-muted-foreground">Ingredients</Label>
                    <p className="mt-1 text-sm">{selectedProduct.ingredient_list}</p>
                  </div>
                )}
                
                {selectedProduct.certifications && selectedProduct.certifications.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Certifications</Label>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {selectedProduct.certifications.map(cert => (
                        <Badge key={cert} variant="secondary">{cert}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="safety" className="space-y-4 pt-4">
                <div className="flex items-center gap-4">
                  <div>
                    <Label className="text-muted-foreground">Risk Level</Label>
                    <div className="mt-1">
                      {getRiskBadge(selectedProduct.default_risk_level, selectedProduct.is_sahcodha)}
                    </div>
                  </div>
                </div>
                
                {selectedProduct.allergens && selectedProduct.allergens.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Allergens</Label>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {selectedProduct.allergens.map(allergen => (
                        <Badge key={allergen} variant="destructive">{allergen}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedProduct.known_hazards && selectedProduct.known_hazards.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Known Hazards</Label>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {selectedProduct.known_hazards.map(hazard => (
                        <Badge key={hazard} variant="outline">{hazard}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="labels" className="space-y-4 pt-4">
                {selectedProductLabels.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No labels uploaded yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedProductLabels.map((label) => (
                      <Card key={label.id}>
                        <CardContent className="flex items-center gap-4 p-4">
                          <div className="flex h-16 w-16 items-center justify-center rounded-md border bg-muted">
                            {label.label_image_url ? (
                              <img 
                                src={label.label_image_url} 
                                alt={`Label v${label.version}`}
                                className="h-full w-full rounded-md object-cover"
                              />
                            ) : (
                              <ImageIcon className="h-8 w-8 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Version {label.version}</span>
                              {label.is_current && (
                                <Badge variant="default">Current</Badge>
                              )}
                              <Badge variant="outline">{label.status}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Uploaded {new Date(label.uploaded_at).toLocaleDateString()}
                            </p>
                            {label.change_reason && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {label.change_reason}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
