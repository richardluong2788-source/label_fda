'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
}

export function AdvancedSettings({ settings, onChange }: AdvancedSettingsProps) {
  return (
    <Card className="overflow-hidden">
      <div className="p-6 space-y-6">
            {/* Language & Market Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Globe className="h-4 w-4 text-purple-600" />
                <span>Ngôn ngữ & Thị trường</span>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="target-market" className="text-xs">
                    Thị trường mục tiêu
                    <span className="ml-1 text-red-500">*</span>
                  </Label>
                  <Select
                    value={settings.target_market}
                    onValueChange={(value) =>
                      onChange({ ...settings, target_market: value })
                    }
                  >
                    <SelectTrigger id="target-market">
                      <SelectValue placeholder="Chọn thị trường" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">Hoa Kỳ (US)</SelectItem>
                      <SelectItem value="Canada">Canada</SelectItem>
                      <SelectItem value="EU">Liên minh Châu Âu (EU)</SelectItem>
                      <SelectItem value="Multiple">Nhiều thị trường</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground flex items-start gap-1">
                    <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    Mỗi thị trường có quy định FDA/CFIA/EFSA khác nhau
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="label-language" className="text-xs">
                    Ngôn ngữ trên nhãn
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
                      <SelectValue placeholder="Chọn ngôn ngữ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">Tiếng Anh</SelectItem>
                      <SelectItem value="es">Tiếng Tây Ban Nha</SelectItem>
                      <SelectItem value="bilingual">Song ngữ (EN + ES)</SelectItem>
                      <SelectItem value="fr">Tiếng Pháp (Canada)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Dimensions Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Ruler className="h-4 w-4 text-purple-600" />
                <span>Kích thước vật lý</span>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pdp-width" className="text-xs">
                    Chiều rộng mặt trước chính (PDP)
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
                    Chiều cao mặt trước chính (PDP)
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
                    Khối lượng tịnh
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
                Kích thước PDP giúp AI kiểm tra cỡ chữ đúng quy định. Khối lượng tịnh để đối chiếu với khẩu phần ăn.
              </p>
            </div>

            {/* Product Type & Container Section — MUST come before Packaging Format for domain-aware notes */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Package className="h-4 w-4 text-purple-600" />
                <span>Loại sản phẩm & Bao bì</span>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="product-type" className="text-xs">
                    Loại sản phẩm
                    <span className="ml-1 text-red-500">*</span>
                  </Label>
                  <Select
                    value={settings.product_type}
                    onValueChange={(value) =>
                      onChange({ ...settings, product_type: value })
                    }
                  >
                    <SelectTrigger id="product-type">
                      <SelectValue placeholder="Chọn loại" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="food">Thực phẩm thông thường</SelectItem>
                      <SelectItem value="dietary_supplement">Thực phẩm chức năng / TPCN</SelectItem>
                      <SelectItem value="beverage">Đồ uống</SelectItem>
                      <SelectItem value="infant_formula">Sữa công thức trẻ em</SelectItem>
                      <SelectItem value="medical_food">Thực phẩm y học</SelectItem>
                      <SelectItem value="cosmetic">Mỹ phẩm</SelectItem>
                      <SelectItem value="drug_otc">Dược phẩm không kê đơn (OTC)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">
                    Ảnh hưởng đến quy định FDA áp dụng
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="package-type" className="text-xs">
                    Hình dạng bao bì
                  </Label>
                  <Select
                    value={settings.package_type}
                    onValueChange={(value) =>
                      onChange({ ...settings, package_type: value })
                    }
                  >
                    <SelectTrigger id="package-type">
                      <SelectValue placeholder="Chọn bao bì" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottle">Chai / Lọ dạng chai</SelectItem>
                      <SelectItem value="box">Hộp</SelectItem>
                      <SelectItem value="pouch">Túi mềm</SelectItem>
                      <SelectItem value="can">Lon / Hộp thiếc</SelectItem>
                      <SelectItem value="jar">Lọ / Hũ</SelectItem>
                      <SelectItem value="bag">Bao / Túi lớn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target-audience" className="text-xs">
                    Đối tượng sử dụng
                  </Label>
                  <Select
                    value={settings.target_audience}
                    onValueChange={(value) =>
                      onChange({ ...settings, target_audience: value })
                    }
                  >
                    <SelectTrigger id="target-audience">
                      <SelectValue placeholder="Chọn đối tượng" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="adults">Người lớn</SelectItem>
                      <SelectItem value="children">Trẻ em (4 - 12 tuổi)</SelectItem>
                      <SelectItem value="infants">{'Trẻ sơ sinh (dưới 2 tuổi)'}</SelectItem>
                      <SelectItem value="elderly">Người cao tuổi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Packaging Format Section — renders AFTER product type so domain is resolved */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Layers className="h-4 w-4 text-purple-600" />
                <span>Tầng bao bì (Phân loại theo cấp độ đóng gói)</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Mỗi tầng bao bì có quy định FDA khác nhau tùy loại sản phẩm. Chọn đúng để AI phân tích chính xác hơn.
              </p>

              {/* Prompt to select product type first if not yet selected */}
              {!settings.product_type && (
                <Alert className="border-amber-200 bg-amber-50/50">
                  <Info className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-xs text-amber-800">
                    Vui lòng chọn <strong>Loại sản phẩm</strong> trước để hiển thị quy định FDA chính xác cho từng ngành (Thực phẩm / Mỹ phẩm / TPCN / Dược phẩm).
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="packaging-format" className="text-xs">
                  Tầng bao bì đang phân tích
                  <span className="ml-1 text-amber-600 font-normal">(Quan trọng)</span>
                </Label>
                <Select
                  value={settings.packaging_format || ''}
                  onValueChange={(value) =>
                    onChange({ ...settings, packaging_format: value as PackagingFormatId })
                  }
                >
                  <SelectTrigger id="packaging-format">
                    <SelectValue placeholder="Chọn tầng bao bì" />
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

              {/* Domain-aware FDA notes — update whenever product_type or packaging_format changes */}
              {settings.packaging_format && (() => {
                const selectedFormat = PACKAGING_FORMATS.find(f => f.id === settings.packaging_format)
                if (!selectedFormat) return null
                const domain = mapProductTypeToDomain(settings.product_type)
                const domainMeta = PRODUCT_DOMAINS[domain]
                const notes = getResolvedFdaNotesVi(settings.packaging_format, domain)
                const regulations = getResolvedRegulations(settings.packaging_format, domain)
                const isDefaultDomain = !settings.product_type
                return (
                  <Alert className="border-blue-200 bg-blue-50/50">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <p className="text-xs font-semibold text-blue-900">
                          Quy định cho {selectedFormat.nameVi}
                        </p>
                        <Badge variant="outline" className={`text-[10px] ${isDefaultDomain ? 'border-amber-300 text-amber-700' : 'border-blue-300 text-blue-700'}`}>
                          {domainMeta.nameVi}
                          {isDefaultDomain && ' (mặc định)'}
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
                          Tham chiếu: {regulations.join(', ')}
                        </p>
                        <p className="text-[10px] text-blue-500">
                          Bảng thông tin bắt buộc: <strong>{domainMeta.factsPanelVi}</strong> ({domainMeta.primaryRegulation})
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
                <span>Thông tin nhà sản xuất</span>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country-origin" className="text-xs">
                    Nước sản xuất
                  </Label>
                  <Input
                    id="country-origin"
                    placeholder="Ví dụ: Việt Nam"
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
                    Vai trò
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
                      <SelectItem value="manufacturer">Nhà sản xuất</SelectItem>
                      <SelectItem value="importer">Nhà nhập khẩu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
      </div>
    </Card>
  )
}
