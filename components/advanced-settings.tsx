'use client'

import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info, Ruler, Globe, Package, Building2, Layers } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { PACKAGING_FORMATS, PRODUCT_DOMAINS, type PackagingFormatId, mapProductTypeToDomain, getResolvedFdaNotesVi, getResolvedRegulations } from '@/lib/packaging-format-config'

interface AdvancedSettingsProps {
  settings: {
    label_language?: string[]
    target_market?: string
    pdp_dimensions?: { width: number; height: number; unit: 'in' | 'cm' }
    package_type?: string
    packaging_format?: PackagingFormatId
    net_content?: { value: number; unit: string }
    product_type?: string
    target_audience?: string
    special_claims?: string[]
    manufacturer_info?: {
      country_of_origin?: string
      is_importer?: boolean
    }
  }
  onChange: (settings: any) => void
  /** When provided from the main form, product type is read-only here */
  externalProductType?: string
}

export function AdvancedSettings({ settings, onChange, externalProductType }: AdvancedSettingsProps) {
  const { t } = useTranslation()
  const af = t.advancedForm

  // Use external product type when available, otherwise fall back to settings
  const effectiveProductType = externalProductType || settings.product_type

  return (
    <Card className="overflow-hidden">
      <div className="p-6 space-y-6">
            {/* Language & Market Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Globe className="h-4 w-4 text-purple-600" />
                <span>{af.languageMarket}</span>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="target-market" className="text-xs">
                    {af.targetMarket}
                    <span className="ml-1 text-red-500">*</span>
                  </Label>
                  <Select
                    value={settings.target_market}
                    onValueChange={(value) =>
                      onChange({ ...settings, target_market: value })
                    }
                  >
                    <SelectTrigger id="target-market">
                      <SelectValue placeholder={af.selectMarket} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">{af.marketUS}</SelectItem>
                      <SelectItem value="Canada">{af.marketCA}</SelectItem>
                      <SelectItem value="EU">{af.marketEU}</SelectItem>
                      <SelectItem value="Multiple">{af.marketMultiple}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground flex items-start gap-1">
                    <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    {af.marketNote}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="label-language" className="text-xs">
                    {af.labelLanguage}
                  </Label>
                  <Select
                    value={settings.label_language?.[0] || 'en'}
                    onValueChange={(value) =>
                      onChange({
                        ...settings,
                        label_language: value === 'bilingual' ? ['en', 'es'] : [value],
                      })
                    }
                  >
                    <SelectTrigger id="label-language">
                      <SelectValue placeholder={af.selectLanguage} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">{af.langEn}</SelectItem>
                      <SelectItem value="es">{af.langEs}</SelectItem>
                      <SelectItem value="bilingual">{af.langBilingual}</SelectItem>
                      <SelectItem value="fr">{af.langFr}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Dimensions Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Ruler className="h-4 w-4 text-purple-600" />
                <span>{af.physicalDimensions}</span>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pdp-width" className="text-xs">
                    {af.pdpWidth}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="pdp-width"
                      type="number"
                      step="0.1"
                      placeholder="4.0"
                      value={settings.pdp_dimensions?.width || ''}
                      onChange={(e) =>
                        onChange({
                          ...settings,
                          pdp_dimensions: {
                            ...settings.pdp_dimensions,
                            width: parseFloat(e.target.value),
                            height: settings.pdp_dimensions?.height || 0,
                            unit: settings.pdp_dimensions?.unit || 'in',
                          },
                        })
                      }
                    />
                    <Select
                      value={settings.pdp_dimensions?.unit || 'in'}
                      onValueChange={(value: 'in' | 'cm') =>
                        onChange({
                          ...settings,
                          pdp_dimensions: {
                            ...settings.pdp_dimensions,
                            unit: value,
                            width: settings.pdp_dimensions?.width || 0,
                            height: settings.pdp_dimensions?.height || 0,
                          },
                        })
                      }
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in">in</SelectItem>
                        <SelectItem value="cm">cm</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pdp-height" className="text-xs">
                    {af.pdpHeight}
                  </Label>
                  <Input
                    id="pdp-height"
                    type="number"
                    step="0.1"
                    placeholder="6.0"
                    value={settings.pdp_dimensions?.height || ''}
                    onChange={(e) =>
                      onChange({
                        ...settings,
                        pdp_dimensions: {
                          ...settings.pdp_dimensions,
                          height: parseFloat(e.target.value),
                          width: settings.pdp_dimensions?.width || 0,
                          unit: settings.pdp_dimensions?.unit || 'in',
                        },
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="net-content" className="text-xs">
                    {af.netWeight}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="net-content"
                      type="number"
                      step="0.1"
                      placeholder="680"
                      value={settings.net_content?.value || ''}
                      onChange={(e) =>
                        onChange({
                          ...settings,
                          net_content: {
                            ...settings.net_content,
                            value: parseFloat(e.target.value),
                            unit: settings.net_content?.unit || 'g',
                          },
                        })
                      }
                    />
                    <Select
                      value={settings.net_content?.unit || 'g'}
                      onValueChange={(value) =>
                        onChange({
                          ...settings,
                          net_content: {
                            ...settings.net_content,
                            value: settings.net_content?.value || 0,
                            unit: value,
                          },
                        })
                      }
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="g">g</SelectItem>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="ml">ml</SelectItem>
                        <SelectItem value="L">L</SelectItem>
                        <SelectItem value="oz">oz</SelectItem>
                        <SelectItem value="lb">lb</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground flex items-start gap-1">
                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                {af.dimensionNote}
              </p>
            </div>

            {/* Product Type & Container Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Package className="h-4 w-4 text-purple-600" />
                <span>{af.productPackaging}</span>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="product-type" className="text-xs">
                    {af.productType}
                    <span className="ml-1 text-red-500">*</span>
                  </Label>
                  <Select
                    value={effectiveProductType}
                    disabled={!!externalProductType}
                    onValueChange={(value) =>
                      onChange({ ...settings, product_type: value })
                    }
                  >
                    <SelectTrigger id="product-type">
                      <SelectValue placeholder={af.selectProductType} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="food">{af.productFood}</SelectItem>
                      <SelectItem value="dietary_supplement">{af.productSupplement}</SelectItem>
                      <SelectItem value="beverage">{af.productBeverage}</SelectItem>
                      <SelectItem value="infant_formula">{af.productInfant}</SelectItem>
                      <SelectItem value="medical_food">{af.productMedical}</SelectItem>
                      <SelectItem value="cosmetic">{af.productCosmetic}</SelectItem>
                      <SelectItem value="drug_otc">{af.productOTC}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">
                    {af.productTypeNote}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="package-type" className="text-xs">
                    {af.packageShape}
                  </Label>
                  <Select
                    value={settings.package_type}
                    onValueChange={(value) =>
                      onChange({ ...settings, package_type: value })
                    }
                  >
                    <SelectTrigger id="package-type">
                      <SelectValue placeholder={af.selectPackage} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottle">{af.pkgBottle}</SelectItem>
                      <SelectItem value="box">{af.pkgBox}</SelectItem>
                      <SelectItem value="pouch">{af.pkgPouch}</SelectItem>
                      <SelectItem value="can">{af.pkgCan}</SelectItem>
                      <SelectItem value="jar">{af.pkgJar}</SelectItem>
                      <SelectItem value="bag">{af.pkgBag}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target-audience" className="text-xs">
                    {af.targetAudience}
                  </Label>
                  <Select
                    value={settings.target_audience}
                    onValueChange={(value) =>
                      onChange({ ...settings, target_audience: value })
                    }
                  >
                    <SelectTrigger id="target-audience">
                      <SelectValue placeholder={af.selectAudience} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="adults">{af.audienceAdults}</SelectItem>
                      <SelectItem value="children">{af.audienceChildren}</SelectItem>
                      <SelectItem value="infants">{af.audienceInfants}</SelectItem>
                      <SelectItem value="elderly">{af.audienceElderly}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Packaging Format Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Layers className="h-4 w-4 text-purple-600" />
                <span>{af.packagingTier}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {af.packagingTierDesc}
              </p>

              {!effectiveProductType && (
                <Alert className="border-amber-200 bg-amber-50/50">
                  <Info className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-xs text-amber-800">
                    {af.selectProductFirst('Food / Cosmetics / Supplements / OTC')}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="packaging-format" className="text-xs">
                  {af.packagingTierLabel}
                  <span className="ml-1 text-amber-600 font-normal">{af.packagingTierImportant}</span>
                </Label>
                <Select
                  value={settings.packaging_format || ''}
                  onValueChange={(value) =>
                    onChange({ ...settings, packaging_format: value as PackagingFormatId })
                  }
                >
                  <SelectTrigger id="packaging-format">
                    <SelectValue placeholder={af.selectPackagingTier} />
                  </SelectTrigger>
                  <SelectContent>
                    {PACKAGING_FORMATS.map((format) => (
                      <SelectItem key={format.id} value={format.id}>
                        <div className="flex flex-col">
                          <span>{format.nameVi}</span>
                          <span className="text-xs text-muted-foreground">{format.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Domain-aware FDA notes */}
              {settings.packaging_format && (() => {
                const selectedFormat = PACKAGING_FORMATS.find(f => f.id === settings.packaging_format)
                if (!selectedFormat) return null
                const domain = mapProductTypeToDomain(effectiveProductType)
                const domainMeta = PRODUCT_DOMAINS[domain]
                const notes = getResolvedFdaNotesVi(settings.packaging_format, domain)
                const regulations = getResolvedRegulations(settings.packaging_format, domain)
                const isDefaultDomain = !effectiveProductType
                return (
                  <Alert className="border-blue-200 bg-blue-50/50">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <p className="text-xs font-semibold text-blue-900">
                          {af.regulationsFor(selectedFormat.nameVi)}
                        </p>
                        <Badge variant="outline" className={`text-[10px] ${isDefaultDomain ? 'border-amber-300 text-amber-700' : 'border-blue-300 text-blue-700'}`}>
                          {domainMeta.nameVi}
                          {isDefaultDomain && ` ${af.defaultDomain}`}
                        </Badge>
                      </div>
                      <ul className="text-xs text-blue-800 space-y-1">
                        {notes.map((note, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-blue-500 mt-0.5 flex-shrink-0">-</span>
                            <span>{note}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-2 pt-2 border-t border-blue-100 space-y-0.5">
                        <p className="text-[10px] text-blue-600">
                          {af.reference}: {regulations.join(', ')}
                        </p>
                        <p className="text-[10px] text-blue-500">
                          {af.requiredPanel}: <strong>{domainMeta.factsPanelVi}</strong> ({domainMeta.primaryRegulation})
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>
                )
              })()}
            </div>

            {/* Manufacturer Info Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Building2 className="h-4 w-4 text-purple-600" />
                <span>{af.manufacturerInfo}</span>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country-origin" className="text-xs">
                    {af.countryOfOrigin}
                  </Label>
                  <Input
                    id="country-origin"
                    placeholder={af.countryPlaceholder}
                    value={settings.manufacturer_info?.country_of_origin || ''}
                    onChange={(e) =>
                      onChange({
                        ...settings,
                        manufacturer_info: {
                          ...settings.manufacturer_info,
                          country_of_origin: e.target.value,
                        },
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="is-importer" className="text-xs">
                    {af.role}
                  </Label>
                  <Select
                    value={settings.manufacturer_info?.is_importer ? 'importer' : 'manufacturer'}
                    onValueChange={(value) =>
                      onChange({
                        ...settings,
                        manufacturer_info: {
                          ...settings.manufacturer_info,
                          is_importer: value === 'importer',
                        },
                      })
                    }
                  >
                    <SelectTrigger id="is-importer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manufacturer">{af.roleManufacturer}</SelectItem>
                      <SelectItem value="importer">{af.roleImporter}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
      </div>
    </Card>
  )
}
