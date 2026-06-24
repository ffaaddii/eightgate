import { clsx } from 'clsx'

import type { InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement>

export function Input({ className, ...props }: Props) {
  return (
    <input
      className={clsx(
        'w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm text-[rgb(var(--fg))] outline-none transition placeholder:text-[rgb(var(--muted))] focus:border-[rgb(var(--primary))]',
        className,
      )}
      {...props}
    />
  )
}
