'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { LabelImageEntry } from '@/lib/types'

const LABEL_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  pdp: { label: 'PDP', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  nutrition: { label: 'Nutrition Facts', color: 'bg-green-100 text-green-700 border-green-200' },
  ingredients: { label: 'Ingredients', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  other: { label: 'Other', color: 'bg-slate-100 text-slate-700 border-slate-200' },
}

interface LabelImageGalleryProps {
  images: LabelImageEntry[]
  fallbackUrl?: string
  scanning?: boolean
  scanPosition?: number
  autoRotate?: boolean
  autoRotateInterval?: number
}

export function LabelImageGallery({
  images,
  fallbackUrl,
  scanning = false,
  scanPosition = 0,
  autoRotate = false,
  autoRotateInterval = 4000,
}: LabelImageGalleryProps) {
  // Derive the effective list: use label_images if available, else fallback to single URL
  const imageList: LabelImageEntry[] =
    images && images.length > 0
      ? images
      : fallbackUrl
        ? [{ type: 'pdp', url: fallbackUrl }]
        : []

  const [activeIndex, setActiveIndex] = useState(0)

  // Auto-rotate through images during scanning
  useEffect(() => {
    if (!autoRotate || imageList.length <= 1) return
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % imageList.length)
    }, autoRotateInterval)
    return () => clearInterval(interval)
  }, [autoRotate, imageList.length, autoRotateInterval])

  if (imageList.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-slate-100 rounded-lg">
        <p className="text-muted-foreground text-sm">Khong co hinh anh</p>
      </div>
    )
  }

  const activeImage = imageList[activeIndex]
  const typeConfig = LABEL_TYPE_CONFIG[activeImage.type] || LABEL_TYPE_CONFIG.other

  return (
    <div className="space-y-3">
      {/* Main Image */}
      <div className="relative rounded-lg overflow-hidden bg-slate-100">
        <img
          src={activeImage.url || '/placeholder.svg'}
          alt={`Label - ${typeConfig.label}`}
          className="w-full h-auto"
        />

        {/* Type Badge on active image */}
        <div className="absolute top-3 left-3">
          <Badge variant="outline" className={cn('text-xs font-medium border backdrop-blur-sm', typeConfig.color)}>
            {typeConfig.label}
          </Badge>
        </div>

        {/* Scanning overlay */}
        {scanning && (
          <>
            <div
              className="absolute inset-0 bg-gradient-to-b from-primary/20 via-transparent to-transparent pointer-events-none"
              style={{
                top: `${scanPosition}%`,
                height: '20%',
                transition: 'top 0.03s linear',
              }}
            />
            <div
              className="absolute left-0 right-0 h-0.5 bg-primary shadow-lg shadow-primary/50 pointer-events-none"
              style={{
                top: `${scanPosition}%`,
                transition: 'top 0.03s linear',
              }}
            />
            {/* Scanning status badge */}
            <div className="absolute top-3 right-3">
              <Badge className="bg-primary/90 backdrop-blur-sm text-xs">
                <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                Dang quet...
              </Badge>
            </div>
          </>
        )}
      </div>

      {/* Thumbnail Strip (only show when multiple images) */}
      {imageList.length > 1 && (
        <div className="flex gap-2">
          {imageList.map((img, idx) => {
            const config = LABEL_TYPE_CONFIG[img.type] || LABEL_TYPE_CONFIG.other
            const isActive = idx === activeIndex
            return (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={cn(
                  'relative flex-1 max-w-[80px] rounded-lg overflow-hidden border-2 transition-all',
                  isActive
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-transparent hover:border-muted-foreground/30'
                )}
              >
                <img
                  src={img.url || '/placeholder.svg'}
                  alt={config.label}
                  className="w-full h-14 object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1 py-0.5">
                  <span className="text-[9px] font-medium text-white leading-none">
                    {config.label}
                  </span>
                </div>
                {scanning && isActive && (
                  <div className="absolute inset-0 border-2 border-primary rounded-lg animate-pulse" />
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Image count info */}
      {imageList.length > 1 && (
        <p className="text-xs text-muted-foreground text-center">
          {activeIndex + 1} / {imageList.length} hinh anh nhan
        </p>
      )}
    </div>
  )
}
