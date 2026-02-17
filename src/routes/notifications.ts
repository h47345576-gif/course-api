import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';

type Variables = {
    user: {
        id: string | number;
        role: string;
        name: string;
        [key: string]: any;
    };
};

const app = new Hono<{ Bindings: any; Variables: Variables }>();

// GET /api/v1/notifications - Get all notifications (admin only)
app.get('/', authMiddleware, async (c) => {
    const user = c.get('user');

    if (user.role !== 'admin') {
        return c.json({ message: 'Unauthorized - Admin access required' }, 403);
    }

    try {
        const limit = parseInt(c.req.query('limit') || '20');
        const notifications = await c.env.DB.prepare(
            `SELECT * FROM notifications ORDER BY created_at DESC LIMIT ?`
        ).bind(limit).all();

        return c.json({
            results: notifications.results || []
        });
    } catch (error: any) {
        console.error('Get notifications error:', error);
        return c.json({ message: error.message || 'Failed to fetch notifications' }, 500);
    }
});

// GET /api/v1/notifications/count - Get unread count (admin only)
app.get('/count', authMiddleware, async (c) => {
    const user = c.get('user');

    if (user.role !== 'admin') {
        return c.json({ message: 'Unauthorized' }, 403);
    }

    try {
        const result = await c.env.DB.prepare(
            `SELECT COUNT(*) as count FROM notifications WHERE is_read = 0`
        ).first();

        return c.json({
            count: result?.count || 0
        });
    } catch (error: any) {
        console.error('Get notification count error:', error);
        return c.json({ message: error.message || 'Failed to get count' }, 500);
    }
});

// PUT /api/v1/notifications/:id/read - Mark one as read
app.put('/:id/read', authMiddleware, async (c) => {
    const user = c.get('user');

    if (user.role !== 'admin') {
        return c.json({ message: 'Unauthorized' }, 403);
    }

    const notificationId = c.req.param('id');

    try {
        await c.env.DB.prepare(
            `UPDATE notifications SET is_read = 1 WHERE id = ?`
        ).bind(notificationId).run();

        return c.json({ message: 'Notification marked as read' });
    } catch (error: any) {
        console.error('Mark read error:', error);
        return c.json({ message: error.message || 'Failed to mark as read' }, 500);
    }
});

// PUT /api/v1/notifications/read-all - Mark all as read
app.put('/read-all', authMiddleware, async (c) => {
    const user = c.get('user');

    if (user.role !== 'admin') {
        return c.json({ message: 'Unauthorized' }, 403);
    }

    try {
        await c.env.DB.prepare(
            `UPDATE notifications SET is_read = 1 WHERE is_read = 0`
        ).run();

        return c.json({ message: 'All notifications marked as read' });
    } catch (error: any) {
        console.error('Mark all read error:', error);
        return c.json({ message: error.message || 'Failed to mark all as read' }, 500);
    }
});

export default app;
