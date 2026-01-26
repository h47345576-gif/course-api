/**
 * Cloudflare Worker Bundle for Course API
 * This file contains all the necessary code in a single file for easy copy-pasting into the Cloudflare Dashboard.
 * 
 * INSTRUCTIONS:
 * 1. Go to Cloudflare Dashboard > Workers & Pages > Create Worker.
 * 2. Name your worker (e.g., 'course-api').
 * 3. Click 'Edit Code'.
 * 4. Replace the content of 'worker.ts' (or index.ts) with this entire file.
 * 5. Ensure you have bound your D1 Database as 'DB' in Settings > Variables > D1 Database Bindings.
 * 6. Set 'JWT_SECRET' in Settings > Variables > Environment Variables.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { SignJWT, jwtVerify } from 'jose';
import * as bcrypt from 'bcryptjs';

// --- TYPES & BINDINGS ---
type Bindings = {
    DB: D1Database;
    STORAGE: R2Bucket;
    SESSIONS: KVNamespace;
    JWT_SECRET: string;
};

// --- UTILS: JWT ---
async function sign(payload: any, secret: string): Promise<string> {
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 60 * 60 * 24 * 7; // 7 days

    return new SignJWT({ ...payload })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setExpirationTime(exp)
        .setIssuedAt(iat)
        .setNotBefore(iat)
        .sign(new TextEncoder().encode(secret));
}

async function verify(token: string, secret: string): Promise<any> {
    try {
        const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
        return payload;
    } catch (e) {
        return null; // Invalid token
    }
}

// --- MIDDLEWARE ---
const authMiddleware = async (c: any, next: any) => {
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

// --- APP INITIALIZATION ---
const app = new Hono<{ Bindings: Bindings }>();

// CORS
app.use('*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
}));

// Root Route
app.get('/', (c) => {
    return c.json({
        status: 'online',
        message: 'Course API is running on Cloudflare Workers 🚀',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// --- AUTH ROUTES ---
const auth = new Hono<{ Bindings: Bindings }>();

auth.post('/register', async (c) => {
    const { name, email, password, phone } = await c.req.json();

    if (!name || !email || !password) {
        return c.json({ error: 'Validation Error', message: 'Missing required fields' }, 400);
    }

    // Check if user exists
    const existingUser = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
    if (existingUser) {
        return c.json({ error: 'Conflict', message: 'Email already exists' }, 409);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user
    const result = await c.env.DB.prepare(
        'INSERT INTO users (name, email, password_hash, phone) VALUES (?, ?, ?, ?)'
    ).bind(name, email, passwordHash, phone).run();

    if (!result.success) {
        return c.json({ error: 'Database Error', message: 'Failed to create user' }, 500);
    }

    // Get created user
    const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();

    // Generate token
    const token = await sign({ id: user.id, email: user.email }, c.env.JWT_SECRET);

    return c.json({
        status: 'success',
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone
        }
    }, 201);
});

auth.post('/login', async (c) => {
    const { email, password } = await c.req.json();

    const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();

    if (!user || !user.password_hash) {
        return c.json({ error: 'Unauthorized', message: 'Invalid credentials' }, 401);
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
        return c.json({ error: 'Unauthorized', message: 'Invalid credentials' }, 401);
    }

    const token = await sign({ id: user.id, email: user.email }, c.env.JWT_SECRET);

    return c.json({
        status: 'success',
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            avatar_url: user.avatar_url
        }
    });
});

auth.get('/profile', authMiddleware, async (c) => {
    const payload = c.get('user');
    const user = await c.env.DB.prepare('SELECT id, name, email, phone, avatar_url, created_at FROM users WHERE id = ?').bind(payload.id).first();

    if (!user) {
        return c.json({ error: 'Not Found', message: 'User not found' }, 404);
    }

    return c.json({ status: 'success', user });
});

// --- COURSES ROUTES ---
const courses = new Hono<{ Bindings: Bindings }>();

courses.get('/', async (c) => {
    const { results } = await c.env.DB.prepare('SELECT * FROM courses ORDER BY created_at DESC').all();
    return c.json({ results });
});

courses.get('/:id', async (c) => {
    const id = c.req.param('id');
    const course = await c.env.DB.prepare('SELECT * FROM courses WHERE id = ?').bind(id).first();

    if (!course) {
        return c.json({ error: 'Not Found', message: 'Course not found' }, 404);
    }

    const { results: lessons } = await c.env.DB.prepare(
        'SELECT id, title, type, duration_seconds, order_num FROM lessons WHERE course_id = ? ORDER BY order_num ASC'
    ).bind(id).all();

    return c.json({ ...course, lessons });
});

courses.post('/:id/enroll', authMiddleware, async (c) => {
    const courseId = c.req.param('id');
    const user = c.get('user');

    const course = await c.env.DB.prepare('SELECT id FROM courses WHERE id = ?').bind(courseId).first();
    if (!course) {
        return c.json({ error: 'Not Found', message: 'Course not found' }, 404);
    }

    const existing = await c.env.DB.prepare(
        'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?'
    ).bind(user.id, courseId).first();

    if (existing) {
        return c.json({ message: 'Already enrolled' });
    }

    await c.env.DB.prepare(
        'INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)'
    ).bind(user.id, courseId).run();

    return c.json({ status: 'success', message: 'Enrolled successfully' }, 201);
});

// --- ROUTE REGISTRATION ---
app.route('/api/v1/auth', auth);
app.route('/api/v1/courses', courses);

// Error Handling
app.onError((err, c) => {
    console.error(`${err}`);
    return c.json({
        status: 'error',
        message: err.message || 'Internal Server Error'
    }, 500);
});

app.notFound((c) => {
    return c.json({ status: 'error', message: 'Not Found' }, 404);
});

export default app;
