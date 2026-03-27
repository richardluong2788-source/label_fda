'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Plus, 
  Beaker, 
  AlertTriangle, 
  Info,
  Edit,
  Trash2,
  Download,
  Copy,
  Eye,
  Bug,
  Atom,
  Droplet,
  ShieldAlert,
  Wheat,
  RefreshCw,
  Building2
} from 'lucide-react'
import type { HazardItem, SupplierHazardAnalysis } from '@/lib/fsvp-supplier-types'
import type { FSVPSupplier } from '@/lib/types'
import { useTranslation } from '@/lib/i18n'
import { getMandatoryHazardsForProduct, requiresSAHCODHAVerification, type ProductHazardProfile } from '@/lib/fsvp-product-hazard-mapping'
import { requiresFCESID, validateFCE, validateSID, validateAcidifiedPH, checkFCESIDCompliance } from '@/lib/fsvp-validator'

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
})

// Common hazards by type
const COMMON_HAZARDS = {
  biological: [
    { name: 'Salmonella', description: 'Bacterial pathogen common in poultry, eggs, produce' },
    { name: 'Listeria monocytogenes', description: 'Bacterial pathogen in ready-to-eat foods' },
    { name: 'E. coli O157:H7', description: 'Bacterial pathogen in beef, leafy greens' },
    { name: 'Vibrio', description: 'Bacterial pathogen in seafood' },
    { name: 'Norovirus', description: 'Viral pathogen in shellfish, produce' },
    { name: 'Parasites', description: 'Anisakis, Cyclospora in raw fish, produce' },
  ],
  chemical: [
    { name: 'Histamine', description: 'Scombrotoxin in tuna, mahi-mahi' },
    { name: 'Pesticide residues', description: 'Agricultural chemical residues' },
    { name: 'Heavy metals', description: 'Mercury, lead, cadmium, arsenic' },
    { name: 'Mycotoxins', description: 'Aflatoxin, ochratoxin in grains, nuts' },
    { name: 'Drug residues', description: 'Antibiotics, hormones in animal products' },
    { name: 'Cleaning chemicals', description: 'Sanitizer, detergent residues' },
  ],
  physical: [
    { name: 'Metal fragments', description: 'From equipment, processing' },
    { name: 'Glass shards', description: 'From containers, lighting' },
    { name: 'Plastic pieces', description: 'From packaging, equipment' },
    { name: 'Wood splinters', description: 'From pallets, crates' },
    { name: 'Stones/Pebbles', description: 'From harvesting, field' },
  ],
  allergen: [
    { name: 'Milk', description: 'Dairy allergen' },
    { name: 'Eggs', description: 'Egg allergen' },
    { name: 'Fish', description: 'Fish allergen' },
    { name: 'Shellfish', description: 'Crustacean allergen' },
    { name: 'Tree nuts', description: 'Tree nut allergen' },
    { name: 'Peanuts', description: 'Peanut allergen' },
    { name: 'Wheat', description: 'Wheat/gluten allergen' },
    { name: 'Soybeans', description: 'Soy allergen' },
    { name: 'Sesame', description: 'Sesame allergen' },
  ],
}

// Database hazard analysis type
interface DBHazardAnalysis {
  id: string
  supplier_id: string
  product_name: string
  product_category: string | null
  product_description: string | null
  known_hazards: HazardItem[]
  biological_hazards: HazardItem[]
  chemical_hazards: HazardItem[]
  physical_hazards: HazardItem[]
  radiological_hazards: HazardItem[]
  is_sahcodha_product: boolean
  sahcodha_justification: string | null
  control_measures: unknown[]
  supplier_controls: Record<string, unknown>
  analysis_date: string
  analyzed_by: string
  qualified_individual_credentials: string | null
  status: string
  created_at: string
  updated_at: string
  // LACF/Acidified Foods - FCE/SID (21 CFR 113/114)
  fce_number: string | null
  sid_number: string | null
  process_authority_name: string | null
  process_authority_date: string | null
  scheduled_process_filed: boolean
  thermal_process_type: string | null
  equilibrium_ph: number | null
  water_activity: number | null
}

