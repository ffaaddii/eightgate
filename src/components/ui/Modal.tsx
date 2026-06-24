import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

import type { ReactNode } from 'react'

export function Modal({
  open,
  title,
  children,
  onClose,
  variant = 'default',
}: {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  variant?: 'default' | 'fullscreen'
}) {
  if (!open) return null
  const full = variant === 'fullscreen'

  if (full) {
    return (
      <div
        className="overflow-hidden"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          backgroundColor: 'rgb(var(--surface))',
          color: 'rgb(var(--fg))',
        }}
      >
        <div className="flex h-dvh flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-[rgb(var(--border))] p-4">
            <div className="min-w-0 truncate text-sm font-semibold">{title}</div>
            <Button variant="secondary" onClick={onClose}>
              <X className="h-4 w-4" />
              إغلاق
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto overflow-x-hidden">{children}</div>
        </div>
      </div>
    )
  }
  return (
    <div
      className={[
        'fixed inset-0 z-50 flex overflow-y-auto bg-black/40',
        'items-end justify-center p-4 md:items-center',
      ].join(' ')}
    >
      <div
        className={[
          'flex w-full flex-col overflow-hidden border border-[rgb(var(--border)/0.6)] bg-[rgb(var(--surface))] shadow-xl',
          'max-h-[90vh] max-w-xl rounded-2xl',
        ].join(' ')}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[rgb(var(--border))] p-4">
          <div className="min-w-0 truncate text-sm font-semibold">{title}</div>
          <Button variant="secondary" onClick={onClose}>
            <X className="h-4 w-4" />
            إغلاق
          </Button>
        </div>
        <div className="min-h-0 overflow-auto overflow-x-hidden p-4">{children}</div>
      </div>
    </div>
  )
}
