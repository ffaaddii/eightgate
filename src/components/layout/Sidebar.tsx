import { NavLink } from 'react-router-dom'
import { Shield, Users, Database, FileText, ClipboardCheck } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

import type { ReactNode } from 'react'

const logoUrl = new URL('../../../logo/logo.png', import.meta.url).href

function Item({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition',
          isActive
            ? 'bg-[rgb(var(--primary))] text-[rgb(var(--primary-fg))]'
            : 'text-[rgb(var(--fg))] hover:bg-[rgb(var(--surface-2))]',
        ].join(' ')
      }
    >
      <span className="text-[rgb(var(--muted))] [&>svg]:text-current">{icon}</span>
      <span className="truncate">{label}</span>
    </NavLink>
  )
}

export function Sidebar() {
  const me = useAuthStore((s) => s.me)
  const role = me?.role

  return (
    <aside className="hidden w-64 shrink-0 border-r border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 md:block">
      <div className="flex items-center gap-2 rounded-xl bg-[rgb(var(--primary))] px-3 py-2 text-[rgb(var(--primary-fg))]">
        <img src={logoUrl} alt="Logo" className="h-7 w-7 object-contain" />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">البوابة الثامنة</div>
          <div className="truncate text-xs opacity-80">HSCODE + RBAC</div>
        </div>
      </div>

      <div className="mt-4 space-y-1">
        <Item to="/" icon={<Database className="h-4 w-4" />} label="لوحة التحكم" />
        <Item to="/hscodes" icon={<FileText className="h-4 w-4" />} label="HSCODE" />

        {(role === 'auditor' || role === 'superadmin') && (
          <Item
            to="/hscodes/pending"
            icon={<ClipboardCheck className="h-4 w-4" />}
            label="بانتظار التدقيق"
          />
        )}

        {role === 'superadmin' && (
          <Item to="/users" icon={<Users className="h-4 w-4" />} label="المستخدمون" />
        )}

        {role === 'superadmin' && (
          <Item to="/audit" icon={<Shield className="h-4 w-4" />} label="سجل التدقيق" />
        )}
      </div>
    </aside>
  )
}