export function SupplierHazardAnalysisTool() {
  const { t } = useTranslation()
  
  // Fetch hazard analyses from API
  const { data: analyses, error: analysesError, isLoading: analysesLoading, mutate: mutateAnalyses } = useSWR<DBHazardAnalysis[]>(
    '/api/fsvp/hazard-analyses',
    fetcher
  )
  
  // Fetch suppliers for the dropdown
  const { data: suppliers } = useSWR<FSVPSupplier[]>(
    '/api/fsvp/suppliers',
    fetcher
  )
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedAnalysis, setSelectedAnalysis] = useState<DBHazardAnalysis | null>(null)
  const [activeHazardTab, setActiveHazardTab] = useState('biological')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('')
  
  // Edit form state
  const [editAnalysis, setEditAnalysis] = useState({
    product_name: '',
    product_category: '',
    qualified_individual_name: '',
    qualified_individual_credentials: '',
  })
  const [editHazards, setEditHazards] = useState<HazardItem[]>([])
  
  // New analysis form state
  const [newAnalysis, setNewAnalysis] = useState({
    product_name: '',
    product_category: '',
    qualified_individual_name: '',
    qualified_individual_credentials: '',
    // FCE/SID for LACF/Acidified Foods
    fce_number: '',
    sid_number: '',
    process_authority_name: '',
    scheduled_process_filed: false,
    thermal_process_type: '',
    equilibrium_ph: '',
  })
  
  // FCE/SID validation state
  const [fceSidErrors, setFceSidErrors] = useState<string[]>([])
  const [fceSidWarnings, setFceSidWarnings] = useState<string[]>([])
  const [showFceSidFields, setShowFceSidFields] = useState(false)
  
  const [newHazard, setNewHazard] = useState<Partial<HazardItem>>({
    hazard_name: '',
    hazard_type: 'biological',
    description: '',
    source: '',
    likelihood: 'medium',
    severity: 'medium',
    is_reasonably_foreseeable: true,
    control_measure: '',
    verification_method: '',
    monitoring_frequency: '',
    responsible_person: '',
  })
  
  const [tempHazards, setTempHazards] = useState<HazardItem[]>([])
  const [suggestedHazards, setSuggestedHazards] = useState<HazardItem[]>([])
  const [matchedProfile, setMatchedProfile] = useState<ProductHazardProfile | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  
  // Auto-suggest hazards when product category or name changes
  const checkAndSuggestHazards = (category: string, productName: string) => {
    const { profile, suggestedHazards: hazards } = getMandatoryHazardsForProduct(category, productName)
    
    if (profile && hazards.length > 0) {
      setMatchedProfile(profile)
      setSuggestedHazards(hazards)
      setShowSuggestions(true)
    } else {
      setMatchedProfile(null)
      setSuggestedHazards([])
      setShowSuggestions(false)
    }
    
    // Check if FCE/SID is required for this category
    const needsFceSid = requiresFCESID(category)
    setShowFceSidFields(needsFceSid)
    
    // Clear FCE/SID errors when category changes
    if (!needsFceSid) {
      setFceSidErrors([])
      setFceSidWarnings([])
    }
  }
  
  // Validate FCE/SID fields
  const validateFceSidFields = (): boolean => {
    if (!showFceSidFields) return true
    
    const compliance = checkFCESIDCompliance(
      newAnalysis.product_category,
      newAnalysis.fce_number || undefined,
      newAnalysis.sid_number || undefined,
      newAnalysis.process_authority_name || undefined,
      newAnalysis.scheduled_process_filed,
      newAnalysis.equilibrium_ph ? parseFloat(newAnalysis.equilibrium_ph) : undefined
    )
    
    setFceSidErrors(compliance.violations)
    setFceSidWarnings(compliance.warnings)
    
    return compliance.isCompliant
  }
  
  // Apply suggested hazards
  const applySuggestedHazards = () => {
    // Filter out already added hazards
    const existingNames = tempHazards.map(h => h.hazard_name.toLowerCase())
    const newHazards = suggestedHazards.filter(h => !existingNames.includes(h.hazard_name.toLowerCase()))
    
    setTempHazards([...tempHazards, ...newHazards])
    setShowSuggestions(false)
  }
  
  // Dismiss suggestions
  const dismissSuggestions = () => {
    setShowSuggestions(false)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      draft: { variant: 'outline', label: 'Draft' },
      pending_review: { variant: 'secondary', label: 'Pending Review' },
      approved: { variant: 'default', label: 'Approved' },
      needs_revision: { variant: 'destructive', label: 'Needs Revision' },
    }
    const config = variants[status] || { variant: 'outline' as const, label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }
  
  const getSeverityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      low: 'bg-green-100 text-green-700',
      medium: 'bg-amber-100 text-amber-700',
      high: 'bg-orange-100 text-orange-700',
      sahcodha: 'bg-red-100 text-red-700',
    }
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[severity] || ''}`}>
        {severity === 'sahcodha' ? 'SAHCODHA' : severity.charAt(0).toUpperCase() + severity.slice(1)}
      </span>
    )
  }
  
  const getHazardTypeIcon = (type: string) => {
    switch (type) {
      case 'biological':
        return <Bug className="h-4 w-4" />
      case 'chemical':
        return <Atom className="h-4 w-4" />
      case 'physical':
        return <AlertTriangle className="h-4 w-4" />
      case 'radiological':
        return <Droplet className="h-4 w-4" />
      case 'allergen':
        return <Wheat className="h-4 w-4" />
      default:
        return <ShieldAlert className="h-4 w-4" />
    }
  }
  
  const addHazard = () => {
    if (!newHazard.hazard_name) return
    
    const hazard: HazardItem = {
      id: `temp-${Date.now()}`,
      hazard_name: newHazard.hazard_name || '',
      hazard_type: (newHazard.hazard_type as HazardItem['hazard_type']) || 'biological',
      description: newHazard.description || '',
      source: newHazard.source || '',
      likelihood: (newHazard.likelihood as HazardItem['likelihood']) || 'medium',
      severity: (newHazard.severity as HazardItem['severity']) || 'medium',
      is_reasonably_foreseeable: newHazard.is_reasonably_foreseeable || true,
      control_measure: newHazard.control_measure || '',
      verification_method: newHazard.verification_method || '',
      monitoring_frequency: newHazard.monitoring_frequency || '',
      responsible_person: newHazard.responsible_person || '',
    }
    
    setTempHazards([...tempHazards, hazard])
    setNewHazard({
      hazard_name: '',
      hazard_type: activeHazardTab as HazardItem['hazard_type'],
      description: '',
      source: '',
      likelihood: 'medium',
      severity: 'medium',
      is_reasonably_foreseeable: true,
      control_measure: '',
      verification_method: '',
      monitoring_frequency: '',
      responsible_person: '',
    })
  }
  
  const removeHazard = (id: string) => {
    setTempHazards(tempHazards.filter(h => h.id !== id))
  }
  
  const selectCommonHazard = (hazard: { name: string; description: string }) => {
    setNewHazard({
      ...newHazard,
      hazard_name: hazard.name,
      description: hazard.description,
    })
  }

  const getTotalHazardCount = (analysis: DBHazardAnalysis) => {
    return (
      (analysis.biological_hazards?.length || 0) +
      (analysis.chemical_hazards?.length || 0) +
      (analysis.physical_hazards?.length || 0) +
      (analysis.radiological_hazards?.length || 0)
    )
  }
  
  const handleCreateAnalysis = async () => {
    if (!newAnalysis.product_name || !newAnalysis.product_category || !selectedSupplierId) {
      return
    }
    
    // Validate FCE/SID if required
    if (showFceSidFields && !validateFceSidFields()) {
      // Allow creation with warnings, but show them
      // User can still proceed if they acknowledge
    }
    
    setIsSubmitting(true)
    try {
      const hasSAHCODHA = tempHazards.some(h => h.severity === 'sahcodha')
      const needsFceSid = requiresFCESID(newAnalysis.product_category)
      
      const response = await fetch('/api/fsvp/hazard-analyses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: selectedSupplierId,
          product_name: newAnalysis.product_name,
          product_category: newAnalysis.product_category,
          qualified_individual_credentials: newAnalysis.qualified_individual_credentials,
          analyzed_by: newAnalysis.qualified_individual_name,
          biological_hazards: tempHazards.filter(h => h.hazard_type === 'biological'),
          chemical_hazards: tempHazards.filter(h => h.hazard_type === 'chemical'),
          physical_hazards: tempHazards.filter(h => h.hazard_type === 'physical'),
          radiological_hazards: tempHazards.filter(h => h.hazard_type === 'radiological'),
          known_hazards: tempHazards.filter(h => h.hazard_type === 'allergen'),
          is_sahcodha_product: hasSAHCODHA,
          status: 'draft',
          // FCE/SID fields for LACF/Acidified Foods
          ...(needsFceSid && {
            fce_number: newAnalysis.fce_number || null,
            sid_number: newAnalysis.sid_number || null,
            process_authority_name: newAnalysis.process_authority_name || null,
            scheduled_process_filed: newAnalysis.scheduled_process_filed,
            thermal_process_type: newAnalysis.thermal_process_type || null,
            equilibrium_ph: newAnalysis.equilibrium_ph ? parseFloat(newAnalysis.equilibrium_ph) : null,
          })
        })
      })
      
      if (response.ok) {
        mutateAnalyses()
        setIsCreateDialogOpen(false)
        setNewAnalysis({
          product_name: '',
          product_category: '',
          qualified_individual_name: '',
          qualified_individual_credentials: '',
          fce_number: '',
          sid_number: '',
          process_authority_name: '',
          scheduled_process_filed: false,
          thermal_process_type: '',
          equilibrium_ph: '',
        })
        setTempHazards([])
        setSelectedSupplierId('')
        setShowFceSidFields(false)
        setFceSidErrors([])
        setFceSidWarnings([])
      }
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const resetForm = () => {
    setNewAnalysis({
      product_name: '',
      product_category: '',
      qualified_individual_name: '',
      qualified_individual_credentials: '',
      fce_number: '',
      sid_number: '',
      process_authority_name: '',
      scheduled_process_filed: false,
      thermal_process_type: '',
      equilibrium_ph: '',
    })
    setTempHazards([])
    setSelectedSupplierId('')
    setShowFceSidFields(false)
    setFceSidErrors([])
    setFceSidWarnings([])
  }
  
  const handleViewAnalysis = (analysis: DBHazardAnalysis) => {
    setSelectedAnalysis(analysis)
    setIsViewDialogOpen(true)
  }
  
  const handleDownloadAnalysis = (analysis: DBHazardAnalysis) => {
    // Generate a detailed hazard analysis report
    const content = `
