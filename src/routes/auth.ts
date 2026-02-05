import { Hono } from 'hono';
import { sign } from '../utils/jwt';
import { authMiddleware } from '../middleware/auth';
import * as bcrypt from 'bcryptjs';

type Variables = {
    user: {
        id: string | number;
        role: string;
        name: string;
        [key: string]: any;
    };
};

const auth = new Hono<{ Bindings: any; Variables: Variables }>();

// Register
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
    ).bind(name, email, passwordHash, phone || null).run();

    if (!result.success) {
        return c.json({ error: 'Database Error', message: 'Failed to create user' }, 500);
    }

    // Get created user
    const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();

    // Generate token
    const token = await sign({ id: user.id, email: user.email, name: user.name, role: 'student' }, c.env.JWT_SECRET);

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

// Login
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

    // Determine role (Temporary logic until DB migration)
    let role = 'student';
    if (user.email.includes('admin')) {
        role = 'admin';
    } else if (user.email.includes('teacher')) {
        role = 'teacher';
    }

    // Also check if DB has role column (future proofing)
    if (user.role) {
        role = user.role;
    }

    const token = await sign({ id: user.id, email: user.email, name: user.name, role }, c.env.JWT_SECRET);

    return c.json({
        status: 'success',
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            avatar_url: user.avatar_url,
            role: role
        }
    });
});

// Profile (Protected)
auth.get('/profile', authMiddleware, async (c) => {
    const payload = c.get('user');
    const user = await c.env.DB.prepare('SELECT id, name, email, phone, avatar_url, created_at FROM users WHERE id = ?').bind(payload.id).first();

    if (!user) {
        return c.json({ error: 'Not Found', message: 'User not found' }, 404);
    }

    return c.json({
        status: 'success',
        user
    });
});

export default auth;
