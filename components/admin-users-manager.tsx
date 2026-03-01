'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Plus, Trash2, Edit2, CheckCircle } from 'lucide-react'
import type { AdminUser } from '@/lib/types'

export function AdminUsersManager() {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserRole, setNewUserRole] = useState<'expert' | 'admin' | 'superadmin'>('expert')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchAdminUsers()
  }, [])

  const fetchAdminUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/users')
      const data = await response.json()

      if (!response.ok) {
        setError(data.error)
        return
      }

      setAdminUsers(data.adminUsers || [])
    } catch (err) {
      setError('Failed to fetch admin users')
      console.error('[v0] Error fetching admin users:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleGrantAdmin = async () => {
    if (!newUserEmail) {
      setError('Email is required')
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: newUserEmail, // In production, lookup user by email first
          role: newUserRole,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error)
        return
      }

      setNewUserEmail('')
      setNewUserRole('expert')
      await fetchAdminUsers()
    } catch (err) {
      setError('Failed to grant admin role')
      console.error('[v0] Error granting admin role:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'bg-red-100 text-red-800'
      case 'admin':
        return 'bg-blue-100 text-blue-800'
      case 'expert':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Quản lý người dùng Admin</h3>

        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 mb-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <Card className="p-6 mb-6">
          <h4 className="font-semibold mb-4">Thêm người dùng Admin mới</h4>
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Email người dùng"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md"
              />
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value as any)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="expert">Expert</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
              </select>
              <Button
                onClick={handleGrantAdmin}
                disabled={submitting || !newUserEmail}
              >
                <Plus className="mr-2 h-4 w-4" />
                Thêm
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <div>
        <h4 className="font-semibold mb-4">Danh sách Admin hiện tại</h4>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Đang tải...
          </div>
        ) : adminUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Chưa có admin user nào
          </div>
        ) : (
          <div className="space-y-2">
            {adminUsers.map((admin) => (
              <Card key={admin.user_id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{admin.user_id}</p>
                    <p className="text-xs text-muted-foreground">
                      Tạo ngày: {new Date(admin.created_at).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getRoleBadgeColor(admin.role)}>
                      {admin.role.toUpperCase()}
                    </Badge>
                    {admin.can_review && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Có thể review
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
