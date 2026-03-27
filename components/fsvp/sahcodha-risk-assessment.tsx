'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  ShieldCheck, 
  AlertTriangle, 
  Info,
  Plus,
  Eye,
  Edit,
  Download,
  HelpCircle,
  XCircle,
  RefreshCw,
  ExternalLink
} from 'lucide-react'
import type { SAHCODHARiskAssessment } from '@/lib/fsvp-supplier-types'
import { useTranslation } from '@/lib/i18n'

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
})

// API response type
interface SAHCODHAProduct {
  id: string
  supplier_id: string
  product_name: string
  product_category: string
  biological_hazards: Array<{ name: string; severity: string; likelihood: string; control: string }>
  chemical_hazards: Array<{ name: string; severity: string }>
  known_hazards: Array<{ name: string; type: string }>
  is_sahcodha_product: boolean
  sahcodha_justification: string | null
  analysis_date: string
  status: string
  risk_score: number
  hazard_count: number
  verification_frequency: string
  fsvp_suppliers: {
    supplier_name: string
    is_sahcodha_risk: boolean
    sahcodha_hazards: string[] | null
    requires_annual_audit: boolean
    last_onsite_audit_date: string | null
    next_onsite_audit_due: string | null
  }
}

// SAHCODHA Categories and their associated hazards
const SAHCODHA_CATEGORIES = {
  seafood: {
    name: 'Seafood (Fish & Shellfish)',
    hazards: [
      { name: 'Histamine (Scombrotoxin)', cfr: '21 CFR 123' },
      { name: 'Ciguatera toxin', cfr: '21 CFR 123' },
      { name: 'Vibrio species', cfr: '21 CFR 123' },
      { name: 'Parasites (Anisakis)', cfr: '21 CFR 123' },
      { name: 'Listeria monocytogenes', cfr: '21 CFR 123' },
      { name: 'Heavy metals (Mercury)', cfr: '21 CFR 123' },
    ],
    cfrReference: '21 CFR 123 (HACCP for Seafood)',
  },
  leafy_greens: {
    name: 'Leafy Greens & Salads',
    hazards: [
      { name: 'E. coli O157:H7', cfr: '21 CFR 112' },
      { name: 'Salmonella', cfr: '21 CFR 112' },
      { name: 'Cyclospora', cfr: '21 CFR 112' },
      { name: 'Listeria monocytogenes', cfr: '21 CFR 112' },
    ],
    cfrReference: '21 CFR 112 (Produce Safety Rule)',
  },
  sprouts: {
    name: 'Sprouts',
    hazards: [
      { name: 'Salmonella', cfr: '21 CFR 112.144' },
      { name: 'E. coli O157:H7', cfr: '21 CFR 112.144' },
      { name: 'Listeria monocytogenes', cfr: '21 CFR 112.144' },
    ],
    cfrReference: '21 CFR 112.144 (Sprout-specific requirements)',
  },
  juice: {
    name: 'Juice & Juice Products',
    hazards: [
      { name: 'E. coli O157:H7', cfr: '21 CFR 120' },
      { name: 'Salmonella', cfr: '21 CFR 120' },
      { name: 'Cryptosporidium', cfr: '21 CFR 120' },
      { name: 'Patulin (apple juice)', cfr: '21 CFR 120' },
    ],
    cfrReference: '21 CFR 120 (HACCP for Juice)',
  },
  shell_eggs: {
    name: 'Shell Eggs',
    hazards: [
      { name: 'Salmonella Enteritidis', cfr: '21 CFR 118' },
    ],
    cfrReference: '21 CFR 118 (Shell Egg Safety)',
  },
  dairy: {
    name: 'Dairy Products (esp. soft cheese)',
    hazards: [
      { name: 'Listeria monocytogenes', cfr: '21 CFR 133' },
      { name: 'Salmonella', cfr: '21 CFR 133' },
      { name: 'E. coli', cfr: '21 CFR 133' },
    ],
    cfrReference: '21 CFR 133',
  },
  deli_meat: {
    name: 'Ready-to-Eat Meat & Deli Products',
    hazards: [
      { name: 'Listeria monocytogenes', cfr: '9 CFR 430 (FSIS)' },
      { name: 'Salmonella', cfr: '9 CFR 430 (FSIS)' },
    ],
    cfrReference: '9 CFR 430 (FSIS)',
  },
}

