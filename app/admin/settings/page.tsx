'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AdminUsersManager } from '@/components/admin-users-manager'
import { AlertCircle, Settings } from 'lucide-react'

export default function AdminSettingsPage() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        router.push('/auth/login')
        return
      }

      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (adminError || !adminUser) {
        setError('Bạn không có quyền truy cập trang này')
        return
      }

      setIsAdmin(true)
    } catch (err) {
      console.error('[v0] Error checking admin status:', err)
      setError('Lỗi kiểm tra quyền')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Đang tải...</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className="h-6 w-6 text-destructive flex-shrink-0" />
            <div>
              <h1 className="font-bold text-lg">Truy cập bị từ chối</h1>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
          </div>
          <Button onClick={() => router.push('/dashboard')} className="w-full">
            Quay lại Dashboard
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary p-2">
              <Settings className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold">Cài đặt Admin</h1>
          </div>
          <Button variant="ghost" asChild>
            <a href="/admin">Quay lại Admin</a>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-6">Quản lý hệ thống</h2>
            <AdminUsersManager />
          </Card>
        </div>
      </main>
    </div>
  )
}
