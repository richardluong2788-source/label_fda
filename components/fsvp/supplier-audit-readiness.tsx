'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  ClipboardCheck, 
  CheckCircle2, 
  Circle,
  AlertTriangle,
  Calendar,
  Clock,
  FileText,
  Users,
  Building2,
  Shield,
  Beaker,
  Utensils,
  Bug,
  Sparkles,
  Package,
  Truck,
  Info
} from 'lucide-react'
import type { ChecklistItem, AuditReadinessChecklist } from '@/lib/fsvp-supplier-types'
import { useTranslation } from '@/lib/i18n'

// Audit Readiness Checklist Items
const CHECKLIST_CATEGORIES = [
  {
    id: 'pre-audit',
    name: 'Pre-Audit Preparation',
    icon: Calendar,
    items: [
      { id: 'pa-1', description: 'Confirm audit date and time with auditor', priority: 'critical', regulation_reference: '' },
      { id: 'pa-2', description: 'Prepare meeting room for opening/closing meetings', priority: 'high', regulation_reference: '' },
      { id: 'pa-3', description: 'Brief all staff on audit procedures', priority: 'high', regulation_reference: '' },
      { id: 'pa-4', description: 'Assign audit guide/escort', priority: 'medium', regulation_reference: '' },
      { id: 'pa-5', description: 'Prepare PPE for auditors (hairnets, coats, boots)', priority: 'medium', regulation_reference: '' },
    ],
  },
  {
    id: 'documentation',
    name: 'Documentation Review',
    icon: FileText,
    items: [
      { id: 'doc-1', description: 'Food Safety Plan available and current', priority: 'critical', regulation_reference: '21 CFR 117.126' },
      { id: 'doc-2', description: 'HACCP plan documented and validated', priority: 'critical', regulation_reference: '21 CFR 120.8' },
      { id: 'doc-3', description: 'Hazard analysis completed for all products', priority: 'critical', regulation_reference: '21 CFR 1.504' },
      { id: 'doc-4', description: 'Preventive control procedures documented', priority: 'critical', regulation_reference: '21 CFR 117.135' },
      { id: 'doc-5', description: 'All certifications current and accessible', priority: 'high', regulation_reference: '' },
      { id: 'doc-6', description: 'Training records up to date', priority: 'high', regulation_reference: '21 CFR 117.4' },
      { id: 'doc-7', description: 'Supplier approval records available', priority: 'high', regulation_reference: '21 CFR 1.505' },
      { id: 'doc-8', description: 'Corrective action records complete', priority: 'high', regulation_reference: '21 CFR 117.150' },
    ],
  },
  {
    id: 'personnel',
    name: 'Personnel & Training',
    icon: Users,
    items: [
      { id: 'per-1', description: 'PCQI designated and qualifications documented', priority: 'critical', regulation_reference: '21 CFR 117.180' },
      { id: 'per-2', description: 'GMP training records available for all employees', priority: 'high', regulation_reference: '21 CFR 117.4' },
      { id: 'per-3', description: 'HACCP training records for relevant staff', priority: 'high', regulation_reference: '' },
      { id: 'per-4', description: 'Allergen awareness training documented', priority: 'high', regulation_reference: '21 CFR 117.135(c)(2)' },
      { id: 'per-5', description: 'Personal hygiene training records', priority: 'medium', regulation_reference: '21 CFR 117.10' },
    ],
  },
  {
    id: 'facility',
    name: 'Facility & Equipment',
    icon: Building2,
    items: [
      { id: 'fac-1', description: 'Facility clean and in good repair', priority: 'high', regulation_reference: '21 CFR 117.20' },
      { id: 'fac-2', description: 'Equipment calibration records current', priority: 'high', regulation_reference: '' },
      { id: 'fac-3', description: 'Pest control program documentation available', priority: 'high', regulation_reference: '21 CFR 117.35' },
      { id: 'fac-4', description: 'Maintenance logs up to date', priority: 'medium', regulation_reference: '' },
      { id: 'fac-5', description: 'Water quality testing records available', priority: 'medium', regulation_reference: '21 CFR 117.37' },
    ],
  },
  {
    id: 'sanitation',
    name: 'Sanitation & Hygiene',
    icon: Sparkles,
    items: [
      { id: 'san-1', description: 'Master sanitation schedule documented', priority: 'high', regulation_reference: '21 CFR 117.135(c)(3)' },
      { id: 'san-2', description: 'Pre-operational inspection records available', priority: 'high', regulation_reference: '' },
      { id: 'san-3', description: 'Cleaning validation records complete', priority: 'high', regulation_reference: '' },
      { id: 'san-4', description: 'Environmental monitoring program documented', priority: 'medium', regulation_reference: '' },
      { id: 'san-5', description: 'Chemical control and storage verified', priority: 'medium', regulation_reference: '21 CFR 117.80' },
    ],
  },
  {
    id: 'allergen',
    name: 'Allergen Control',
    icon: AlertTriangle,
    items: [
      { id: 'all-1', description: 'Allergen control program documented', priority: 'critical', regulation_reference: '21 CFR 117.135(c)(2)' },
      { id: 'all-2', description: 'Allergen segregation verified in storage', priority: 'high', regulation_reference: '' },
      { id: 'all-3', description: 'Production scheduling prevents cross-contact', priority: 'high', regulation_reference: '' },
      { id: 'all-4', description: 'Allergen cleaning procedures validated', priority: 'high', regulation_reference: '' },
      { id: 'all-5', description: 'Label review procedures documented', priority: 'high', regulation_reference: '21 CFR 101.22' },
    ],
  },
  {
    id: 'process',
    name: 'Process Controls',
    icon: Beaker,
    items: [
      { id: 'pro-1', description: 'CCP monitoring records complete and current', priority: 'critical', regulation_reference: '21 CFR 117.145' },
      { id: 'pro-2', description: 'Deviation and corrective action records', priority: 'critical', regulation_reference: '21 CFR 117.150' },
      { id: 'pro-3', description: 'Process validation records available', priority: 'high', regulation_reference: '21 CFR 117.160' },
      { id: 'pro-4', description: 'Temperature monitoring calibrated', priority: 'high', regulation_reference: '' },
      { id: 'pro-5', description: 'Metal detection/X-ray verification logs', priority: 'medium', regulation_reference: '' },
    ],
  },
  {
    id: 'traceability',
    name: 'Traceability & Recall',
    icon: Package,
    items: [
      { id: 'tra-1', description: 'Lot coding system documented', priority: 'high', regulation_reference: '' },
      { id: 'tra-2', description: 'Traceability exercise records (mock recall)', priority: 'high', regulation_reference: '' },
      { id: 'tra-3', description: 'Recall plan documented and tested', priority: 'high', regulation_reference: '21 CFR 117.139' },
      { id: 'tra-4', description: 'Raw material traceability verified', priority: 'high', regulation_reference: '' },
      { id: 'tra-5', description: 'Finished product traceability verified', priority: 'high', regulation_reference: '' },
    ],
  },
]

