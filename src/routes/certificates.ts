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

const certificates = new Hono<{ Bindings: any; Variables: Variables }>();

// ===== Admin: Certificate Templates =====

// List all certificate templates (Admin)
certificates.get('/templates', authMiddleware, async (c) => {
    const user = c.get('user');
    if (user.role !== 'admin' && user.role !== 'teacher') {
        return c.json({ error: 'Unauthorized' }, 403);
    }

    try {
        const { results } = await c.env.DB.prepare(
            `SELECT ct.*, c.title as course_title, c.thumbnail_url,
                    (SELECT COUNT(*) FROM certificates WHERE course_id = ct.course_id) as issued_count
             FROM certificate_templates ct
             JOIN courses c ON ct.course_id = c.id
             ORDER BY ct.created_at DESC`
        ).all();

        return c.json({ results });
    } catch (error: any) {
        return c.json({ error: error.message || 'Failed to fetch templates' }, 500);
    }
});

// Get template for a specific course (Admin)
certificates.get('/templates/:courseId', authMiddleware, async (c) => {
    const courseId = c.req.param('courseId');
    const user = c.get('user');
    if (user.role !== 'admin' && user.role !== 'teacher') {
        return c.json({ error: 'Unauthorized' }, 403);
    }

    try {
        const template = await c.env.DB.prepare(
            `SELECT ct.*, c.title as course_title
             FROM certificate_templates ct
             JOIN courses c ON ct.course_id = c.id
             WHERE ct.course_id = ?`
        ).bind(courseId).first();

        if (!template) {
            return c.json({ template: null });
        }

        return c.json({ template });
    } catch (error: any) {
        return c.json({ error: error.message || 'Failed to fetch template' }, 500);
    }
});

// Create or update certificate template (Admin)
certificates.post('/templates', authMiddleware, async (c) => {
    const user = c.get('user');
    if (user.role !== 'admin' && user.role !== 'teacher') {
        return c.json({ error: 'Unauthorized' }, 403);
    }

    try {
        const body = await c.req.json();
        const { course_id, template_style, title, subtitle, body_text, signature_name, signature_title, accent_color } = body;

        if (!course_id) {
            return c.json({ error: 'course_id is required' }, 400);
        }

        // Check if course exists
        const course = await c.env.DB.prepare('SELECT id FROM courses WHERE id = ?').bind(course_id).first();
        if (!course) {
            return c.json({ error: 'Course not found' }, 404);
        }

        // Upsert template
        const result = await c.env.DB.prepare(
            `INSERT INTO certificate_templates (course_id, template_style, title, subtitle, body_text, signature_name, signature_title, accent_color)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(course_id) DO UPDATE SET
                template_style = excluded.template_style,
                title = excluded.title,
                subtitle = excluded.subtitle,
                body_text = excluded.body_text,
                signature_name = excluded.signature_name,
                signature_title = excluded.signature_title,
                accent_color = excluded.accent_color`
        ).bind(
            course_id,
            template_style || 'classic',
            title || 'شهادة إتمام',
            subtitle || '',
            body_text || '',
            signature_name || '',
            signature_title || '',
            accent_color || '#6366f1'
        ).run();

        return c.json({ status: 'success', message: 'Template saved', id: result.meta.last_row_id });
    } catch (error: any) {
        return c.json({ error: error.message || 'Failed to save template' }, 500);
    }
});

// Update certificate template (Admin)
certificates.put('/templates/:id', authMiddleware, async (c) => {
    const id = c.req.param('id');
    const user = c.get('user');
    if (user.role !== 'admin' && user.role !== 'teacher') {
        return c.json({ error: 'Unauthorized' }, 403);
    }

    try {
        const body = await c.req.json();
        const updates = Object.keys(body).filter(k => k !== 'id' && k !== 'course_id').map(key => `${key} = ?`).join(', ');
        const values = Object.keys(body).filter(k => k !== 'id' && k !== 'course_id').map(k => body[k]);

        if (updates.length === 0) {
            return c.json({ error: 'No fields to update' }, 400);
        }

        await c.env.DB.prepare(
            `UPDATE certificate_templates SET ${updates} WHERE id = ?`
        ).bind(...values, id).run();

        return c.json({ status: 'success', message: 'Template updated' });
    } catch (error: any) {
        return c.json({ error: error.message || 'Failed to update template' }, 500);
    }
});

// Delete certificate template (Admin)
certificates.delete('/templates/:id', authMiddleware, async (c) => {
    const id = c.req.param('id');
    const user = c.get('user');
    if (user.role !== 'admin' && user.role !== 'teacher') {
        return c.json({ error: 'Unauthorized' }, 403);
    }

    try {
        await c.env.DB.prepare('DELETE FROM certificate_templates WHERE id = ?').bind(id).run();
        return c.json({ status: 'success', message: 'Template deleted' });
    } catch (error: any) {
        return c.json({ error: error.message || 'Failed to delete template' }, 500);
    }
});

// ===== Student: My Certificates =====

