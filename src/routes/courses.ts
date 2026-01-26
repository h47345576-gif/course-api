import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';

const courses = new Hono<{ Bindings: any }>();

// List all courses
courses.get('/', async (c) => {
    const { results } = await c.env.DB.prepare('SELECT * FROM courses ORDER BY created_at DESC').all();
    return c.json({ results });
});

// Get course details
courses.get('/:id', async (c) => {
    const id = c.req.param('id');
    const course = await c.env.DB.prepare('SELECT * FROM courses WHERE id = ?').bind(id).first();

    if (!course) {
        return c.json({ error: 'Not Found', message: 'Course not found' }, 404);
    }

    // Get lessons summary
    const { results: lessons } = await c.env.DB.prepare(
        'SELECT id, title, type, duration_seconds, order_num, is_free FROM lessons WHERE course_id = ? ORDER BY order_num ASC'
    ).bind(id).all();

    return c.json({
        ...course,
        lessons
    });
});

// Get lessons for a course (Protected for full access usually, but we'll return list)
courses.get('/:id/lessons', async (c) => {
    const id = c.req.param('id');
    const { results } = await c.env.DB.prepare(
        'SELECT * FROM lessons WHERE course_id = ? ORDER BY order_num ASC'
    ).bind(id).all();

    return c.json({ results });
});

// Enroll in a course (Protected)
courses.post('/:id/enroll', authMiddleware, async (c) => {
    const courseId = c.req.param('id');
    const user = c.get('user');

    // Check if course exists
    const course = await c.env.DB.prepare('SELECT id FROM courses WHERE id = ?').bind(courseId).first();
    if (!course) {
        return c.json({ error: 'Not Found', message: 'Course not found' }, 404);
    }

    // Check if already enrolled
    const existing = await c.env.DB.prepare(
        'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?'
    ).bind(user.id, courseId).first();

    if (existing) {
        return c.json({ message: 'Already enrolled' });
    }

    // Enroll
    await c.env.DB.prepare(
        'INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)'
    ).bind(user.id, courseId).run();

    return c.json({ status: 'success', message: 'Enrolled successfully' }, 201);
});

export default courses;
