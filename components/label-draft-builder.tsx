'use client'

import {
  ClipboardCheck,
  Download,
  ArrowLeft,
  Save,
  Sparkles,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'
import { useLabelDraft } from '@/hooks/use-label-draft'
import { LabelInputForm } from '@/components/label-input-form'
import { LabelPreview } from '@/components/label-preview'
import { LABEL_CONFIGS } from '@/lib/label-field-config'

/**
 * LABEL DRAFT BUILDER - Thin Orchestrator
 * 
 * Architecture:
 * - This component is ONLY for layout and coordination
 * - Data entry: LabelInputForm (reads from label-field-config)
 * - Preview: LabelPreview (renders per product type)
 * - State/Logic: useLabelDraft hook
 * - Validation/Rounding: AI via /api/analyze (uses knowledge base)
 * 
 * Supports: Food, Supplement, Cosmetics (extensible to Pharma)
 */
export function LabelDraftBuilder() {
  const {
    categoryId,
    config,
    formData,
    submitting,
    analyzing,
    switchCategory,
    handleChange,
    handleSave,
    handleAnalyze,
  } = useLabelDraft('conventional-foods')

  const categoryOptions = Object.entries(LABEL_CONFIGS).map(([id, cfg]) => ({
    id,
    name: cfg.name,
    regulation: cfg.regulation,
  }))

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8 font-sans">
      {/* Header */}
      <header className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="bg-transparent">
            <Link href="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ClipboardCheck className="text-primary" />
              Vexim Global - Trinh Tao Nhan
            </h1>
            <p className="text-muted-foreground text-sm italic">
              {config.regulation}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Product Category Selector */}
          <Select value={categoryId} onValueChange={switchCategory}>
            <SelectTrigger className="w-52 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map(opt => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" className="flex items-center gap-2 bg-transparent">
            <Download size={16} /> Xuat PDF
          </Button>

          <Button
            variant="outline"
            onClick={handleSave}
            disabled={submitting || analyzing}
            className="flex items-center gap-2 bg-transparent"
          >
            <Save size={16} />
            {submitting ? 'Dang xu ly...' : 'Luu'}
          </Button>

          <Button
            onClick={handleAnalyze}
            disabled={analyzing || submitting}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 shadow-md hover:shadow-lg transition-all"
          >
            {analyzing ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Sparkles size={18} />
            )}
            {analyzing ? 'Dang phan tich...' : 'Phan Tich AI'}
          </Button>
        </div>
      </header>

      {/* Main: Form + Preview */}
      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7">
          <LabelInputForm
            config={config}
            formData={formData}
            onChange={handleChange}
          />

          {/* Bottom CTA */}
          <div className="mt-4 p-6 bg-primary/5 border border-primary/20 rounded-xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles size={20} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    San sang kiem tra tuan thu?
                  </p>
                  <p className="text-xs text-muted-foreground">
                    AI se phan tich du lieu, kiem tra rounding rules, va doi chieu voi FDA knowledge base
                  </p>
                </div>
              </div>
              <Button
                onClick={handleAnalyze}
                disabled={analyzing || submitting}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-3 shadow-md hover:shadow-lg transition-all w-full sm:w-auto"
              >
                {analyzing ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Sparkles size={18} />
                )}
                {analyzing ? 'Dang phan tich...' : 'Phan Tich Tuan Thu FDA'}
              </Button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <LabelPreview config={config} formData={formData} />
        </div>
      </main>

      <footer className="max-w-6xl mx-auto mt-12 pt-8 border-t border-border text-center text-muted-foreground text-xs">
        <p>
          {'© 2026 Vexim Global - Compliance Specialist. Ho tro doanh nghiep Viet xuat khau sang Hoa Ky.'}
        </p>
      </footer>
    </div>
  )
}
