const KEY = 'eg_device_id'

export function getOrCreateDeviceId(): string {
  const existing = localStorage.getItem(KEY)
  if (existing && existing.length > 0) return existing
  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
  localStorage.setItem(KEY, id)
  return id
}

