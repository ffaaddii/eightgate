export const rolePermissions = {
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
};
export function hasPermission(role, perm) {
    return rolePermissions[role].includes(perm);
}
