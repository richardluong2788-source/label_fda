'use client'

import { useTranslation } from '@/lib/i18n'
import { AuditHistory } from '@/components/audit-history'
import { Button } from '@/components/ui/button'
import { FileText } from 'lucide-react'
import Link from 'next/link'
import type { AuditReport } from '@/lib/types'

interface Props {
  reports: AuditReport[] | null
  currentPage: number
  totalPages: number
  totalCount: number
}

export function HistoryPageClient({ reports, currentPage, totalPages, totalCount }: Props) {
  const { t } = useTranslation()
  const h = t.history

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{h.pageTitle}</h1>
          <p className="text-muted-foreground mt-1">{h.pageDesc}</p>
        </div>
        <Link href="/analyze">
          <Button>
            <FileText className="mr-2 h-4 w-4" />
            {h.startAnalysisAlt}
          </Button>
        </Link>
      </div>

      {!reports || reports.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">{h.noHistoryAlt}</p>
          <Link href="/analyze">
            <Button>{h.startAnalysis}</Button>
          </Link>
        </div>
      ) : (
        <AuditHistory
          reports={reports}
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
        />
      )}
    </>
  )
}
