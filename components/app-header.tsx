'use client'

import { useState } from 'react'
import {
  Home, Database, BarChart3, TrendingUp, Tag,
  History, ScanLine, BookOpen, Calculator,
  Menu, ChevronDown, Shield,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { UserProfileMenu } from '@/components/user-profile-menu'
import { LanguageSwitcher } from '@/components/language-switcher'
import { useTranslation } from '@/lib/i18n'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface AppHeaderProps {
  email?: string
  isAdmin?: boolean
  showAuth?: boolean
}

export function AppHeader({ email, isAdmin, showAuth = true }: AppHeaderProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { t } = useTranslation()

  // Main nav items (visible to all users)
  const navItems = [
    { href: '/dashboard',        label: t.nav.home,           icon: Home,       exact: true },
    { href: '/analyze',          label: t.nav.analyze,        icon: ScanLine,   exact: false },
    { href: '/history',          label: t.nav.history,        icon: History,    exact: false },
    { href: '/guide',            label: t.nav.guide,          icon: BookOpen,   exact: false },
    { href: '/risk-methodology', label: t.nav.riskMethodology, icon: Calculator, exact: false },
  ]

  // Admin dropdown items
  const adminItems = [
    { href: '/admin',            label: t.nav.adminPanel,    icon: BarChart3  },
    { href: '/admin/revenue',    label: t.nav.revenue,       icon: TrendingUp },
    { href: '/admin/pricing',    label: t.nav.pricing,       icon: Tag        },
    { href: '/admin/knowledge',  label: t.nav.knowledgeBase, icon: Database   },
  ]

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')

  const isAdminActive = adminItems.some(item =>
    pathname === item.href || pathname.startsWith(item.href + '/')
  )

  // All items merged for mobile sheet
  const allMobileItems = [
    ...navItems,
    ...(isAdmin ? adminItems : []),
  ]

  return (
    <header className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">

        {/* LEFT: hamburger + logo + nav */}
        <div className="flex items-center gap-3 min-w-0 flex-1">

          {/* Mobile hamburger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="xl:hidden shrink-0" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="p-4 border-b">
                <SheetTitle className="flex items-center gap-3">
                  <Image src="/images/logo.png" alt="AI Label Pro" width={36} height={36} className="rounded-lg" />
                  <div>
                    <div className="text-sm font-bold leading-tight">AI Label Pro</div>
                    <div className="text-xs text-muted-foreground leading-tight">by Vexim Global</div>
                  </div>
                </SheetTitle>
              </SheetHeader>

              <nav className="flex flex-col p-2" role="navigation" aria-label="Mobile navigation">
                {isAdmin && (
                  <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Menu chính
                  </p>
                )}
                {navItems.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href, item.exact)
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
                      <Button variant={active ? 'secondary' : 'ghost'} className="w-full justify-start gap-3 h-10 text-sm">
                        <Icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </Button>
                    </Link>
                  )
                })}

                {isAdmin && (
                  <>
                    <p className="px-3 py-1.5 mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Admin
                    </p>
                    {adminItems.map((item) => {
                      const Icon = item.icon
                      const active = pathname === item.href || pathname.startsWith(item.href + '/')
                      return (
                        <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
                          <Button variant={active ? 'secondary' : 'ghost'} className="w-full justify-start gap-3 h-10 text-sm">
                            <Icon className="h-4 w-4 shrink-0" />
                            {item.label}
                          </Button>
                        </Link>
                      )
                    })}
                  </>
                )}
              </nav>

              {showAuth && email && (
                <div className="mt-auto border-t p-4">
                  <p className="text-sm font-medium truncate">{email}</p>
                  <p className="text-xs text-muted-foreground">{isAdmin ? t.common.admin : t.common.user}</p>
                  <form action="/auth/logout" method="post" className="mt-3 w-full">
                    <Button variant="ghost" size="sm" type="submit" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10">
                      {t.nav.logout}
                    </Button>
                  </form>
                </div>
              )}
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-3 shrink-0">
            <Image src="/images/logo.png" alt="AI Label Pro by Vexim Global" width={40} height={40} className="rounded-lg" />
            <div className="hidden sm:block">
              <h1 className="text-base font-bold leading-tight">AI Label Pro</h1>
              <p className="text-xs text-muted-foreground leading-tight">by Vexim Global</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden xl:flex items-center gap-1" role="navigation" aria-label="Main navigation">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href, item.exact)
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={active ? 'secondary' : 'ghost'}
                    size="sm"
                    className="gap-1.5 whitespace-nowrap text-xs"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{item.label}</span>
                  </Button>
                </Link>
              )
            })}

            {/* Admin dropdown */}
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isAdminActive ? 'secondary' : 'ghost'}
                    size="sm"
                    className="gap-1.5 whitespace-nowrap text-xs"
                  >
                    <Shield className="h-3.5 w-3.5 shrink-0" />
                    <span>Admin</span>
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                  <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    Quản trị hệ thống
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {adminItems.map((item) => {
                    const Icon = item.icon
                    const active = pathname === item.href || pathname.startsWith(item.href + '/')
                    return (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link
                          href={item.href}
                          className={`flex items-center gap-2 cursor-pointer ${active ? 'bg-secondary' : ''}`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span>{item.label}</span>
                        </Link>
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>
        </div>

        {/* RIGHT: language switcher + user profile */}
        <div className="flex items-center gap-1 shrink-0">
          <LanguageSwitcher />
          {showAuth && email && <UserProfileMenu email={email} isAdmin={isAdmin} />}
        </div>

      </div>
    </header>
  )
}
