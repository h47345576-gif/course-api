import { Context, Next } from 'hono';
import { verify } from '../utils/jwt';

export const authMiddleware = async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized', message: 'Missing or invalid token' }, 401);
    }

    const token = authHeader.split(' ')[1];
    const payload = await verify(token, c.env.JWT_SECRET);

    if (!payload) {
        return c.json({ error: 'Unauthorized', message: 'Invalid or expired token' }, 401);
    }

    c.set('user', payload);
    await next();
};
