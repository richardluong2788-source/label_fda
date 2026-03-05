'use client'

import { useState } from 'react'
import { FileText, Menu } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/language-switcher'
import { useTranslation } from '@/lib/i18n'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

export function LandingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { t } = useTranslation()

  const navLinks = [
    { href: '/pricing', label: t.nav.pricingPage },
    { href: '/knowledge', label: t.nav.knowledge },
  ]

  return (
    <header className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between max-w-6xl">
        {/* Left: hamburger + logo */}
        <div className="flex items-center gap-3">
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
                {navLinks.map((link) => (
                  <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start h-11">
                      {link.label}
                    </Button>
                  </Link>
                ))}
              </nav>

              <div className="p-4 border-t mt-auto flex flex-col gap-2">
                <Link href="/auth/login" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" className="w-full">{t.nav.login}</Button>
                </Link>
                <Link href="/auth/sign-up" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full">{t.nav.signUp}</Button>
                </Link>
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="rounded-lg bg-primary p-2">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <span className="text-base font-bold">Vexim Compliance AI</span>
              <p className="text-xs text-muted-foreground leading-tight">FDA Market - US</p>
            </div>
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 text-sm" role="navigation" aria-label="Main navigation">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Auth buttons */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
            <Link href="/auth/login">{t.nav.login}</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/auth/sign-up">
              <span className="hidden sm:inline">{t.nav.signUp}</span>
              <span className="sm:hidden">{t.nav.signUpShort}</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
