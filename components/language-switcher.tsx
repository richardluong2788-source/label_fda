'use client'

import { Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTranslation, type Locale } from '@/lib/i18n'

const LANGUAGES: { code: Locale; label: string; flag: string }[] = [
  { code: 'vi', label: 'Tiếng Việt', flag: 'VI' },
  { code: 'en', label: 'English', flag: 'EN' },
]

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useTranslation()
  const current = LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 px-2"
          aria-label={t.language.switchLanguage}
        >
          <Globe className="h-4 w-4" />
          <span className="text-xs font-medium hidden sm:inline">{current.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLocale(lang.code)}
            className={locale === lang.code ? 'bg-accent font-medium' : ''}
          >
            <span className="mr-2 text-xs font-mono w-5">{lang.flag}</span>
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
