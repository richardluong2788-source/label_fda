'use client'

import {
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  BarChart2,
  FlaskConical,
  FileText,
  Lightbulb,
  ChevronRight,
  Star,
  X,
  Camera,
  ZoomIn,
  Layers,
  Settings2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/lib/i18n'

const IMAGE_TYPE_META = [
  {
    id: 'pdp',
    icon: ImageIcon,
    badgeVariant: 'destructive' as const,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    id: 'nutrition',
    icon: BarChart2,
    badgeVariant: 'destructive' as const,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  {
    id: 'ingredients',
    icon: FlaskConical,
    badgeVariant: 'secondary' as const,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  {
    id: 'other',
    icon: FileText,
    badgeVariant: 'outline' as const,
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
  },
]

const ADVANCED_TIP_ICONS = [Settings2, ZoomIn, Layers, Camera]

export default function GuidePage() {
  const { t } = useTranslation()
  const g = t.guide

  return (
    <main className="min-h-screen bg-background font-sans">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
              Dashboard
            </Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{g.breadcrumb}</span>
          </div>
          <Link href="/dashboard">
            <Button variant="outline" size="sm">{g.backToDashboard}</Button>
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-16">

        {/* Hero */}
        <div className="text-center space-y-4">
          <Badge variant="secondary" className="text-xs px-3 py-1">{g.badge}</Badge>
          <h1 className="text-4xl font-bold tracking-tight text-balance">{g.heroTitle}</h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto text-pretty">
            {g.heroDesc}
          </p>
        </div>

        {/* How it works */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-1">{g.howItWorksTitle}</h2>
            <p className="text-muted-foreground">{g.howItWorksDesc}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {g.steps.map((item) => (
              <Card key={item.step} className="p-6 space-y-3">
                <div className="text-3xl font-bold text-primary/20">{item.step}</div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Image type guide */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-1">{g.imageTypesTitle}</h2>
            <p className="text-muted-foreground">{g.imageTypesDesc}</p>
          </div>

          <div className="space-y-6">
            {g.imageTypes.map((type, idx) => {
              const meta = IMAGE_TYPE_META[idx]
              const Icon = meta.icon
              return (
                <Card key={type.id} id={type.id} className={`border-2 ${meta.borderColor} overflow-hidden scroll-mt-8`}>
                  <div className={`${meta.bgColor} px-6 py-4 flex items-start gap-4`}>
                    <div className="rounded-lg bg-background p-2 shadow-sm">
                      <Icon className={`h-6 w-6 ${meta.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-lg">{type.label}</h3>
                        <span className="text-sm text-muted-foreground">— {type.subtitle}</span>
                        <Badge variant={meta.badgeVariant}>{type.badge}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
                    </div>
                  </div>

                  <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold flex items-center gap-1.5 text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        {g.mustHaveLabel}
                      </p>
                      <ul className="space-y-1.5">
                        {type.mustHave.map((item, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex gap-2">
                            <span className="text-emerald-500 mt-0.5 shrink-0">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold flex items-center gap-1.5 text-destructive">
                        <X className="h-4 w-4" />
                        {g.avoidLabel}
                      </p>
                      <ul className="space-y-1.5">
                        {type.avoid.map((item, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex gap-2">
                            <span className="text-destructive mt-0.5 shrink-0">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className={`${meta.bgColor} border-t ${meta.borderColor} px-6 py-3 flex gap-2`}>
                    <Lightbulb className={`h-4 w-4 mt-0.5 shrink-0 ${meta.color}`} />
                    <p className="text-sm text-muted-foreground">{type.tip}</p>
                  </div>
                </Card>
              )
            })}
          </div>
        </section>

        {/* Do & Don't */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-1">{g.qualityTitle}</h2>
            <p className="text-muted-foreground">{g.qualityDesc}</p>
          </div>
          <Card className="overflow-hidden">
            <div className="grid grid-cols-2 border-b">
              <div className="px-5 py-3 bg-emerald-50 flex items-center gap-2 border-r">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-700">{g.doLabel}</span>
              </div>
              <div className="px-5 py-3 bg-red-50 flex items-center gap-2">
                <X className="h-4 w-4 text-destructive" />
                <span className="text-sm font-semibold text-destructive">{g.dontLabel}</span>
              </div>
            </div>
            {g.doDont.map((row, i) => (
              <div key={i} className={`grid grid-cols-2 ${i < g.doDont.length - 1 ? 'border-b' : ''}`}>
                <div className="px-5 py-4 flex gap-2.5 border-r">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-foreground">{row.good}</span>
                </div>
                <div className="px-5 py-4 flex gap-2.5">
                  <X className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">{row.bad}</span>
                </div>
              </div>
            ))}
          </Card>
        </section>

        {/* Advanced tips */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-1">{g.advancedTitle}</h2>
            <p className="text-muted-foreground">{g.advancedDesc}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {g.advancedTips.map((tip, i) => {
              const Icon = ADVANCED_TIP_ICONS[i]
              return (
                <Card key={i} className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-md bg-primary/10 p-2">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="font-semibold text-sm">{tip.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{tip.desc}</p>
                </Card>
              )
            })}
          </div>
        </section>

        {/* Common mistakes */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-1">{g.mistakesTitle}</h2>
          </div>
          <div className="space-y-3">
            {g.mistakes.map((item, i) => (
              <Card key={i} className="p-5">
                <div className="flex gap-4">
                  <div className="shrink-0">
                    <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center">
                      <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{item.issue}</p>
                    <div className="flex gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.fix}</p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Quick checklist */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">{g.checklistTitle}</h2>
          <Card className="p-6 space-y-3">
            {g.checklistItems.map((item, i) => (
              <label key={i} className="flex items-start gap-3 cursor-pointer group">
                <div className="mt-0.5 w-4 h-4 rounded border-2 border-muted-foreground/30 group-hover:border-primary transition-colors shrink-0" />
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{item}</span>
              </label>
            ))}
          </Card>
        </section>

        {/* CTA */}
        <div className="text-center space-y-4 py-8 border-t">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            <span className="text-sm">{g.ctaStat}</span>
          </div>
          <h2 className="text-2xl font-bold">{g.ctaTitle}</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">{g.ctaDesc}</p>
          <Link href="/analyze">
            <Button size="lg" className="mt-2">
              {g.ctaButton}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

      </div>
    </main>
  )
}
