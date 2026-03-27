'use client'

import { useState, useEffect } from 'react'
import { User, Settings, LogOut, ChevronDown, Ship, Factory, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type AccountType = 'importer' | 'supplier' | 'qi' | null

interface UserProfileMenuProps {
  email: string
  isAdmin?: boolean
}

// Role display config
const ROLE_CONFIG: Record<string, { label: string; labelVi: string; icon: typeof Ship; color: string }> = {
  importer: { label: 'Importer', labelVi: 'Nhà nhập khẩu', icon: Ship, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  supplier: { label: 'Supplier', labelVi: 'Nhà cung cấp', icon: Factory, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  qi: { label: 'QI', labelVi: 'Qualified Individual', icon: UserCheck, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
}

export function UserProfileMenu({ email, isAdmin }: UserProfileMenuProps) {
  const [accountType, setAccountType] = useState<AccountType>(null)
  
  // Fetch user's account_type on mount
  useEffect(() => {
    const fetchAccountType = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          // Check user_metadata first
          const metadataType = user.user_metadata?.account_type as AccountType
          if (metadataType && ['importer', 'supplier', 'qi'].includes(metadataType)) {
            setAccountType(metadataType)
            return
          }
          
          // Fallback to user_profiles table
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('account_type')
            .eq('id', user.id)
            .single()
          
          if (profile?.account_type && ['importer', 'supplier', 'qi'].includes(profile.account_type)) {
            setAccountType(profile.account_type as AccountType)
          }
        }
      } catch (error) {
        console.error('Error fetching account type:', error)
      }
    }
    
    fetchAccountType()
  }, [])

  const getInitials = (email: string) => {
    return email
      .split('@')[0]
      .split('.')
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('')
      .slice(0, 2)
  }
  
  const roleConfig = accountType ? ROLE_CONFIG[accountType] : null
  const RoleIcon = roleConfig?.icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 h-auto py-1.5"
        >
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold shrink-0">
            {getInitials(email)}
          </div>
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-sm font-medium max-w-[120px] truncate leading-tight">
              {email.split('@')[0]}
            </span>
            {roleConfig && (
              <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-4 font-medium ${roleConfig.color}`}>
                {RoleIcon && <RoleIcon className="h-2.5 w-2.5 mr-1" />}
                {roleConfig.label}
              </Badge>
            )}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium leading-none">{email}</p>
            <div className="flex items-center gap-2">
              {roleConfig && (
                <Badge variant="secondary" className={`text-xs px-2 py-0.5 font-medium ${roleConfig.color}`}>
                  {RoleIcon && <RoleIcon className="h-3 w-3 mr-1" />}
                  {roleConfig.labelVi}
                </Badge>
              )}
              {isAdmin && (
                <Badge variant="outline" className="text-xs px-2 py-0.5">
                  Admin
                </Badge>
              )}
            </div>
            {!roleConfig && !isAdmin && (
              <p className="text-xs text-muted-foreground leading-none">
                Người dùng
              </p>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/profile" className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              Hồ sơ cá nhân
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings" className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              Cài đặt
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <form action="/auth/logout" method="post" className="w-full">
            <button
              type="submit"
              className="flex w-full items-center text-destructive cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Đăng xuất
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
