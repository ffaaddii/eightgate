import { clsx } from 'clsx'

import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger'
}

export function Button({ variant = 'primary', className, ...props }: Props) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50'
  const styles = {
    primary: 'bg-[rgb(var(--primary))] text-[rgb(var(--primary-fg))] hover:bg-[rgb(var(--primary-hover))]',
    secondary:
      'bg-[rgb(var(--secondary))] text-[rgb(var(--secondary-fg))] hover:bg-[rgb(var(--secondary-hover))]',
    danger: 'bg-[rgb(var(--danger))] text-[rgb(var(--danger-fg))] hover:bg-[rgb(var(--danger-hover))]',
  } as const

  return <button className={clsx(base, styles[variant], className)} {...props} />
}
