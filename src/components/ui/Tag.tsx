import { clsx } from 'clsx'

import type { ReactNode } from 'react'

export function Tag({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'success' | 'warn' | 'danger'
}) {
  const styles = {
    neutral: 'bg-[rgb(var(--surface-2))] text-[rgb(var(--muted))]',
    success: 'bg-emerald-100 text-emerald-800',
    warn: 'bg-amber-100 text-amber-800',
    danger: 'bg-red-100 text-red-800',
  } as const
  return (
    <span className={clsx('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', styles[tone])}>
      {children}
    </span>
  )
}
