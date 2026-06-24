import { describe, expect, it } from 'vitest'
import { hasPermission } from './permissions.js'

describe('hasPermission', () => {
  it('allows superadmin everything', () => {
    expect(hasPermission('superadmin', 'users:read')).toBe(true)
    expect(hasPermission('superadmin', 'hscodes:approve')).toBe(true)
    expect(hasPermission('superadmin', 'audit:read')).toBe(true)
  })

  it('restricts customs_broker to reading hscodes', () => {
    expect(hasPermission('customs_broker', 'hscodes:read')).toBe(true)
    expect(hasPermission('customs_broker', 'users:read')).toBe(false)
    expect(hasPermission('customs_broker', 'hscodes:write')).toBe(false)
  })
})

