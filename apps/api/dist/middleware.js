import { verifyAccessToken } from './auth.js';
export function authRequired(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'missing_token' });
        return;
    }
    const token = header.slice('Bearer '.length);
    try {
        const payload = verifyAccessToken(token);
        req.user = { id: payload.sub, role: payload.role };
        next();
    }
    catch {
        res.status(401).json({ error: 'invalid_token' });
    }
}
export function requireRole(roles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: 'missing_token' });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({ error: 'forbidden' });
            return;
        }
        next();
    };
}
