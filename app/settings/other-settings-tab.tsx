import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bell, Lock, Eye } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

interface Props {
  user: User
}

export default function OtherSettingsTab({ user }: Props) {
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="mb-4">
          <p className="text-xs text-muted-foreground">Email đăng nhập</p>
          <p className="font-medium">{user.email}</p>
        </div>
      </Card>

      <Card className="p-5 opacity-60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-semibold">Thông báo</h3>
              <p className="text-sm text-muted-foreground">Quản lý cài đặt email thông báo</p>
            </div>
          </div>
          <Button variant="outline" size="sm" disabled>Sắp ra mắt</Button>
        </div>
      </Card>

      <Card className="p-5 opacity-60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-semibold">Bảo mật</h3>
              <p className="text-sm text-muted-foreground">Đổi mật khẩu và quản lý phiên đăng nhập</p>
            </div>
          </div>
          <Button variant="outline" size="sm" disabled>Sắp ra mắt</Button>
        </div>
      </Card>

      <Card className="p-5 opacity-60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-semibold">Quyền riêng tư</h3>
              <p className="text-sm text-muted-foreground">Kiểm soát dữ liệu cá nhân của bạn</p>
            </div>
          </div>
          <Button variant="outline" size="sm" disabled>Sắp ra mắt</Button>
        </div>
      </Card>
    </div>
  )
}
