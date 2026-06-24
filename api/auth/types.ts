export type Role = 'superadmin' | 'customs_broker' | 'publisher' | 'auditor'

export type SessionUser = {
  id: string
  username: string
  role: Role
}

export type Permission =
  | 'users:read'
  | 'users:write'
  | 'hscodes:read'
  | 'hscodes:write'
  | 'hscodes:approve'
  | 'audit:read'

