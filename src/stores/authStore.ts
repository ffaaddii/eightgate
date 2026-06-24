import { create } from 'zustand'
import { ApiError, apiGet, apiPost } from '@/utils/api'
import { getOrCreateDeviceId } from '@/utils/device'

export type Role = 'superadmin' | 'customs_broker' | 'publisher' | 'auditor'

export type Me = {
  id: string
  username: string
  role: Role
}

type AuthState = {
  status: 'idle' | 'loading' | 'authenticated' | 'guest'
  me: Me | null
  error: string | null
  fetchMe: () => Promise<void>
  login: (args: { username: string; password: string }) => Promise<boolean>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'idle',
  me: null,
  error: null,
  fetchMe: async () => {
    if (get().status === 'loading') return
    set({ status: 'loading', error: null })
    try {
      const res = await apiGet<{ success: true; data: Me | null }>(`/api/auth/me`)
      if (res.data) set({ status: 'authenticated', me: res.data })
      else set({ status: 'guest', me: null })
    } catch {
      set({ status: 'guest', me: null })
    }
  },
  login: async ({ username, password }) => {
    set({ error: null })
    const deviceId = getOrCreateDeviceId()
    try {
      const res = await apiPost<
        | { success: true; data: { id: string; username: string; displayName: string; role: Role } }
        | { success: false; error: string }
      >('/api/auth/login', { username, password, deviceId })
      if (res.success === false) {
        set({ error: res.error || 'LOGIN_FAILED' })
        return false
      }
      await get().fetchMe()
      return true
    } catch (err) {
      if (err instanceof ApiError) {
        set({ error: err.message || 'LOGIN_FAILED' })
        return false
      }
      set({ error: 'LOGIN_FAILED' })
      return false
    }
  },
  logout: async () => {
    try {
      await apiPost('/api/auth/logout', {})
    } finally {
      set({ me: null, status: 'guest' })
    }
  },
}))
