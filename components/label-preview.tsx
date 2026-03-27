'use client'

import { Eye } from 'lucide-react'
import type { LabelConfig } from '@/lib/label-field-config'

interface LabelPreviewProps {
  config: LabelConfig
  formData: Record<string, string>
}

/**
 * Live label preview - renders dynamically based on config and form data.
 * Delegates to the correct preview renderer per product category.
 * 
 * Shows RAW values only. Rounding is NOT applied here on purpose.
 * AI handles rounding validation via /api/analyze.
 */
export function LabelPreview({ config, formData }: LabelPreviewProps) {
  return (
    <div className="flex flex-col items-center">
      <div className="sticky top-8 w-full max-w-sm">
        {config.id === 'conventional-foods' && (
          <FoodLabelPreview config={config} formData={formData} />
        )}
        {config.id === 'dietary-supplements' && (
          <SupplementLabelPreview config={config} formData={formData} />
        )}
        {config.id === 'cosmetics' && (
          <CosmeticLabelPreview config={config} formData={formData} />
        )}

        <div className="mt-6 flex items-center justify-center gap-2 text-muted-foreground">
          <Eye size={16} />
          <span className="text-xs uppercase font-semibold">
            Ban xem truoc nhan hoan chinh
          </span>
        </div>
      </div>
    </div>
  )
}

// ============================================
// FOOD LABEL PREVIEW - Nutrition Facts
// ============================================

function FoodLabelPreview({ config, formData }: LabelPreviewProps) {
  const calcDV = (key: string) => {
    const field = config.fields.find(f => f.key === key)
    if (!field?.dailyValue) return null
    return Math.round((Number.parseFloat(formData[key] || '0') / field.dailyValue) * 100)
  }

  const nutritionFields = config.fields.filter(
    f => f.type === 'number' && f.key !== 'calories'
  )

  return (
    <div className="bg-white p-6 border-[1.5px] border-black text-black font-sans shadow-lg">
      <h2
        className="text-4xl font-extrabold border-b-[8px] border-black pb-1 leading-none uppercase"
        style={{ fontFamily: 'Arial Black, sans-serif' }}
      >
        Nutrition Facts
      </h2>

      <div className="border-b border-black py-1">
        <div className="flex justify-between font-bold text-sm">
          <span>{formData.servingsPerContainer} servings per container</span>
        </div>
        <div className="flex justify-between items-end font-bold text-lg leading-tight">
          <span>Serving size</span>
          <span>{formData.servingSize}</span>
        </div>
      </div>

      <div className="border-b-[10px] border-black py-1">
        <div className="flex justify-between items-center font-bold">
          <div className="text-xs">Amount per serving</div>
        </div>
        <div className="flex justify-between items-end font-extrabold text-3xl leading-none">
          <span>Calories</span>
          <span>{formData.calories}</span>
        </div>
      </div>

      <div className="text-right font-bold text-[10px] py-1 border-b border-black">
        {'% Daily Value*'}
      </div>

      {nutritionFields.map(field => {
        const dv = calcDV(field.key)
        const value = formData[field.key] || '0'
        const isVitamin = field.group === 'vitamins'
        const borderClass = field.key === 'protein'
          ? 'border-b-[10px]'
          : 'border-b'

        // Special display for Added Sugars
        if (field.key === 'addedSugars') {
          return (
            <div key={field.key} className={`${borderClass} border-black py-0.5 pl-8 flex justify-between text-sm`}>
              <span>Includes {value}{field.unit} Added Sugars</span>
              {dv !== null && <span className="font-bold">{dv}%</span>}
            </div>
          )
        }

        return (
          <div
            key={field.key}
            className={`${borderClass} border-black py-${isVitamin ? '1' : '0.5'} ${field.indent ? `pl-${field.indent * 4}` : ''} flex justify-between ${isVitamin ? 'text-[11px]' : 'text-sm'} ${field.italic ? 'italic' : ''}`}
          >
            <span>
              {field.bold && !isVitamin ? (
                <><span className="font-bold">{field.label}</span> {value}{field.unit}</>
              ) : (
                <>{field.label} {value}{field.unit}</>
              )}
            </span>
            {field.showDV && dv !== null ? (
              <span className={isVitamin ? '' : 'font-bold'}>{dv}%</span>
            ) : (
              <span />
            )}
          </div>
        )
      })}

      <div className="mt-2 text-[9px] leading-tight italic border-b border-black pb-1">
        {config.footerText}
      </div>

      {formData.ingredients && (
        <div className="mt-2 text-[10px] leading-snug">
          <span className="font-bold">INGREDIENTS: </span>
          {formData.ingredients}
        </div>
      )}

      {formData.allergens && (
        <div className="mt-2 text-[10px] font-bold leading-snug uppercase">
          {formData.allergens}
        </div>
      )}
    </div>
  )
}

// ============================================
// SUPPLEMENT LABEL PREVIEW - Supplement Facts
// ============================================

