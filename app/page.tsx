'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  FileText, Shield, CheckCircle, ArrowRight, AlertTriangle,
  TrendingUp, Clock, DollarSign, BookOpen, Award, Users, Target,
  ScanLine, Database, FlaskConical, Cpu, ChevronRight, Star,
  Package, Microscope, Pill, Sparkles, RefreshCw, Lock,
  Truck, Ban, UserCheck,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { LandingHeader } from '@/components/landing-header'
import { useTranslation } from '@/lib/i18n'
import type { LucideIcon } from 'lucide-react'

// ─── Static styling data ────────────────────────────────────────────────────

const INDUSTRY_STYLES = [
  { icon: Package, color: 'bg-blue-50 border-blue-200 text-blue-700', iconColor: 'text-blue-600' },
  { icon: Sparkles, color: 'bg-purple-50 border-purple-200 text-purple-700', iconColor: 'text-purple-600' },
  { icon: Pill, color: 'bg-green-50 border-green-200 text-green-700', iconColor: 'text-green-600' },
  { icon: Microscope, color: 'bg-orange-50 border-orange-200 text-orange-700', iconColor: 'text-orange-600' },
]

const SEVERITY_COLORS: Record<string, string> = {
  'Class I': 'bg-red-100 text-red-700',
  'Class II': 'bg-amber-100 text-amber-700',
  'Class III': 'bg-blue-100 text-blue-700',
}

const FLOW_ICONS: LucideIcon[] = [ScanLine, Database, Cpu, FlaskConical, FileText]

const PERSONA_ICONS: LucideIcon[] = [Truck, Ban, UserCheck, RefreshCw]

const PORT_STEP_STYLES = [
  { color: 'border-l-blue-500', badge: 'text-blue-700' },
  { color: 'border-l-amber-500', badge: 'text-amber-700' },
  { color: 'border-l-red-500', badge: 'text-red-700' },
  { color: 'border-l-green-500', badge: 'text-green-700' },
]

// ─── Component ──────────────────────────────────────────────────────────────

