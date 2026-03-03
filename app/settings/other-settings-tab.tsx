'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bell, Lock, Eye } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import type { User } from '@supabase/supabase-js'

interface Props {
  user: User
}

export default function OtherSettingsTab({ user }: Props) {
  const { t } = useTranslation()
  const s = t.settings

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="mb-4">
          <p className="text-xs text-muted-foreground">{s.loginEmail}</p>
          <p className="font-medium">{user.email}</p>
        </div>
      </Card>

      <Card className="p-5 opacity-60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-semibold">{s.notifications}</h3>
              <p className="text-sm text-muted-foreground">{s.notificationsDesc}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" disabled>{s.comingSoon}</Button>
        </div>
      </Card>

      <Card className="p-5 opacity-60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-semibold">{s.security}</h3>
              <p className="text-sm text-muted-foreground">{s.securityDesc}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" disabled>{s.comingSoon}</Button>
        </div>
      </Card>

      <Card className="p-5 opacity-60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-semibold">{s.privacy}</h3>
              <p className="text-sm text-muted-foreground">{s.privacyDesc}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" disabled>{s.comingSoon}</Button>
        </div>
      </Card>
    </div>
  )
}
