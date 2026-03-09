import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import * as bcrypt from 'bcryptjs';

const users = new Hono<{ Bindings: any; Variables: { user: any } }>();

// ===== Migration Route (مؤقت - احذفه بعد التنفيذ) =====
users.get('/migrate', async (c) => {
    try {
        try {
            await c.env.DB.prepare(`
                ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'student'
            `).run();
        } catch (e: any) {
            console.log('Column role might already exist:', e.message);
        }

        await c.env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS user_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER UNIQUE NOT NULL,
                bio TEXT,
                status TEXT DEFAULT 'active',
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `).run();

        // Create profiles for existing users that don't have one
        await c.env.DB.prepare(`
            INSERT OR IGNORE INTO user_profiles (user_id, status)
            SELECT id, 'active' FROM users WHERE id NOT IN (SELECT user_id FROM user_profiles)
        `).run();

        return c.json({ status: 'success', message: 'Migration completed: user_profiles table created' });
    } catch (error: any) {
        return c.json({ status: 'error', message: error.message }, 500);
    }
});

// ===== GET /users - جلب المستخدمين مع بحث/فلترة/ترتيب =====
users.get('/', authMiddleware, async (c) => {
    const user = c.get('user') as any;
    if (user.role !== 'admin') {
        return c.json({ error: 'Forbidden', message: 'Admin access required' }, 403);
    }

    try {
        const search = c.req.query('search') || '';
        const role = c.req.query('role') || '';
        const sort = c.req.query('sort') || 'created_at';
        const order = c.req.query('order') || 'DESC';

        // Validate sort column to prevent SQL injection
        const validSorts: Record<string, string> = {
            'name': 'u.name',
            'email': 'u.email',
            'created_at': 'u.created_at',
            'role': 'u.role'
        };
        const sortColumn = validSorts[sort] || 'u.created_at';
        const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        let query = `
            SELECT u.id, u.name, u.email, u.phone, u.avatar_url, u.role, u.created_at,
                   COALESCE(p.bio, '') as bio,
                   COALESCE(p.status, 'active') as status
            FROM users u
            LEFT JOIN user_profiles p ON u.id = p.user_id
            WHERE 1=1
        `;
        const params: any[] = [];

        // Search filter
        if (search) {
            query += ` AND (u.name LIKE ? OR u.email LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        // Role filter
        if (role && ['admin', 'teacher', 'student'].includes(role)) {
            query += ` AND u.role = ?`;
            params.push(role);
        }

        // Sorting
        query += ` ORDER BY ${sortColumn} ${sortOrder}`;

        const stmt = c.env.DB.prepare(query);
        const result = params.length > 0
            ? await stmt.bind(...params).all()
            : await stmt.all();

        // Get counts by role
        const countResult = await c.env.DB.prepare(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins,
                SUM(CASE WHEN role = 'teacher' THEN 1 ELSE 0 END) as teachers,
                SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END) as students
            FROM users
        `).first();

        return c.json({
            status: 'success',
            results: result.results,
            counts: {
                total: countResult?.total || 0,
                admins: countResult?.admins || 0,
                teachers: countResult?.teachers || 0,
                students: countResult?.students || 0
            }
        });
    } catch (error: any) {
        return c.json({ error: 'Database Error', message: error.message }, 500);
    }
});

// ===== GET /users/:id - تفاصيل مستخدم =====
users.get('/:id', authMiddleware, async (c) => {
    const user = c.get('user') as any;
    if (user.role !== 'admin') {
        return c.json({ error: 'Forbidden', message: 'Admin access required' }, 403);
    }

    const id = c.req.param('id');

    try {
        const result = await c.env.DB.prepare(`
            SELECT u.id, u.name, u.email, u.phone, u.avatar_url, u.role, u.created_at,
                   COALESCE(p.bio, '') as bio,
                   COALESCE(p.status, 'active') as status
            FROM users u
            LEFT JOIN user_profiles p ON u.id = p.user_id
            WHERE u.id = ?
        `).bind(id).first();

        if (!result) {
            return c.json({ error: 'Not Found', message: 'User not found' }, 404);
        }

        // Get enrollment count
        const enrollments = await c.env.DB.prepare(
            'SELECT COUNT(*) as count FROM enrollments WHERE user_id = ?'
        ).bind(id).first();

        return c.json({
            status: 'success',
            user: {
                ...result,
                enrollments_count: enrollments?.count || 0
            }
        });
    } catch (error: any) {
        return c.json({ error: 'Database Error', message: error.message }, 500);
    }
});

// ===== POST /users - إضافة مستخدم جديد =====
users.post('/', authMiddleware, async (c) => {
    const admin = c.get('user') as any;
    if (admin.role !== 'admin') {
        return c.json({ error: 'Forbidden', message: 'Admin access required' }, 403);
    }

    try {
        const { name, email, password, phone, role, bio, status } = await c.req.json();

        if (!name || !email) {
            return c.json({ error: 'Validation Error', message: 'Name and email are required' }, 400);
        }

        // Check if email exists
        const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
        if (existing) {
            return c.json({ error: 'Conflict', message: 'Email already exists' }, 409);
        }

        // Hash password if provided
        let passwordHash = null;
        if (password) {
            const salt = await bcrypt.genSalt(10);
            passwordHash = await bcrypt.hash(password, salt);
        }

        const userRole = role || 'student';

        // Insert user
        const result = await c.env.DB.prepare(
            'INSERT INTO users (name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, ?)'
        ).bind(name, email, passwordHash, phone || null, userRole).run();

        if (!result.success) {
            return c.json({ error: 'Database Error', message: 'Failed to create user' }, 500);
        }

        // Get the new user id
        const newUser = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();

        // Create profile
        if (newUser) {
            await c.env.DB.prepare(
                'INSERT INTO user_profiles (user_id, bio, status) VALUES (?, ?, ?)'
            ).bind(newUser.id, bio || '', status || 'active').run();
        }

        return c.json({ status: 'success', message: 'User created successfully', userId: newUser?.id }, 201);
    } catch (error: any) {
        return c.json({ error: 'Database Error', message: error.message }, 500);
    }
});

// ===== PUT /users/:id - تعديل مستخدم =====
users.put('/:id', authMiddleware, async (c) => {
    const admin = c.get('user') as any;
    if (admin.role !== 'admin') {
        return c.json({ error: 'Forbidden', message: 'Admin access required' }, 403);
    }

    const id = c.req.param('id');

    try {
        const { name, email, password, phone, role, bio, status } = await c.req.json();

        // Check user exists
        const existing = await c.env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(id).first();
        if (!existing) {
            return c.json({ error: 'Not Found', message: 'User not found' }, 404);
        }

        // Check email uniqueness (excluding current user)
        if (email) {
            const emailCheck = await c.env.DB.prepare(
                'SELECT id FROM users WHERE email = ? AND id != ?'
            ).bind(email, id).first();
            if (emailCheck) {
                return c.json({ error: 'Conflict', message: 'Email already taken' }, 409);
            }
        }

        // Update user
        let updateQuery = 'UPDATE users SET name = ?, email = ?, phone = ?, role = ?';
        const updateParams: any[] = [
            name || '',
            email || '',
            phone || null,
            role || 'student'
        ];

        if (password) {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);
            updateQuery += ', password_hash = ?';
            updateParams.push(passwordHash);
        }

        updateQuery += ' WHERE id = ?';
        updateParams.push(id);

        await c.env.DB.prepare(updateQuery).bind(...updateParams).run();

        // Update or create profile
        const profileExists = await c.env.DB.prepare(
            'SELECT id FROM user_profiles WHERE user_id = ?'
        ).bind(id).first();

        if (profileExists) {
            await c.env.DB.prepare(
                'UPDATE user_profiles SET bio = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?'
            ).bind(bio || '', status || 'active', id).run();
        } else {
            await c.env.DB.prepare(
                'INSERT INTO user_profiles (user_id, bio, status) VALUES (?, ?, ?)'
            ).bind(id, bio || '', status || 'active').run();
        }

        return c.json({ status: 'success', message: 'User updated successfully' });
    } catch (error: any) {
        return c.json({ error: 'Database Error', message: error.message }, 500);
    }
});

// ===== DELETE /users/:id - حذف مستخدم =====
users.delete('/:id', authMiddleware, async (c) => {
    const admin = c.get('user') as any;
    if (admin.role !== 'admin') {
        return c.json({ error: 'Forbidden', message: 'Admin access required' }, 403);
    }

    const id = c.req.param('id');

    try {
        // Prevent deleting self
        if (String(admin.id) === String(id)) {
            return c.json({ error: 'Forbidden', message: 'Cannot delete yourself' }, 403);
        }

        const existing = await c.env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(id).first();
        if (!existing) {
            return c.json({ error: 'Not Found', message: 'User not found' }, 404);
        }

        // Delete profile first
        await c.env.DB.prepare('DELETE FROM user_profiles WHERE user_id = ?').bind(id).run();
        // Delete user
        await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();

        return c.json({ status: 'success', message: 'User deleted successfully' });
    } catch (error: any) {
        return c.json({ error: 'Database Error', message: error.message }, 500);
    }
});

export default users;
