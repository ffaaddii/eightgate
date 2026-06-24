import type { Permission, Role } from './types.js'

export const rolePermissions: Record<Role, Permission[]> = {
  superadmin: [
    'users:read',
    'users:write',
    'hscodes:read',
    'hscodes:write',
    'hscodes:approve',
    'audit:read',
  ],
  customs_broker: ['hscodes:read'],
  publisher: ['hscodes:read', 'hscodes:write'],
  auditor: ['hscodes:read', 'hscodes:approve'],
}

export function hasPermission(role: Role, perm: Permission): boolean {
  return rolePermissions[role].includes(perm)
}