export default function Page() {
  const { t } = useTranslation()
  const l = t.landing

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingHeader />

      <main className="max-w-6xl mx-auto px-4">

        {/* ── HERO ── */}
        <section className="py-20 text-center">
          <Badge variant="destructive" className="mb-6 gap-1.5">
            <AlertTriangle className="h-3 w-3" />
            {l.heroBadge}
          </Badge>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-balance leading-tight">
            {l.heroTitle}<br />
            <span className="text-primary">{l.heroTitleHighlight}</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-10 text-pretty max-w-3xl mx-auto leading-relaxed">
            <strong className="text-foreground">{l.heroDesc1}</strong>
            {l.heroDesc2}
            <strong className="text-foreground">{l.heroDesc3}</strong>
            {l.heroDesc4}
            <strong className="text-foreground">{l.heroDesc5}</strong>
            {l.heroDesc6}
            <strong className="text-foreground">{l.heroDesc7}</strong>
            {l.heroDesc8}
          </p>

          <div className="flex flex-wrap gap-4 justify-center mb-12">
            <Button size="lg" asChild>
              <Link href="/auth/sign-up">
                <Shield className="mr-2 h-5 w-5" />
                {l.ctaCheckLabel}
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/knowledge">
                <BookOpen className="mr-2 h-5 w-5" />
                {l.ctaViewCases}
              </Link>
            </Button>
          </div>

          {/* Trust bar */}
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8 text-sm border rounded-2xl bg-muted/30 px-6 md:px-8 py-5">
            {l.trustStats.map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-bold text-primary">{s.num}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── PERSONAS ── */}
        <section className="py-16">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-3">{l.personasBadge}</Badge>
            <h2 className="text-3xl font-bold mb-3 text-balance">{l.personasTitle}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">{l.personasDesc}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {l.personas.map((p, i) => {
              const Icon = PERSONA_ICONS[i]
              return (
                <Card key={i} className="p-6 flex gap-4 items-start">
                  <div className="p-3 rounded-xl bg-primary/10 shrink-0">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-base">{p.situation}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{p.pain}</p>
                    <p className="text-sm font-medium text-primary flex items-start gap-1.5">
                      <ArrowRight className="h-4 w-4 mt-0.5 shrink-0" />
                      {p.solution}
                    </p>
                  </div>
                </Card>
              )
            })}
          </div>
        </section>

        {/* ── INDUSTRIES ── */}
        <section className="py-16">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-3">{l.industriesBadge}</Badge>
            <h2 className="text-3xl font-bold mb-3 text-balance">{l.industriesTitle}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">{l.industriesDesc}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {l.industries.map((ind, i) => {
              const style = INDUSTRY_STYLES[i]
              const Icon = style.icon
              return (
                <Card key={i} className={`p-5 border-2 ${style.color} bg-opacity-50`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-white/70">
                      <Icon className={`h-5 w-5 ${style.iconColor}`} />
                    </div>
                    <h3 className="font-bold">{ind.label}</h3>
                  </div>
                  <div className="text-xs font-mono font-semibold mb-2 opacity-80">{ind.regs}</div>
                  <p className="text-xs leading-relaxed mb-3 opacity-90">{ind.detail}</p>
                  <Badge variant="outline" className="text-xs border-current opacity-70">{ind.count}</Badge>
                </Card>
              )
            })}
          </div>
        </section>

        {/* ── RECALL DATABASE ── */}
        <section className="py-16">
          <Card className="p-6 md:p-8 border-2 border-red-200 bg-gradient-to-br from-red-50 to-orange-50">
            <div className="flex items-start gap-4 mb-8">
              <div className="p-3 bg-red-600 rounded-xl shrink-0">
                <Database className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">{l.recallDbTitle}</h2>
                <p className="text-muted-foreground">{l.recallDbDesc}</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border bg-white mb-6">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 border-b">
                  <tr>
                    <th className="text-left p-3 font-semibold text-muted-foreground">{l.recallTableHeaders.date}</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground">{l.recallTableHeaders.product}</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground">{l.recallTableHeaders.violation}</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground">{l.recallTableHeaders.cfr}</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground">{l.recallTableHeaders.severity}</th>
                  </tr>
                </thead>
                <tbody>
                  {l.recallExamples.map((r, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-muted/20'}>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">{r.date}</td>
                      <td className="p-3">
                        <div className="font-medium">{r.product}</div>
                        <div className="text-xs text-muted-foreground">{r.company}</div>
                      </td>
                      <td className="p-3 text-sm max-w-xs">{r.reason}</td>
                      <td className="p-3 font-mono text-xs text-primary">{r.cfr}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${SEVERITY_COLORS[r.severity] || ''}`}>
                          {r.severity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border p-4 text-center">
                <div className="text-2xl font-bold text-red-600 mb-1">{l.classI.title}</div>
                <div className="text-sm font-medium mb-1">{l.classI.subtitle}</div>
                <p className="text-xs text-muted-foreground">{l.classI.desc}</p>
              </div>
              <div className="bg-white rounded-xl border p-4 text-center">
                <div className="text-2xl font-bold text-amber-600 mb-1">{l.classII.title}</div>
                <div className="text-sm font-medium mb-1">{l.classII.subtitle}</div>
                <p className="text-xs text-muted-foreground">{l.classII.desc}</p>
              </div>
              <div className="bg-white rounded-xl border p-4 text-center">
                <div className="text-2xl font-bold text-blue-600 mb-1">{l.classIII.title}</div>
                <div className="text-sm font-medium mb-1">{l.classIII.subtitle}</div>
                <p className="text-xs text-muted-foreground">{l.classIII.desc}</p>
              </div>
            </div>
          </Card>
        </section>

        {/* ── FLOW STEPS ── */}
        <section className="py-16">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-3">{l.flowBadge}</Badge>
            <h2 className="text-3xl font-bold mb-3 text-balance">{l.flowTitle}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">{l.flowDesc}</p>
          </div>

          <div className="relative">
            <div className="hidden lg:block absolute top-8 left-[10%] right-[10%] h-0.5 bg-border z-0" />
            <div className="grid lg:grid-cols-5 gap-6 relative z-10">
              {l.flowSteps.map((s, i) => {
                const Icon = FLOW_ICONS[i]
                const step = String(i + 1).padStart(2, '0')
                return (
                  <div key={i} className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-md">
                      <Icon className="h-7 w-7 text-primary-foreground" />
                    </div>
                    <div className="text-xs font-bold text-primary mb-1">{t.common.step} {step}</div>
                    <h3 className="font-bold mb-2">{s.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-2">{s.desc}</p>
                    <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">{s.detail}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Sample result card */}
          <Card className="mt-12 p-6 border-2 border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2 mb-4">
              <Cpu className="h-5 w-5 text-primary" />
              <h3 className="font-bold">{l.sampleResultTitle}</h3>
              <Badge variant="secondary" className="ml-auto">{l.sampleResultBadge}</Badge>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-red-700 mb-0.5">{l.sampleCritical} - 21 CFR 101.4(b)(2)</div>
                    <p className="text-sm text-red-800">{l.sampleViolation1}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-amber-700 mb-0.5">{l.sampleImportant} - 21 CFR 101.9(c)(7)</div>
                    <p className="text-sm text-amber-800">{l.sampleViolation2}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-amber-700 mb-0.5">{l.sampleImportant} - 21 CFR 101.105(a)</div>
                    <p className="text-sm text-amber-800">{l.sampleViolation3}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-green-700 mb-0.5">{l.samplePass} - 21 CFR 101.2(b)</div>
                    <p className="text-sm text-green-800">{l.samplePass1}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4 pt-4 border-t">
              <div className="text-sm"><span className="text-muted-foreground">{l.sampleRiskScore}</span> <strong className="text-red-600 text-lg">7,8/10</strong></div>
              <div className="text-sm"><span className="text-muted-foreground">{l.sampleCriticalCount}</span> <strong className="text-red-600">1</strong></div>
              <div className="text-sm"><span className="text-muted-foreground">{l.sampleImportantCount}</span> <strong className="text-amber-600">2</strong></div>
              <div className="text-sm"><span className="text-muted-foreground">{l.sampleMinorCount}</span> <strong className="text-blue-600">1</strong></div>
              <div className="ml-auto">
                <Badge variant="destructive">{l.sampleNeedFix}</Badge>
              </div>
            </div>
          </Card>
        </section>

        {/* ── WHY TRUST ── */}
        <section className="py-16">
          <Card className="p-6 md:p-8 border-2 border-primary/20">
            <div className="flex items-start gap-4 mb-8">
              <div className="p-3 bg-primary rounded-xl shrink-0">
                <Target className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">{l.whyTrustTitle}</h2>
                <p className="text-muted-foreground">{l.whyTrustDesc}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                {l.whyTrustItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold mb-0.5">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                  <p className="font-semibold text-amber-900 mb-3">{l.commonViolations}</p>
                  <div className="space-y-2 text-sm text-amber-800">
                    {l.commonViolationRows.map((row) => (
                      <div key={row.vio} className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs border-amber-400 text-amber-700 shrink-0">{row.cat}</Badge>
                        <span className="flex-1">{row.vio}</span>
                        <span className="font-bold shrink-0">{row.pct}</span>
                        <span className="text-xs opacity-60 shrink-0">{row.cnt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-muted/40 rounded-xl p-5 flex items-start gap-3">
                  <RefreshCw className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold mb-1">{l.dbUpdated}</p>
                    <p className="text-sm text-muted-foreground">{l.dbUpdatedDesc}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* ── PORT PROCESS ── */}
        <section className="py-16">
          <Card className="p-6 md:p-8 border-2 border-red-200 bg-gradient-to-br from-red-50 to-orange-50">
            <div className="flex items-start gap-4 mb-8">
              <div className="p-3 bg-red-600 rounded-xl shrink-0">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">{l.portProcessTitle}</h2>
                <p className="text-muted-foreground">{l.portProcessDesc}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-4 mb-8">
              {l.portSteps.map((s, i) => {
                const style = PORT_STEP_STYLES[i]
                return (
                  <div key={i} className={`bg-white p-4 rounded-xl border-l-4 ${style.color}`}>
                    <div className={`text-xs font-bold mb-1 ${style.badge}`}>{t.common.step} {i + 1}</div>
                    <h4 className="font-bold mb-2 text-sm">{s.title}</h4>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                )
              })}
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <Card className="p-5 border-l-4 border-l-red-500 bg-white">
                <div className="flex items-center gap-2 mb-2"><DollarSign className="h-5 w-5 text-red-600" /><h5 className="font-bold text-sm">{l.detentionCost}</h5></div>
                <div className="text-2xl font-bold text-red-600 mb-1">{l.detentionCostValue}</div>
                <p className="text-xs text-muted-foreground">{l.detentionCostDesc}</p>
              </Card>
              <Card className="p-5 border-l-4 border-l-orange-500 bg-white">
                <div className="flex items-center gap-2 mb-2"><Clock className="h-5 w-5 text-orange-600" /><h5 className="font-bold text-sm">{l.delayTime}</h5></div>
                <div className="text-2xl font-bold text-orange-600 mb-1">{l.delayTimeValue}</div>
                <p className="text-xs text-muted-foreground">{l.delayTimeDesc}</p>
              </Card>
              <Card className="p-5 border-l-4 border-l-red-500 bg-white">
                <div className="flex items-center gap-2 mb-2"><AlertTriangle className="h-5 w-5 text-red-600" /><h5 className="font-bold text-sm">{l.reputationDamage}</h5></div>
                <div className="text-2xl font-bold text-red-600 mb-1">{l.reputationDamageValue}</div>
                <p className="text-xs text-muted-foreground">{l.reputationDamageDesc}</p>
              </Card>
            </div>

            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 text-center">
              <h3 className="text-lg md:text-xl font-bold text-green-900 mb-2 text-balance">{l.checkBeforeShip}</h3>
              <p className="text-green-800 mb-4">{l.checkBeforeShipDesc('499.000d')}</p>
              <Button size="lg" className="bg-green-600 hover:bg-green-700" asChild>
                <Link href="/auth/sign-up">
                  {l.checkFreeNow}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </Card>
        </section>

        {/* ── COMPARISON TABLE ── */}
        <section className="py-16">
          <Card className="p-6 md:p-8">
            <div className="flex items-start gap-4 mb-8">
              <div className="p-3 bg-green-600 rounded-xl shrink-0">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">{l.vsTraditionalTitle}</h2>
                <p className="text-muted-foreground">{l.vsTraditionalDesc}</p>
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-semibold">{l.vsHeaders.criteria}</th>
                    <th className="text-left p-3 font-semibold text-primary">{l.vsHeaders.vexim}</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground">{l.vsHeaders.traditional}</th>
                  </tr>
                </thead>
                <tbody>
                  {l.vsRows.map(([crit, vexim, trad], i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-muted/20'}>
                      <td className="p-3 font-medium">{crit}</td>
                      <td className="p-3 text-primary font-medium">{vexim}</td>
                      <td className="p-3 text-muted-foreground">{trad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        {/* ── TESTIMONIALS ── */}
        <section className="py-16">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-3">{l.testimonialsBadge}</Badge>
            <h2 className="text-3xl font-bold mb-3 text-balance">{l.testimonialsTitle}</h2>
            <p className="text-muted-foreground">{l.testimonialsDesc}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {l.testimonials.map((tm, i) => (
              <Card key={i} className="p-6 flex flex-col gap-4">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">{`"${tm.quote}"`}</p>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm">{tm.name}</div>
                    <div className="text-xs text-muted-foreground">{tm.title}</div>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">{tm.result}</Badge>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* ── WHAT YOU GET ── */}
        <section className="py-16">
          <Card className="p-6 md:p-8 border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
            <div className="flex items-start gap-4 mb-8">
              <div className="p-3 bg-blue-600 rounded-xl shrink-0">
                <Award className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">{l.whatYouGetTitle}</h2>
                <p className="text-muted-foreground">{l.whatYouGetDesc}</p>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              {l.whatYouGetCols.map((col) => (
                <div key={col.title} className="bg-white p-5 rounded-xl border">
                  <div className="text-xl font-bold text-primary mb-3">{col.title}</div>
                  <ul className="space-y-2">
                    {col.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="bg-white border border-blue-300 rounded-xl p-5 flex items-start gap-3">
              <Users className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-blue-900 mb-1">{l.commitment}</p>
                <p className="text-sm text-blue-800">{l.commitmentQuote}</p>
              </div>
            </div>
          </Card>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="py-16">
          <Card className="p-8 md:p-12 bg-primary text-primary-foreground text-center">
            <Lock className="h-10 w-10 mx-auto mb-4 opacity-80" />
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-balance">{l.finalCtaTitle}</h2>
            <p className="text-base md:text-lg mb-8 opacity-90 text-pretty max-w-2xl mx-auto">{l.finalCtaDesc}</p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/auth/sign-up">
                  <Shield className="mr-2 h-5 w-5" />
                  {l.finalCtaButton}
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="bg-white/10 border-white/30 hover:bg-white/20 text-primary-foreground" asChild>
                <Link href="/pricing">
                  {l.finalCtaPricing}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Card>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className="border-t bg-muted/30 mt-8">
        <div className="container mx-auto px-4 py-10 max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Image src="/images/logo.png" alt="Vexim logo" width={32} height={32} className="rounded-lg" />
                <span className="font-bold">{l.footerCompany}</span>
              </div>
              <p className="text-sm text-muted-foreground">{l.footerDescFull}</p>
            </div>
            <div>
              <h4 className="font-bold mb-3">{l.footerProduct}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/analyze" className="hover:text-foreground transition-colors">{l.footerAnalyze}</Link></li>
                <li><Link href="/pricing" className="hover:text-foreground transition-colors">{l.footerPricing}</Link></li>
                <li><Link href="/knowledge" className="hover:text-foreground transition-colors">{l.footerKnowledge}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-3">{l.footerLegal}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground transition-colors">{l.footerAbout}</Link></li>
                <li><Link href="/contact" className="hover:text-foreground transition-colors">{l.footerContact}</Link></li>
                <li><Link href="/terms" className="hover:text-foreground transition-colors">{l.footerTerms}</Link></li>
                <li><Link href="/privacy" className="hover:text-foreground transition-colors">{l.footerPrivacy}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-3">{l.footerSupportLabel}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Email: support@veximglobal.com</li>
                <li>Hotline: +84 344 591 641</li>
              </ul>
            </div>
          </div>
          <div className="text-center text-sm text-muted-foreground border-t pt-6">
            &copy; 2026 {l.footerCompany}. {l.footerRights}
          </div>
        </div>
      </footer>
    </div>
  )
}
