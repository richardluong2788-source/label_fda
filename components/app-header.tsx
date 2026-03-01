'use client'

import { useState } from 'react'
import {
  FileText, Home, Database, BarChart3, TrendingUp, Tag,
  History, ScanLine, Settings, Menu,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { UserProfileMenu } from '@/components/user-profile-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

interface AppHeaderProps {
  email?: string
  isAdmin?: boolean
  showAuth?: boolean
}

export function AppHeader({ email, isAdmin, showAuth = true }: AppHeaderProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems = [
    { href: '/dashboard', label: 'Trang chủ',       icon: Home,       exact: true },
    { href: '/analyze',   label: 'Phân tích',       icon: ScanLine,   exact: false },
    { href: '/history',   label: 'Lịch sử',         icon: History,    exact: false },
    { href: '/settings',  label: 'Cài đặt',         icon: Settings,   exact: false },
    ...(isAdmin
      ? [
          { href: '/admin/knowledge', label: 'Knowledge Base', icon: Database,   exact: false },
          { href: '/admin/revenue',   label: 'Doanh thu',      icon: TrendingUp, exact: false },
          { href: '/admin/pricing',   label: 'Giá gói',        icon: Tag,        exact: false },
          { href: '/admin',           label: 'Admin',          icon: BarChart3,  exact: true },
        ]
      : []),
  ]

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')

  return (
    <header className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Mobile hamburger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="p-4 border-b">
                <SheetTitle className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary p-2">
                    <FileText className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div>
                    <div className="text-sm font-bold leading-tight">Vexim Compliance AI</div>
                    <div className="text-xs text-muted-foreground leading-tight">FDA Market - US</div>
                  </div>
                </SheetTitle>
              </SheetHeader>

              <nav className="flex flex-col p-2" role="navigation" aria-label="Mobile navigation">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href, item.exact)
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
                      <Button
                        variant={active ? 'secondary' : 'ghost'}
                        className="w-full justify-start gap-3 h-11"
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </Button>
                    </Link>
                  )
                })}
              </nav>

              {/* Mobile user info */}
              {showAuth && email && (
                <div className="mt-auto border-t p-4">
                  <p className="text-sm font-medium truncate">{email}</p>
                  <p className="text-xs text-muted-foreground">
                    {isAdmin ? 'Quản trị viên' : 'Người dùng'}
                  </p>
                  <div className="flex flex-col gap-1 mt-3">
                    <Link href="/profile" onClick={() => setMobileOpen(false)}>
                      <Button variant="ghost" size="sm" className="w-full justify-start">
                        Hồ sơ cá nhân
                      </Button>
                    </Link>
                    <form action="/auth/logout" method="post" className="w-full">
                      <Button
                        variant="ghost"
                        size="sm"
                        type="submit"
                        className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        Đăng xuất
                      </Button>
                    </form>
                  </div>
                </div>
              )}
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-3 shrink-0">
            <div className="rounded-lg bg-primary p-2">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base font-bold leading-tight">Vexim Compliance AI</h1>
              <p className="text-xs text-muted-foreground leading-tight">FDA Market - US</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1" role="navigation" aria-label="Main navigation">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href, item.exact)
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={active ? 'secondary' : 'ghost'}
                    size="sm"
                    className="gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </Button>
                </Link>
              )
            })}
          </nav>
        </div>

        {showAuth && email && <UserProfileMenu email={email} isAdmin={isAdmin} />}
      </div>
    </header>
  )
}
