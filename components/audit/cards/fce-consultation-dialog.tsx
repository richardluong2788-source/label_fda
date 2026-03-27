'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Building2, CheckCircle, Loader2, Send, AlertTriangle } from 'lucide-react'

interface FceConsultationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  locale: string
  productName?: string
  productCategory?: string
  countryOfOrigin?: string
  auditReportId?: string
  fceSidCategory?: string | null
}

export function FceConsultationDialog({
  open,
  onOpenChange,
  locale,
  productName = '',
  productCategory = '',
  countryOfOrigin = '',
  auditReportId = '',
  fceSidCategory,
}: FceConsultationDialogProps) {
  const [form, setForm] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    supplierName: '',
    productType: '',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!form.email || !form.companyName) {
      setError(locale === 'vi' ? 'Vui lòng điền đầy đủ thông tin' : 'Please fill in required fields')
      return
    }
    
    setIsSubmitting(true)
    setError(null)
    
    try {
      const response = await fetch('/api/fsvp/fce-consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          productName,
          productCategory,
          countryOfOrigin,
          auditReportId,
          requestType: 'fce_sid_registration',
          fceSidCategory,
        }),
      })
      
      if (!response.ok) {
        // Fallback to mailto
        const mailtoLink = `mailto:fce-support@vexim.io?subject=${encodeURIComponent(
          `FCE/SID Registration Support - ${form.companyName}`
        )}&body=${encodeURIComponent(
          `Company: ${form.companyName}\n` +
          `Contact: ${form.contactName}\n` +
          `Email: ${form.email}\n` +
          `Phone: ${form.phone}\n` +
          `Supplier: ${form.supplierName}\n` +
          `Product Type: ${form.productType}\n` +
          `Product: ${productName}\n\n` +
          `Message:\n${form.message}`
        )}`
        window.open(mailtoLink, '_blank')
      }
      
      setSubmitted(true)
      setTimeout(() => {
        onOpenChange(false)
        setSubmitted(false)
        setForm({
          companyName: '',
          contactName: '',
          email: '',
          phone: '',
          supplierName: '',
          productType: '',
          message: '',
        })
      }, 2000)
    } catch {
      // Fallback to mailto
      const mailtoLink = `mailto:fce-support@vexim.io?subject=${encodeURIComponent(
        `FCE/SID Registration Support - ${form.companyName}`
      )}&body=${encodeURIComponent(
        `Company: ${form.companyName}\n` +
        `Contact: ${form.contactName}\n` +
        `Email: ${form.email}\n` +
        `Phone: ${form.phone}\n` +
        `Supplier: ${form.supplierName}\n` +
        `Product Type: ${form.productType}\n` +
        `Product: ${productName}\n\n` +
        `Message:\n${form.message}`
      )}`
      window.open(mailtoLink, '_blank')
      setSubmitted(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-orange-600" />
            {locale === 'vi' 
              ? 'Đăng Ký Tư Vấn FCE/SID' 
              : 'FCE/SID Registration Consultation'}
          </DialogTitle>
          <DialogDescription>
            {locale === 'vi'
              ? 'Vexim sẽ liên hệ với bạn trong vòng 24h để hỗ trợ đăng ký FCE/SID với FDA.'
              : 'Vexim will contact you within 24 hours to assist with FCE/SID registration with FDA.'}
          </DialogDescription>
        </DialogHeader>
        
        {submitted ? (
          <div className="py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="font-medium text-green-700">
              {locale === 'vi' ? 'Đã gửi yêu cầu thành công!' : 'Request submitted successfully!'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {locale === 'vi' ? 'Chúng tôi sẽ liên hệ trong 24h.' : 'We will contact you within 24 hours.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="companyName" className="text-sm">
                  {locale === 'vi' ? 'Tên Công Ty' : 'Company Name'} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="companyName"
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  placeholder={locale === 'vi' ? 'VD: ABC Foods Inc.' : 'e.g. ABC Foods Inc.'}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contactName" className="text-sm">
                  {locale === 'vi' ? 'Người Liên Hệ' : 'Contact Name'}
                </Label>
                <Input
                  id="contactName"
                  value={form.contactName}
                  onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                  placeholder={locale === 'vi' ? 'Họ và tên' : 'Full name'}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@company.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-sm">
                  {locale === 'vi' ? 'Số Điện Thoại' : 'Phone'}
                </Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+84 xxx xxx xxx"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="supplierName" className="text-sm">
                  {locale === 'vi' ? 'Tên Nhà Máy/Supplier' : 'Factory/Supplier Name'}
                </Label>
                <Input
                  id="supplierName"
                  value={form.supplierName}
                  onChange={(e) => setForm({ ...form, supplierName: e.target.value })}
                  placeholder={locale === 'vi' ? 'Tên nhà máy cần đăng ký FCE' : 'Factory needing FCE registration'}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="productType" className="text-sm">
                  {locale === 'vi' ? 'Loại Sản Phẩm' : 'Product Type'}
                </Label>
                <Input
                  id="productType"
                  value={form.productType}
                  onChange={(e) => setForm({ ...form, productType: e.target.value })}
                  placeholder={locale === 'vi' ? 'VD: Đồ hộp, dưa chua...' : 'e.g. Canned goods, pickles...'}
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="message" className="text-sm">
                {locale === 'vi' ? 'Thông Tin Thêm' : 'Additional Information'}
              </Label>
              <Textarea
                id="message"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder={locale === 'vi' 
                  ? 'Mô tả chi tiết về sản phẩm, quy trình sản xuất...'
                  : 'Describe your products, manufacturing process...'}
                rows={3}
              />
            </div>
            
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-orange-800 mb-1">
                {locale === 'vi' ? 'Vexim hỗ trợ:' : 'Vexim assists with:'}
              </p>
              <ul className="text-orange-700 space-y-0.5 text-xs">
                <li>• {locale === 'vi' ? 'Đăng ký FCE với FDA' : 'FCE registration with FDA'}</li>
                <li>• {locale === 'vi' ? 'Process filing và lấy SID number' : 'Process filing and SID number'}</li>
                <li>• {locale === 'vi' ? 'Kiểm tra scheduled process' : 'Scheduled process validation'}</li>
                <li>• {locale === 'vi' ? 'Tư vấn LACF/Acidified compliance' : 'LACF/Acidified compliance consulting'}</li>
              </ul>
            </div>
            
            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-2 rounded">
                <AlertTriangle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}
        
        {!submitted && (
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {locale === 'vi' ? 'Hủy' : 'Cancel'}
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting || !form.email || !form.companyName}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {locale === 'vi' ? 'Đang gửi...' : 'Submitting...'}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {locale === 'vi' ? 'Gửi Yêu Cầu Tư Vấn' : 'Submit Request'}
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
