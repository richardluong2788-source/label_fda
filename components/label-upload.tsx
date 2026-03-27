'use client'

import { Badge } from "@/components/ui/badge"
import React from "react"

import { useState, useCallback } from 'react'
import { Upload, FileImage, X, ChevronDown, ChevronUp, FileCheck, FilePlus, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { CategoryDimensionSelector } from './category-dimension-selector'
import Link from 'next/link'

type AnalysisMode = 'audit' | 'draft'

interface LabelImage {
  file: File
  preview: string
  type: 'pdp' | 'nutrition' | 'ingredients' | 'other'
  label: string
}

export function LabelUpload() {
  const [mode, setMode] = useState<AnalysisMode>('audit')
  const [images, setImages] = useState<LabelImage[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
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

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.type.startsWith('image/')) {
        setError('Please select an image file')
        return
      }
      setFile(selectedFile)
      setError(null)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(selectedFile)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      if (!droppedFile.type.startsWith('image/')) {
        setError('Please select an image file')
        return
      }
      setFile(droppedFile)
      setError(null)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(droppedFile)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const clearFile = useCallback(() => {
    setFile(null)
    setPreview(null)
    setError(null)
  }, [])

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('You must be logged in to upload files')
      }

      // Sanitize file name: remove accents, spaces, and special characters
      const sanitizedName = file.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '-')
        .replace(/-+/g, '-')

      // Upload to storage
      const fileName = `${user.id}/${Date.now()}-${sanitizedName}`
      const { error: uploadError } = await supabase.storage
        .from('label-images')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('label-images')
        .getPublicUrl(fileName)

      // Create audit report with additional metadata
      const { data: report, error: reportError } = await supabase
        .from('audit_reports')
        .insert({
          user_id: user.id,
          label_image_url: publicUrl,
          status: 'pending',
          product_category: category || null,
          product_sub_category: subCategory || null,
          physical_width_cm: dimensions.physicalWidth || null,
          physical_height_cm: dimensions.physicalHeight || null,
          pixel_width: dimensions.pixelWidth || null,
          pixel_height: dimensions.pixelHeight || null,
          has_foreign_language: hasForeignLanguage,
          foreign_language: hasForeignLanguage ? foreignLanguage : null,
          payment_status: 'free_preview', // Default to free preview
          report_unlocked: false, // Locked by default
        })
        .select()
        .single()

      if (reportError) throw reportError

      // Navigate to audit page (will redirect to preview if not paid)
      router.push(`/audit/${report.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  // If draft mode is selected, redirect to dedicated draft page
  if (mode === 'draft') {
    router.push('/dashboard/draft')
    return null
  }

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
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 transition-colors"
          >
            {preview ? (
              <div className="space-y-4">
                <div className="relative inline-block">
                  <img
                    src={preview || "/placeholder.svg"}
                    alt="Preview"
                    className="max-h-64 rounded-lg shadow-md"
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute -top-2 -right-2"
                    onClick={clearFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">{file?.name}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="rounded-full bg-primary/10 p-6">
                    <Upload className="h-12 w-12 text-primary" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-medium">Tải lên hình ảnh nhãn</p>
                  <p className="text-sm text-muted-foreground">
                    Kéo thả hình ảnh nhãn thực phẩm vào đây, hoặc nhấp để chọn file
                  </p>
                </div>
                <label htmlFor="file-upload">
                  <Button variant="outline" className="cursor-pointer bg-transparent" asChild>
                    <span>
                      <FileImage className="mr-2 h-4 w-4" />
                      Chọn file
                    </span>
                  </Button>
                  <input
                    id="file-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            )}
          </div>
        )}

        {file && (
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
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {file && (
          <Button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full"
            size="lg"
          >
            {uploading ? 'Đang tải lên...' : 'Bắt đầu kiểm tra tuân thủ FDA'}
          </Button>
        )}
      </div>
    </Card>
  )
}
