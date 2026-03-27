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
import { Factory, CheckCircle, Loader2, Send, AlertTriangle, ExternalLink } from 'lucide-react'

interface FfrConsultationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  locale: string
  productName?: string
  productCategory?: string
  countryOfOrigin?: string
  auditReportId?: string
  onSubmitSuccess?: () => void
}

export function FfrConsultationDialog({
  open,
  onOpenChange,
  locale,
  productName = '',
  productCategory = '',
  countryOfOrigin = '',
  auditReportId = '',
  onSubmitSuccess,
}: FfrConsultationDialogProps) {
  const [form, setForm] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    facilityName: '',
    facilityAddress: '',
    facilityCountry: '',
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
      const response = await fetch('/api/fsvp/ffr-consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          productName,
          productCategory,
          countryOfOrigin,
          auditReportId,
          requestType: 'ffr_registration',
        }),
      })
      
      if (!response.ok) {
        // Fallback to mailto
        const mailtoLink = `mailto:ffr-support@vexim.io?subject=${encodeURIComponent(
          `FFR Registration Support - ${form.companyName}`
        )}&body=${encodeURIComponent(
          `Company: ${form.companyName}\n` +
          `Contact: ${form.contactName}\n` +
          `Email: ${form.email}\n` +
          `Phone: ${form.phone}\n` +
          `Facility: ${form.facilityName}\n` +
          `Address: ${form.facilityAddress}\n` +
          `Country: ${form.facilityCountry}\n` +
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
          facilityName: '',
          facilityAddress: '',
          facilityCountry: '',
          message: '',
        })
        onSubmitSuccess?.()
      }, 2000)
    } catch {
      // Fallback to mailto
      const mailtoLink = `mailto:ffr-support@vexim.io?subject=${encodeURIComponent(
        `FFR Registration Support - ${form.companyName}`
      )}&body=${encodeURIComponent(
        `Company: ${form.companyName}\n` +
        `Contact: ${form.contactName}\n` +
        `Email: ${form.email}\n` +
        `Phone: ${form.phone}\n` +
        `Facility: ${form.facilityName}\n` +
        `Address: ${form.facilityAddress}\n` +
        `Country: ${form.facilityCountry}\n` +
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
            <Factory className="h-5 w-5 text-amber-600" />
            {locale === 'vi' 
              ? 'Đăng Ký FFR (Food Facility Registration)' 
              : 'FFR (Food Facility Registration) Support'}
          </DialogTitle>
          <DialogDescription>
            {locale === 'vi'
              ? 'FFR là bước bắt buộc trước khi đăng ký FCE/SID. Vexim sẽ hỗ trợ bạn đăng ký FFR và nhận FEI number từ FDA trong 2-5 ngày.'
              : 'FFR is required before FCE/SID registration. Vexim will help you register FFR and obtain FEI number from FDA within 2-5 business days.'}
          </DialogDescription>
        </DialogHeader>
        
        {submitted ? (
          <div className="py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="font-medium text-green-700">
              {locale === 'vi' ? 'Đã gửi yêu cầu thành công!' : 'Request submitted successfully!'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {locale === 'vi'
                ? 'Chúng tôi sẽ liên hệ trong 24h. Sau khi có FFR, bạn có thể tiếp tục đăng ký FCE/SID.'
                : 'We will contact you within 24h. After FFR is complete, you can proceed with FCE/SID.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ffrCompanyName" className="text-sm">
                  {locale === 'vi' ? 'Tên Công Ty' : 'Company Name'} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="ffrCompanyName"
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  placeholder={locale === 'vi' ? 'VD: ABC Foods Inc.' : 'e.g. ABC Foods Inc.'}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ffrContactName" className="text-sm">
                  {locale === 'vi' ? 'Người Liên Hệ' : 'Contact Name'}
                </Label>
                <Input
                  id="ffrContactName"
                  value={form.contactName}
                  onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                  placeholder={locale === 'vi' ? 'Họ và tên' : 'Full name'}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ffrEmail" className="text-sm">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="ffrEmail"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@company.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ffrPhone" className="text-sm">
                  {locale === 'vi' ? 'Số Điện Thoại' : 'Phone'}
                </Label>
                <Input
                  id="ffrPhone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+84 xxx xxx xxx"
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="facilityName" className="text-sm">
                {locale === 'vi' ? 'Tên Cơ Sở Sản Xuất' : 'Facility Name'}
              </Label>
              <Input
                id="facilityName"
                value={form.facilityName}
                onChange={(e) => setForm({ ...form, facilityName: e.target.value })}
                placeholder={locale === 'vi' ? 'Tên nhà máy cần đăng ký FFR' : 'Factory name to register'}
              />
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="facilityAddress" className="text-sm">
                  {locale === 'vi' ? 'Địa Chỉ' : 'Address'}
                </Label>
                <Input
                  id="facilityAddress"
                  value={form.facilityAddress}
                  onChange={(e) => setForm({ ...form, facilityAddress: e.target.value })}
                  placeholder={locale === 'vi' ? 'Địa chỉ nhà máy' : 'Facility address'}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="facilityCountry" className="text-sm">
                  {locale === 'vi' ? 'Quốc Gia' : 'Country'}
                </Label>
                <Input
                  id="facilityCountry"
                  value={form.facilityCountry}
                  onChange={(e) => setForm({ ...form, facilityCountry: e.target.value })}
                  placeholder={locale === 'vi' ? 'VD: Vietnam' : 'e.g. Vietnam'}
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="ffrMessage" className="text-sm">
                {locale === 'vi' ? 'Thông Tin Thêm' : 'Additional Information'}
              </Label>
              <Textarea
                id="ffrMessage"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder={locale === 'vi' 
                  ? 'Mô tả chi tiết về cơ sở, loại sản phẩm...'
                  : 'Describe your facility, product types...'}
                rows={2}
              />
            </div>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-amber-800 mb-1">
                {locale === 'vi' ? 'FFR cần thiết cho:' : 'FFR is required for:'}
              </p>
              <ul className="text-amber-700 space-y-0.5 text-xs">
                <li>• {locale === 'vi' ? 'Tất cả cơ sở sản xuất/chế biến/đóng gói xuất khẩu sang Mỹ' : 'All food facilities exporting to US'}</li>
                <li>• {locale === 'vi' ? 'Là điều kiện tiên quyết trước khi làm FCE/SID' : 'Prerequisite before FCE/SID registration'}</li>
                <li>• {locale === 'vi' ? 'Cần gia hạn mỗi 2 năm (số chẵn: 2024, 2026...)' : 'Renewal required every 2 years'}</li>
              </ul>
              <div className="mt-2">
                <a 
                  href="https://www.fda.gov/food/registration-food-facilities-and-other-submissions/food-facility-registration"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-amber-800 hover:text-amber-900 underline text-xs"
                >
                  <ExternalLink className="h-3 w-3" />
                  {locale === 'vi' ? 'Hướng dẫn FDA' : 'FDA Guide'}
                </a>
              </div>
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
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {locale === 'vi' ? 'Đang gửi...' : 'Submitting...'}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {locale === 'vi' ? 'Gửi Yêu Cầu Hỗ Trợ FFR' : 'Submit FFR Request'}
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
