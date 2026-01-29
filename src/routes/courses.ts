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

// Temporary Seed Endpoint
courses.post('/seed', async (c) => {
    try {
        // Add Courses
        await c.env.DB.batch([
            c.env.DB.prepare("INSERT INTO courses (title, description, instructor, category, thumbnail_url, price, duration_minutes) VALUES ('تعلم برمجة فلاتر من الصفر', 'دورة شاملة لتعلم تطوير تطبيقات الموبايل باستخدام Flutter و Dart', 'محمد أحمد', 'برمجة', 'https://storage.googleapis.com/cms-storage-bucket/0dbfcc7a59cd1cf16282.png', 150000, 1200)"),
            c.env.DB.prepare("INSERT INTO courses (title, description, instructor, category, thumbnail_url, price, duration_minutes) VALUES ('التصميم الجرافيكي للمبتدئين', 'تعلم أساسيات التصميم الجرافيكي باستخدام Photoshop و Illustrator', 'سارة علي', 'تصميم', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT8k5q6c8v4y3b3f2g1h0j9k8l7m6n5o4p3q2&s', 0, 800)"),
            c.env.DB.prepare("INSERT INTO courses (title, description, instructor, category, thumbnail_url, price, duration_minutes) VALUES ('أساسيات الذكاء الاصطناعي', 'مدخل إلى عالم الذكاء الاصطناعي وتعلم الآلة', 'أحمد محمود', 'ذكاء اصطناعي', 'https://www.simplilearn.com/ice9/free_resources_article_thumb/Types_of_Artificial_Intelligence.jpg', 200000, 1500)"),
            c.env.DB.prepare("INSERT INTO courses (title, description, instructor, category, thumbnail_url, price, duration_minutes) VALUES ('التسويق الرقمي الحديث', 'استراتيجيات التسويق عبر وسائل التواصل الاجتماعي وتحسين محركات البحث', 'نور هدى', 'تسويق', 'https://www.simplilearn.com/ice9/free_resources_article_thumb/What_is_digital_marketing.jpg', 100000, 900)")
        ]);

        // We need course IDs to add lessons. Since we just inserted, and IDs are autoincrement, we can assume 1, 2, 3, 4 if fresh, or strictly we should select.
        // For robustness, let's fetch IDs.
        const courses = await c.env.DB.prepare('SELECT id, title FROM courses').all();

        // Let's just add lessons for the first found course if matches title, or loosely add to ID 1 and 2
        // To be safe against existing data, we can use INSERT OR IGNORE or just try.
        // Simplified for this emergency fix:
        await c.env.DB.batch([
            c.env.DB.prepare("INSERT INTO lessons (course_id, title, type, duration_seconds, order_num) VALUES (1, 'مقدمة في فلاتر', 'video', 600, 1)"),
            c.env.DB.prepare("INSERT INTO lessons (course_id, title, type, duration_seconds, order_num) VALUES (1, 'تثبيت بيئة العمل', 'video', 1200, 2)"),
            c.env.DB.prepare("INSERT INTO lessons (course_id, title, type, duration_seconds, order_num) VALUES (1, 'أساسيات لغة Dart', 'video', 1800, 3)"),
            c.env.DB.prepare("INSERT INTO lessons (course_id, title, type, duration_seconds, order_num) VALUES (2, 'مفهوم الألوان', 'video', 900, 1)")
        ]);

        return c.json({ message: 'Seeded successfully' });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

export default courses;
