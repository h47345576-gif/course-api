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

const courses = new Hono<{ Bindings: any; Variables: Variables }>();

// --- File Upload (R2 via S3 API) ---
import { AwsClient } from 'aws4fetch';

// Upload Image (Teacher/Admin) - MUST be defined before /:id to avoid shadowing
courses.post('/upload', authMiddleware, async (c) => {
    const user = c.get('user');
    if (user.role !== 'teacher' && user.role !== 'admin') {
        return c.json({ error: 'Unauthorized' }, 403);
    }

    try {
        const body = await c.req.parseBody();
        const file = body['file'];

        if (!file || !(file instanceof File)) {
            return c.json({ error: 'No file uploaded' }, 400);
        }

        if (!file.type.startsWith('image/')) {
            return c.json({ error: 'Invalid file type' }, 400);
        }

        const extension = file.name.split('.').pop();
        const fileName = `courses/${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;

        // R2 Configuration
        const R2_ACCOUNT_ID = c.env.R2_ACCOUNT_ID;
        const R2_ACCESS_KEY_ID = c.env.R2_ACCESS_KEY_ID;
        const R2_SECRET_ACCESS_KEY = c.env.R2_SECRET_ACCESS_KEY;
        const R2_BUCKET_NAME = c.env.R2_BUCKET_NAME;
        const PUBLIC_R2_URL = c.env.PUBLIC_R2_URL;

        if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ACCOUNT_ID || !R2_BUCKET_NAME) {
            return c.json({ error: 'Server configuration error: Missing R2 keys' }, 500);
        }

        const r2 = new AwsClient({
            accessKeyId: R2_ACCESS_KEY_ID,
            secretAccessKey: R2_SECRET_ACCESS_KEY,
            service: 's3',
            region: 'auto',
        });

        // Sign and upload
        // R2 S3 Endpoint: https://<accountid>.r2.cloudflarestorage.com
        const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${fileName}`;

        const response = await r2.fetch(endpoint, {
            method: 'PUT',
            headers: {
                'Content-Type': file.type
            },
            body: file.stream()
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('R2 Upload Error:', errorText);
            throw new Error('Failed to upload to R2');
        }

        // Return Public URL
        const publicUrl = `${PUBLIC_R2_URL}/${fileName}`;

        return c.json({ status: 'success', url: publicUrl });

    } catch (e: any) {
        return c.json({ error: 'Upload failed', details: e.message }, 500);
    }
});

// Generate R2 Presigned URL for Video Upload (Teacher/Admin)
courses.post('/upload-url', authMiddleware, async (c) => {
    const user = c.get('user');
    if (user.role !== 'teacher' && user.role !== 'admin') {
        return c.json({ error: 'Unauthorized' }, 403);
    }

    try {
        const body = await c.req.json();
        const { fileName, fileType } = body;

        if (!fileName || !fileType) {
            return c.json({ error: 'Missing fileName or fileType' }, 400);
        }

        if (!fileType.startsWith('video/')) {
            return c.json({ error: 'Invalid file type. Only videos are allowed.' }, 400);
        }

        const extension = fileName.split('.').pop();
        const randomName = `videos/${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;

        const R2_ACCOUNT_ID = c.env.R2_ACCOUNT_ID;
        const R2_ACCESS_KEY_ID = c.env.R2_ACCESS_KEY_ID;
        const R2_SECRET_ACCESS_KEY = c.env.R2_SECRET_ACCESS_KEY;
        const R2_BUCKET_NAME = c.env.R2_BUCKET_NAME;
        const PUBLIC_R2_URL = c.env.PUBLIC_R2_URL;

        if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ACCOUNT_ID || !R2_BUCKET_NAME) {
            return c.json({ error: 'Server configuration error: Missing R2 keys' }, 500);
        }

        const r2 = new AwsClient({
            accessKeyId: R2_ACCESS_KEY_ID,
            secretAccessKey: R2_SECRET_ACCESS_KEY,
            service: 's3',
            region: 'auto',
        });

        const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${randomName}`;

        // Generate signed Request with aws4fetch, enabling query params
        const signedRequest = await r2.sign(endpoint, {
            method: 'PUT',
            headers: {
                'Content-Type': fileType
            },
            aws: { signQuery: true }
        });

        return c.json({
            status: 'success',
            uploadUrl: signedRequest.url,
            publicUrl: `${PUBLIC_R2_URL}/${randomName}`
        });

    } catch (e: any) {
        return c.json({ error: 'Failed to generate upload URL', details: e.message }, 500);
    }
});

// Temporary Seed Endpoint - MUST be defined before /:id
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

// Check enrollment status + progress for a course (Protected)
courses.get('/:id/enrollment-status', authMiddleware, async (c) => {
    const courseId = c.req.param('id');
    const user = c.get('user');

    try {
        // Check enrollment
        const enrollment = await c.env.DB.prepare(
            'SELECT id, progress, created_at FROM enrollments WHERE user_id = ? AND course_id = ?'
        ).bind(user.id, courseId).first();

        if (!enrollment) {
            return c.json({ enrolled: false, progress: 0 });
        }

        // Calculate progress from lesson_progress
        const totalLessons = await c.env.DB.prepare(
            'SELECT COUNT(*) as count FROM lessons WHERE course_id = ?'
        ).bind(courseId).first();

        const completedLessons = await c.env.DB.prepare(
            'SELECT COUNT(*) as count FROM lesson_progress lp JOIN lessons l ON lp.lesson_id = l.id WHERE l.course_id = ? AND lp.user_id = ? AND lp.is_completed = 1'
        ).bind(courseId, user.id).first();

        const total = (totalLessons as any)?.count || 0;
        const completed = (completedLessons as any)?.count || 0;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

        // Update enrollment progress
        await c.env.DB.prepare(
            'UPDATE enrollments SET progress = ? WHERE id = ?'
        ).bind(progress, enrollment.id).run();

        // Get completed lesson IDs
        const { results: completedLessonIds } = await c.env.DB.prepare(
            'SELECT lesson_id FROM lesson_progress WHERE user_id = ? AND is_completed = 1'
        ).bind(user.id).all();

        // Check for certificate if progress is 100%
        let certificate_number = null;
        if (progress === 100) {
            const certRow = await c.env.DB.prepare(
                'SELECT certificate_number FROM certificates WHERE user_id = ? AND course_id = ?'
            ).bind(user.id, courseId).first();
            if (certRow) {
                certificate_number = (certRow as any).certificate_number;
            }
        }

        return c.json({
            enrolled: true,
            progress,
            completed_lessons: completed,
            total_lessons: total,
            completed_lesson_ids: completedLessonIds.map((r: any) => r.lesson_id),
            enrolled_at: enrollment.created_at,
            certificate_number
        });
    } catch (error: any) {
        return c.json({ message: error.message || 'Failed to check enrollment status' }, 500);
    }
});

// Get quizzes for a course (Protected)
courses.get('/:id/quizzes', authMiddleware, async (c) => {
    const courseId = c.req.param('id');
    const user = c.get('user');

    try {
        // Get all quizzes for lessons in this course
        const { results: quizzes } = await c.env.DB.prepare(
            `SELECT q.id, q.lesson_id, q.title, q.description, q.time_limit_minutes, q.passing_score, q.max_attempts,
                    (SELECT COUNT(*) FROM questions WHERE quiz_id = q.id) as question_count
             FROM quizzes q
             JOIN lessons l ON q.lesson_id = l.id
             WHERE l.course_id = ?
             ORDER BY l.order_num ASC`
        ).bind(courseId).all();

        // Get user's quiz attempts
        const { results: attempts } = await c.env.DB.prepare(
            `SELECT qa.quiz_id, qa.score, qa.total_points, qa.passed, qa.completed_at
             FROM quiz_attempts qa
             JOIN quizzes q ON qa.quiz_id = q.id
             JOIN lessons l ON q.lesson_id = l.id
             WHERE l.course_id = ? AND qa.user_id = ?
             ORDER BY qa.completed_at DESC`
        ).bind(courseId, user.id).all();

        // Map attempts to quizzes
        const quizzesWithAttempts = quizzes.map((quiz: any) => {
            const quizAttempts = attempts.filter((a: any) => a.quiz_id === quiz.id);
            return {
                ...quiz,
                attempts: quizAttempts,
                best_score: quizAttempts.length > 0 ? Math.max(...quizAttempts.map((a: any) => a.score)) : null,
                attempts_count: quizAttempts.length
            };
        });

        return c.json({ results: quizzesWithAttempts });
    } catch (error: any) {
        return c.json({ message: error.message || 'Failed to fetch quizzes' }, 500);
    }
});

// Mark lesson as completed (Protected)
courses.post('/lessons/:lessonId/complete', authMiddleware, async (c) => {
    const lessonId = c.req.param('lessonId');
    const user = c.get('user');

    try {
        // Check lesson exists and get course_id
        const lesson = await c.env.DB.prepare(
            'SELECT id, course_id FROM lessons WHERE id = ?'
        ).bind(lessonId).first();

        if (!lesson) {
            return c.json({ message: 'Lesson not found' }, 404);
        }

        // Check enrollment
        const enrollment = await c.env.DB.prepare(
            'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?'
        ).bind(user.id, (lesson as any).course_id).first();

        if (!enrollment) {
            return c.json({ message: 'You must be enrolled in this course' }, 403);
        }

        // Upsert lesson progress
        await c.env.DB.prepare(
            `INSERT INTO lesson_progress (user_id, lesson_id, is_completed, completed_at)
             VALUES (?, ?, 1, datetime('now'))
             ON CONFLICT(user_id, lesson_id) DO UPDATE SET is_completed = 1, completed_at = datetime('now')`
        ).bind(user.id, lessonId).run();

        // Recalculate progress
        const totalLessons = await c.env.DB.prepare(
            'SELECT COUNT(*) as count FROM lessons WHERE course_id = ?'
        ).bind((lesson as any).course_id).first();

        const completedLessonsCount = await c.env.DB.prepare(
            'SELECT COUNT(*) as count FROM lesson_progress lp JOIN lessons l ON lp.lesson_id = l.id WHERE l.course_id = ? AND lp.user_id = ? AND lp.is_completed = 1'
        ).bind((lesson as any).course_id, user.id).first();

        const total = (totalLessons as any)?.count || 0;
        const completedCount = (completedLessonsCount as any)?.count || 0;
        const progress = total > 0 ? Math.round((completedCount / total) * 100) : 0;

        // Update enrollment progress
        await c.env.DB.prepare(
            'UPDATE enrollments SET progress = ? WHERE user_id = ? AND course_id = ?'
        ).bind(progress, user.id, (lesson as any).course_id).run();

        // Auto-issue certificate if progress is 100%
        let certificate_number = null;
        if (progress === 100) {
            try {
                // Check if certificate already exists
                const existingCert = await c.env.DB.prepare(
                    'SELECT certificate_number FROM certificates WHERE user_id = ? AND course_id = ?'
                ).bind(user.id, (lesson as any).course_id).first();

                if (!existingCert) {
                    certificate_number = `CERT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
                    await c.env.DB.prepare(
                        'INSERT INTO certificates (user_id, course_id, certificate_number) VALUES (?, ?, ?)'
                    ).bind(user.id, (lesson as any).course_id, certificate_number).run();
                } else {
                    certificate_number = (existingCert as any).certificate_number;
                }
            } catch (certError) {
                console.error('Auto-certificate issuance error:', certError);
            }
        }

        return c.json({
            status: 'success',
            message: 'Lesson completed',
            progress,
            completed_lessons: completedCount,
            total_lessons: total,
            certificate_number
        });
    } catch (error: any) {
        return c.json({ message: error.message || 'Failed to mark lesson as completed' }, 500);
    }
});

// List all courses
courses.get('/', async (c) => {
    const { results } = await c.env.DB.prepare('SELECT * FROM courses WHERE is_archived = 0 ORDER BY created_at DESC').all();
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


// Create a new course (Protected)
courses.post('/', authMiddleware, async (c) => {
    const user = c.get('user');
    if (user.role !== 'teacher' && user.role !== 'admin') {
        return c.json({ error: 'Unauthorized', message: 'Only teachers and admins can create courses' }, 403);
    }

    const body = await c.req.json();
    const { title, description, instructor, category, thumbnail_url, price, original_price, discount_percentage, duration_minutes, duration, can_download, requirements, extra_content } = body;

    const result = await c.env.DB.prepare(
        `INSERT INTO courses (title, description, instructor, instructor_id, category, thumbnail_url, price, original_price, discount_percentage, duration_minutes, can_download, requirements, extra_content) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
        title,
        description,
        instructor || user.name,
        user.id,
        category,
        thumbnail_url,
        price || 0,
        original_price || 0,
        discount_percentage || 0,
        duration_minutes || parseInt(duration) || 0,
        can_download !== undefined ? can_download : 1,
        requirements || '',
        extra_content || ''
    ).run();

    return c.json({ status: 'success', id: result.meta.last_row_id }, 201);
});

// Update an existing course (Protected)
courses.put('/:id', authMiddleware, async (c) => {
    const id = c.req.param('id');
    const user = c.get('user');

    const course = await c.env.DB.prepare('SELECT instructor_id, instructor FROM courses WHERE id = ?').bind(id).first();
    if (!course) return c.json({ error: 'Not Found' }, 404);

    if (user.role !== 'admin' && course.instructor_id !== user.id && course.instructor !== user.name) {
        return c.json({ error: 'Unauthorized', message: 'Only the course instructor can edit this course' }, 403);
    }

    const body = await c.req.json();

    if (body.duration !== undefined && body.duration_minutes === undefined) {
        body.duration_minutes = parseInt(body.duration) || 0;
        delete body.duration;
    }

    const updates = Object.keys(body).map(key => `${key} = ?`).join(', ');
    const values = Object.values(body);

    await c.env.DB.prepare(
        `UPDATE courses SET ${updates} WHERE id = ?`
    ).bind(...values, id).run();

    return c.json({ status: 'success', message: 'Course updated' });
});

// Delete a course (Protected)
courses.delete('/:id', authMiddleware, async (c) => {
    const id = c.req.param('id');
    const user = c.get('user');

    const course = await c.env.DB.prepare('SELECT instructor_id, instructor FROM courses WHERE id = ?').bind(id).first();
    if (!course) return c.json({ error: 'Not Found' }, 404);

    if (user.role !== 'admin' && course.instructor_id !== user.id && course.instructor !== user.name) {
        return c.json({ error: 'Unauthorized', message: 'Only the course instructor can delete this course' }, 403);
    }

    await c.env.DB.prepare('DELETE FROM courses WHERE id = ?').bind(id).run();
    return c.json({ status: 'success', message: 'Course and related content deleted' });
});

// --- Lessons Management ---

// Add lesson to course
courses.post('/:id/lessons', authMiddleware, async (c) => {
    const courseId = c.req.param('id');
    const user = c.get('user');

    const course = await c.env.DB.prepare('SELECT instructor_id, instructor FROM courses WHERE id = ?').bind(courseId).first();
    if (!course) return c.json({ error: 'Not Found' }, 404);
    if (user.role !== 'admin' && course.instructor_id !== user.id && course.instructor !== user.name) {
        return c.json({ error: 'Unauthorized', message: 'Only the course instructor can add lessons' }, 403);
    }

    const body = await c.req.json();
    const { title, description, type, content_url, duration_seconds, order_num, text_content } = body;

    const result = await c.env.DB.prepare(
        `INSERT INTO lessons (course_id, title, description, type, content_url, duration_seconds, order_num, text_content) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(courseId, title, description || null, type || 'video', content_url, duration_seconds || 0, order_num || 0, text_content || null).run();

    return c.json({ status: 'success', id: result.meta.last_row_id }, 201);
});

// Update lesson
courses.put('/lessons/:lessonId', authMiddleware, async (c) => {
    const lessonId = c.req.param('lessonId');
    const user = c.get('user');

    const lesson = await c.env.DB.prepare(
        'SELECT c.instructor_id, c.instructor FROM courses c JOIN lessons l ON l.course_id = c.id WHERE l.id = ?'
    ).bind(lessonId).first();

    if (!lesson) return c.json({ error: 'Not Found' }, 404);
    if (user.role !== 'admin' && lesson.instructor_id !== user.id && lesson.instructor !== user.name) {
        return c.json({ error: 'Unauthorized', message: 'Only the course instructor can edit lessons' }, 403);
    }

    const body = await c.req.json();
    const updates = Object.keys(body).map(key => `${key} = ?`).join(', ');
    const values = Object.values(body);

    await c.env.DB.prepare(
        `UPDATE lessons SET ${updates} WHERE id = ?`
    ).bind(...values, lessonId).run();

    return c.json({ status: 'success', message: 'Lesson updated' });
});

// Delete lesson
courses.delete('/lessons/:lessonId', authMiddleware, async (c) => {
    const lessonId = c.req.param('lessonId');
    const user = c.get('user');

    const lesson = await c.env.DB.prepare(
        'SELECT c.instructor_id, c.instructor FROM courses c JOIN lessons l ON l.course_id = c.id WHERE l.id = ?'
    ).bind(lessonId).first();

    if (!lesson) return c.json({ error: 'Not Found' }, 404);
    if (user.role !== 'admin' && lesson.instructor_id !== user.id && lesson.instructor !== user.name) {
        return c.json({ error: 'Unauthorized', message: 'Only the course instructor can delete lessons' }, 403);
    }

    await c.env.DB.prepare('DELETE FROM lessons WHERE id = ?').bind(lessonId).run();
    return c.json({ status: 'success', message: 'Lesson deleted' });
});

export default courses;