certificates.get('/my', authMiddleware, async (c) => {
    const user = c.get('user');

    try {
        const { results } = await c.env.DB.prepare(
            `SELECT cert.*, c.title as course_title, c.thumbnail_url, c.instructor,
                    ct.template_style, ct.title as cert_title, ct.subtitle, ct.body_text,
                    ct.signature_name, ct.signature_title, ct.accent_color
             FROM certificates cert
             JOIN courses c ON cert.course_id = c.id
             LEFT JOIN certificate_templates ct ON ct.course_id = cert.course_id
             WHERE cert.user_id = ?
             ORDER BY cert.created_at DESC`
        ).bind(user.id).all();

        return c.json({ results });
    } catch (error: any) {
        return c.json({ error: error.message || 'Failed to fetch certificates' }, 500);
    }
});

// ===== Public: Verify Certificate =====

certificates.get('/verify/:certNumber', async (c) => {
    const certNumber = c.req.param('certNumber');

    try {
        const certificate = await c.env.DB.prepare(
            `SELECT cert.*, c.title as course_title, c.thumbnail_url, c.instructor, c.duration_minutes,
                    u.name as student_name, u.email as student_email,
                    ct.template_style, ct.title as cert_title, ct.subtitle, ct.body_text,
                    ct.signature_name, ct.signature_title, ct.accent_color
             FROM certificates cert
             JOIN courses c ON cert.course_id = c.id
             JOIN users u ON cert.user_id = u.id
             LEFT JOIN certificate_templates ct ON ct.course_id = cert.course_id
             WHERE cert.certificate_number = ?`
        ).bind(certNumber).first();

        if (!certificate) {
            return c.json({ error: 'Certificate not found' }, 404);
        }

        return c.json({ certificate });
    } catch (error: any) {
        return c.json({ error: error.message || 'Failed to verify certificate' }, 500);
    }
});

// ===== Issue Certificate (called internally or by admin) =====

certificates.post('/issue/:courseId', authMiddleware, async (c) => {
    const courseId = c.req.param('courseId');
    const user = c.get('user');

    try {
        // Check if student already has a certificate for this course
        const existing = await c.env.DB.prepare(
            'SELECT id, certificate_number FROM certificates WHERE user_id = ? AND course_id = ?'
        ).bind(user.id, courseId).first();

        if (existing) {
            return c.json({ status: 'already_issued', certificate_number: (existing as any).certificate_number });
        }

        // Check if student is enrolled and has 100% progress
        const enrollment = await c.env.DB.prepare(
            'SELECT id, progress FROM enrollments WHERE user_id = ? AND course_id = ?'
        ).bind(user.id, courseId).first();

        if (!enrollment) {
            return c.json({ error: 'Not enrolled in this course' }, 403);
        }

        // Verify 100% progress
        const totalLessons = await c.env.DB.prepare(
            'SELECT COUNT(*) as count FROM lessons WHERE course_id = ?'
        ).bind(courseId).first();

        const completedLessons = await c.env.DB.prepare(
            'SELECT COUNT(*) as count FROM lesson_progress lp JOIN lessons l ON lp.lesson_id = l.id WHERE l.course_id = ? AND lp.user_id = ? AND lp.is_completed = 1'
        ).bind(courseId, user.id).first();

        const total = (totalLessons as any)?.count || 0;
        const completed = (completedLessons as any)?.count || 0;

        if (total === 0 || completed < total) {
            return c.json({ error: 'Course not completed yet', progress: total > 0 ? Math.round((completed / total) * 100) : 0 }, 403);
        }

        // Check if a template exists
        const template = await c.env.DB.prepare(
            'SELECT id FROM certificate_templates WHERE course_id = ?'
        ).bind(courseId).first();

        if (!template) {
            return c.json({ error: 'No certificate template configured for this course' }, 404);
        }

        // Generate unique certificate number
        const certNumber = `CERT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        // Issue certificate
        await c.env.DB.prepare(
            `INSERT INTO certificates (user_id, course_id, certificate_number) VALUES (?, ?, ?)`
        ).bind(user.id, courseId, certNumber).run();

        return c.json({ status: 'success', certificate_number: certNumber });
    } catch (error: any) {
        return c.json({ error: error.message || 'Failed to issue certificate' }, 500);
    }
});

// ===== Admin: List all issued certificates =====

certificates.get('/issued', authMiddleware, async (c) => {
    const user = c.get('user');
    if (user.role !== 'admin' && user.role !== 'teacher') {
        return c.json({ error: 'Unauthorized' }, 403);
    }

    try {
        const { results } = await c.env.DB.prepare(
            `SELECT cert.*, c.title as course_title, u.name as student_name, u.email as student_email
             FROM certificates cert
             JOIN courses c ON cert.course_id = c.id
             JOIN users u ON cert.user_id = u.id
             ORDER BY cert.created_at DESC`
        ).all();

        return c.json({ results });
    } catch (error: any) {
        return c.json({ error: error.message || 'Failed to fetch issued certificates' }, 500);
    }
});

export default certificates;
