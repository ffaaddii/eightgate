import { hasPermission } from './permissions.js';
import { SESSION_COOKIE_NAME, verifySession } from './session.js';
function getTokenFromRequest(req) {
    const cookieToken = req.cookies?.[SESSION_COOKIE_NAME];
    if (typeof cookieToken === 'string' && cookieToken.length > 0)
        return cookieToken;
    const auth = req.header('authorization');
    if (auth && auth.startsWith('Bearer '))
        return auth.slice('Bearer '.length);
    return null;
}
export function requireAuth(req, res, next) {
    try {
        const token = getTokenFromRequest(req);
        if (!token) {
            res.status(401).json({ success: false, error: 'UNAUTHENTICATED' });
            return;
        }
        const payload = verifySession(token);
        req.user = {
            id: payload.sub,
            username: payload.username,
            role: payload.role,
        };
        next();
    }
    catch {
        res.status(401).json({ success: false, error: 'UNAUTHENTICATED' });
    }
}
export function requirePermission(perm) {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
            res.status(401).json({ success: false, error: 'UNAUTHENTICATED' });
            return;
        }
        if (!hasPermission(user.role, perm)) {
            res.status(403).json({ success: false, error: 'FORBIDDEN' });
            return;
        }
        next();
    };
}
