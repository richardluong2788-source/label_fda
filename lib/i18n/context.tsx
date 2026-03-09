'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { vi, type TranslationKeys } from './vi'
import { en } from './en'

export type Locale = 'vi' | 'en'

const dictionaries: Record<Locale, TranslationKeys> = { vi, en }

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: TranslationKeys
}

const I18nContext = createContext<I18nContextType | null>(null)

const STORAGE_KEY = 'vexim-locale'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('vi')

  // Read persisted locale on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'en' || stored === 'vi') {
        setLocaleState(stored)
      }
    } catch {
      // localStorage unavailable
    }
  }, [])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    try {
      localStorage.setItem(STORAGE_KEY, newLocale)
    } catch {
      // localStorage unavailable
    }
    // Update HTML lang attribute
    document.documentElement.lang = newLocale
  }, [])

  const t = dictionaries[locale]

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useTranslation() {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    // Fallback for non-provider usage (e.g., server components)
    return { locale: 'vi' as Locale, setLocale: () => {}, t: vi }
  }
  return ctx
}

// Helper to get translations server-side (non-React)
export function getTranslations(locale: Locale = 'vi'): TranslationKeys {
  return dictionaries[locale]
}
