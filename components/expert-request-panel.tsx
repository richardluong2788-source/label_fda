'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useTranslation } from '@/lib/i18n'
import {
  MessageCircle,
  CheckCircle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  User,
  FileText,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  CreditCard,
  Crown,
} from 'lucide-react'

interface ExpertRequestPanelProps {
  reportId: string
  productName?: string
  productCategory?: string
  overallResult?: string
  needsExpertReview?: boolean
  planName?: string
  expertReviewsIncluded?: boolean
  expertReviewPrice?: number
}

type RequestStatus = 'idle' | 'pending' | 'in_review' | 'completed' | 'cancelled'

interface ExpertRequest {
  id: string
  status: RequestStatus
  created_at: string
  expert_summary?: string
  violation_reviews?: Array<{
    violation_index: number
    confirmed: boolean
    wording_fix?: string
    legal_note?: string
  }>
  recommended_actions?: Array<{
    action: string
    priority: string
    cfr_reference?: string
  }>
  sign_off_name?: string
  sign_off_at?: string
}

export function ExpertRequestPanel({
  reportId,
  productName,
  productCategory,
  overallResult,
  needsExpertReview,
  planName = 'Free Trial',
  expertReviewsIncluded = false,
  expertReviewPrice: expertReviewPriceProp,
}: ExpertRequestPanelProps) {
  const { t, locale } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [existingRequest, setExistingRequest] = useState<ExpertRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [userContext, setUserContext] = useState('')
  const [targetMarket, setTargetMarket] = useState('US')
  const [error, setError] = useState<string | null>(null)
  const [expertReviewPrice, setExpertReviewPrice] = useState<number>(expertReviewPriceProp ?? 499000)
  const [quotaInfo, setQuotaInfo] = useState<{ canRequest: boolean; used: number; limit: number } | null>(null)
  const [processingAddon, setProcessingAddon] = useState(false)

  useEffect(() => {
    if (needsExpertReview) setExpanded(true)
  }, [needsExpertReview])

  // Fetch quota info to determine if user has access
  useEffect(() => {
    const fetchQuota = async () => {
      try {
        const res = await fetch('/api/expert-request/quota')
        const data = await res.json()
        if (data.can_request !== undefined) {
          setQuotaInfo({
            canRequest: data.can_request,
            used: data.reviews_used ?? 0,
            limit: data.reviews_limit ?? 0,
          })
        }
      } catch {
        // If can't fetch quota, assume no access
        setQuotaInfo({ canRequest: false, used: 0, limit: 0 })
      }
    }
    fetchQuota()
  }, [])

  useEffect(() => {
    if (expertReviewPriceProp !== undefined) return
    const fetchPrice = async () => {
      try {
        const res = await fetch('/api/expert-request/price')
        const data = await res.json()
        if (typeof data.expert_review_price_vnd === 'number') {
          setExpertReviewPrice(data.expert_review_price_vnd)
        }
      } catch {
        // keep default
      }
    }
    fetchPrice()
  }, [expertReviewPriceProp])

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        const res = await fetch(`/api/expert-request?reportId=${reportId}`)
        const data = await res.json()
        if (data.request) setExistingRequest(data.request)
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    fetchRequest()
  }, [reportId])

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/expert-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          userContext: userContext.trim() || null,
          targetMarket,
          productCategory,
        }),
      })

      const data = await res.json()

      if (res.status === 409) {
        const refresh = await fetch(`/api/expert-request?reportId=${reportId}`)
        const refreshData = await refresh.json()
        if (refreshData.request) setExistingRequest(refreshData.request)
        return
      }

      if (res.status === 402) {
        setError(
          data.reason === 'no_active_subscription'
            ? t.expert.errorNoSubscription
            : t.expert.errorQuotaExhausted(data.reviews_used, data.reviews_limit)
        )
        return
      }

      if (!res.ok) throw new Error(data.error || t.expert.errorSubmitFailed)

      setExistingRequest(data.request)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Handle addon purchase checkout
  const handleAddonCheckout = async () => {
    setProcessingAddon(true)
    setError(null)
    try {
      const res = await fetch('/api/expert-request/addon-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditReportId: reportId,
          targetMarket,
          userContext: userContext.trim() || '',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || data.error || t.expert.errorSubmitFailed)
      }

      // Redirect to VNPay
      if (data.payUrl) {
        window.location.href = data.payUrl
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setProcessingAddon(false)
    }
  }

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    pending:   { label: t.expert.statusPending,   color: 'bg-amber-100 text-amber-700 border-amber-200',  icon: Clock },
    in_review: { label: t.expert.statusInReview,   color: 'bg-blue-100 text-blue-700 border-blue-200',     icon: Loader2 },
    completed: { label: t.expert.statusCompleted,  color: 'bg-green-100 text-green-700 border-green-200',  icon: CheckCircle },
    cancelled: { label: t.expert.statusCancelled,  color: 'bg-muted text-muted-foreground border-border',  icon: AlertTriangle },
  }

  if (loading) return null

  // Existing request — show status
  if (existingRequest) {
    const cfg = statusConfig[existingRequest.status] ?? statusConfig.pending
    const StatusIcon = cfg.icon

    return (
      <Card className="border-2 border-primary/20">
        <div
          className="flex items-center justify-between p-5 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">{t.expert.title}</p>
              <p className="text-xs text-muted-foreground">
                {t.expert.requestSentAt(new Date(existingRequest.created_at).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US'))}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`text-xs border ${cfg.color}`}>
              <StatusIcon className={`mr-1 h-3 w-3 ${existingRequest.status === 'in_review' ? 'animate-spin' : ''}`} />
              {cfg.label}
            </Badge>
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>

        {/* Expert review results */}
        {expanded && existingRequest.status === 'completed' && (
          <div className="px-5 pb-5 space-y-4 border-t pt-4">
            {existingRequest.expert_summary && (
              <div>
                <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {t.expert.expertSummaryTitle}
                </p>
                <div className="bg-primary/5 rounded-lg p-4 text-sm leading-relaxed">
                  {existingRequest.expert_summary}
                </div>
              </div>
            )}

            {existingRequest.violation_reviews && existingRequest.violation_reviews.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  {t.expert.violationFixTitle}
                </p>
                <div className="space-y-3">
                  {existingRequest.violation_reviews.map((vr, i) => (
                    <div key={i} className={`rounded-lg p-3 text-sm border ${vr.confirmed ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {vr.confirmed
                          ? <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                          : <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        }
                        <span className="font-medium">
                          {t.expert.violationIndex(vr.violation_index + 1)} — {vr.confirmed ? t.expert.violationConfirmed : t.expert.violationNotSerious}
                        </span>
                      </div>
                      {vr.wording_fix && (
                        <div className="mt-2">
                          <span className="text-xs text-muted-foreground">{t.expert.suggestedWording}</span>
                          <p className="mt-1 font-medium text-foreground bg-white rounded px-2 py-1 border">
                            {vr.wording_fix}
                          </p>
                        </div>
                      )}
                      {vr.legal_note && (
                        <p className="mt-2 text-xs text-muted-foreground italic">{vr.legal_note}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {existingRequest.recommended_actions && existingRequest.recommended_actions.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  {t.expert.priorityActionsTitle}
                </p>
                <div className="space-y-2">
                  {existingRequest.recommended_actions.map((ra, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <Badge variant="outline" className={`shrink-0 text-xs ${ra.priority === 'high' ? 'border-red-300 text-red-700' : ra.priority === 'medium' ? 'border-amber-300 text-amber-700' : 'border-border'}`}>
                        {ra.priority === 'high' ? t.expert.priorityHigh : ra.priority === 'medium' ? t.expert.priorityMedium : t.expert.priorityLow}
                      </Badge>
                      <span>{ra.action}</span>
                      {ra.cfr_reference && <span className="text-xs text-muted-foreground ml-auto shrink-0">({ra.cfr_reference})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {existingRequest.sign_off_name && (
              <div className="border-t pt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span>{t.expert.signedBy} <span className="font-medium text-foreground">{existingRequest.sign_off_name}</span></span>
                <span>{'•'}</span>
                <span>{new Date(existingRequest.sign_off_at!).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')}</span>
              </div>
            )}
          </div>
        )}

        {expanded && existingRequest.status === 'pending' && (
          <div className="px-5 pb-5 border-t pt-4">
            <p className="text-sm text-muted-foreground">
              {t.expert.pendingMessage(48)}
            </p>
          </div>
        )}

        {expanded && existingRequest.status === 'in_review' && (
          <div className="px-5 pb-5 border-t pt-4">
            <p className="text-sm text-muted-foreground">
              {t.expert.inReviewMessage}
            </p>
          </div>
        )}
      </Card>
    )
  }

  // No request yet — show submission form
  const isHighRisk = overallResult === 'fail' || needsExpertReview

  return (
    <Card className={`border-2 ${isHighRisk ? 'border-amber-300' : 'border-slate-200'}`}>
      <div className={`p-4 rounded-t-lg ${isHighRisk ? 'bg-amber-50 border-b border-amber-200' : 'bg-slate-50 border-b border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <div className={`rounded-full p-2.5 ${isHighRisk ? 'bg-amber-100' : 'bg-blue-100'}`}>
            <MessageCircle className={`h-5 w-5 ${isHighRisk ? 'text-amber-600' : 'text-blue-600'}`} />
          </div>
          <div className="flex-1">
            <p className={`font-bold text-base ${isHighRisk ? 'text-amber-800' : 'text-slate-800'}`}>
              {t.expert.questionBannerHighRisk}
            </p>
            <p className="text-sm text-slate-600 mt-0.5">
              {isHighRisk ? t.expert.questionBannerHighRiskDesc : t.expert.questionBannerNormalDesc}
            </p>
          </div>
        </div>
      </div>
      
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div>
            <p className="font-semibold text-sm text-slate-700">{t.expert.title}</p>
            <p className="text-xs text-muted-foreground">
              {t.expert.subtitle}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Show "Free in plan" badge for Pro/Business users with quota */}
          {expertReviewsIncluded && (
            <Badge className="text-xs bg-primary text-primary-foreground">{t.expert.freeInPlan}</Badge>
          )}
          {/* Show quota remaining for Pro users */}
          {expertReviewsIncluded && quotaInfo && quotaInfo.limit > 0 && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {quotaInfo.limit - quotaInfo.used}/{quotaInfo.limit} {t.expert.creditsRemaining || 'remaining'}
            </Badge>
          )}
          {/* Show upgrade prompt for Free/Starter users (no quota) */}
          {!expertReviewsIncluded && (
            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50">
              {t.expert.upgradeRequired || 'Pro/Business required'}
            </Badge>
          )}
          {needsExpertReview && (
            <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200 border">{t.expert.recommended}</Badge>
          )}
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 border-t pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {t.expert.serviceItems.map((item) => (
              <div key={item} className="flex items-center gap-1.5 text-muted-foreground">
                <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                {item}
              </div>
            ))}
          </div>

          <div>
            <Label className="text-xs mb-1 block">{t.expert.targetMarketLabel}</Label>
            <select
              value={targetMarket}
              onChange={(e) => setTargetMarket(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm bg-background"
            >
              <option value="US">{t.expert.marketUS}</option>
              <option value="EU">{t.expert.marketEU}</option>
              <option value="CA">{t.expert.marketCA}</option>
              <option value="AU">{t.expert.marketAU}</option>
            </select>
          </div>

          <div>
            <Label className="text-xs mb-1 block">
              {t.expert.additionalInfo} <span className="text-muted-foreground">{t.expert.additionalInfoOptional}</span>
            </Label>
            <Textarea
              placeholder={t.expert.additionalInfoPlaceholder}
              value={userContext}
              onChange={(e) => setUserContext(e.target.value)}
              rows={3}
              className="text-sm"
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
              {(error.includes(t.expert.viewPricing) || error.includes('subscription') || error.includes('gói')) && (
                <a href="/pricing?highlight=business#subscription-plans" className="ml-auto shrink-0 underline font-medium">
                  {t.expert.viewPricing}
                </a>
              )}
            </div>
          )}

          {/* Show addon purchase + upgrade CTA for Starter/Free users */}
          {!expertReviewsIncluded ? (
            <div className="space-y-3">
              {/* Option A: Buy single addon — chỉ hiện cho Starter, ẩn với Free */}
              {planName && !planName.toLowerCase().includes('free') && (
                <Button
                  onClick={handleAddonCheckout}
                  disabled={processingAddon}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                >
                  {processingAddon ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="mr-2 h-4 w-4" />
                  )}
                  {processingAddon
                    ? t.expert.processingPayment || 'Processing...'
                    : t.expert.buyAddon
                      ? t.expert.buyAddon(expertReviewPrice.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US'))
                      : `Mua 1 lần tư vấn - ${expertReviewPrice.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')}₫`
                  }
                </Button>
              )}

              {/* Option B: Upgrade to Pro/Business */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm font-medium text-amber-800 mb-2">
                  {t.expert.upgradeToAccess || 'Upgrade to access Expert Consultation'}
                </p>
                <p className="text-xs text-amber-700 mb-3">
                  {t.expert.proUpgradeNote}
                </p>
                <Button
                  asChild
                  variant="outline"
                  className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                >
                  <a href="/pricing?highlight=business#subscription-plans">
                    <Crown className="mr-2 h-4 w-4" />
                    {t.expert.upgradeToPro || 'Upgrade to Pro/Business'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <>
            {/* Pro users with quota exhausted - show 2 options */}
            {quotaInfo && !quotaInfo.canRequest && quotaInfo.limit > 0 ? (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-800 font-medium mb-1">
                    {t.expert.quotaExhaustedTitle || 'Monthly quota exhausted'}
                  </p>
                  <p className="text-xs text-amber-700">
                    {t.expert.quotaExhaustedDesc || `You have used all ${quotaInfo.limit} Expert Review credits this month.`}
                  </p>
                </div>
                
                {/* Option A: Buy addon */}
                <Button
                  onClick={handleAddonCheckout}
                  disabled={processingAddon}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                >
                  {processingAddon ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="mr-2 h-4 w-4" />
                  )}
                  {processingAddon 
                    ? t.expert.processingPayment || 'Processing...'
                    : t.expert.buyAddon 
                      ? t.expert.buyAddon(expertReviewPrice.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US'))
                      : `Buy 1 review - ${expertReviewPrice.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')}₫`
                  }
                </Button>
                
                {/* Option B: Upgrade to Enterprise */}
                <Button
                  asChild
                  variant="outline"
                  className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                >
                  <a href="/pricing?highlight=enterprise#subscription-plans">
                    <Crown className="mr-2 h-4 w-4" />
                    {t.expert.upgradeToEnterprise || 'Upgrade to Enterprise - Unlimited'}
                  </a>
                </Button>
              </div>
            ) : (
              /* Pro users with quota available */
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full"
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <MessageCircle className="mr-2 h-4 w-4" />
                )}
                {submitting
                  ? t.expert.submitting
                  : t.expert.submitFreeInPlan}
              </Button>
            )}
            </>
          )}
        </div>
      )}
    </Card>
  )
}