function SupplementLabelPreview({ config, formData }: LabelPreviewProps) {
  const calcDV = (key: string) => {
    const field = config.fields.find(f => f.key === key)
    if (!field?.dailyValue) return null
    return Math.round((Number.parseFloat(formData[key] || '0') / field.dailyValue) * 100)
  }

  const vitaminFields = config.fields.filter(f => f.group === 'vitamins')
  const mineralFields = config.fields.filter(f => f.group === 'minerals')

  return (
    <div className="bg-white p-6 border-[1.5px] border-black text-black font-sans shadow-lg">
      <h2
        className="text-3xl font-extrabold border-b-[8px] border-black pb-1 leading-none uppercase"
        style={{ fontFamily: 'Arial Black, sans-serif' }}
      >
        Supplement Facts
      </h2>

      <div className="border-b border-black py-1">
        <div className="text-sm"><span className="font-bold">Serving Size</span> {formData.servingSize}</div>
        <div className="text-sm"><span className="font-bold">Servings Per Container</span> {formData.servingsPerContainer}</div>
      </div>

      <div className="flex justify-between text-[10px] font-bold py-1 border-b-[3px] border-black">
        <span>{'Amount Per Serving'}</span>
        <span>{'% Daily Value'}</span>
      </div>

      {Number.parseFloat(formData.calories || '0') > 0 && (
        <div className="border-b border-black py-0.5 flex justify-between text-sm font-bold">
          <span>Calories {formData.calories}</span>
          <span />
        </div>
      )}

      {vitaminFields.map(field => (
        <div key={field.key} className="border-b border-black py-0.5 flex justify-between text-sm">
          <span>{field.label} {formData[field.key]}{field.unit}</span>
          <span className="font-bold">{calcDV(field.key)}%</span>
        </div>
      ))}

      {mineralFields.length > 0 && (
        <>
          <div className="border-b-[3px] border-black" />
          {mineralFields.map(field => (
            <div key={field.key} className="border-b border-black py-0.5 flex justify-between text-sm">
              <span>{field.label} {formData[field.key]}{field.unit}</span>
              <span className="font-bold">{calcDV(field.key)}%</span>
            </div>
          ))}
        </>
      )}

      {formData.proprietaryBlend && (
        <div className="mt-2 text-[10px] leading-snug">
          <span className="font-bold">Proprietary Blend: </span>
          {formData.proprietaryBlend}
        </div>
      )}

      <div className="mt-2 text-[9px] leading-tight italic border-t border-black pt-1">
        {config.footerText}
      </div>

      {formData.otherIngredients && (
        <div className="mt-2 text-[10px] leading-snug">
          <span className="font-bold">Other Ingredients: </span>
          {formData.otherIngredients}
        </div>
      )}

      {formData.disclaimer && (
        <div className="mt-2 text-[9px] leading-snug italic border-t border-black pt-1">
          {formData.disclaimer}
        </div>
      )}

      {formData.allergens && (
        <div className="mt-2 text-[10px] font-bold leading-snug uppercase">
          {formData.allergens}
        </div>
      )}
    </div>
  )
}

// ============================================
// COSMETIC LABEL PREVIEW
// ============================================

function CosmeticLabelPreview({ config, formData }: LabelPreviewProps) {
  return (
    <div className="bg-white p-6 border-[1.5px] border-black text-black font-sans shadow-lg">
      {formData.productIdentity && (
        <h2
          className="text-2xl font-extrabold border-b-[4px] border-black pb-2 leading-none uppercase text-center"
          style={{ fontFamily: 'Arial Black, sans-serif' }}
        >
          {formData.productIdentity}
        </h2>
      )}

      {formData.netContents && (
        <div className="text-center text-sm font-bold py-2 border-b border-black">
          {formData.netContents}
        </div>
      )}

      {formData.intendedUse && (
        <div className="text-xs text-center py-2 border-b border-black italic">
          {formData.intendedUse}
        </div>
      )}

      {formData.activeIngredients && (
        <div className="mt-3 text-[10px] leading-snug">
          <span className="font-bold uppercase">Active Ingredients: </span>
          {formData.activeIngredients}
        </div>
      )}

      {formData.ingredients && (
        <div className="mt-2 text-[10px] leading-snug">
          <span className="font-bold uppercase">Ingredients: </span>
          {formData.ingredients}
        </div>
      )}

      {formData.warnings && (
        <div className="mt-3 p-2 border border-black text-[10px] leading-snug">
          <span className="font-bold uppercase">Warning: </span>
          {formData.warnings}
        </div>
      )}

      {formData.sunscreenWarning && (
        <div className="mt-2 text-[10px] leading-snug italic">
          {formData.sunscreenWarning}
        </div>
      )}

      <div className="mt-3 text-[9px] leading-tight italic border-t border-black pt-2">
        {config.footerText}
      </div>

      {formData.manufacturer && (
        <div className="mt-2 text-[9px] leading-snug">
          {formData.manufacturer}
        </div>
      )}

      {formData.madeIn && (
        <div className="text-[9px] leading-snug font-bold">
          {formData.madeIn}
        </div>
      )}
    </div>
  )
}
