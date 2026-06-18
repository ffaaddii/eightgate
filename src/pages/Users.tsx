import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { apiGet, apiPatch, apiPost } from '@/utils/api'
import { useAuthStore } from '@/stores/authStore'
import type { Role } from '@/stores/authStore'

type UserRow = {
  id: string
  username: string
  displayName: string
  role: Role
  enabled: boolean
  createdAt: string
}

export default function Users() {
  const me = useAuthStore((s) => s.me)
  const [rows, setRows] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(false)

  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<UserRow | null>(null)

  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState<Role>('customs_broker')
  const [enabled, setEnabled] = useState(true)
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const editingSelf = !!edit && !!me && edit.id === me.id

  async function refresh() {
    setLoading(true)
    try {
      const res = await apiGet<{ success: true; data: UserRow[] }>('/api/users')
      setRows(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">المستخدمون</div>
          <div className="text-xs text-[rgb(var(--muted))]">إدارة المستخدمين والأدوار</div>
        </div>
        <Button
          onClick={() => {
            setEdit(null)
            setUsername('')
            setDisplayName('')
            setRole('customs_broker')
            setEnabled(true)
            setPassword('')
            setOpen(true)
          }}
        >
          <Plus className="h-4 w-4" />
          إضافة مستخدم
        </Button>
      </div>

      <Card className="hidden overflow-hidden md:block">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full border-collapse text-right text-sm">
            <thead className="sticky top-0 bg-[rgb(var(--surface))]">
              <tr className="border-b border-[rgb(var(--border))] text-xs text-[rgb(var(--muted))]">
                <th className="px-4 py-3">اسم المستخدم</th>
                <th className="px-4 py-3">الاسم</th>
                <th className="px-4 py-3">الدور</th>
                <th className="px-4 py-3">الحالة</th>
                <th className="px-4 py-3">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-center text-[rgb(var(--muted))]" colSpan={5}>
                    جارٍ التحميل...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-[rgb(var(--muted))]" colSpan={5}>
                    لا يوجد مستخدمون
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-[rgb(var(--border))] hover:bg-[rgb(var(--surface-2))]">
                    <td className="px-4 py-3 font-medium">{r.username}</td>
                    <td className="px-4 py-3">{r.displayName}</td>
                    <td className="px-4 py-3">{r.role}</td>
                    <td className="px-4 py-3">{r.enabled ? 'مفعّل' : 'معطّل'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setEdit(r)
                            setUsername(r.username)
                            setDisplayName(r.displayName)
                            setRole(r.role)
                            setEnabled(r.enabled)
                            setPassword('')
                            setOpen(true)
                          }}
                        >
                          تعديل
                        </Button>

                        <Button
                          variant="secondary"
                          onClick={async () => {
                            await apiPatch(`/api/users/${r.id}`, { enabled: !r.enabled })
                            await refresh()
                          }}
                        >
                          {r.enabled ? 'تعطيل' : 'تفعيل'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-3 md:hidden">
        {loading ? (
          <Card className="p-4 text-sm text-[rgb(var(--muted))]">جارٍ التحميل...</Card>
        ) : rows.length === 0 ? (
          <Card className="p-4 text-sm text-[rgb(var(--muted))]">لا يوجد مستخدمون</Card>
        ) : (
          rows.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{r.username}</div>
                  <div className="mt-1 truncate text-xs text-[rgb(var(--muted))]">{r.displayName}</div>
                </div>
                <div className="text-xs text-[rgb(var(--muted))]">{r.enabled ? 'مفعّل' : 'معطّل'}</div>
              </div>

              <div className="mt-3 grid gap-1 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[rgb(var(--muted))]">الدور</span>
                  <span className="truncate">{r.role}</span>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <Button
                  className="flex-1"
                  variant="secondary"
                  onClick={() => {
                    setEdit(r)
                    setUsername(r.username)
                    setDisplayName(r.displayName)
                    setRole(r.role)
                    setEnabled(r.enabled)
                    setPassword('')
                    setOpen(true)
                  }}
                >
                  تعديل
                </Button>
                <Button
                  className="flex-1"
                  variant="secondary"
                  onClick={async () => {
                    await apiPatch(`/api/users/${r.id}`, { enabled: !r.enabled })
                    await refresh()
                  }}
                >
                  {r.enabled ? 'تعطيل' : 'تفعيل'}
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      <Modal open={open} title={edit ? 'تعديل مستخدم' : 'إضافة مستخدم'} onClose={() => setOpen(false)}>
        <div className="grid gap-3">
          <div>
            <div className="mb-1 text-xs text-[rgb(var(--muted))]">اسم المستخدم</div>
            <Input disabled={!!edit} value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div>
            <div className="mb-1 text-xs text-[rgb(var(--muted))]">الاسم</div>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="mb-1 text-xs text-[rgb(var(--muted))]">الدور</div>
              <select
                className="h-9 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm text-[rgb(var(--fg))] outline-none focus:border-[rgb(var(--primary))]"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
              >
                <option value="customs_broker">customs_broker</option>
                <option value="publisher">publisher</option>
                <option value="auditor">auditor</option>
                <option value="superadmin">superadmin</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <div className="text-sm">مفعّل</div>
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs text-[rgb(var(--muted))]">كلمة المرور</div>
            {edit && editingSelf ? (
              <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] px-3 py-2 text-xs text-[rgb(var(--muted))]">
                لا يمكن تغيير كلمة مرور هذا الحساب
              </div>
            ) : (
              <Input
                placeholder={edit ? 'اتركها فارغة إن لم تُرد تغييرها' : 'مطلوبة'}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </div>

          <div className="flex justify-end">
            <Button
              disabled={
                saving ||
                username.trim().length < 3 ||
                displayName.trim().length === 0 ||
                (!edit && password.trim().length < 8)
              }
              onClick={async () => {
                setSaving(true)
                try {
                  if (edit) {
                    await apiPatch(`/api/users/${edit.id}`, { displayName: displayName.trim(), role, enabled })
                    if (!editingSelf && password.trim().length >= 8) {
                      await apiPost(`/api/users/${edit.id}/reset-password`, { password })
                    }
                  } else {
                    await apiPost('/api/users', {
                      username: username.trim(),
                      displayName: displayName.trim(),
                      role,
                      enabled,
                      password,
                    })
                  }
                  setOpen(false)
                  await refresh()
                } finally {
                  setSaving(false)
                }
              }}
            >
              حفظ
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