// Product characteristics that may indicate SAHCODHA
const PRODUCT_CHARACTERISTICS = [
  { id: 'ready_to_eat', label: 'Ready-to-eat (no further cooking required)', weight: 3 },
  { id: 'raw_ingredients', label: 'Contains raw animal-derived ingredients', weight: 3 },
  { id: 'supports_pathogen', label: 'Supports pathogen growth (high moisture, neutral pH)', weight: 3 },
  { id: 'vulnerable_population', label: 'Intended for vulnerable populations (infants, elderly)', weight: 2 },
  { id: 'minimal_processing', label: 'Minimally processed', weight: 2 },
  { id: 'recall_history', label: 'Product category has history of recalls', weight: 2 },
  { id: 'long_shelf_life', label: 'Long shelf life with refrigeration', weight: 1 },
  { id: 'complex_supply_chain', label: 'Complex supply chain or multiple handlers', weight: 1 },
]

export function SAHCODHARiskAssessmentTool() {
  const { t } = useTranslation()
  
  // Fetch SAHCODHA products from API
  const { data: sahcodhaProducts, error: productsError, isLoading, mutate: mutateProducts } = useSWR<SAHCODHAProduct[]>(
    '/api/fsvp/sahcodha',
    fetcher
  )
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  
  // New assessment form state
  const [newAssessment, setNewAssessment] = useState({
    product_name: '',
    product_category: '',
    characteristics: {} as Record<string, boolean>,
    selectedHazards: [] as Array<{ category: string; hazard: string; controlled: boolean; control_description: string }>,
  })
  
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  
  const calculateRiskScore = () => {
    let score = 0
    let maxScore = 0
    
    PRODUCT_CHARACTERISTICS.forEach(char => {
      maxScore += char.weight * 10
      if (newAssessment.characteristics[char.id]) {
        score += char.weight * 10
      }
    })
    
    // Add points for SAHCODHA category match
    if (selectedCategory && SAHCODHA_CATEGORIES[selectedCategory as keyof typeof SAHCODHA_CATEGORIES]) {
      score += 20
    }
    
    // Add points for uncontrolled hazards
    const uncontrolledHazards = newAssessment.selectedHazards.filter(h => !h.controlled).length
    score += uncontrolledHazards * 15
    
    return Math.min(Math.round((score / (maxScore + 40)) * 100), 100)
  }
  
  const getRiskLevel = (score: number) => {
    if (score >= 70) return { level: 'SAHCODHA', color: 'text-red-600', bg: 'bg-red-100' }
    if (score >= 50) return { level: 'High', color: 'text-orange-600', bg: 'bg-orange-100' }
    if (score >= 30) return { level: 'Medium', color: 'text-amber-600', bg: 'bg-amber-100' }
    return { level: 'Low', color: 'text-green-600', bg: 'bg-green-100' }
  }
  
  const toggleCharacteristic = (id: string) => {
    setNewAssessment(prev => ({
      ...prev,
      characteristics: {
        ...prev.characteristics,
        [id]: !prev.characteristics[id],
      },
    }))
  }
  
  const addHazard = (category: string, hazardName: string) => {
    if (newAssessment.selectedHazards.some(h => h.category === category && h.hazard === hazardName)) {
      return
    }
    
    setNewAssessment(prev => ({
      ...prev,
      selectedHazards: [
        ...prev.selectedHazards,
        { category, hazard: hazardName, controlled: false, control_description: '' },
      ],
    }))
  }
  
  const removeHazard = (index: number) => {
    setNewAssessment(prev => ({
      ...prev,
      selectedHazards: prev.selectedHazards.filter((_, i) => i !== index),
    }))
  }
  
  const updateHazardControl = (index: number, controlled: boolean, description: string) => {
    setNewAssessment(prev => ({
      ...prev,
      selectedHazards: prev.selectedHazards.map((h, i) => 
        i === index ? { ...h, controlled, control_description: description } : h
      ),
    }))
  }
  
  const currentRiskScore = calculateRiskScore()
  const currentRiskLevel = getRiskLevel(currentRiskScore)
  
  const getVerificationRequirement = (level: string) => {
    switch (level) {
      case 'SAHCODHA':
        return t.fsvpSupplier.verificationAnnualOnsite || 'Annual onsite audit required per 21 CFR 1.506(d)(1)'
      case 'High':
        return t.fsvpSupplier.verificationEnhanced || 'Enhanced verification activities recommended (annual audit suggested)'
      case 'Medium':
        return t.fsvpSupplier.verificationPeriodic || 'Periodic verification activities per 21 CFR 1.506'
      default:
        return t.fsvpSupplier.verificationStandard || 'Standard verification activities per 21 CFR 1.506'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
<ShieldCheck className="h-6 w-6" />
{t.fsvpSupplier.sahcodhaTitle}
</h2>
          <p className="text-muted-foreground">
            {t.fsvpSupplier.identifyProducts}
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t.fsvpSupplier.newAssessment}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t.fsvpSupplier.sahcodhaTitle}</DialogTitle>
              <DialogDescription>
                {t.fsvpSupplier.aboutSahcodhaDesc}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Product Information */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="product_name">{t.fsvpSupplier.productName} *</Label>
                  <Input
                    id="product_name"
                    value={newAssessment.product_name}
                    onChange={(e) => setNewAssessment({ ...newAssessment, product_name: e.target.value })}
                    placeholder="e.g., Frozen Shrimp"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product_category">{t.fsvpSupplier.productCategory} *</Label>
                  <Select
                    value={selectedCategory}
                    onValueChange={(value) => {
                      setSelectedCategory(value)
                      setNewAssessment({ ...newAssessment, product_category: value })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t.fsvpSupplier.selectCategory} />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SAHCODHA_CATEGORIES).map(([key, cat]) => (
                        <SelectItem key={key} value={key}>
                          {cat.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Category Warning */}
              {selectedCategory && SAHCODHA_CATEGORIES[selectedCategory as keyof typeof SAHCODHA_CATEGORIES] && (
                <Alert variant="destructive" className="border-orange-500 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertTitle className="text-orange-700">SAHCODHA Category Identified</AlertTitle>
                  <AlertDescription className="text-orange-600">
                    {SAHCODHA_CATEGORIES[selectedCategory as keyof typeof SAHCODHA_CATEGORIES].name} products 
                    are commonly associated with serious adverse health consequences. 
                    Reference: {SAHCODHA_CATEGORIES[selectedCategory as keyof typeof SAHCODHA_CATEGORIES].cfrReference}
                  </AlertDescription>
                </Alert>
              )}
              
              <Separator />
              
              {/* Product Characteristics */}
              <div>
                <h3 className="text-lg font-semibold mb-4">{t.fsvpSupplier.productCharacteristics}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Select all characteristics that apply to your product. These factors help determine SAHCODHA risk.
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  {PRODUCT_CHARACTERISTICS.map((char) => (
                    <div
                      key={char.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${
                        newAssessment.characteristics[char.id] 
                          ? 'bg-orange-50 border-orange-200' 
                          : 'bg-muted/50 hover:bg-muted'
                      }`}
                      onClick={() => toggleCharacteristic(char.id)}
                    >
                      <Checkbox
                        checked={newAssessment.characteristics[char.id] || false}
                        onCheckedChange={() => toggleCharacteristic(char.id)}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{char.label}</p>
                        <Badge variant="outline" className="mt-1 text-xs">
                          Risk Weight: {char.weight}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <Separator />
              
              {/* Known Hazards */}
              <div>
                <h3 className="text-lg font-semibold mb-4">SAHCODHA Hazards</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Identify known hazards associated with your product category and whether they are controlled.
                </p>
                
                {/* Category Hazards */}
                {selectedCategory && SAHCODHA_CATEGORIES[selectedCategory as keyof typeof SAHCODHA_CATEGORIES] && (
                  <div className="p-4 bg-muted rounded-lg mb-4">
                    <p className="text-sm font-medium mb-2">
                      Common hazards for {SAHCODHA_CATEGORIES[selectedCategory as keyof typeof SAHCODHA_CATEGORIES].name}:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {SAHCODHA_CATEGORIES[selectedCategory as keyof typeof SAHCODHA_CATEGORIES].hazards.map((hazard) => (
                        <Button
                          key={hazard.name}
                          variant="outline"
                          size="sm"
                          onClick={() => addHazard(selectedCategory, hazard.name)}
                          disabled={newAssessment.selectedHazards.some(h => h.hazard === hazard.name)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          {hazard.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Selected Hazards Table */}
                {newAssessment.selectedHazards.length > 0 && (
                  <Card>
                    <CardContent className="pt-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Hazard</TableHead>
                            <TableHead>Controlled?</TableHead>
                            <TableHead>Control Description</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {newAssessment.selectedHazards.map((hazard, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{hazard.hazard}</p>
                                  <p className="text-xs text-muted-foreground capitalize">{hazard.category}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Checkbox
                                  checked={hazard.controlled}
                                  onCheckedChange={(checked) => 
                                    updateHazardControl(index, checked as boolean, hazard.control_description)
                                  }
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  placeholder="Describe control measures..."
                                  value={hazard.control_description}
                                  onChange={(e) => 
                                    updateHazardControl(index, hazard.controlled, e.target.value)
                                  }
                                  className="text-sm"
                                />
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" onClick={() => removeHazard(index)}>
                                  <XCircle className="h-4 w-4 text-red-500" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </div>
              
              <Separator />
              
              {/* Risk Assessment Result */}
              <Card className={`border-2 ${currentRiskLevel.level === 'SAHCODHA' ? 'border-red-500' : ''}`}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Risk Assessment Result</span>
                    <Badge className={`${currentRiskLevel.bg} ${currentRiskLevel.color} text-lg px-4 py-1`}>
                      {currentRiskLevel.level} Risk
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Risk Score</span>
                      <span className={`text-2xl font-bold ${currentRiskLevel.color}`}>{currentRiskScore}%</span>
                    </div>
                    <Progress value={currentRiskScore} className="h-3" />
                  </div>
                  
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Verification Requirement</AlertTitle>
                    <AlertDescription>
                      {getVerificationRequirement(currentRiskLevel.level)}
                    </AlertDescription>
                  </Alert>
                  
                  {currentRiskLevel.level === 'SAHCODHA' && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Annual Onsite Audit Required</AlertTitle>
                      <AlertDescription>
                        This product is classified as SAHCODHA (Serious Adverse Health Consequences or Death).
                        Per 21 CFR 1.506(d)(1), you must conduct or arrange for annual onsite audits by 
                        qualified auditors to verify your foreign supplier's food safety practices.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                disabled={!newAssessment.product_name || !newAssessment.product_category}
                onClick={() => {
                  // Save logic here
                  setIsCreateDialogOpen(false)
                }}
              >
                Save Assessment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>What is SAHCODHA?</AlertTitle>
        <AlertDescription>
          <p className="mb-2">
            SAHCODHA stands for "Serious Adverse Health Consequences or Death to Humans or Animals." 
            Per 21 CFR 1.500, products that could cause SAHCODHA require enhanced supplier verification activities.
          </p>
          <Button variant="link" className="p-0 h-auto" asChild>
            <a 
              href="https://www.fda.gov/food/food-safety-modernization-act-fsma/fsma-final-rule-foreign-supplier-verification-programs-fsvp-importers-food-humans-and-animals" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              {t.fsvpSupplier.learnMoreFsvp}
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </Button>
        </AlertDescription>
      </Alert>
      
      {/* Existing Assessments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t.fsvpSupplier.sahcodhaTitle}</CardTitle>
            <CardDescription>
              {t.fsvpSupplier.productsAssessed}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => mutateProducts()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </div>
          ) : productsError ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-destructive" />
              <p>Failed to load SAHCODHA products</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => mutateProducts()}>
                Try Again
              </Button>
            </div>
          ) : !sahcodhaProducts || sahcodhaProducts.length === 0 ? (
            <div className="text-center py-8">
              <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No SAHCODHA products identified yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Products classified as SAHCODHA in hazard analyses will appear here
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.fsvpSupplier.product}</TableHead>
                  <TableHead>{t.fsvpSupplier.category}</TableHead>
                  <TableHead>{t.fsvpSupplier.riskLevel}</TableHead>
                  <TableHead>{t.fsvpSupplier.riskScore}</TableHead>
                  <TableHead>{t.fsvpSupplier.verificationRequired}</TableHead>
                  <TableHead>{t.fsvpSupplier.assessmentDateCol}</TableHead>
                  <TableHead className="text-right">{t.fsvpSupplier.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sahcodhaProducts.map((product) => {
                  const riskLevel = getRiskLevel(product.risk_score)
                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{product.product_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {product.fsvp_suppliers?.supplier_name}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{product.product_category}</TableCell>
                      <TableCell>
                        <Badge className={`${riskLevel.bg} ${riskLevel.color}`}>
                          {riskLevel.level}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={product.risk_score} className="w-16 h-2" />
                          <span className="text-sm">{product.risk_score}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.verification_frequency === 'Annual' ? 'destructive' : 'secondary'}>
                          {product.verification_frequency}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(product.analysis_date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" title="View Details">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Edit">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Download">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* SAHCODHA Categories Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            {t.fsvpSupplier.commonSahcodhaCategories}
          </CardTitle>
          <CardDescription>
            {t.fsvpSupplier.fdaRecognizedCategories}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(SAHCODHA_CATEGORIES).map(([key, category]) => (
              <Card key={key}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    {category.name}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {category.cfrReference}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {category.hazards.slice(0, 3).map((hazard) => (
                      <Badge key={hazard.name} variant="outline" className="text-xs">
                        {hazard.name}
                      </Badge>
                    ))}
                    {category.hazards.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{category.hazards.length - 3} {t.fsvpSupplier.moreHazards}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