export function SupplierAuditReadiness() {
  const { t } = useTranslation()
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({})
  const [targetAuditDate, setTargetAuditDate] = useState<string>('2026-03-15')
  
  const toggleItem = (itemId: string) => {
    setCompletedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId],
    }))
  }
  
  const getTotalItems = () => {
    return CHECKLIST_CATEGORIES.reduce((acc, cat) => acc + cat.items.length, 0)
  }
  
  const getCompletedCount = () => {
    return Object.values(completedItems).filter(Boolean).length
  }
  
  const getCategoryProgress = (categoryId: string) => {
    const category = CHECKLIST_CATEGORIES.find(c => c.id === categoryId)
    if (!category) return { completed: 0, total: 0, percentage: 0 }
    
    const completed = category.items.filter(item => completedItems[item.id]).length
    const total = category.items.length
    return {
      completed,
      total,
      percentage: total > 0 ? (completed / total) * 100 : 0,
    }
  }
  
  const getCriticalIncomplete = () => {
    return CHECKLIST_CATEGORIES.flatMap(cat => 
      cat.items.filter(item => item.priority === 'critical' && !completedItems[item.id])
    )
  }
  
  const overallProgress = getTotalItems() > 0 
    ? (getCompletedCount() / getTotalItems()) * 100 
    : 0
  
  const criticalIncomplete = getCriticalIncomplete()
  
  const getReadinessStatus = () => {
    if (criticalIncomplete.length > 0) {
      return { status: 'Not Ready', color: 'text-red-600', bgColor: 'bg-red-100' }
    }
    if (overallProgress >= 90) {
      return { status: 'Ready', color: 'text-green-600', bgColor: 'bg-green-100' }
    }
    if (overallProgress >= 70) {
      return { status: 'Almost Ready', color: 'text-amber-600', bgColor: 'bg-amber-100' }
    }
    return { status: 'Needs Work', color: 'text-orange-600', bgColor: 'bg-orange-100' }
  }
  
  const readinessStatus = getReadinessStatus()
  
  const getDaysUntilAudit = () => {
    const auditDate = new Date(targetAuditDate)
    const today = new Date()
    const diffTime = auditDate.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }
  
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>
      case 'high':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-700">High</Badge>
      case 'medium':
        return <Badge variant="outline">Medium</Badge>
      default:
        return <Badge variant="outline">Low</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
