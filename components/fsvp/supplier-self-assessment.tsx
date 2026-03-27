'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  ClipboardCheck, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Info,
  Download,
  Save,
  RefreshCw,
  ChevronRight,
  FileText,
  Shield,
  Building2,
  Users,
  Beaker,
  Calendar,
  Clock
} from 'lucide-react'
import type { AssessmentSection, AssessmentQuestion, SupplierSelfAssessment } from '@/lib/fsvp-supplier-types'
import { useTranslation } from '@/lib/i18n'

// Self-Assessment Sections based on FSVP requirements
const ASSESSMENT_SECTIONS: AssessmentSection[] = [
  {
    id: 'company-info',
    section_name: 'Company Information & Registration',
    section_description: 'Basic company information and FDA registration status',
    section_score: 0,
    max_score: 20,
    compliance_status: 'not_applicable',
    questions: [
      {
        id: 'q1-1',
        question_text: 'Does the company have a valid FDA Establishment Identifier (FEI)?',
        question_type: 'yes_no',
        regulation_reference: '21 CFR 1.225',
        required: true,
        weight: 5,
        evidence_required: true,
      },
      {
        id: 'q1-2',
        question_text: 'Is the FDA facility registration current and up-to-date?',
        question_type: 'yes_no',
        regulation_reference: '21 CFR 1.225',
        required: true,
        weight: 5,
        evidence_required: true,
      },
      {
        id: 'q1-3',
        question_text: 'Does the company have a valid D-U-N-S number?',
        question_type: 'yes_no',
        required: false,
        weight: 5,
        evidence_required: false,
      },
      {
        id: 'q1-4',
        question_text: 'Is company contact information current and accurate?',
        question_type: 'yes_no',
        required: true,
        weight: 5,
        evidence_required: false,
      },
    ],
  },
  {
    id: 'food-safety-system',
    section_name: 'Food Safety Management System',
    section_description: 'HACCP, FSMS, and preventive controls evaluation',
    section_score: 0,
    max_score: 35,
    compliance_status: 'not_applicable',
    questions: [
      {
        id: 'q2-1',
        question_text: 'Does the facility have a documented HACCP plan?',
        question_type: 'yes_no',
        regulation_reference: '21 CFR 117/120/123',
        required: true,
        weight: 10,
        evidence_required: true,
      },
      {
        id: 'q2-2',
        question_text: 'Is the HACCP plan validated and verified?',
        question_type: 'yes_no',
        regulation_reference: '21 CFR 117.150',
        required: true,
        weight: 5,
        evidence_required: true,
      },
      {
        id: 'q2-3',
        question_text: 'Are Critical Control Points (CCPs) properly identified and monitored?',
        question_type: 'yes_no',
        regulation_reference: '21 CFR 117.135',
        required: true,
        weight: 5,
        evidence_required: true,
      },
      {
        id: 'q2-4',
        question_text: 'Does the facility have a certified food safety management system (FSSC 22000, SQF, BRC, etc.)?',
        question_type: 'yes_no',
        required: false,
        weight: 10,
        evidence_required: true,
      },
      {
        id: 'q2-5',
        question_text: 'Is there a designated Preventive Controls Qualified Individual (PCQI)?',
        question_type: 'yes_no',
        regulation_reference: '21 CFR 117.180',
        required: true,
        weight: 5,
        evidence_required: true,
      },
    ],
  },
  {
    id: 'hazard-analysis',
    section_name: 'Hazard Analysis',
    section_description: 'Identification and control of hazards per 21 CFR 1.504',
    section_score: 0,
    max_score: 25,
    compliance_status: 'not_applicable',
    questions: [
      {
        id: 'q3-1',
        question_text: 'Has a hazard analysis been conducted for each product?',
        question_type: 'yes_no',
        regulation_reference: '21 CFR 1.504',
        required: true,
        weight: 10,
        evidence_required: true,
      },
      {
        id: 'q3-2',
        question_text: 'Are biological hazards identified and controlled?',
        question_type: 'yes_no',
        regulation_reference: '21 CFR 1.504',
        required: true,
        weight: 5,
        evidence_required: true,
      },
      {
        id: 'q3-3',
        question_text: 'Are chemical hazards identified and controlled?',
        question_type: 'yes_no',
        regulation_reference: '21 CFR 1.504',
        required: true,
        weight: 5,
        evidence_required: true,
      },
      {
        id: 'q3-4',
        question_text: 'Are physical hazards identified and controlled?',
        question_type: 'yes_no',
        regulation_reference: '21 CFR 1.504',
        required: true,
        weight: 5,
        evidence_required: false,
      },
    ],
  },
  {
    id: 'allergen-control',
    section_name: 'Allergen Control Program',
    section_description: 'Allergen management and labeling compliance',
    section_score: 0,
    max_score: 20,
    compliance_status: 'not_applicable',
    questions: [
      {
        id: 'q4-1',
        question_text: 'Does the facility have a written allergen control program?',
        question_type: 'yes_no',
        regulation_reference: '21 CFR 117.135(c)(2)',
        required: true,
        weight: 5,
        evidence_required: true,
      },
      {
        id: 'q4-2',
        question_text: 'Are allergens properly segregated during storage and production?',
        question_type: 'yes_no',
        required: true,
        weight: 5,
        evidence_required: false,
      },
      {
        id: 'q4-3',
        question_text: 'Are production lines properly cleaned between allergen changeovers?',
        question_type: 'yes_no',
        required: true,
        weight: 5,
        evidence_required: true,
      },
      {
        id: 'q4-4',
        question_text: 'Is allergen labeling compliant with US requirements (FALCPA)?',
        question_type: 'yes_no',
        regulation_reference: 'FALCPA, 21 CFR 101.22',
        required: true,
        weight: 5,
        evidence_required: true,
      },
    ],
  },
  {
    id: 'documentation',
    section_name: 'Documentation & Recordkeeping',
    section_description: 'Records maintenance per 21 CFR 1.510 requirements',
    section_score: 0,
    max_score: 20,
    compliance_status: 'not_applicable',
    questions: [
      {
        id: 'q5-1',
        question_text: 'Are all food safety records maintained and readily accessible?',
        question_type: 'yes_no',
        regulation_reference: '21 CFR 1.510',
        required: true,
        weight: 5,
        evidence_required: true,
      },
      {
        id: 'q5-2',
        question_text: 'Can records be retrieved within 24 hours upon request?',
        question_type: 'yes_no',
        regulation_reference: '21 CFR 1.510(b)(3)',
        required: true,
        weight: 5,
        evidence_required: false,
      },
      {
        id: 'q5-3',
        question_text: 'Are Certificates of Analysis (COA) maintained for raw materials?',
        question_type: 'yes_no',
        required: true,
        weight: 5,
        evidence_required: true,
      },
      {
        id: 'q5-4',
        question_text: 'Are supplier verification records maintained?',
        question_type: 'yes_no',
        regulation_reference: '21 CFR 1.510',
        required: true,
        weight: 5,
        evidence_required: true,
      },
    ],
  },
  {
    id: 'sanitation',
    section_name: 'Sanitation & GMP',
    section_description: 'Good Manufacturing Practices and sanitation programs',
    section_score: 0,
    max_score: 20,
    compliance_status: 'not_applicable',
    questions: [
      {
        id: 'q6-1',
        question_text: 'Does the facility have a documented sanitation program?',
        question_type: 'yes_no',
        regulation_reference: '21 CFR 117.135(c)(3)',
        required: true,
        weight: 5,
        evidence_required: true,
      },
      {
        id: 'q6-2',
        question_text: 'Is environmental monitoring conducted for pathogens?',
        question_type: 'yes_no',
        required: false,
        weight: 5,
        evidence_required: true,
      },
      {
        id: 'q6-3',
        question_text: 'Are employee hygiene practices documented and enforced?',
        question_type: 'yes_no',
        regulation_reference: '21 CFR 117.10',
        required: true,
        weight: 5,
        evidence_required: false,
      },
      {
        id: 'q6-4',
        question_text: 'Is there a pest control program in place?',
        question_type: 'yes_no',
        regulation_reference: '21 CFR 117.35',
        required: true,
        weight: 5,
        evidence_required: true,
      },
    ],
  },
]

