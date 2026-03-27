'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Factory, 
  Building2, 
  CheckCircle, 
  Send, 
  ExternalLink,
  Loader2 
} from 'lucide-react'

interface RegistrationStatusCheckerProps {
  locale: string
  registrationStatus: {
    hasFFR: boolean | null
    hasFCESID: boolean | null
  }
  onConfirmFFR: () => void
  onRequestFFRHelp: () => void
  onConfirmFCESID: () => void
  onRequestFCESIDHelp: () => void
  onSkip: () => void
  fceSidRegulation?: string | null
  isCreating?: boolean
}

export function RegistrationStatusChecker({
  locale,
  registrationStatus,
  onConfirmFFR,
  onRequestFFRHelp,
  onConfirmFCESID,
  onRequestFCESIDHelp,
  onSkip,
  fceSidRegulation,
  isCreating = false,
}: RegistrationStatusCheckerProps) {
  // Step 1: FFR Check
  if (registrationStatus.hasFFR === null) {
    return (
      <div className="bg-amber-100 rounded-lg p-4 text-sm border border-amber-300">
        <div className="flex items-center gap-2 mb-2">
          <Factory className="h-5 w-5 text-amber-700" />
          <span className="font-semibold text-amber-800">
            {locale === 'vi' ? 'Bước 1: Cơ sở đã đăng ký FFR chưa?' : 'Step 1: Does the facility have FFR?'}
          </span>
        </div>
        <p className="text-amber-700 mb-3">
          {locale === 'vi' 
            ? 'FFR (Food Facility Registration) là điều kiện tiên quyết trước khi đăng ký FCE/SID. Cơ sở phải có FEI number từ FDA.'
            : 'FFR (Food Facility Registration) is required before FCE/SID registration. Facility must have FEI number from FDA.'}
        </p>
        
        <div className="flex flex-wrap gap-2">
          <Button 
            size="sm"
            onClick={onConfirmFFR}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            {locale === 'vi' ? 'Có FFR rồi' : 'Yes, have FFR'}
          </Button>
          <Button 
            size="sm"
            variant="outline"
            onClick={onRequestFFRHelp}
            className="border-amber-500 text-amber-700 hover:bg-amber-200"
          >
            <Send className="h-4 w-4 mr-1" />
            {locale === 'vi' ? 'Chưa có - Vexim hỗ trợ' : 'No - Vexim Support'}
          </Button>
          <a 
            href="https://www.fda.gov/food/registration-food-facilities-and-other-submissions/food-facility-registration"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-amber-700 hover:bg-amber-200 text-xs border border-amber-400"
          >
            <ExternalLink className="h-3 w-3" />
            {locale === 'vi' ? 'Tự đăng ký FFR' : 'Self-register FFR'}
          </a>
          <Button 
            size="sm"
            variant="ghost"
            onClick={onSkip}
            className="text-amber-600 hover:bg-amber-100"
          >
            {locale === 'vi' ? 'Bỏ qua, xem trước' : 'Skip, preview'}
          </Button>
        </div>
      </div>
    )
  }

  // Step 2: FCE/SID Check (only shown if FFR confirmed)
  if (registrationStatus.hasFFR === true) {
    return (
      <div className="bg-orange-100 rounded-lg p-4 text-sm border border-orange-300">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="h-5 w-5 text-orange-700" />
          <span className="font-semibold text-orange-800">
            {locale === 'vi' ? 'Bước 2: Cơ sở đã có FCE/SID chưa?' : 'Step 2: Does the facility have FCE/SID?'}
          </span>
          {fceSidRegulation && (
            <Badge className="bg-orange-700 text-white text-[9px]">
              {fceSidRegulation}
            </Badge>
          )}
        </div>
        <p className="text-orange-700 mb-3">
          {locale === 'vi' 
            ? 'Sản phẩm LACF/Acidified cần FCE Number và SID (process filing). Nếu chưa có, sản phẩm sẽ bị detention.'
            : 'LACF/Acidified products require FCE Number and SID (process filing). Without it, products will be detained.'}
        </p>
        
        <div className="flex flex-wrap gap-2 mb-3">
          <a 
            href="https://www.fda.gov/food/registration-food-facilities/food-canning-establishment-registration"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-orange-700 hover:text-orange-900 underline text-xs"
          >
            <ExternalLink className="h-3 w-3" />
            {locale === 'vi' ? 'Tra cứu FCE Database' : 'Search FCE Database'}
          </a>
          <a 
            href="https://www.fda.gov/food/guidance-regulation-food-and-dietary-supplements/better-process-control-school"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-orange-700 hover:text-orange-900 underline text-xs"
          >
            <ExternalLink className="h-3 w-3" />
            {locale === 'vi' ? 'BPCS Training' : 'BPCS Training'}
          </a>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button 
            size="sm"
            onClick={onConfirmFCESID}
            disabled={isCreating}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-1" />
            )}
            {locale === 'vi' ? 'Có FCE/SID - Tạo FSVP' : 'Yes - Create FSVP'}
          </Button>
          <Button 
            size="sm"
            variant="outline"
            onClick={onRequestFCESIDHelp}
            className="border-orange-500 text-orange-700 hover:bg-orange-200"
          >
            <Send className="h-4 w-4 mr-1" />
            {locale === 'vi' ? 'Chưa có - Vexim hỗ trợ FCE/SID' : 'No - Vexim FCE/SID Support'}
          </Button>
          <Button 
            size="sm"
            variant="ghost"
            onClick={onSkip}
            disabled={isCreating}
            className="text-orange-600 hover:bg-orange-100"
          >
            {locale === 'vi' ? 'Bỏ qua, xem trước' : 'Skip, preview'}
          </Button>
        </div>
      </div>
    )
  }

  return null
}