<ClipboardCheck className="h-6 w-6" />
{t.fsvpSupplier.auditReadinessTitle}
</h2>
          <p className="text-muted-foreground">
            {t.fsvpSupplier.auditReadinessDesc}
          </p>
        </div>
      </div>
      
      {/* Readiness Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${readinessStatus.bgColor} mb-4`}>
                <span className={`text-2xl font-bold ${readinessStatus.color}`}>
                  {Math.round(overallProgress)}%
                </span>
              </div>
              <h3 className={`text-lg font-semibold ${readinessStatus.color}`}>
                {readinessStatus.status}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {getCompletedCount()} / {getTotalItems()} {t.fsvpSupplier.complete}
              </p>
              <Progress value={overallProgress} className="mt-4" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 mb-4 mx-auto">
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold">{t.fsvpSupplier.scheduledDate}</h3>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {new Date(targetAuditDate).toLocaleDateString()}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {getDaysUntilAudit()} {t.fsvpSupplier.daysRemaining}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card className={criticalIncomplete.length > 0 ? 'border-red-200' : ''}>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className={`flex items-center justify-center w-20 h-20 rounded-full ${criticalIncomplete.length > 0 ? 'bg-red-100' : 'bg-green-100'} mb-4 mx-auto`}>
                {criticalIncomplete.length > 0 ? (
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                ) : (
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                )}
              </div>
              <h3 className="text-lg font-semibold">{t.fsvpSupplier.priorityHigh}</h3>
              {criticalIncomplete.length > 0 ? (
                <>
                  <p className="text-2xl font-bold text-red-600 mt-1">
                    {criticalIncomplete.length} incomplete
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Must be completed before audit
                  </p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    All complete
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Critical items addressed
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Critical Items Alert */}
      {criticalIncomplete.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Critical Items Incomplete</AlertTitle>
          <AlertDescription>
            <p className="mb-2">
              The following critical items must be completed before your audit:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              {criticalIncomplete.slice(0, 5).map(item => (
                <li key={item.id} className="text-sm">{item.description}</li>
              ))}
              {criticalIncomplete.length > 5 && (
                <li className="text-sm">...and {criticalIncomplete.length - 5} more</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>{t.fsvpSupplier.auditReadinessTitle}</CardTitle>
          <CardDescription>
            {t.fsvpSupplier.auditReadinessDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="space-y-2">
            {CHECKLIST_CATEGORIES.map((category) => {
              const progress = getCategoryProgress(category.id)
              const Icon = category.icon
              
              return (
                <AccordionItem key={category.id} value={category.id} className="border rounded-lg">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-primary" />
                        <span className="font-semibold">{category.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          {progress.completed}/{progress.total}
                        </span>
                        <div className="w-20">
                          <Progress value={progress.percentage} className="h-2" />
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-2">
                      {category.items.map((item) => (
                        <div
                          key={item.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border ${
                            completedItems[item.id] ? 'bg-green-50 border-green-200' : 'bg-muted/50'
                          }`}
                        >
                          <Checkbox
                            id={item.id}
                            checked={completedItems[item.id] || false}
                            onCheckedChange={() => toggleItem(item.id)}
                            className="mt-0.5"
                          />
                          <div className="flex-1">
                            <label
                              htmlFor={item.id}
                              className={`text-sm font-medium cursor-pointer ${
                                completedItems[item.id] ? 'line-through text-muted-foreground' : ''
                              }`}
                            >
                              {item.description}
                            </label>
                            {item.regulation_reference && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Ref: {item.regulation_reference}
                              </p>
                            )}
                          </div>
                          {getPriorityBadge(item.priority)}
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </CardContent>
      </Card>
      
      {/* Info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Audit Tip</AlertTitle>
        <AlertDescription>
          Conduct a mock internal audit 2-4 weeks before the scheduled audit date.
          This helps identify any last-minute gaps and ensures your team is prepared for auditor questions.
        </AlertDescription>
      </Alert>
    </div>
  )
}