FSVP HAZARD ANALYSIS REPORT
============================

Product Information
-------------------
Product Name: ${analysis.product_name}
Product Category: ${analysis.product_category || 'N/A'}
Product Description: ${analysis.product_description || 'N/A'}

Analysis Information
-------------------
Analysis Date: ${new Date(analysis.analysis_date).toLocaleDateString()}
Analyzed By: ${analysis.analyzed_by || 'N/A'}
Credentials: ${analysis.qualified_individual_credentials || 'N/A'}
Status: ${analysis.status}
SAHCODHA Product: ${analysis.is_sahcodha_product ? 'Yes' : 'No'}
${analysis.sahcodha_justification ? `SAHCODHA Justification: ${analysis.sahcodha_justification}` : ''}

Biological Hazards (${analysis.biological_hazards?.length || 0})
-------------------
${(analysis.biological_hazards || []).map(h => `- ${h.hazard_name}: ${h.description || 'N/A'} (Severity: ${h.severity}, Likelihood: ${h.likelihood})`).join('\n') || 'None identified'}

Chemical Hazards (${analysis.chemical_hazards?.length || 0})
-----------------
${(analysis.chemical_hazards || []).map(h => `- ${h.hazard_name}: ${h.description || 'N/A'} (Severity: ${h.severity}, Likelihood: ${h.likelihood})`).join('\n') || 'None identified'}

Physical Hazards (${analysis.physical_hazards?.length || 0})
-----------------
${(analysis.physical_hazards || []).map(h => `- ${h.hazard_name}: ${h.description || 'N/A'} (Severity: ${h.severity}, Likelihood: ${h.likelihood})`).join('\n') || 'None identified'}

Radiological Hazards (${analysis.radiological_hazards?.length || 0})
--------------------
${(analysis.radiological_hazards || []).map(h => `- ${h.hazard_name}: ${h.description || 'N/A'} (Severity: ${h.severity}, Likelihood: ${h.likelihood})`).join('\n') || 'None identified'}

Known Hazards/Allergens (${analysis.known_hazards?.length || 0})
-----------------------
${(analysis.known_hazards || []).map(h => `- ${h.hazard_name}: ${h.description || 'N/A'}`).join('\n') || 'None identified'}

Report Generated: ${new Date().toLocaleString()}
    `.trim()
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Hazard_Analysis_${analysis.product_name.replace(/\s+/g, '_')}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  
  const handleCopyAnalysis = async (analysis: DBHazardAnalysis) => {
    const summary = `Hazard Analysis: ${analysis.product_name} (${analysis.product_category})
