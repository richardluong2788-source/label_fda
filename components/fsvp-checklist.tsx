'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Info, 
  ChevronDown, 
  ExternalLink,
  Shield,
  FileCheck,
  UserCheck,
  ClipboardCheck,
  Building2,
  AlertCircle,
  Calendar
} from 'lucide-react'
import { 
  validateDUNS, 
  FSVP_REQUIREMENTS, 
  assessSAHCODHARisk,
  SAHCODHA_CATEGORIES
} from '@/lib/fsvp-validator'
import type { FSVPRequirement, FSVPImporterProfile } from '@/lib/types'

interface FSVPChecklistProps {
  importerProfile?: FSVPImporterProfile
  productCategory?: string
  productName?: string
  countryOfOrigin?: string
  onProfileUpdate?: (profile: Partial<FSVPImporterProfile>) => void
  readOnly?: boolean
}

interface ChecklistItemStatus {
  id: string
  completed: boolean
  hasIssue: boolean
  issueMessage?: string
}

export function FSVPChecklist({
  importerProfile,
  productCategory,
  productName,
  countryOfOrigin,
  onProfileUpdate,
  readOnly = false
}: FSVPChecklistProps) {
  const [dunsInput, setDunsInput] = useState(importerProfile?.importer_duns || '')
  const [dunsError, setDunsError] = useState<string | null>(null)
  const [dunsValid, setDunsValid] = useState(false)
  const [qiName, setQiName] = useState(importerProfile?.fsvp_qualified_individual || '')
  const [qiTitle, setQiTitle] = useState(importerProfile?.fsvp_qi_title || '')
  const [expandedSections, setExpandedSections] = useState<string[]>(['requirements'])
  
  // Calculate SAHCODHA risk if product info provided
  const sahcodhaRisk = productCategory 
    ? assessSAHCODHARisk(productCategory, productName || '', '', countryOfOrigin)
    : null
  
  // Validate DUNS on input change
  useEffect(() => {
    if (!dunsInput) {
      setDunsError(null)
      setDunsValid(false)
      return
    }
    
    const result = validateDUNS(dunsInput)
    if (result.valid) {
      setDunsError(null)
      setDunsValid(true)
      if (result.formatted) {
        // Don't auto-format while typing, only show formatted version
      }
    } else {
      setDunsError(result.error || 'Invalid DUNS')
      setDunsValid(false)
    }
  }, [dunsInput])
  
  // Calculate checklist status
  const getChecklistStatus = (): ChecklistItemStatus[] => {
    return FSVP_REQUIREMENTS.map(req => {
      let completed = false
      let hasIssue = false
      let issueMessage: string | undefined
      
      switch (req.id) {
        case 'duns_registration':
          completed = dunsValid
          hasIssue = !!dunsInput && !dunsValid
          issueMessage = dunsError || undefined
          break
        case 'qi':
          completed = !!qiName
          hasIssue = !qiName
          issueMessage = !qiName ? 'Qualified Individual must be designated' : undefined
          break
        case 'hazard_analysis':
          // This would be checked against actual hazard analysis records
          completed = false
          hasIssue = true
          issueMessage = 'Hazard analysis documentation required'
          break
        case 'supplier_evaluation':
          completed = false
          hasIssue = true
          issueMessage = 'Supplier evaluation records required'
          break
        case 'verification_activities':
          completed = false
          hasIssue = true
          issueMessage = 'Verification activities must be documented'
          break
        case 'corrective_actions':
          // Optional unless issues identified
          completed = true
          break
        case 'recordkeeping':
          // Check if dossier export capability exists
          completed = true
          break
      }
      
      return { id: req.id, completed, hasIssue, issueMessage }
    })
  }
  
  const checklistStatus = getChecklistStatus()
  const completedCount = checklistStatus.filter(s => s.completed).length
  const completionPercentage = (completedCount / FSVP_REQUIREMENTS.length) * 100
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }
  
  const handleSave = () => {
    if (onProfileUpdate) {
      onProfileUpdate({
        importer_duns: dunsInput,
        fsvp_qualified_individual: qiName,
        fsvp_qi_title: qiTitle
      })
    }
  }
  
  const getStatusIcon = (status: ChecklistItemStatus) => {
    if (status.completed) {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />
    }
    if (status.hasIssue) {
      return <XCircle className="h-5 w-5 text-red-500" />
    }
    return <AlertTriangle className="h-5 w-5 text-yellow-500" />
  }
  
  const getRequirementIcon = (reqId: string) => {
    switch (reqId) {
      case 'duns_registration':
        return <Building2 className="h-4 w-4" />
      case 'qi':
        return <UserCheck className="h-4 w-4" />
      case 'hazard_analysis':
        return <AlertCircle className="h-4 w-4" />
      case 'supplier_evaluation':
        return <ClipboardCheck className="h-4 w-4" />
      case 'verification_activities':
        return <FileCheck className="h-4 w-4" />
      case 'corrective_actions':
        return <Shield className="h-4 w-4" />
      case 'recordkeeping':
        return <Calendar className="h-4 w-4" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">FSVP Compliance Checklist</CardTitle>
          </div>
          <Badge variant={completionPercentage === 100 ? 'default' : 'secondary'}>
            {completedCount}/{FSVP_REQUIREMENTS.length} Complete
          </Badge>
        </div>
        <CardDescription>
          Foreign Supplier Verification Program requirements per 21 CFR Part 1, Subpart L
        </CardDescription>
        <Progress value={completionPercentage} className="mt-2" />
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* SAHCODHA Risk Alert */}
        {sahcodhaRisk?.isHighRisk && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>SAHCODHA Risk Identified</AlertTitle>
            <AlertDescription>
              <p className="mb-2">{sahcodhaRisk.rationale}</p>
              <p className="text-sm font-medium">Identified hazards: {sahcodhaRisk.hazards.join(', ')}</p>
              <p className="text-sm mt-1">Annual onsite audit of foreign supplier is required per 21 CFR 1.506(d)(1).</p>
            </AlertDescription>
          </Alert>
        )}
        
        {/* DUNS Number Section */}
        <Collapsible 
          open={expandedSections.includes('duns')}
          onOpenChange={() => toggleSection('duns')}
        >
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-3 bg-background rounded-lg border cursor-pointer hover:bg-accent/50">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">DUNS Number Registration</p>
                  <p className="text-sm text-muted-foreground">21 CFR 1.512 - Required for customs declaration</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {dunsValid ? (
                  <Badge variant="default" className="bg-green-500">Verified</Badge>
                ) : dunsInput ? (
                  <Badge variant="destructive">Invalid</Badge>
                ) : (
                  <Badge variant="outline">Required</Badge>
                )}
                <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.includes('duns') ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 px-3">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="duns">DUNS Number (9 digits)</Label>
                <div className="flex gap-2">
                  <Input
                    id="duns"
                    placeholder="12-345-6789"
                    value={dunsInput}
                    onChange={(e) => setDunsInput(e.target.value)}
                    disabled={readOnly}
                    className={dunsError ? 'border-red-500' : dunsValid ? 'border-green-500' : ''}
                  />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" asChild>
                          <a href="https://www.dnb.com/duns.html" target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Get a DUNS number at dnb.com</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {dunsError && (
                  <p className="text-sm text-red-500">{dunsError}</p>
                )}
                {dunsValid && (
                  <p className="text-sm text-green-600">Valid DUNS format</p>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                The DUNS number is required when declaring the FSV (Foreign Supplier Verification) role in customs entry filings.
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>
        
        {/* Qualified Individual Section */}
        <Collapsible 
          open={expandedSections.includes('qi')}
          onOpenChange={() => toggleSection('qi')}
        >
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-3 bg-background rounded-lg border cursor-pointer hover:bg-accent/50">
              <div className="flex items-center gap-3">
                <UserCheck className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">Qualified Individual</p>
                  <p className="text-sm text-muted-foreground">21 CFR 1.502 - Technical food safety expert</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {qiName ? (
                  <Badge variant="default" className="bg-green-500">Designated</Badge>
                ) : (
                  <Badge variant="outline">Required</Badge>
                )}
                <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.includes('qi') ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 px-3">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="qi-name">Qualified Individual Name</Label>
                  <Input
                    id="qi-name"
                    placeholder="Full name"
                    value={qiName}
                    onChange={(e) => setQiName(e.target.value)}
                    disabled={readOnly}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qi-title">Title/Position</Label>
                  <Input
                    id="qi-title"
                    placeholder="e.g., Food Safety Director"
                    value={qiTitle}
                    onChange={(e) => setQiTitle(e.target.value)}
                    disabled={readOnly}
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                The Qualified Individual must have education, training, or experience in food safety to perform FSVP activities.
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>
        
        {/* Requirements Checklist */}
        <Collapsible 
          open={expandedSections.includes('requirements')}
          onOpenChange={() => toggleSection('requirements')}
        >
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-3 bg-background rounded-lg border cursor-pointer hover:bg-accent/50">
              <div className="flex items-center gap-3">
                <ClipboardCheck className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">FSVP Requirements</p>
                  <p className="text-sm text-muted-foreground">21 CFR 1.500-1.514</p>
                </div>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.includes('requirements') ? 'rotate-180' : ''}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <div className="space-y-2">
              {FSVP_REQUIREMENTS.map((req) => {
                const status = checklistStatus.find(s => s.id === req.id)
                return (
                  <div 
                    key={req.id}
                    className="flex items-start gap-3 p-3 bg-background rounded-lg border"
                  >
                    <div className="mt-0.5">
                      {status && getStatusIcon(status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {getRequirementIcon(req.id)}
                        <span className="font-medium">{req.title}</span>
                        <Badge variant="outline" className="text-xs">{req.cfrSection}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{req.description}</p>
                      {status?.hasIssue && status.issueMessage && (
                        <p className="text-sm text-red-500 mt-1">{status.issueMessage}</p>
                      )}
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Info className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-xs">
                          <p>Verification method: {req.verificationMethod}</p>
                          <p className="mt-1">{req.isMandatory ? 'Mandatory requirement' : 'Conditional requirement'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
        
        {/* SAHCODHA Categories Reference */}
        <Collapsible 
          open={expandedSections.includes('sahcodha')}
          onOpenChange={() => toggleSection('sahcodha')}
        >
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-3 bg-background rounded-lg border cursor-pointer hover:bg-accent/50">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="font-medium">SAHCODHA Categories</p>
                  <p className="text-sm text-muted-foreground">Products requiring annual onsite audit</p>
                </div>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.includes('sahcodha') ? 'rotate-180' : ''}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(SAHCODHA_CATEGORIES).slice(0, 8).map(([category, config]) => (
                <div key={category} className="p-2 bg-orange-50 rounded border border-orange-200">
                  <p className="font-medium capitalize text-sm">{category.replace('_', ' ')}</p>
                  <p className="text-xs text-muted-foreground">{config.cfrReference}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              SAHCODHA (Serious Adverse Health Consequences or Death) products require annual onsite audits of foreign suppliers per 21 CFR 1.506(d)(1).
            </p>
          </CollapsibleContent>
        </Collapsible>
        
        {/* Save Button */}
        {!readOnly && onProfileUpdate && (
          <div className="flex justify-end pt-4">
            <Button onClick={handleSave}>
              Save FSVP Profile
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
