import React from "react"
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/toaster'
import { LanguageProvider } from '@/lib/i18n'

import './globals.css'

const _geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const _geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: {
    default: 'AI Label Pro – FDA Food Label Compliance Checker | by Vexim Global',
    template: '%s | AI Label Pro',
  },
  description:
    'Instantly audit food & cosmetic labels against 21 CFR regulations with AI. Detect violations, generate compliance reports and avoid FDA import alerts. Built by Vexim Global.',
  keywords: [
    'FDA label compliance',
    'food label audit AI',
    '21 CFR checker',
    'FDA import alert',
    'food label violation checker',
    'cosmetic label compliance',
    'AI compliance checker',
    'ailabelpro',
  ],
  authors: [{ name: 'Vexim Global', url: 'https://ailabelpro.com' }],
  creator: 'Vexim Global',
  publisher: 'Vexim Global',
  metadataBase: new URL('https://ailabelpro.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://ailabelpro.com',
    siteName: 'AI Label Pro',
    title: 'AI Label Pro – FDA Food Label Compliance Checker',
    description:
      'Audit your food & cosmetic labels against 21 CFR in seconds. Detect violations and generate actionable compliance reports powered by AI.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'AI Label Pro – FDA Label Compliance Checker',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Label Pro – FDA Label Compliance Checker',
    description:
      'Instantly audit food labels against 21 CFR with AI. Avoid FDA import alerts.',
    images: ['/og-image.png'],
    creator: '@veximai',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
  verification: {
    // google: 'your-google-verification-code',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'AI Label Pro',
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web',
              url: 'https://ailabelpro.com',
              author: {
                '@type': 'Organization',
                name: 'Vexim Global',
                url: 'https://ailabelpro.com',
              },
              description:
                'AI-powered FDA food and cosmetic label compliance checker. Audit labels against 21 CFR regulations instantly.',
              offers: {
                '@type': 'AggregateOffer',
                priceCurrency: 'VND',
                lowPrice: '0',
                offerCount: '3',
              },
            }),
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <LanguageProvider>
          {children}
          <Toaster />
        </LanguageProvider>
      </body>
    </html>
  )
}

