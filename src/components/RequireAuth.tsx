import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

import type { ReactNode } from 'react'

export function RequireAuth({ children }: { children: ReactNode }) {
  const status = useAuthStore((s) => s.status)
  const fetchMe = useAuthStore((s) => s.fetchMe)
  const location = useLocation()

  useEffect(() => {
    if (status === 'idle') fetchMe()
  }, [status, fetchMe])

  if (status === 'idle' || status === 'loading') return <LoadingScreen />
  if (status === 'guest') return <Navigate to="/login" replace state={{ from: location }} />
  return <>{children}</>
}
