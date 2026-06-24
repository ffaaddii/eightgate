import { clsx } from 'clsx'

import type { HTMLAttributes } from 'react'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))]',
        className,
      )}
      {...props}
    />
  )
}
