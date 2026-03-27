'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Ship, 
  Factory, 
  ArrowRight, 
  CheckCircle,
  FileCheck,
  ClipboardList,
  Shield,
  Package,
  UserCheck,
  GraduationCap,
} from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

export type FSVPUserRole = 'importer' | 'supplier' | 'qi'

interface RoleSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRoleSelected: (role: FSVPUserRole) => void
  productName?: string
  isSAHCODHA?: boolean
}

export function RoleSelectionDialog({
  open,
  onOpenChange,
  onRoleSelected,
  productName,
  isSAHCODHA,
}: RoleSelectionDialogProps) {
  const { locale } = useTranslation()
  const [selectedRole, setSelectedRole] = useState<FSVPUserRole | null>(null)

  const handleConfirm = () => {
    if (selectedRole) {
      // Save role preference to localStorage for future sessions
      localStorage.setItem('fsvp_user_role', selectedRole)
      onRoleSelected(selectedRole)
      onOpenChange(false)
    }
  }

  const roles = [
    {
      id: 'importer' as FSVPUserRole,
      icon: Ship,
      title: locale === 'vi' ? 'Tôi là Importer (Nhà nhập khẩu)' : 'I am an Importer',
      subtitle: locale === 'vi' 
        ? 'Nhập khẩu thực phẩm vào Hoa Kỳ' 
        : 'Importing food into the United States',
      description: locale === 'vi'
        ? 'Bạn cần thực hiện FSVP để đảm bảo foreign supplier tuân thủ FDA requirements.'
        : 'You need to conduct FSVP to ensure your foreign supplier meets FDA requirements.',
      features: [
        locale === 'vi' ? 'Tạo Hazard Analysis cho sản phẩm nhập khẩu' : 'Create Hazard Analysis for imported products',
        locale === 'vi' ? 'Liên kết và quản lý Foreign Suppliers' : 'Link and manage Foreign Suppliers',
        locale === 'vi' ? 'Lập kế hoạch Supplier Verification' : 'Plan Supplier Verification activities',
        locale === 'vi' ? 'Lưu trữ records theo 21 CFR Part 1' : 'Maintain records per 21 CFR Part 1',
      ],
      color: 'blue',
    },
    {
      id: 'supplier' as FSVPUserRole,
      icon: Factory,
      title: locale === 'vi' ? 'Tôi là Supplier (Nhà cung cấp)' : 'I am a Supplier',
      subtitle: locale === 'vi' 
        ? 'Xuất khẩu thực phẩm sang Hoa Kỳ' 
        : 'Exporting food to the United States',
      description: locale === 'vi'
        ? 'Chuẩn bị tài liệu và chứng từ để hỗ trợ US Importers thực hiện FSVP.'
        : 'Prepare documentation to support US Importers with their FSVP compliance.',
      features: [
        locale === 'vi' ? 'Tự đánh giá compliance (Self-Assessment)' : 'Self-assess compliance readiness',
        locale === 'vi' ? 'Chuẩn bị tài liệu HACCP, Certificates' : 'Prepare HACCP plans, Certificates',
        locale === 'vi' ? 'Xem yêu cầu từ US Importers' : 'View requirements from US Importers',
        locale === 'vi' ? 'Chia sẻ documents với đối tác' : 'Share documents with partners',
      ],
      color: 'emerald',
    },
    {
      id: 'qi' as FSVPUserRole,
      icon: GraduationCap,
      title: locale === 'vi' ? 'Tôi là Qualified Individual (QI)' : 'I am a Qualified Individual (QI)',
      subtitle: locale === 'vi' 
        ? 'Chuyên gia FSVP compliance' 
        : 'FSVP Compliance Expert',
      description: locale === 'vi'
        ? 'Thực hiện và giám sát các hoạt động FSVP theo 21 CFR 1.502.'
        : 'Perform and oversee FSVP activities per 21 CFR 1.502 requirements.',
      features: [
        locale === 'vi' ? 'Review và phê duyệt Hazard Analysis' : 'Review and approve Hazard Analysis',
        locale === 'vi' ? 'Đánh giá năng lực Supplier' : 'Evaluate Supplier capabilities',
        locale === 'vi' ? 'Lập kế hoạch Verification activities' : 'Plan Verification activities',
        locale === 'vi' ? 'Sign-off Corrective Actions' : 'Sign-off Corrective Actions',
      ],
      color: 'violet',
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shield className="h-5 w-5 text-primary" />
            {locale === 'vi' ? 'Bạn đang sử dụng FSVP với vai trò nào?' : 'What is your role in FSVP?'}
          </DialogTitle>
          <DialogDescription>
            {productName && (
              <span className="block mt-1">
                <span className="font-medium">{locale === 'vi' ? 'Sản phẩm: ' : 'Product: '}</span>
                {productName}
                {isSAHCODHA && (
                  <Badge className="ml-2 bg-amber-500 text-white text-[10px]">SAHCODHA</Badge>
                )}
              </span>
            )}
            <span className="block mt-2 text-sm">
              {locale === 'vi' 
                ? 'Chọn vai trò để hệ thống hiển thị giao diện và tính năng phù hợp với bạn.'
                : 'Select your role so we can show you the appropriate features and workflow.'}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 md:grid-cols-3">
          {roles.map((role) => {
            const Icon = role.icon
            const isSelected = selectedRole === role.id
            const colorClasses = role.color === 'blue' 
              ? {
                  border: isSelected ? 'border-blue-500 bg-blue-50' : 'border-border hover:border-blue-300',
                  icon: 'text-blue-600',
                  badge: 'bg-blue-100 text-blue-700',
                  check: 'text-blue-500',
                }
              : role.color === 'violet'
              ? {
                  border: isSelected ? 'border-violet-500 bg-violet-50' : 'border-border hover:border-violet-300',
                  icon: 'text-violet-600',
                  badge: 'bg-violet-100 text-violet-700',
                  check: 'text-violet-500',
                }
              : {
                  border: isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-border hover:border-emerald-300',
                  icon: 'text-emerald-600',
                  badge: 'bg-emerald-100 text-emerald-700',
                  check: 'text-emerald-500',
                }

            return (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`relative flex flex-col items-start gap-3 rounded-lg border-2 p-4 text-left transition-all ${colorClasses.border}`}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle className={`h-5 w-5 ${colorClasses.check}`} />
                  </div>
                )}
                
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${colorClasses.badge}`}>
                    <Icon className={`h-6 w-6 ${colorClasses.icon}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{role.title}</h3>
                    <p className="text-xs text-muted-foreground">{role.subtitle}</p>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground">{role.description}</p>
                
                <ul className="space-y-1.5 text-xs text-muted-foreground w-full">
                  {role.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${colorClasses.check}`} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </button>
            )
          })}
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {locale === 'vi' ? 'Hủy' : 'Cancel'}
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!selectedRole}
            className={selectedRole === 'importer' 
              ? 'bg-blue-600 hover:bg-blue-700' 
              : selectedRole === 'supplier'
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : selectedRole === 'qi'
              ? 'bg-violet-600 hover:bg-violet-700'
              : ''
            }
          >
            {selectedRole === 'importer' ? (
              <>
                <ClipboardList className="h-4 w-4 mr-2" />
                {locale === 'vi' ? 'Tiếp tục với Importer' : 'Continue as Importer'}
              </>
            ) : selectedRole === 'supplier' ? (
              <>
                <Package className="h-4 w-4 mr-2" />
                {locale === 'vi' ? 'Tiếp tục với Supplier' : 'Continue as Supplier'}
              </>
            ) : selectedRole === 'qi' ? (
              <>
                <UserCheck className="h-4 w-4 mr-2" />
                {locale === 'vi' ? 'Tiếp tục với QI' : 'Continue as QI'}
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4 mr-2" />
                {locale === 'vi' ? 'Tiếp tục' : 'Continue'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
