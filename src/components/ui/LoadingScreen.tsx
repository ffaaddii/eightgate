export function LoadingScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[rgb(var(--bg))]">
      <div className="w-full max-w-sm rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6">
        <div className="h-4 w-40 animate-pulse rounded bg-[rgb(var(--border))]" />
        <div className="mt-4 h-3 w-64 animate-pulse rounded bg-[rgb(var(--surface-2))]" />
        <div className="mt-6 h-9 w-full animate-pulse rounded-lg bg-[rgb(var(--surface-2))]" />
      </div>
    </div>
  )
}
