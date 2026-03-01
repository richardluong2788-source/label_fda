'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info, Ruler, Languages } from 'lucide-react'
import { PRODUCT_CATEGORIES } from '@/lib/product-categories'

interface Props {
  onCategoryChange: (category: string, subcategory: string) => void
  onDimensionsChange: (dimensions: {
    physicalWidth: number
    physicalHeight: number
    pixelWidth: number
    pixelHeight: number
  }) => void
  onLanguageChange: (hasForeign: boolean, language: string) => void
}

export function CategoryDimensionSelector({
  onCategoryChange,
  onDimensionsChange,
  onLanguageChange,
}: Props) {
  const [category, setCategory] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [physicalWidth, setPhysicalWidth] = useState('')
  const [physicalHeight, setPhysicalHeight] = useState('')
  const [pixelWidth, setPixelWidth] = useState('')
  const [pixelHeight, setPixelHeight] = useState('')
  const [hasForeignLanguage, setHasForeignLanguage] = useState(false)
  const [foreignLanguage, setForeignLanguage] = useState('')

  const selectedCategory = PRODUCT_CATEGORIES.find((cat) => cat.id === category)
  const subcategories = selectedCategory?.subcategories || []

  // Update parent when values change
  useEffect(() => {
    if (category) {
      onCategoryChange(category, subcategory)
    }
  }, [category, subcategory, onCategoryChange])

  useEffect(() => {
    const pw = Number.parseFloat(physicalWidth) || 0
    const ph = Number.parseFloat(physicalHeight) || 0
    const pxw = Number.parseFloat(pixelWidth) || 0
    const pxh = Number.parseFloat(pixelHeight) || 0

    if (pw > 0 && ph > 0) {
      onDimensionsChange({
        physicalWidth: pw,
        physicalHeight: ph,
        pixelWidth: pxw,
        pixelHeight: pxh,
      })
    }
  }, [physicalWidth, physicalHeight, pixelWidth, pixelHeight, onDimensionsChange])

  useEffect(() => {
    onLanguageChange(hasForeignLanguage, foreignLanguage)
  }, [hasForeignLanguage, foreignLanguage, onLanguageChange])

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Phân loại sản phẩm</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Giúp chúng tôi áp dụng đúng quy định FDA cho sản phẩm của bạn
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Chọn đúng danh mục đảm bảo kiểm tra tuân thủ chính xác dựa trên yêu cầu FDA cụ thể cho
          loại sản phẩm của bạn.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <div>
          <Label htmlFor="category">Danh mục sản phẩm</Label>
          <Select
            value={category}
            onValueChange={(val) => {
              setCategory(val)
              setSubcategory('')
            }}
          >
            <SelectTrigger id="category">
              <SelectValue placeholder="Chọn danh mục" />
            </SelectTrigger>
            <SelectContent>
              {PRODUCT_CATEGORIES.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedCategory && (
            <p className="text-xs text-muted-foreground mt-1">
              Quy định: {selectedCategory.regulations.join(', ')}
            </p>
          )}
        </div>

        {subcategories.length > 0 && (
          <div>
            <Label htmlFor="subcategory">Phân loại chi tiết (Tùy chọn)</Label>
            <Select value={subcategory} onValueChange={setSubcategory}>
              <SelectTrigger id="subcategory">
                <SelectValue placeholder="Chọn phân loại chi tiết" />
              </SelectTrigger>
              <SelectContent>
                {subcategories.map((sub) => (
                  <SelectItem key={sub.id} value={sub.id}>
                    {sub.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="border-t pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Ruler className="h-5 w-5 text-primary" />
            <h4 className="font-semibold">Kích thước vật lý</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Nhập kích thước thực tế của nhãn/bao bì để xác thực chính xác kích thước font chữ (21
            CFR 101.105)
          </p>

          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <Label htmlFor="width">Rộng (cm)</Label>
              <Input
                id="width"
                type="number"
                step="0.1"
                min="0"
                placeholder="VD: 10"
                value={physicalWidth}
                onChange={(e) => setPhysicalWidth(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="height">Cao (cm)</Label>
              <Input
                id="height"
                type="number"
                step="0.1"
                min="0"
                placeholder="VD: 15"
                value={physicalHeight}
                onChange={(e) => setPhysicalHeight(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pixelWidth">Chiều rộng hình (pixel)</Label>
              <Input
                id="pixelWidth"
                type="number"
                min="0"
                placeholder="VD: 1000"
                value={pixelWidth}
                onChange={(e) => setPixelWidth(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="pixelHeight">Chiều cao hình (pixel)</Label>
              <Input
                id="pixelHeight"
                type="number"
                min="0"
                placeholder="VD: 1500"
                value={pixelHeight}
                onChange={(e) => setPixelHeight(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Kích thước pixel có thể xem trong thuộc tính file hình ảnh
          </p>
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Languages className="h-5 w-5 text-primary" />
            <h4 className="font-semibold">Nhãn đa ngôn ngữ</h4>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              id="hasForeignLanguage"
              checked={hasForeignLanguage}
              onChange={(e) => setHasForeignLanguage(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="hasForeignLanguage" className="cursor-pointer">
              Nhãn này có chữ ngoài tiếng Anh
            </Label>
          </div>

          {hasForeignLanguage && (
            <div>
              <Label htmlFor="language">Ngôn ngữ</Label>
              <Select value={foreignLanguage} onValueChange={setForeignLanguage}>
                <SelectTrigger id="language">
                  <SelectValue placeholder="Chọn ngôn ngữ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vietnamese">Tiếng Việt</SelectItem>
                  <SelectItem value="spanish">Tiếng Tây Ban Nha</SelectItem>
                  <SelectItem value="chinese">Tiếng Trung</SelectItem>
                  <SelectItem value="french">Tiếng Pháp</SelectItem>
                  <SelectItem value="other">Khác</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                FDA yêu cầu tất cả thông tin bắt buộc phải xuất hiện bằng cả tiếng Anh và ngôn
                ngữ nước ngoài (21 CFR 101.15)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
