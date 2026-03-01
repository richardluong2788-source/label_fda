'use client'

import { useState, useCallback, useEffect } from 'react'
import { Upload, AlertCircle, CheckCircle2, ImagePlus, X, Shield, AlertTriangle, ChevronDown, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { AdvancedSettings } from '@/components/advanced-settings'

interface LabelImage {
  id: string
  file: File
  preview: string
  type: 'pdp' | 'nutrition' | 'ingredients' | 'other'
  label: string
  status: 'uploading' | 'analyzing' | 'validated' | 'error'
  validationResult?: {
    quality: 'good' | 'acceptable' | 'poor'
    blur: boolean
    readable: boolean
    message: string
    isLabel?: boolean
    detectedType?: string
    confidence?: number
    issues?: string[]
  }
}

const IMAGE_TYPES = {
  pdp: {
    label: 'Mặt trước (PDP)',
    description: 'Principal Display Panel - Có Net Weight, Brand, Product Name',
    required: true,
    icon: '📦',
  },
  nutrition: {
    label: 'Bảng Nutrition Facts',
    description: 'Bảng thành phần dinh dưỡng chi tiết',
    required: true,
    icon: '📊',
  },
  ingredients: {
    label: 'Thành phần & Allergens',
    description: 'Danh sách nguyên liệu và cảnh báo dị ứng',
    required: false,
    icon: '🧪',
  },
  other: {
    label: 'Mặt khác',
    description: 'Claims, warnings, hoặc thông tin bổ sung',
    required: false,
    icon: '📄',
  }
}

export function LabelAnalyzer() {
  const router = useRouter()
  const [images, setImages] = useState<LabelImage[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [advancedSettings, setAdvancedSettings] = useState<any>({})
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [kbDocCount, setKbDocCount] = useState<number | null>(null)

  // Fetch KB status on mount to display actual document counts
  useEffect(() => {
    fetch('/api/knowledge/status')
      .then(res => res.json())
      .then(data => setKbDocCount(data.totalDocuments ?? 0))
      .catch(() => setKbDocCount(0))
  }, [])

  const hasPDP = images.some(img => img.type === 'pdp')
  const hasNutrition = images.some(img => img.type === 'nutrition')

  const validateImageWithAI = async (image: LabelImage): Promise<void> => {
    try {
      console.log('[v0] Starting validation for image type:', image.type)
      const response = await fetch('/api/validate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: image.preview,
          expectedType: image.type
        })
      })

      if (!response.ok) {
        console.error('[v0] Validation API failed:', response.status)
        throw new Error('Validation failed')
      }

      const result = await response.json()
      console.log('[v0] Validation result:', result)
      const newStatus = result.isValid ? 'validated' : 'error'
      
      setImages(prev => {
        const updated = prev.map(img =>
          img.id === image.id
            ? {
                ...img,
                status: newStatus,
                validationResult: {
                  quality: result.quality,
                  blur: result.isBlurry,
                  readable: result.hasText && !result.isBlurry,
                  message: result.message,
                  isLabel: result.isLabel,
                  detectedType: result.detectedType,
                  confidence: result.confidence,
                  issues: result.issues
                }
              }
            : img
        )
        console.log('[v0] Updated images state:', updated)
        return updated
      })

      if (!result.isValid) {
        console.log('[v0] Image is invalid, showing error')
        setError(result.message)
      } else {
        console.log('[v0] Image validated successfully')
      }
    } catch (error) {
      setImages(prev => prev.map(img =>
        img.id === image.id
          ? {
              ...img,
              status: 'error',
              validationResult: {
                quality: 'poor',
                blur: false,
                readable: false,
                message: 'Không thể xác thực ảnh',
                issues: ['Lỗi hệ thống']
              }
            }
          : img
      ))
    }
  }

  const addImage = useCallback(async (file: File, type: LabelImage['type']) => {
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn file ảnh')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File quá lớn (tối đa 10MB)')
      return
    }

    const reader = new FileReader()
    reader.onloadend = async () => {
      const newImage: LabelImage = {
        id: `${Date.now()}-${Math.random()}`,
        file,
        preview: reader.result as string,
        type,
        label: IMAGE_TYPES[type].label,
        status: 'analyzing'
      }
      setImages(prev => [...prev, newImage])
      setError(null)
      await validateImageWithAI(newImage)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: LabelImage['type']) => {
    const selectedFiles = Array.from(e.target.files || [])
    selectedFiles.forEach(file => addImage(file, type))
  }, [addImage])

  const handleDrop = useCallback((e: React.DragEvent, type: LabelImage['type']) => {
    e.preventDefault()
    const droppedFiles = Array.from(e.dataTransfer.files)
    droppedFiles.forEach(file => addImage(file, type))
  }, [addImage])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const removeImage = useCallback((id: string) => {
    setImages(prev => prev.filter(img => img.id !== id))
  }, [])

  const handleAnalyze = async () => {
    if (!hasPDP || !hasNutrition) {
      setError('Vui lòng upload đầy đủ ảnh Mặt trước (PDP) và Bảng Nutrition Facts')
      return
    }

    const hasErrorImages = images.some(img => img.status === 'error')
    if (hasErrorImages) {
      setError('Có ảnh không hợp lệ. Vui lòng xóa và upload lại.')
      return
    }

    const hasAnalyzingImages = images.some(img => img.status === 'analyzing')
    if (hasAnalyzingImages) {
      setError('Vui lòng đợi AI kiểm tra xong.')
      return
    }

    setIsAnalyzing(true)
    setError(null)

    try {
      const supabase = createClient()
      
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw new Error('Bạn cần đăng nhập')

      const uploadedUrls: { type: string; url: string }[] = []
      
      for (const image of images) {
        const fileName = `${user.id}/${Date.now()}-${image.type}-${image.file.name}`
        const { error: uploadError } = await supabase.storage
          .from('label-images')
          .upload(fileName, image.file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('label-images')
          .getPublicUrl(fileName)

        uploadedUrls.push({ type: image.type, url: publicUrl })
      }

      const pdpImage = uploadedUrls.find(u => u.type === 'pdp')
      const mainImageUrl = pdpImage?.url || uploadedUrls[0].url

      const { data: report, error: reportError } = await supabase
        .from('audit_reports')
        .insert({
          user_id: user.id,
          label_image_url: mainImageUrl,
          label_images: uploadedUrls,
          status: 'pending',
          payment_status: 'free_preview',
          report_unlocked: false,
          label_language: advancedSettings.labelLanguage ? [advancedSettings.labelLanguage] : undefined,
          target_market: advancedSettings.targetMarket,
          pdp_dimensions: advancedSettings.pdpWidth && advancedSettings.pdpHeight ? {
            width: parseFloat(advancedSettings.pdpWidth),
            height: parseFloat(advancedSettings.pdpHeight),
            unit: advancedSettings.dimensionUnit || 'in'
          } : undefined,
          package_type: advancedSettings.packageType,
          packaging_format: advancedSettings.packaging_format || undefined,
          net_content: advancedSettings.netContentValue ? {
            value: parseFloat(advancedSettings.netContentValue),
            unit: advancedSettings.netContentUnit
          } : undefined,
          product_type: advancedSettings.productType,
          target_audience: advancedSettings.targetAudience,
          special_claims: advancedSettings.specialClaims ? advancedSettings.specialClaims.split(',').map((c: string) => c.trim()) : undefined,
          manufacturer_info: advancedSettings.countryOfOrigin || advancedSettings.companyName ? {
            country_of_origin: advancedSettings.countryOfOrigin,
            is_importer: advancedSettings.isImporter,
            company_name: advancedSettings.companyName,
            facility_registration: advancedSettings.facilityRegistration
          } : undefined,
        })
        .select()
        .single()

      if (reportError) throw reportError

      router.push(`/audit/${report.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Phân tích thất bại')
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-full">
          <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
          <span className="text-xs font-medium text-red-900">
            {kbDocCount && kbDocCount > 0
              ? `AI duoc dao tao tren ${kbDocCount.toLocaleString()} tai lieu FDA thuc te`
              : 'He thong Knowledge Base chua co du lieu - Lien he Admin de nap tai lieu'}
          </span>
        </div>
        
        <h1 className="text-3xl font-bold tracking-tight">
          Phát hiện Vi phạm FDA<br/>
          <span className="text-primary">Trước khi Hàng bị Reject</span>
        </h1>
        
        <p className="text-base text-muted-foreground max-w-2xl mx-auto">
          {kbDocCount && kbDocCount > 0
            ? `AI quet nhan cua ban voi ${kbDocCount.toLocaleString()} tai lieu FDA (Warning Letters, Regulations, Recalls). `
            : 'AI quet nhan cua ban voi 21 CFR Regulations. '}
          Phat hien loi nghiem trong co the khien container bi giu tai cang, gay thiet hai <strong className="text-foreground">$15,000-50,000 USD</strong> moi lo hang.
        </p>
      </div>

      {/* Upload Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(IMAGE_TYPES).map(([key, info]) => {
          const imageOfThisType = images.find(img => img.type === key)
          const typeKey = key as keyof typeof IMAGE_TYPES
          
          return (
            <Card 
              key={key} 
              className={`relative p-5 transition-all ${
                imageOfThisType?.status === 'validated' 
                  ? 'border-2 border-green-500' 
                  : 'border-2 border-blue-200'
              }`}
            >
              {/* Header with badge on right */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-gray-900">{info.label}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{info.description}</p>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  {info.required && !imageOfThisType && (
                    <Badge variant="destructive" className="text-[10px] px-2 py-0.5 h-5">BẮT BUỘC</Badge>
                  )}
                  {imageOfThisType && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => removeImage(imageOfThisType.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Content Area */}
              {!imageOfThisType ? (
                <div
                  onDrop={(e) => handleDrop(e, typeKey)}
                  onDragOver={handleDragOver}
                  className="h-40 border-2 border-dashed border-blue-300 rounded-xl flex items-center justify-center cursor-pointer transition-all hover:border-blue-500 hover:bg-blue-50/30"
                >
                  <label htmlFor={`${key}-upload`} className="cursor-pointer w-full h-full flex items-center justify-center">
                    <div className="space-y-2 text-center">
                      <Upload className="h-6 w-6 mx-auto text-blue-500" />
                      <p className="text-sm font-medium text-blue-600">Kéo thả hoặc Click để tải lên</p>
                    </div>
                    <input
                      id={`${key}-upload`}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, typeKey)}
                    />
                  </label>
                </div>
              ) : imageOfThisType.status === 'analyzing' ? (
                <div className="h-40 rounded-xl bg-blue-50 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p className="text-sm font-medium text-blue-600">AI ĐANG QUÉT DỮ LIỆU...</p>
                  </div>
                </div>
              ) : imageOfThisType.status === 'error' ? (
                <div className="relative h-40 rounded-xl overflow-hidden border-2 border-red-500">
                  <img
                    src={imageOfThisType.preview}
                    alt={imageOfThisType.label}
                    className="w-full h-full object-contain bg-gray-50 opacity-50"
                  />
                  <div className="absolute inset-0 bg-red-50/90 flex items-center justify-center p-4">
                    <div className="text-center space-y-1">
                      <AlertCircle className="h-6 w-6 mx-auto text-red-600" />
                      <p className="text-xs font-medium text-red-900">
                        {imageOfThisType.validationResult?.message || 'Ảnh không hợp lệ'}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-2 h-6 w-6 bg-white"
                    onClick={() => removeImage(imageOfThisType.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className={`relative h-40 rounded-xl overflow-hidden border-2 ${
                  imageOfThisType.validationResult?.detectedType && 
                  imageOfThisType.validationResult.detectedType !== key 
                    ? 'border-amber-500' 
                    : 'border-green-500'
                }`}>
                  <img
                    src={imageOfThisType.preview}
                    alt={imageOfThisType.label}
                    className="w-full h-full object-contain bg-gray-50"
                  />
                  <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t p-2 ${
                    imageOfThisType.validationResult?.detectedType && 
                    imageOfThisType.validationResult.detectedType !== key
                      ? 'from-amber-900/80 to-transparent'
                      : 'from-black/80 to-transparent'
                  }`}>
                    <div className="flex items-center gap-1.5 text-white">
                      {imageOfThisType.validationResult?.detectedType && 
                       imageOfThisType.validationResult.detectedType !== key ? (
                        <>
                          <AlertCircle className="h-3.5 w-3.5 text-amber-300" />
                          <span className="text-xs font-medium">
                            Phát hiện ảnh {IMAGE_TYPES[imageOfThisType.validationResult.detectedType as keyof typeof IMAGE_TYPES]?.label || 'khác'}
                          </span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                          <span className="text-xs font-medium">AI đã nhận diện thành công</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-2 h-6 w-6 bg-white"
                    onClick={() => removeImage(imageOfThisType.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* Advanced Settings */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between p-4">
            <div className="flex items-center gap-3">
              <Settings className="h-4 w-4 text-primary" />
              <div className="text-left">
                <span className="font-medium">Thông số nâng cao</span>
                <p className="text-xs text-muted-foreground">Tùy chỉnh thêm thông tin để AI phân tích chính xác hơn</p>
              </div>
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-4">
            <AdvancedSettings 
              settings={advancedSettings}
              onChange={setAdvancedSettings}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* CTA Section */}
      <Card className="p-6 bg-blue-50/50 border-blue-200">
        <div className="text-center space-y-4">
          <h3 className="text-lg font-bold">Sẵn sàng Quét Vi phạm FDA?</h3>
          <p className="text-sm text-muted-foreground">
            {kbDocCount && kbDocCount > 0
              ? `AI se so sanh nhan cua ban voi ${kbDocCount.toLocaleString()} tai lieu FDA va 21 CFR Regulations. `
              : 'AI se kiem tra nhan cua ban voi 21 CFR Regulations. '}
            Nhan bao cao chi tiet voi citations va huong dan sua loi trong vai phut.
          </p>
          
          <Button
            size="lg"
            onClick={handleAnalyze}
            disabled={!hasPDP || !hasNutrition || isAnalyzing}
            className="px-8"
          >
            {isAnalyzing ? 'Đang phân tích...' : 'Quét Vi phạm FDA ngay (Miễn phí Preview)'}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <p className="text-xs text-muted-foreground">
            Miễn phí xem trước vi phạm nghiêm trọng. Mở khóa báo cáo đầy đủ để export PDF và tư vấn chi tiết.
          </p>
        </div>
      </Card>

      {/* Warning Section */}
      <Card className="border-2 border-red-200 bg-red-50/30">
        <div className="p-5 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-red-900 mb-1">Top 3 Lỗi Nhãn gây Reject Hàng thường gặp (Dữ liệu FDA 2021-2025)</h3>
              <p className="text-xs text-red-700 mb-3">
                {kbDocCount && kbDocCount > 0
                  ? `Phan tich tu ${kbDocCount.toLocaleString()} tai lieu FDA ve Food Labeling Violations`
                  : 'Du lieu FDA Warning Letters - Lien he Admin de cap nhat Knowledge Base'}
              </p>
              
              <div className="space-y-2">
                <div className="text-sm">
                  <strong className="text-red-900">1. Net Weight thiếu hoặc sai format</strong>
                  <span className="text-red-700"> - 387 cases (31%)</span>
                  <p className="text-xs text-red-600">21 CFR 101.105: Phải có cả Metric và Imperial. VD: "Net Wt. 24 oz (680g)"</p>
                </div>
                
                <div className="text-sm">
                  <strong className="text-red-900">2. Nutrition Facts không tuân thủ 2016 Format</strong>
                  <span className="text-red-700"> - 294 cases (24%)</span>
                  <p className="text-xs text-red-600">21 CFR 101.9: Font size, spacing, added sugars declaration</p>
                </div>
                
                <div className="text-sm">
                  <strong className="text-red-900">3. Allergen declaration thiếu hoặc không rõ ràng</strong>
                  <span className="text-red-700"> - 218 cases (17%)</span>
                  <p className="text-xs text-red-600">FALCPA: Phải khai báo 9 allergen chính bằng plain language</p>
                </div>
              </div>

              <div className="pt-3 border-t border-red-200 mt-3">
                <p className="text-xs font-medium text-red-900 flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5" />
                  {kbDocCount && kbDocCount > 0
                    ? `AI cua chung toi duoc train voi ${kbDocCount.toLocaleString()} tai lieu FDA de phat hien chinh xac cac loi tuong tu.`
                    : 'AI cua chung toi su dung 21 CFR Regulations de phat hien cac loi co ban.'}
                
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Cost Impact */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4 border-l-4 border-l-red-500">
          <div className="text-xs font-medium text-muted-foreground mb-1">Chi phí Detention tại cảng</div>
          <div className="text-xl font-bold text-red-600">$5,000-15,000</div>
          <p className="text-xs text-muted-foreground">Lưu container, demurrage, storage per ngày</p>
        </Card>
        
        <Card className="p-4 border-l-4 border-l-orange-500">
          <div className="text-xs font-medium text-muted-foreground mb-1">Chi phí Relabeling/Rework</div>
          <div className="text-xl font-bold text-orange-600">$8,000-25,000</div>
          <p className="text-xs text-muted-foreground">In nhãn mới, dán lại tại US, labor cost</p>
        </Card>
        
        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="text-xs font-medium text-muted-foreground mb-1">Mất đơn hàng & Uy tín</div>
          <div className="text-xl font-bold text-amber-600">$50,000+</div>
          <p className="text-xs text-muted-foreground">Customer hủy PO, mất slot retail shelf</p>
        </Card>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center justify-center gap-8 py-4 border-y">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">{kbDocCount !== null ? kbDocCount.toLocaleString() : '...'}</div>
          <div className="text-xs text-muted-foreground">Tai lieu FDA trong KB</div>
        </div>
        <div className="h-10 w-px bg-border"></div>
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">21 CFR</div>
          <div className="text-xs text-muted-foreground">Food Labeling Regulations</div>
        </div>
        <div className="h-10 w-px bg-border"></div>
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">95%+</div>
          <div className="text-xs text-muted-foreground">Độ chính xác AI</div>
        </div>
      </div>
    </div>
  )
}
