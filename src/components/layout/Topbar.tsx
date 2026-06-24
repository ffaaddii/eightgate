import { LogOut, Menu } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'

export function Topbar() {
  const me = useAuthStore((s) => s.me)
  const logout = useAuthStore((s) => s.logout)
  const role = me?.role
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-10 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.85)] backdrop-blur">
      <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            className="md:hidden"
            variant="secondary"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="h-4 w-4" />
            القائمة
          </Button>

          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">مرحباً {me?.username}</div>
            <div className="truncate text-xs text-[rgb(var(--muted))]">الدور: {me?.role}</div>
          </div>
        </div>

        <Button variant="secondary" onClick={() => logout()}>
          <LogOut className="h-4 w-4" />
          خروج
        </Button>
      </div>

      {menuOpen && (
        <div
          className="md:hidden"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            backgroundColor: 'rgb(var(--surface))',
            color: 'rgb(var(--fg))',
          }}
        >
          <div className="flex h-dvh flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-[rgb(var(--border))] p-4">
              <div className="min-w-0 truncate text-sm font-semibold">القائمة</div>
              <Button variant="secondary" onClick={() => setMenuOpen(false)}>
                إغلاق
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  [
                    'block border-b border-[rgb(var(--border))] px-4 py-4 text-base transition',
                    isActive
                      ? 'bg-[rgb(var(--primary))] text-[rgb(var(--primary-fg))]'
                      : 'bg-[rgb(var(--surface))] hover:bg-[rgb(var(--surface-2))]',
                  ].join(' ')
                }
                onClick={() => setMenuOpen(false)}
              >
                لوحة التحكم
              </NavLink>

              <NavLink
                to="/hscodes"
                className={({ isActive }) =>
                  [
                    'block border-b border-[rgb(var(--border))] px-4 py-4 text-base transition',
                    isActive
                      ? 'bg-[rgb(var(--primary))] text-[rgb(var(--primary-fg))]'
                      : 'bg-[rgb(var(--surface))] hover:bg-[rgb(var(--surface-2))]',
                  ].join(' ')
                }
                onClick={() => setMenuOpen(false)}
              >
                HSCODE
              </NavLink>

              {(role === 'auditor' || role === 'superadmin') && (
                <NavLink
                  to="/hscodes/pending"
                  className={({ isActive }) =>
                    [
                      'block border-b border-[rgb(var(--border))] px-4 py-4 text-base transition',
                      isActive
                        ? 'bg-[rgb(var(--primary))] text-[rgb(var(--primary-fg))]'
                        : 'bg-[rgb(var(--surface))] hover:bg-[rgb(var(--surface-2))]',
                    ].join(' ')
                  }
                  onClick={() => setMenuOpen(false)}
                >
                  بانتظار التدقيق
                </NavLink>
              )}

              {role === 'superadmin' && (
                <NavLink
                  to="/users"
                  className={({ isActive }) =>
                    [
                      'block border-b border-[rgb(var(--border))] px-4 py-4 text-base transition',
                      isActive
                        ? 'bg-[rgb(var(--primary))] text-[rgb(var(--primary-fg))]'
                        : 'bg-[rgb(var(--surface))] hover:bg-[rgb(var(--surface-2))]',
                    ].join(' ')
                  }
                  onClick={() => setMenuOpen(false)}
                >
                  المستخدمون
                </NavLink>
              )}

              {role === 'superadmin' && (
                <NavLink
                  to="/audit"
                  className={({ isActive }) =>
                    [
                      'block border-b border-[rgb(var(--border))] px-4 py-4 text-base transition',
                      isActive
                        ? 'bg-[rgb(var(--primary))] text-[rgb(var(--primary-fg))]'
                        : 'bg-[rgb(var(--surface))] hover:bg-[rgb(var(--surface-2))]',
                    ].join(' ')
                  }
                  onClick={() => setMenuOpen(false)}
                >
                  سجل التدقيق
                </NavLink>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
