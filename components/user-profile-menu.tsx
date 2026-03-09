'use client'

import { User, Settings, LogOut, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

interface UserProfileMenuProps {
  email: string
  isAdmin?: boolean
}

export function UserProfileMenu({ email, isAdmin }: UserProfileMenuProps) {
  const getInitials = (email: string) => {
    return email
      .split('@')[0]
      .split('.')
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('')
      .slice(0, 2)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2"
        >
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold shrink-0">
            {getInitials(email)}
          </div>
          <span className="hidden sm:inline text-sm font-medium max-w-[120px] truncate">
            {email.split('@')[0]}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium leading-none">{email}</p>
            <p className="text-xs text-muted-foreground leading-none">
              {isAdmin ? 'Quản trị viên' : 'Người dùng'}
            </p>
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
