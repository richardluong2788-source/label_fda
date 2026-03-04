'use client'

import { Badge } from "@/components/ui/badge"
import React from "react"
import { useState, useCallback } from 'react'
import { Upload, FileImage, X, ChevronDown, ChevronUp, FileCheck, FilePlus, AlertCircle, CheckCircle2, ImagePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { CategoryDimensionSelector } from './category-dimension-selector'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type AnalysisMode = 'audit' | 'draft'

interface LabelImage {
  id: string
  file: File
  preview: string
  type: 'pdp' | 'nutrition' | 'ingredients' | 'other'
  label: string
}

const IMAGE_TYPES = {
  pdp: {
    label: 'Mặt trước (PDP)',
    description: 'Principal Display Panel - Có Net Weight, Brand, Product Name',
    required: true,
    icon: '📦'
  },
  nutrition: {
    label: 'Bảng Nutrition Facts',
    description: 'Bảng thành phần dinh dưỡng',
    required: true,
    icon: '📊'
  },
  ingredients: {
    label: 'Thành phần & Allergens',
    description: 'Ingredient list và cảnh báo dị ứng',
    required: false,
    icon: '🧪'
  },
  other: {
    label: 'Mặt khác',
    description: 'Claims, warnings, hoặc thông tin bổ sung',
    required: false,
    icon: '📄'
  }
}

export function LabelMultiUpload() {
  const [mode, setMode] = useState<AnalysisMode>('audit')
  const [images, setImages] = useState<LabelImage[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [category, setCategory] = useState<string>('')
  const [subCategory, setSubCategory] = useState<string>('')
  const [dimensions, setDimensions] = useState({
    physicalWidth: 0,
    physicalHeight: 0,
    pixelWidth: 0,
    pixelHeight: 0,
  })
  const [hasForeignLanguage, setHasForeignLanguage] = useState(false)
  const [foreignLanguage, setForeignLanguage] = useState('')
  const router = useRouter()

  const addImage = useCallback((file: File, type: LabelImage['type'] = 'other') => {
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn file ảnh')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const newImage: LabelImage = {
        id: `${Date.now()}-${Math.random()}`,
        file,
        preview: reader.result as string,
        type,
        label: IMAGE_TYPES[type].label
      }
      setImages(prev => [...prev, newImage])
      setError(null)
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

  const updateImageType = useCallback((id: string, newType: LabelImage['type']) => {
    setImages(prev => prev.map(img => 
      img.id === id 
        ? { ...img, type: newType, label: IMAGE_TYPES[newType].label }
        : img
    ))
  }, [])

  const validateImages = (): { valid: boolean; message?: string } => {
    const hasPDP = images.some(img => img.type === 'pdp')
    const hasNutrition = images.some(img => img.type === 'nutrition')

    if (images.length === 0) {
      return { valid: false, message: 'Vui lòng upload ít nhất một ảnh' }
    }

    if (!hasPDP) {
      return { valid: false, message: 'Thiếu ảnh Mặt trước (PDP) - Bắt buộc phải có Net Weight' }
    }

    if (!hasNutrition) {
      return { valid: false, message: 'Thiếu ảnh Bảng Nutrition Facts - Bắt buộc' }
    }

    return { valid: true }
  }

  const handleUpload = async () => {
    const validation = validateImages()
    if (!validation.valid) {
      setError(validation.message || 'Validation failed')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('Bạn cần đăng nhập để upload ảnh')
      }

      // Upload all images to storage
      const uploadedUrls: { type: string; url: string }[] = []
      
      for (const image of images) {
        // Sanitize file name: remove accents, spaces, and special characters
        const sanitizedName = image.file.name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9._-]/g, '-')
          .replace(/-+/g, '-')

        const fileName = `${user.id}/${Date.now()}-${image.type}-${sanitizedName}`
        const { error: uploadError } = await supabase.storage
          .from('label-images')
          .upload(fileName, image.file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('label-images')
          .getPublicUrl(fileName)

        uploadedUrls.push({ type: image.type, url: publicUrl })
      }

      // Find the primary image (PDP) for the main label_image_url field
      const pdpImage = uploadedUrls.find(u => u.type === 'pdp')
      const mainImageUrl = pdpImage?.url || uploadedUrls[0].url

      // Create audit report with all images
      const { data: report, error: reportError } = await supabase
        .from('audit_reports')
        .insert({
          user_id: user.id,
          label_image_url: mainImageUrl,
          label_images: uploadedUrls, // Store all images with their types
          status: 'pending',
          product_category: category || null,
          product_sub_category: subCategory || null,
          physical_width_cm: dimensions.physicalWidth || null,
          physical_height_cm: dimensions.physicalHeight || null,
          pixel_width: dimensions.pixelWidth || null,
          pixel_height: dimensions.pixelHeight || null,
          has_foreign_language: hasForeignLanguage,
          foreign_language: hasForeignLanguage ? foreignLanguage : null,
          payment_status: 'free_preview',
          report_unlocked: false,
        })
        .select()
        .single()

      if (reportError) throw reportError

      router.push(`/audit/${report.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload thất bại')
    } finally {
      setUploading(false)
    }
  }

  if (mode === 'draft') {
    router.push('/dashboard/draft')
    return null
  }

  const validation = validateImages()
  const hasPDP = images.some(img => img.type === 'pdp')
  const hasNutrition = images.some(img => img.type === 'nutrition')

  return (
    <Card className="p-8">
      <div className="space-y-6">
        {/* Mode Selection */}
        <div className="space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2">Chọn loại phân tích</h2>
            <p className="text-muted-foreground">
              Bạn đã có nhãn hay đang làm nhãn mới?
            </p>
          </div>
          
          <RadioGroup value={mode} onValueChange={(value) => setMode(value as AnalysisMode)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className={`p-6 cursor-pointer transition-all ${mode === 'audit' ? 'border-primary border-2 bg-primary/5' : 'hover:border-primary/50'}`} onClick={() => setMode('audit')}>
                <div className="flex items-start space-x-4">
                  <RadioGroupItem value="audit" id="audit" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="audit" className="cursor-pointer">
                      <div className="flex items-center gap-2 mb-2">
                        <FileCheck className="h-5 w-5 text-primary" />
                        <span className="font-semibold text-lg">Audit Mode - Tôi đã có nhãn</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Upload ảnh nhãn hiện tại để kiểm tra tuân thủ FDA. AI sẽ quét và phát hiện vi phạm.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="secondary" className="text-xs">Phát hiện lỗi</Badge>
                        <Badge variant="secondary" className="text-xs">Citations CFR</Badge>
                        <Badge variant="secondary" className="text-xs">Sửa lỗi nhanh</Badge>
                      </div>
                    </Label>
                  </div>
                </div>
              </Card>
              
              <Card className={`p-6 cursor-pointer transition-all ${mode === 'draft' ? 'border-primary border-2 bg-primary/5' : 'hover:border-primary/50'}`} onClick={() => setMode('draft')}>
                <div className="flex items-start space-x-4">
                  <RadioGroupItem value="draft" id="draft" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="draft" className="cursor-pointer">
                      <div className="flex items-center gap-2 mb-2">
                        <FilePlus className="h-5 w-5 text-green-600" />
                        <span className="font-semibold text-lg">Draft Mode - Tôi đang làm nhãn mới</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Nhập thông tin sản phẩm để AI tư vấn thiết kế nhãn tuân thủ FDA từ đầu.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">Tư vấn thiết kế</Badge>
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">Template nhãn</Badge>
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">FDA Specs</Badge>
                      </div>
                    </Label>
                  </div>
                </div>
              </Card>
            </div>
          </RadioGroup>
        </div>

        {mode === 'audit' && (
          <>
            {/* Important Notice */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Quan trọng:</strong> FDA yêu cầu kiểm tra TOÀN BỘ nhãn, không chỉ 1 mặt. 
                Vui lòng upload đầy đủ để AI phân tích chính xác:
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li><strong>Mặt trước (PDP)</strong> - Có Net Weight, Brand name (BẮT BUỘC)</li>
                  <li><strong>Bảng Nutrition Facts</strong> - Thành phần dinh dưỡng (BẮT BUỘC)</li>
                  <li>Thành phần & Allergens (Khuyến nghị)</li>
                  <li>Các mặt khác nếu có claims (Tùy chọn)</li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* Upload Areas for Each Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* PDP Upload */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <span className="text-xl">{IMAGE_TYPES.pdp.icon}</span>
                    {IMAGE_TYPES.pdp.label}
                    <Badge variant="destructive" className="text-xs">Bắt buộc</Badge>
                  </Label>
                  {hasPDP && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                </div>
                <p className="text-xs text-muted-foreground mb-2">{IMAGE_TYPES.pdp.description}</p>
                <div
                  onDrop={(e) => handleDrop(e, 'pdp')}
                  onDragOver={handleDragOver}
                  className={`border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors ${hasPDP ? 'border-green-500 bg-green-50' : 'border-border'}`}
                >
                  <label htmlFor="pdp-upload" className="cursor-pointer">
                    <div className="space-y-2">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-sm">Upload mặt trước</p>
                    </div>
                    <input
                      id="pdp-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, 'pdp')}
                      multiple
                    />
                  </label>
                </div>
              </div>

              {/* Nutrition Facts Upload */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <span className="text-xl">{IMAGE_TYPES.nutrition.icon}</span>
                    {IMAGE_TYPES.nutrition.label}
                    <Badge variant="destructive" className="text-xs">Bắt buộc</Badge>
                  </Label>
                  {hasNutrition && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                </div>
                <p className="text-xs text-muted-foreground mb-2">{IMAGE_TYPES.nutrition.description}</p>
                <div
                  onDrop={(e) => handleDrop(e, 'nutrition')}
                  onDragOver={handleDragOver}
                  className={`border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors ${hasNutrition ? 'border-green-500 bg-green-50' : 'border-border'}`}
                >
                  <label htmlFor="nutrition-upload" className="cursor-pointer">
                    <div className="space-y-2">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-sm">Upload Nutrition Facts</p>
                    </div>
                    <input
                      id="nutrition-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, 'nutrition')}
                      multiple
                    />
                  </label>
                </div>
              </div>

              {/* Ingredients Upload */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <span className="text-xl">{IMAGE_TYPES.ingredients.icon}</span>
                  {IMAGE_TYPES.ingredients.label}
                  <Badge variant="secondary" className="text-xs">Khuyến nghị</Badge>
                </Label>
                <p className="text-xs text-muted-foreground mb-2">{IMAGE_TYPES.ingredients.description}</p>
                <div
                  onDrop={(e) => handleDrop(e, 'ingredients')}
                  onDragOver={handleDragOver}
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors"
                >
                  <label htmlFor="ingredients-upload" className="cursor-pointer">
                    <div className="space-y-2">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-sm">Upload Ingredients</p>
                    </div>
                    <input
                      id="ingredients-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, 'ingredients')}
                      multiple
                    />
                  </label>
                </div>
              </div>

              {/* Other Upload */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <span className="text-xl">{IMAGE_TYPES.other.icon}</span>
                  {IMAGE_TYPES.other.label}
                  <Badge variant="secondary" className="text-xs">Tùy chọn</Badge>
                </Label>
                <p className="text-xs text-muted-foreground mb-2">{IMAGE_TYPES.other.description}</p>
                <div
                  onDrop={(e) => handleDrop(e, 'other')}
                  onDragOver={handleDragOver}
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors"
                >
                  <label htmlFor="other-upload" className="cursor-pointer">
                    <div className="space-y-2">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-sm">Upload mặt khác</p>
                    </div>
                    <input
                      id="other-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, 'other')}
                      multiple
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Preview Uploaded Images */}
            {images.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <ImagePlus className="h-5 w-5" />
                    Ảnh đã upload ({images.length})
                  </h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {images.map((image) => (
                    <div key={image.id} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden border-2 border-border">
                        <img
                          src={image.preview}
                          alt={image.label}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="mt-2 space-y-2">
                        <Select
                          value={image.type}
                          onValueChange={(value) => updateImageType(image.id, value as LabelImage['type'])}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(IMAGE_TYPES).map(([key, value]) => (
                              <SelectItem key={key} value={key} className="text-xs">
                                {value.icon} {value.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(image.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}

        {images.length > 0 && (
          <div className="space-y-4">
            <Button
              variant="outline"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full bg-transparent"
              type="button"
            >
              {showAdvanced ? (
                <>
                  <ChevronUp className="mr-2 h-4 w-4" />
                  Ẩn tùy chọn nâng cao
                </>
              ) : (
                <>
                  <ChevronDown className="mr-2 h-4 w-4" />
                  Hiện tùy chọn nâng cao (Phân loại, Kích thước, Ngôn ngữ)
                </>
              )}
            </Button>

            {showAdvanced && (
              <Card className="p-4 bg-muted/30">
                <CategoryDimensionSelector
                  onCategoryChange={(cat, subCat) => {
                    setCategory(cat)
                    setSubCategory(subCat)
                  }}
                  onDimensionsChange={setDimensions}
                  onLanguageChange={(hasLang, lang) => {
                    setHasForeignLanguage(hasLang)
                    setForeignLanguage(lang)
                  }}
                />
              </Card>
            )}
          </div>
        )}
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!validation.valid && images.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{validation.message}</AlertDescription>
          </Alert>
        )}

        {images.length > 0 && (
          <Button
            onClick={handleUpload}
            disabled={uploading || !validation.valid}
            className="w-full"
            size="lg"
          >
            {uploading ? 'Đang upload và phân tích...' : `Bắt đầu kiểm tra FDA (${images.length} ảnh)`}
          </Button>
        )}
      </div>
    </Card>
  )
}
