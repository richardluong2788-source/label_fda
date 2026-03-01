'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X, ArrowRight, ArrowLeft } from 'lucide-react'

interface OnboardingStep {
  title: string
  description: string
  image?: string
  highlight?: string
}

const steps: OnboardingStep[] = [
  {
    title: 'Chào mừng đến với Vexim Compliance AI! 👋',
    description:
      'Hệ thống giúp bạn kiểm tra nhãn thực phẩm có tuân thủ FDA hay không chỉ trong vài phút.',
    highlight: 'welcome',
  },
  {
    title: 'Tải lên hình ảnh nhãn',
    description:
      'Nhấn "Chọn file" hoặc kéo thả hình ảnh nhãn thực phẩm của bạn vào khung bên dưới.',
    highlight: 'upload',
  },
  {
    title: 'Tùy chọn nâng cao (không bắt buộc)',
    description:
      'Nhập thêm phân loại sản phẩm, kích thước nhãn, và ngôn ngữ để AI phân tích chính xác hơn.',
    highlight: 'advanced',
  },
  {
    title: 'AI phân tích tự động',
    description:
      'Hệ thống sẽ quét nhãn, kiểm tra với 1000+ quy định FDA, và tạo báo cáo chi tiết với citations.',
    highlight: 'analysis',
  },
  {
    title: 'Xem kết quả và khuyến nghị',
    description:
      'Báo cáo sẽ hiển thị các vi phạm (nếu có) với mức độ nghiêm trọng và hướng dẫn sửa chữa cụ thể.',
    highlight: 'results',
  },
]

export function OnboardingTour() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    // Check if user has seen onboarding
    const hasSeenOnboarding = localStorage.getItem('vexim_onboarding_completed')
    if (!hasSeenOnboarding) {
      setIsOpen(true)
    }
  }, [])

  const handleComplete = () => {
    localStorage.setItem('vexim_onboarding_completed', 'true')
    setIsOpen(false)
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    handleComplete()
  }

  if (!isOpen) return null

  const step = steps[currentStep]

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-8 relative">
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  idx <= currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          <h2 className="text-2xl font-bold mb-2">{step.title}</h2>
          <p className="text-muted-foreground">{step.description}</p>
        </div>

        {step.image && (
          <div className="mb-6 rounded-lg border bg-muted/30 p-4 flex items-center justify-center h-48">
            <p className="text-muted-foreground">
              [Minh họa: {step.highlight}]
            </p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handlePrev}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </Button>

          <div className="text-sm text-muted-foreground">
            Bước {currentStep + 1} / {steps.length}
          </div>

          <Button onClick={handleNext}>
            {currentStep === steps.length - 1 ? (
              'Hoàn thành'
            ) : (
              <>
                Tiếp theo
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={handleSkip}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Bỏ qua hướng dẫn
          </button>
        </div>
      </Card>
    </div>
  )
}
