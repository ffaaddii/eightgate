import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../db/env.js';
export const SESSION_COOKIE_NAME = 'eg_session';
export function signSession(payload) {
    return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}
export function verifySession(token) {
    const decoded = jwt.verify(token, getJwtSecret());
    if (typeof decoded !== 'object' || decoded === null) {
        throw new Error('Invalid token');
    }
    const p = decoded;
    if (!p.sub || !p.username || !p.role)
        throw new Error('Invalid token');
    return p;
}
