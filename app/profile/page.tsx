import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, User, Mail } from 'lucide-react'
import Link from 'next/link'

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/auth/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại Dashboard
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Hồ sơ cá nhân</h1>
          <p className="text-muted-foreground">Xem và cập nhật thông tin tài khoản của bạn</p>
        </div>

        <Card className="p-8">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                <User className="h-8 w-8" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="text-lg font-semibold flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </p>
              </div>
            </div>

            <div className="pt-6 border-t space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">ID người dùng</label>
                <p className="text-sm font-mono mt-1 p-2 bg-muted rounded">{user.id}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Ngày tạo tài khoản</label>
                <p className="text-sm mt-1">
                  {user.created_at 
                    ? new Date(user.created_at).toLocaleString('vi-VN')
                    : 'N/A'
                  }
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Trạng thái xác nhận email</label>
                <p className="text-sm mt-1">
                  {user.email_confirmed_at ? (
                    <span className="text-green-600 font-medium">✓ Đã xác nhận</span>
                  ) : (
                    <span className="text-orange-600 font-medium">Chờ xác nhận</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </main>
    </div>
  )
}