export function SupplierSelfAssessmentTool() {
  const { t } = useTranslation()
  const [sections, setSections] = useState<AssessmentSection[]>(ASSESSMENT_SECTIONS)
  const [answers, setAnswers] = useState<Record<string, boolean | string | number>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const handleAnswerChange = (questionId: string, value: boolean) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }
  
  const handleNoteChange = (questionId: string, note: string) => {
    setNotes(prev => ({ ...prev, [questionId]: note }))
  }
  
  const calculateSectionScore = (section: AssessmentSection) => {
    let score = 0
    let maxScore = 0
    
    section.questions.forEach(q => {
      maxScore += q.weight
      if (answers[q.id] === true) {
        score += q.weight
      }
    })
    
    return { score, maxScore, percentage: maxScore > 0 ? (score / maxScore) * 100 : 0 }
  }
  
  const calculateOverallScore = () => {
    let totalScore = 0
    let totalMaxScore = 0
    
    sections.forEach(section => {
      const { score, maxScore } = calculateSectionScore(section)
      totalScore += score
      totalMaxScore += maxScore
    })
    
    return totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0
  }
  
  const getAnsweredCount = (section: AssessmentSection) => {
    return section.questions.filter(q => answers[q.id] !== undefined).length
  }
  
  const getTotalAnswered = () => {
    return Object.keys(answers).length
  }
  
  const getTotalQuestions = () => {
    return sections.reduce((acc, section) => acc + section.questions.length, 0)
  }
  
  const getComplianceStatus = (percentage: number) => {
    if (percentage >= 90) return { status: 'Compliant', color: 'text-green-600', bg: 'bg-green-100' }
    if (percentage >= 70) return { status: 'Partially Compliant', color: 'text-amber-600', bg: 'bg-amber-100' }
    if (percentage >= 50) return { status: 'Needs Improvement', color: 'text-orange-600', bg: 'bg-orange-100' }
    return { status: 'Non-Compliant', color: 'text-red-600', bg: 'bg-red-100' }
  }
  
  const overallScore = calculateOverallScore()
  const overallStatus = getComplianceStatus(overallScore)
  
  // Clear all answers
  const handleClear = () => {
    if (confirm('Are you sure you want to clear all answers? This action cannot be undone.')) {
      setAnswers({})
      setNotes({})
    }
  }
  
  // Export assessment as text report
  const handleExport = () => {
    const report = `
FSVP SUPPLIER SELF-ASSESSMENT REPORT
=====================================
Generated: ${new Date().toLocaleString()}

OVERALL COMPLIANCE SCORE: ${overallScore}%
STATUS: ${overallStatus.status}
Questions Answered: ${getTotalAnswered()} of ${getTotalQuestions()}

SECTION BREAKDOWN
-----------------
${sections.map(section => {
  const sectionScore = calculateSectionScore(section)
  return `
${section.section_name}
  Score: ${Math.round(sectionScore.percentage)}%
  Answered: ${getAnsweredCount(section)}/${section.questions.length}
  
${section.questions.map((q, i) => {
  const answer = answers[q.id]
  const note = notes[q.id]
  return `  Q${i + 1}: ${q.question_text}
     Answer: ${answer === true ? 'YES' : answer === false ? 'NO' : 'Not answered'}
     ${q.regulation_reference ? `Reference: ${q.regulation_reference}` : ''}
     ${note ? `Notes: ${note}` : ''}`
}).join('\n')}
`
}).join('\n')}

GAP ANALYSIS
------------
${Object.entries(answers)
  .filter(([_, value]) => value === false)
  .map(([qId]) => {
    const question = sections.flatMap(s => s.questions).find(q => q.id === qId)
    return question ? `- ${question.question_text}${notes[qId] ? `\n  Corrective Action: ${notes[qId]}` : ''}` : ''
  })
  .join('\n')}

--- End of Report ---
    `.trim()
    
    const blob = new Blob([report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `FSVP_Self_Assessment_${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  
  // Save assessment to localStorage (or could be API)
  const handleSave = async () => {
    setIsSubmitting(true)
    try {
      // Save to localStorage for persistence
      const assessmentData = {
        answers,
        notes,
        overallScore,
        status: overallStatus.status,
        savedAt: new Date().toISOString()
      }
      localStorage.setItem('fsvp_self_assessment', JSON.stringify(assessmentData))
      alert('Assessment saved successfully!')
    } catch (error) {
      console.error('Failed to save assessment:', error)
      alert('Failed to save assessment. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Load saved assessment on mount
  const loadSavedAssessment = () => {
    try {
      const saved = localStorage.getItem('fsvp_self_assessment')
      if (saved) {
        const data = JSON.parse(saved)
        setAnswers(data.answers || {})
        setNotes(data.notes || {})
      }
    } catch (error) {
      console.error('Failed to load saved assessment:', error)
    }
  }
  
  // Load on component mount
  useEffect(() => {
    loadSavedAssessment()
  }, [])
  
  const getSectionIcon = (sectionId: string) => {
    switch (sectionId) {
      case 'company-info':
        return <Building2 className="h-5 w-5" />
      case 'food-safety-system':
        return <Shield className="h-5 w-5" />
      case 'hazard-analysis':
        return <Beaker className="h-5 w-5" />
      case 'allergen-control':
        return <AlertTriangle className="h-5 w-5" />
      case 'documentation':
        return <FileText className="h-5 w-5" />
      case 'sanitation':
        return <CheckCircle2 className="h-5 w-5" />
      default:
        return <ClipboardCheck className="h-5 w-5" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
<ClipboardCheck className="h-6 w-6" />
{t.fsvpSupplier.selfAssessmentTitle}
</h2>
          <p className="text-muted-foreground">
            {t.fsvpSupplier.selfAssessmentDesc}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleClear}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t.fsvpSupplier.clear}
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            {t.fsvpSupplier.export}
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Saving...' : t.fsvpSupplier.save}
          </Button>
        </div>
      </div>
      
      {/* Overall Score Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">{t.fsvpSupplier.complianceScore}</h3>
              <p className="text-sm text-muted-foreground">
                Based on {getTotalAnswered()} of {getTotalQuestions()} questions answered
              </p>
            </div>
            <div className="text-right">
              <p className={`text-4xl font-bold ${overallStatus.color}`}>{overallScore}%</p>
              <Badge className={`${overallStatus.bg} ${overallStatus.color}`}>
                {overallStatus.status}
              </Badge>
            </div>
          </div>
          <Progress value={overallScore} className="h-3" />
        </CardContent>
      </Card>
      
      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>{t.fsvpSupplier.aboutSelfAssessment}</AlertTitle>
        <AlertDescription>
          {t.fsvpSupplier.aboutSelfAssessmentDesc}
        </AlertDescription>
      </Alert>
      
      {/* Assessment Sections */}
      <Accordion type="multiple" className="space-y-4">
        {sections.map((section) => {
          const sectionScore = calculateSectionScore(section)
          const sectionStatus = getComplianceStatus(sectionScore.percentage)
          const answered = getAnsweredCount(section)
          
          return (
            <AccordionItem key={section.id} value={section.id} className="border rounded-lg">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    {getSectionIcon(section.id)}
                    <div className="text-left">
                      <p className="font-semibold">{section.section_name}</p>
                      <p className="text-sm text-muted-foreground">{section.section_description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`font-semibold ${sectionStatus.color}`}>
                        {Math.round(sectionScore.percentage)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {answered}/{section.questions.length} {t.fsvpSupplier.answered}
                      </p>
                    </div>
                    <div className="w-24">
                      <Progress value={sectionScore.percentage} className="h-2" />
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4 pt-2">
                  {section.questions.map((question, index) => (
                    <div key={question.id} className="p-4 bg-muted/50 rounded-lg space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground">
                              Q{index + 1}
                            </span>
                            {question.required && (
                              <Badge variant="outline" className="text-xs">{t.fsvpSupplier.required}</Badge>
                            )}
                            {question.evidence_required && (
                              <Badge variant="secondary" className="text-xs">{t.fsvpSupplier.evidenceRequired}</Badge>
                            )}
                          </div>
                          <p className="font-medium mt-1">{question.question_text}</p>
                          {question.regulation_reference && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {t.fsvpSupplier.reference}: {question.regulation_reference}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant={answers[question.id] === true ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => handleAnswerChange(question.id, true)}
                              className={answers[question.id] === true ? 'bg-green-600 hover:bg-green-700' : ''}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Yes
                            </Button>
                            <Button
                              variant={answers[question.id] === false ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => handleAnswerChange(question.id, false)}
                              className={answers[question.id] === false ? 'bg-red-600 hover:bg-red-700' : ''}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              No
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {answers[question.id] === false && (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            Add notes or describe your corrective action plan:
                          </p>
                          <Textarea
                            placeholder="Describe the gap and planned corrective actions..."
                            value={notes[question.id] || ''}
                            onChange={(e) => handleNoteChange(question.id, e.target.value)}
                            rows={2}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
      
      {/* Gap Summary */}
      {Object.values(answers).some(a => a === false) && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader>
            <CardTitle className="text-amber-700 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Identified Gaps
            </CardTitle>
            <CardDescription>
              The following areas require attention before your next audit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sections.map(section => {
                const gaps = section.questions.filter(q => answers[q.id] === false)
                if (gaps.length === 0) return null
                
                return (
                  <div key={section.id} className="space-y-2">
                    <h4 className="font-medium text-amber-700">{section.section_name}</h4>
                    {gaps.map(gap => (
                      <div key={gap.id} className="pl-4 py-2 border-l-2 border-amber-400">
                        <p className="text-sm">{gap.question_text}</p>
                        {notes[gap.id] && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Note: {notes[gap.id]}
                          </p>
                        )}
                        {gap.regulation_reference && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            {gap.regulation_reference}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full">
              Generate Corrective Action Plan
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
