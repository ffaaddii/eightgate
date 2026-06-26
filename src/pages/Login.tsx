import { useMemo, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

const logoUrl = new URL('../../logo/logo.png', import.meta.url).href

export default function Login() {
  const status = useAuthStore((s) => s.status)
  const login = useAuthStore((s) => s.login)
  const error = useAuthStore((s) => s.error)
  const location = useLocation()

  const from = useMemo(() => {
    const state = location.state as { from?: { pathname?: string } } | null
    return state?.from?.pathname ? String(state.from.pathname) : '/'
  }, [location.state])

  const [username, setUsername] = useState('superadmin')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  if (status === 'authenticated') return <Navigate to={from} replace />

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[rgb(var(--bg))] p-4">
      <Card className="w-full max-w-md p-6">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-[rgb(var(--primary))] p-2 text-[rgb(var(--primary-fg))]">
            <img src={logoUrl} alt="Logo" className="h-5 w-5 object-contain" />
          </div>
          <div>
            <div className="text-sm font-semibold">تسجيل الدخول</div>
            <div className="text-xs text-[rgb(var(--muted))]">لنظام شركة البوابة الثامنة</div>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <div>
            <div className="mb-1 text-xs text-[rgb(var(--muted))]">اسم المستخدم</div>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div>
            <div className="mb-1 text-xs text-[rgb(var(--muted))]">كلمة المرور</div>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              فشل تسجيل الدخول: {error}
            </div>
          )}

          <Button
            className="w-full"
            disabled={busy || username.trim().length === 0 || password.trim().length === 0}
            onClick={async () => {
              setBusy(true)
              try {
                await login({ username: username.trim(), password })
              } finally {
                setBusy(false)
              }
            }}
          >
            دخول
          </Button>

          <div className="text-xs text-[rgb(var(--muted))]">
            يرجى الاحتفاظ بكلمة المرور <span className="font-medium"></span> / <span className="font-medium"></span>
          </div>
        </div>
      </Card>
    </div>
  )
}