SAHCODHA: ${analysis.is_sahcodha_product ? 'Yes' : 'No'}
Total Hazards: ${getTotalHazardCount(analysis)}
Status: ${analysis.status}`
    
    try {
      await navigator.clipboard.writeText(summary)
      alert('Analysis summary copied to clipboard!')
    } catch {
      console.error('Failed to copy to clipboard')
    }
  }
  
  const handleEditAnalysis = (analysis: DBHazardAnalysis) => {
    setSelectedAnalysis(analysis)
    setEditAnalysis({
      product_name: analysis.product_name,
      product_category: analysis.product_category || '',
      qualified_individual_name: analysis.analyzed_by || '',
      qualified_individual_credentials: analysis.qualified_individual_credentials || '',
    })
    // Combine all hazards for editing
    const allHazards: HazardItem[] = [
      ...(analysis.biological_hazards || []).map(h => ({ ...h, hazard_type: 'biological' as const })),
      ...(analysis.chemical_hazards || []).map(h => ({ ...h, hazard_type: 'chemical' as const })),
      ...(analysis.physical_hazards || []).map(h => ({ ...h, hazard_type: 'physical' as const })),
      ...(analysis.radiological_hazards || []).map(h => ({ ...h, hazard_type: 'radiological' as const })),
      ...(analysis.known_hazards || []).map(h => ({ ...h, hazard_type: 'allergen' as const })),
    ]
    setEditHazards(allHazards)
    setSelectedSupplierId(analysis.supplier_id)
    setIsEditDialogOpen(true)
  }
  
  const handleUpdateAnalysis = async () => {
    if (!selectedAnalysis || !editAnalysis.product_name || !editAnalysis.product_category) {
      return
    }
    
    setIsSubmitting(true)
    try {
      const hasSAHCODHA = editHazards.some(h => h.severity === 'sahcodha')
      
      const response = await fetch('/api/fsvp/hazard-analyses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedAnalysis.id,
          supplier_id: selectedSupplierId,
          product_name: editAnalysis.product_name,
          product_category: editAnalysis.product_category,
          qualified_individual_credentials: editAnalysis.qualified_individual_credentials,
          analyzed_by: editAnalysis.qualified_individual_name,
          biological_hazards: editHazards.filter(h => h.hazard_type === 'biological'),
          chemical_hazards: editHazards.filter(h => h.hazard_type === 'chemical'),
          physical_hazards: editHazards.filter(h => h.hazard_type === 'physical'),
          radiological_hazards: editHazards.filter(h => h.hazard_type === 'radiological'),
          known_hazards: editHazards.filter(h => h.hazard_type === 'allergen'),
          is_sahcodha_product: hasSAHCODHA,
        })
      })
      
      if (response.ok) {
        mutateAnalyses()
        setIsEditDialogOpen(false)
        setSelectedAnalysis(null)
        setEditHazards([])
      } else {
        const error = await response.json()
        alert(`Error: ${error.error || 'Failed to update'}`)
      }
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const addEditHazard = () => {
    if (!newHazard.hazard_name) return
    
    const hazard: HazardItem = {
      id: `temp-${Date.now()}`,
      hazard_name: newHazard.hazard_name || '',
      hazard_type: (newHazard.hazard_type as HazardItem['hazard_type']) || 'biological',
      description: newHazard.description || '',
      source: newHazard.source || '',
      likelihood: (newHazard.likelihood as HazardItem['likelihood']) || 'medium',
      severity: (newHazard.severity as HazardItem['severity']) || 'medium',
      is_reasonably_foreseeable: newHazard.is_reasonably_foreseeable || true,
      control_measure: newHazard.control_measure || '',
      verification_method: newHazard.verification_method || '',
      monitoring_frequency: newHazard.monitoring_frequency || '',
      responsible_person: newHazard.responsible_person || '',
    }
    
    setEditHazards([...editHazards, hazard])
    setNewHazard({
      hazard_name: '',
      hazard_type: activeHazardTab as HazardItem['hazard_type'],
      description: '',
      source: '',
      likelihood: 'medium',
      severity: 'medium',
      is_reasonably_foreseeable: true,
      control_measure: '',
      verification_method: '',
      monitoring_frequency: '',
      responsible_person: '',
    })
  }
  
  const removeEditHazard = (id: string) => {
    setEditHazards(editHazards.filter(h => h.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Beaker className="h-6 w-6" />
            {t.fsvpSupplier.hazardAnalysisTitle}
          </h2>
          <p className="text-muted-foreground">
            {t.fsvpSupplier.hazardAnalysisDesc}
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t.fsvpSupplier.createHazardAnalysis}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t.fsvpSupplier.createHazardAnalysisTitle}</DialogTitle>
              <DialogDescription>
                {t.fsvpSupplier.createHazardAnalysisDesc}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Supplier Selection */}
              <div className="space-y-2">
                <Label htmlFor="supplier">Foreign Supplier *</Label>
                <Select
                  value={selectedSupplierId}
                  onValueChange={setSelectedSupplierId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers && suppliers.length > 0 ? (
                      suppliers.filter(s => s.status !== 'removed').map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            {supplier.supplier_name} ({supplier.supplier_country})
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        No suppliers available - add a supplier first
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {(!suppliers || suppliers.length === 0) && (
                  <p className="text-sm text-muted-foreground">
                    You need to add a foreign supplier before creating a hazard analysis.
                  </p>
                )}
              </div>

              {/* Product Information */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="product_name">{t.fsvpSupplier.productName} *</Label>
                  <Input
                    id="product_name"
                    value={newAnalysis.product_name}
                    onChange={(e) => {
                      setNewAnalysis({ ...newAnalysis, product_name: e.target.value })
                      // Debounced check on product name
                      setTimeout(() => {
                        checkAndSuggestHazards(newAnalysis.product_category, e.target.value)
                      }, 500)
                    }}
                    placeholder="e.g., Frozen Pangasius, Roasted Cashews"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product_category">{t.fsvpSupplier.productCategory} *</Label>
                  <Select
                    value={newAnalysis.product_category}
                    onValueChange={(value) => {
                      setNewAnalysis({ ...newAnalysis, product_category: value })
                      checkAndSuggestHazards(value, newAnalysis.product_name)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t.fsvpSupplier.selectCategory} />
                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="seafood">Seafood (21 CFR 123)</SelectItem>
                                      <SelectItem value="pangasius">Pangasius / Ca Tra</SelectItem>
                                      <SelectItem value="shrimp">Shrimp / Tom</SelectItem>
                                      <SelectItem value="produce">Produce (21 CFR 112)</SelectItem>
                                      <SelectItem value="leafy_greens">Leafy Greens</SelectItem>
                                      <SelectItem value="dairy">Dairy</SelectItem>
                                      <SelectItem value="meat">Meat & Poultry</SelectItem>
                                      <SelectItem value="grains">Grains & Cereals</SelectItem>
                                      <SelectItem value="nuts">Nuts & Seeds</SelectItem>
                                      <SelectItem value="cashew">Cashew / Hat Dieu</SelectItem>
                                      <SelectItem value="peanuts">Peanuts / Dau Phong</SelectItem>
                                      <SelectItem value="spices">Spices / Gia Vi</SelectItem>
                                      <SelectItem value="beverages">Beverages</SelectItem>
                                      <SelectItem value="processed">Processed Foods</SelectItem>
                                      <SelectItem value="supplements">Dietary Supplements (21 CFR 111)</SelectItem>
                                      <SelectItem value="lacf">Low-Acid Canned Foods - LACF (21 CFR 113)</SelectItem>
                                      <SelectItem value="canned_vegetables">Canned Vegetables (21 CFR 113)</SelectItem>
                                      <SelectItem value="canned_meat">Canned Meat/Poultry (21 CFR 113)</SelectItem>
                                      <SelectItem value="acidified_foods">Acidified Foods (21 CFR 114)</SelectItem>
                                      <SelectItem value="pickles">Pickles / Dua Chua (21 CFR 114)</SelectItem>
                                      <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Qualified Individual */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="qi_name">{t.fsvpSupplier.qualifiedIndividualName} *</Label>
                  <Input
                    id="qi_name"
                    value={newAnalysis.qualified_individual_name}
                    onChange={(e) => setNewAnalysis({ ...newAnalysis, qualified_individual_name: e.target.value })}
                    placeholder={t.fsvpSupplier.fullName}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qi_credentials">{t.fsvpSupplier.credentials}</Label>
                  <Input
                    id="qi_credentials"
                    value={newAnalysis.qualified_individual_credentials}
                    onChange={(e) => setNewAnalysis({ ...newAnalysis, qualified_individual_credentials: e.target.value })}
                    placeholder="e.g., PCQI Certified, MS Food Science"
                  />
                </div>
              </div>
              
              <Separator />
              
              {/* FCE/SID Section for LACF/Acidified Foods */}
              {showFceSidFields && (
                <Card className="border-red-200 bg-red-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-red-800 flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5" />
                      FCE/SID Required - LACF/Acidified Foods (21 CFR 108/113/114)
                    </CardTitle>
                    <CardDescription className="text-red-700">
                      This product category requires FCE registration and Process Filing (SID) with FDA before import.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* FCE/SID Errors */}
                    {fceSidErrors.length > 0 && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Compliance Issues</AlertTitle>
                        <AlertDescription>
                          <ul className="list-disc list-inside space-y-1 mt-2">
                            {fceSidErrors.map((error, idx) => (
                              <li key={idx}>{error}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {/* FCE/SID Warnings */}
                    {fceSidWarnings.length > 0 && (
                      <Alert className="border-amber-300 bg-amber-50">
                        <Info className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-amber-800">Recommendations</AlertTitle>
                        <AlertDescription className="text-amber-700">
                          <ul className="list-disc list-inside space-y-1 mt-2">
                            {fceSidWarnings.map((warning, idx) => (
                              <li key={idx}>{warning}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="fce_number" className="text-red-800">
                          FCE Number (Food Canning Establishment) *
                        </Label>
                        <Input
                          id="fce_number"
                          value={newAnalysis.fce_number}
                          onChange={(e) => setNewAnalysis({ ...newAnalysis, fce_number: e.target.value })}
                          placeholder="e.g., 12345"
                          className="border-red-200"
                        />
                        <p className="text-xs text-red-600">
                          Required per 21 CFR 108.25 - Foreign establishments must register with FDA
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sid_number" className="text-red-800">
                          SID Number (Process Filing) *
                        </Label>
                        <Input
                          id="sid_number"
                          value={newAnalysis.sid_number}
                          onChange={(e) => setNewAnalysis({ ...newAnalysis, sid_number: e.target.value })}
                          placeholder="e.g., SID123456"
                          className="border-red-200"
                        />
                        <p className="text-xs text-red-600">
                          Required per 21 CFR 108.35 - Scheduled processes must be filed with FDA
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="process_authority_name" className="text-red-800">
                          Process Authority Name
                        </Label>
                        <Input
                          id="process_authority_name"
                          value={newAnalysis.process_authority_name}
                          onChange={(e) => setNewAnalysis({ ...newAnalysis, process_authority_name: e.target.value })}
                          placeholder="e.g., Dr. John Smith, ABC Process Authority"
                          className="border-red-200"
                        />
                        <p className="text-xs text-red-600">
                          Name of recognized Process Authority who validated the scheduled process
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="thermal_process_type" className="text-red-800">
                          Thermal Process Type
                        </Label>
                        <Select
                          value={newAnalysis.thermal_process_type}
                          onValueChange={(value) => setNewAnalysis({ ...newAnalysis, thermal_process_type: value })}
                        >
                          <SelectTrigger className="border-red-200">
                            <SelectValue placeholder="Select process type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="retort">Retort (Still/Agitating)</SelectItem>
                            <SelectItem value="aseptic">Aseptic Processing</SelectItem>
                            <SelectItem value="hot_fill">Hot Fill</SelectItem>
                            <SelectItem value="acidification">Acidification</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {/* For Acidified Foods - pH field */}
                    {['acidified_foods', 'pickles'].includes(newAnalysis.product_category) && (
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="equilibrium_ph" className="text-red-800">
                            Equilibrium pH *
                          </Label>
                          <Input
                            id="equilibrium_ph"
                            type="number"
                            step="0.01"
                            min="0"
                            max="14"
                            value={newAnalysis.equilibrium_ph}
                            onChange={(e) => setNewAnalysis({ ...newAnalysis, equilibrium_ph: e.target.value })}
                            placeholder="e.g., 4.2"
                            className="border-red-200"
                          />
                          <p className="text-xs text-red-600">
                            Must be ≤4.6 for acidified foods per 21 CFR 114.80
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2 pt-2">
                      <Checkbox
                        id="scheduled_process_filed"
                        checked={newAnalysis.scheduled_process_filed}
                        onCheckedChange={(checked) => 
                          setNewAnalysis({ ...newAnalysis, scheduled_process_filed: checked as boolean })
                        }
                      />
                      <Label htmlFor="scheduled_process_filed" className="text-red-800 font-normal">
                        Scheduled process has been filed with FDA (FDA Form 2541 series)
                      </Label>
                    </div>
                    
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={validateFceSidFields}
                      className="border-red-300 text-red-700 hover:bg-red-100"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Validate FCE/SID Compliance
                    </Button>
                  </CardContent>
                </Card>
              )}
              
              {/* Auto-Suggested Hazards Banner */}
              {showSuggestions && suggestedHazards.length > 0 && matchedProfile && (
                <Alert className="border-amber-500 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800">
                    Mandatory Hazards Detected for {matchedProfile.category.toUpperCase()}
                  </AlertTitle>
                  <AlertDescription className="text-amber-700">
                    <div className="space-y-3">
                      <p>
                        Based on FDA guidance and enforcement history, the following hazards are <strong>mandatory</strong> for this product category:
                      </p>
                      <div className="space-y-2">
                        {suggestedHazards.map((hazard, idx) => (
                          <div key={idx} className="flex items-start gap-2 p-2 bg-white rounded border border-amber-200">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-amber-900">{hazard.hazard_name}</span>
                                {getSeverityBadge(hazard.severity)}
                                {hazard.is_reasonably_foreseeable && (
                                  <Badge variant="outline" className="text-xs">Mandatory</Badge>
                                )}
                              </div>
                              <p className="text-sm text-amber-800 mt-1">{hazard.description}</p>
                              <p className="text-xs text-amber-600 mt-1">
                                <strong>Control:</strong> {hazard.control_measure}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      {matchedProfile.importAlerts && matchedProfile.importAlerts.length > 0 && (
                        <div className="text-xs text-amber-600 pt-2 border-t border-amber-200">
                          <strong>Related FDA Import Alerts:</strong> {matchedProfile.importAlerts.join(', ')}
                        </div>
                      )}
                      <div className="flex gap-2 pt-2">
                        <Button 
                          size="sm" 
                          onClick={applySuggestedHazards}
                          className="bg-amber-600 hover:bg-amber-700"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add All Mandatory Hazards
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={dismissSuggestions}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              
              {/* SAHCODHA Warning */}
              {matchedProfile && requiresSAHCODHAVerification(newAnalysis.product_category, newAnalysis.product_name).requires && (
                <Alert variant="destructive">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertTitle>SAHCODHA Product - Annual Audit Required</AlertTitle>
                  <AlertDescription>
                    {requiresSAHCODHAVerification(newAnalysis.product_category, newAnalysis.product_name).rationale}
                    <br />
                    <span className="text-xs">Reference: 21 CFR 1.506(d)(1)</span>
                  </AlertDescription>
                </Alert>
              )}

              {/* Hazard Identification */}
              <div>
                <h3 className="text-lg font-semibold mb-4">{t.fsvpSupplier.hazardIdentification}</h3>
                
                <Tabs value={activeHazardTab} onValueChange={setActiveHazardTab}>
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="biological" className="flex items-center gap-1">
                      <Bug className="h-3 w-3" />
                      <span className="hidden sm:inline">{t.fsvpSupplier.biological}</span>
                    </TabsTrigger>
                    <TabsTrigger value="chemical" className="flex items-center gap-1">
                      <Atom className="h-3 w-3" />
                      <span className="hidden sm:inline">{t.fsvpSupplier.chemical}</span>
                    </TabsTrigger>
                    <TabsTrigger value="physical" className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      <span className="hidden sm:inline">{t.fsvpSupplier.physical}</span>
                    </TabsTrigger>
                    <TabsTrigger value="radiological" className="flex items-center gap-1">
                      <Droplet className="h-3 w-3" />
                      <span className="hidden sm:inline">{t.fsvpSupplier.radiological}</span>
                    </TabsTrigger>
                    <TabsTrigger value="allergen" className="flex items-center gap-1">
                      <Wheat className="h-3 w-3" />
                      <span className="hidden sm:inline">{t.fsvpSupplier.allergen}</span>
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value={activeHazardTab} className="mt-4 space-y-4">
                    {/* Common Hazards Quick Select */}
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-2">{t.fsvpSupplier.commonHazards} ({activeHazardTab}):</p>
                      <div className="flex flex-wrap gap-2">
                        {COMMON_HAZARDS[activeHazardTab as keyof typeof COMMON_HAZARDS]?.map((hazard) => (
                          <Button
                            key={hazard.name}
                            variant="outline"
                            size="sm"
                            onClick={() => selectCommonHazard(hazard)}
                          >
                            {hazard.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Add New Hazard Form */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">{t.fsvpSupplier.addHazard} ({activeHazardTab})</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>{t.fsvpSupplier.hazardName} *</Label>
                            <Input
                              value={newHazard.hazard_name}
                              onChange={(e) => setNewHazard({ ...newHazard, hazard_name: e.target.value })}
                              placeholder="e.g., Salmonella"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>{t.fsvpSupplier.source}</Label>
                            <Input
                              value={newHazard.source}
                              onChange={(e) => setNewHazard({ ...newHazard, source: e.target.value })}
                              placeholder="e.g., Raw material, Environment"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>{t.fsvpSupplier.description}</Label>
                          <Textarea
                            value={newHazard.description}
                            onChange={(e) => setNewHazard({ ...newHazard, description: e.target.value })}
                            placeholder="Describe the hazard and potential source"
                            rows={2}
                          />
                        </div>
                        
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label>{t.fsvpSupplier.likelihood}</Label>
                            <Select
                              value={newHazard.likelihood}
                              onValueChange={(value) => setNewHazard({ ...newHazard, likelihood: value as HazardItem['likelihood'] })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">{t.fsvpSupplier.severityLow}</SelectItem>
                                <SelectItem value="medium">{t.fsvpSupplier.severityMedium}</SelectItem>
                                <SelectItem value="high">{t.fsvpSupplier.severityHigh}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>{t.fsvpSupplier.severity}</Label>
                            <Select
                              value={newHazard.severity}
                              onValueChange={(value) => setNewHazard({ ...newHazard, severity: value as HazardItem['severity'] })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">{t.fsvpSupplier.severityLow}</SelectItem>
                                <SelectItem value="medium">{t.fsvpSupplier.severityMedium}</SelectItem>
                                <SelectItem value="high">{t.fsvpSupplier.severityHigh}</SelectItem>
                                <SelectItem value="sahcodha">SAHCODHA ({t.fsvpSupplier.severityCritical})</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>{t.fsvpSupplier.reasonablyForeseeable}</Label>
                            <div className="flex items-center gap-2 pt-2">
                              <Checkbox
                                checked={newHazard.is_reasonably_foreseeable}
                                onCheckedChange={(checked) => setNewHazard({ ...newHazard, is_reasonably_foreseeable: checked as boolean })}
                              />
                              <span className="text-sm">{t.fsvpSupplier.yes}</span>
                            </div>
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div className="space-y-2">
                          <Label>{t.fsvpSupplier.controlMeasures} *</Label>
                          <Textarea
                            value={newHazard.control_measure}
                            onChange={(e) => setNewHazard({ ...newHazard, control_measure: e.target.value })}
                            placeholder="How is this hazard controlled?"
                            rows={2}
                          />
                        </div>
                        
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label>Verification Method</Label>
                            <Input
                              value={newHazard.verification_method}
                              onChange={(e) => setNewHazard({ ...newHazard, verification_method: e.target.value })}
                              placeholder="e.g., Testing, Audit"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Monitoring Frequency</Label>
                            <Input
                              value={newHazard.monitoring_frequency}
                              onChange={(e) => setNewHazard({ ...newHazard, monitoring_frequency: e.target.value })}
                              placeholder="e.g., Each batch"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Responsible Person</Label>
                            <Input
                              value={newHazard.responsible_person}
                              onChange={(e) => setNewHazard({ ...newHazard, responsible_person: e.target.value })}
                              placeholder="e.g., QC Manager"
                            />
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button onClick={addHazard} disabled={!newHazard.hazard_name || !newHazard.control_measure}>
                          <Plus className="h-4 w-4 mr-2" />
                          {t.fsvpSupplier.addHazard}
                        </Button>
                      </CardFooter>
                    </Card>
                    
                    {/* Added Hazards List */}
                    {tempHazards.filter(h => h.hazard_type === activeHazardTab).length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Added Hazards:</h4>
                        {tempHazards
                          .filter(h => h.hazard_type === activeHazardTab)
                          .map((hazard) => (
                            <div key={hazard.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                              <div className="flex items-center gap-3">
                                {getHazardTypeIcon(hazard.hazard_type)}
                                <div>
                                  <p className="font-medium">{hazard.hazard_name}</p>
                                  <p className="text-sm text-muted-foreground">{hazard.description}</p>
                                </div>
                                {getSeverityBadge(hazard.severity)}
                              </div>
                              <Button variant="ghost" size="icon" onClick={() => removeHazard(hazard.id)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
              
              {/* Summary */}
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">{t.fsvpSupplier.tabOverview}</h4>
                <div className="grid grid-cols-5 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{tempHazards.filter(h => h.hazard_type === 'biological').length}</p>
                    <p className="text-xs text-muted-foreground">{t.fsvpSupplier.biological}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{tempHazards.filter(h => h.hazard_type === 'chemical').length}</p>
                    <p className="text-xs text-muted-foreground">{t.fsvpSupplier.chemical}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{tempHazards.filter(h => h.hazard_type === 'physical').length}</p>
                    <p className="text-xs text-muted-foreground">{t.fsvpSupplier.physical}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{tempHazards.filter(h => h.hazard_type === 'radiological').length}</p>
                    <p className="text-xs text-muted-foreground">{t.fsvpSupplier.radiological}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{tempHazards.filter(h => h.hazard_type === 'allergen').length}</p>
                    <p className="text-xs text-muted-foreground">{t.fsvpSupplier.allergen}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                {t.fsvpSupplier.cancel}
              </Button>
              <Button 
                disabled={!newAnalysis.product_name || !newAnalysis.product_category || !selectedSupplierId || tempHazards.length === 0 || isSubmitting}
                onClick={handleCreateAnalysis}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  t.fsvpSupplier.createHazardAnalysis
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>{t.fsvpSupplier.aboutHazardAnalysis}</AlertTitle>
        <AlertDescription>
          {t.fsvpSupplier.aboutHazardAnalysisDesc}
        </AlertDescription>
      </Alert>
      
      {/* Existing Analyses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t.fsvpSupplier.documentedHazardAnalyses}</CardTitle>
            <CardDescription>
              {t.fsvpSupplier.documentedHazardAnalysesDesc}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => mutateAnalyses()} disabled={analysesLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${analysesLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {analysesLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </div>
          ) : analysesError ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Failed to load hazard analyses</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => mutateAnalyses()}>
                Try Again
              </Button>
            </div>
          ) : !analyses || analyses.length === 0 ? (
            <div className="text-center py-8">
              <Beaker className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hazard analyses documented yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first hazard analysis by clicking the button above
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.fsvpSupplier.product}</TableHead>
                  <TableHead>{t.fsvpSupplier.category}</TableHead>
                  <TableHead>{t.fsvpSupplier.totalHazards}</TableHead>
                  <TableHead>SAHCODHA</TableHead>
                  <TableHead>{t.fsvpSupplier.status}</TableHead>
                  <TableHead>{t.fsvpSupplier.lastUpdated}</TableHead>
                  <TableHead className="text-right">{t.fsvpSupplier.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analyses.map((analysis) => (
                  <TableRow key={analysis.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{analysis.product_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {analysis.analyzed_by && `by ${analysis.analyzed_by}`}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{analysis.product_category || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline">{getTotalHazardCount(analysis)} {t.fsvpSupplier.total}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {analysis.is_sahcodha_product ? (
                        <Badge variant="destructive">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {t.fsvpSupplier.yes}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">{t.fsvpSupplier.no}</Badge>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(analysis.status)}</TableCell>
                    <TableCell>{new Date(analysis.updated_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="View Details"
                          onClick={() => handleViewAnalysis(analysis)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="Edit"
                          onClick={() => handleEditAnalysis(analysis)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="Download Report"
                          onClick={() => handleDownloadAnalysis(analysis)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="Copy Summary"
                          onClick={() => handleCopyAnalysis(analysis)}
                        >
                          <Copy className="h-4 w-4" />
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
      
      {/* View Analysis Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Hazard Analysis Details</DialogTitle>
            <DialogDescription>
              View complete hazard analysis information
            </DialogDescription>
          </DialogHeader>
          {selectedAnalysis && (
            <div className="space-y-4 py-4">
              {/* Product Info */}
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold text-lg">{selectedAnalysis.product_name}</h3>
                <p className="text-sm text-muted-foreground capitalize">
                  {selectedAnalysis.product_category || 'Uncategorized'}
                </p>
                {selectedAnalysis.is_sahcodha_product && (
                  <Badge variant="destructive" className="mt-2">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    SAHCODHA Product
                  </Badge>
                )}
              </div>
              
              {/* Analysis Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Analyzed By</span>
                  <p className="font-medium">{selectedAnalysis.analyzed_by || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Analysis Date</span>
                  <p className="font-medium">{new Date(selectedAnalysis.analysis_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <div className="mt-1">{getStatusBadge(selectedAnalysis.status)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Hazards</span>
                  <p className="font-medium">{getTotalHazardCount(selectedAnalysis)}</p>
                </div>
              </div>
              
              {/* Hazards Summary */}
              <div className="space-y-3">
                <h4 className="font-semibold">Identified Hazards</h4>
                
                {(selectedAnalysis.biological_hazards?.length || 0) > 0 && (
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Bug className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Biological ({selectedAnalysis.biological_hazards.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedAnalysis.biological_hazards.map((h, i) => (
                        <Badge key={i} variant="outline">{h.hazard_name}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {(selectedAnalysis.chemical_hazards?.length || 0) > 0 && (
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Atom className="h-4 w-4 text-purple-600" />
                      <span className="font-medium">Chemical ({selectedAnalysis.chemical_hazards.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedAnalysis.chemical_hazards.map((h, i) => (
                        <Badge key={i} variant="outline">{h.hazard_name}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {(selectedAnalysis.physical_hazards?.length || 0) > 0 && (
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <span className="font-medium">Physical ({selectedAnalysis.physical_hazards.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedAnalysis.physical_hazards.map((h, i) => (
                        <Badge key={i} variant="outline">{h.hazard_name}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {(selectedAnalysis.known_hazards?.length || 0) > 0 && (
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Wheat className="h-4 w-4 text-amber-600" />
                      <span className="font-medium">Allergens ({selectedAnalysis.known_hazards.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedAnalysis.known_hazards.map((h, i) => (
                        <Badge key={i} variant="outline">{h.hazard_name}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {getTotalHazardCount(selectedAnalysis) === 0 && (
                  <p className="text-muted-foreground text-center py-4">No hazards identified</p>
                )}
              </div>
              
              {selectedAnalysis.sahcodha_justification && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <span className="text-sm font-medium text-red-800">SAHCODHA Justification</span>
                  <p className="text-sm text-red-700 mt-1">{selectedAnalysis.sahcodha_justification}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            {selectedAnalysis && (
              <Button onClick={() => handleDownloadAnalysis(selectedAnalysis)}>
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Analysis Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Hazard Analysis</DialogTitle>
            <DialogDescription>
              Update the hazard analysis for this product
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Product Information */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit_product_name">Product Name *</Label>
                <Input
                  id="edit_product_name"
                  value={editAnalysis.product_name}
                  onChange={(e) => setEditAnalysis({ ...editAnalysis, product_name: e.target.value })}
                  placeholder="e.g., Frozen Shrimp"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_product_category">Product Category *</Label>
                <Select
                  value={editAnalysis.product_category}
                  onValueChange={(value) => setEditAnalysis({ ...editAnalysis, product_category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seafood">Seafood</SelectItem>
                    <SelectItem value="produce">Produce</SelectItem>
                    <SelectItem value="dairy">Dairy</SelectItem>
                    <SelectItem value="meat">Meat & Poultry</SelectItem>
                    <SelectItem value="grains">Grains & Cereals</SelectItem>
                    <SelectItem value="nuts">Nuts & Seeds</SelectItem>
                    <SelectItem value="beverages">Beverages</SelectItem>
                    <SelectItem value="processed">Processed Foods</SelectItem>
                    <SelectItem value="supplements">Dietary Supplements</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Qualified Individual */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit_qi_name">Qualified Individual Name</Label>
                <Input
                  id="edit_qi_name"
                  value={editAnalysis.qualified_individual_name}
                  onChange={(e) => setEditAnalysis({ ...editAnalysis, qualified_individual_name: e.target.value })}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_qi_credentials">Credentials</Label>
                <Input
                  id="edit_qi_credentials"
                  value={editAnalysis.qualified_individual_credentials}
                  onChange={(e) => setEditAnalysis({ ...editAnalysis, qualified_individual_credentials: e.target.value })}
                  placeholder="e.g., PCQI Certified"
                />
              </div>
            </div>
            
            <Separator />
            
            {/* Current Hazards */}
            <div className="space-y-3">
              <h4 className="font-semibold">Current Hazards ({editHazards.length})</h4>
              {editHazards.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hazards added yet</p>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {editHazards.map((hazard) => (
                    <div key={hazard.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        {getHazardTypeIcon(hazard.hazard_type)}
                        <div>
                          <p className="font-medium text-sm">{hazard.hazard_name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {hazard.hazard_type} - {hazard.severity}
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeEditHazard(hazard.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <Separator />
            
            {/* Add New Hazard */}
            <div className="space-y-4">
              <h4 className="font-semibold">Add New Hazard</h4>
              
              <Tabs value={activeHazardTab} onValueChange={(v) => {
                setActiveHazardTab(v)
                setNewHazard({ ...newHazard, hazard_type: v as HazardItem['hazard_type'] })
              }}>
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="biological">Biological</TabsTrigger>
                  <TabsTrigger value="chemical">Chemical</TabsTrigger>
                  <TabsTrigger value="physical">Physical</TabsTrigger>
                  <TabsTrigger value="radiological">Radiological</TabsTrigger>
                  <TabsTrigger value="allergen">Allergen</TabsTrigger>
                </TabsList>
                
                <TabsContent value={activeHazardTab} className="space-y-4 mt-4">
                  {/* Common Hazards Quick Select */}
                  {COMMON_HAZARDS[activeHazardTab as keyof typeof COMMON_HAZARDS] && (
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Quick Select Common Hazards</Label>
                      <div className="flex flex-wrap gap-1">
                        {COMMON_HAZARDS[activeHazardTab as keyof typeof COMMON_HAZARDS]?.map((h) => (
                          <Button
                            key={h.name}
                            variant="outline"
                            size="sm"
                            onClick={() => selectCommonHazard(h)}
                          >
                            {h.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Hazard Name *</Label>
                      <Input
                        value={newHazard.hazard_name}
                        onChange={(e) => setNewHazard({ ...newHazard, hazard_name: e.target.value })}
                        placeholder="Enter hazard name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Severity</Label>
                      <Select
                        value={newHazard.severity}
                        onValueChange={(v) => setNewHazard({ ...newHazard, severity: v as HazardItem['severity'] })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="sahcodha">SAHCODHA</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={newHazard.description}
                      onChange={(e) => setNewHazard({ ...newHazard, description: e.target.value })}
                      placeholder="Describe the hazard"
                      rows={2}
                    />
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Likelihood</Label>
                      <Select
                        value={newHazard.likelihood}
                        onValueChange={(v) => setNewHazard({ ...newHazard, likelihood: v as HazardItem['likelihood'] })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Control Measure</Label>
                      <Input
                        value={newHazard.control_measure}
                        onChange={(e) => setNewHazard({ ...newHazard, control_measure: e.target.value })}
                        placeholder="e.g., Cooking to 165F"
                      />
                    </div>
                  </div>
                  
                  <Button 
                    onClick={addEditHazard}
                    disabled={!newHazard.hazard_name}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Hazard
                  </Button>
                </TabsContent>
              </Tabs>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateAnalysis}
              disabled={isSubmitting || !editAnalysis.product_name || !editAnalysis.product_category}
            >
              {isSubmitting ? 'Updating...' : 'Update Analysis'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
