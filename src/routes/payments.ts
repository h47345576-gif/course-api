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

// POST /api/v1/payments - Submit payment for a course
app.post('/', authMiddleware, async (c) => {
    const { course_id, payment_method, amount, notes } = await c.req.json();
    const user = c.get('user');

    if (!course_id || !payment_method || !amount) {
        return c.json({ message: 'Missing required fields' }, 400);
    }

    try {
        // Check if course exists
        const course = await c.env.DB.prepare(
            'SELECT id, price FROM courses WHERE id = ?'
        ).bind(course_id).first();

        if (!course) {
            return c.json({ message: 'Course not found' }, 404);
        }

        // Check if payment already exists
        const existingPayment = await c.env.DB.prepare(
            'SELECT id, status FROM payments WHERE user_id = ? AND course_id = ?'
        ).bind(user.id, course_id).first();

        if (existingPayment && existingPayment.status === 'confirmed') {
            return c.json({ message: 'You have already paid for this course' }, 400);
        }

        // Create payment record
        const result = await c.env.DB.prepare(
            `INSERT INTO payments (user_id, course_id, amount, method, status, notes, created_at)
             VALUES (?, ?, ?, ?, 'pending', ?, datetime('now'))`
        ).bind(user.id, course_id, amount, payment_method, notes || null).run();

        return c.json({
            message: 'Payment submitted successfully',
            payment_id: result.meta.last_row_id,
            status: 'pending'
        }, 201);
    } catch (error: any) {
        console.error('Payment error:', error);
        return c.json({ message: error.message || 'Failed to submit payment' }, 500);
    }
});

// POST /api/v1/payments/:id/receipt - Upload payment receipt
app.post('/:id/receipt', authMiddleware, async (c) => {
    const paymentId = c.req.param('id');
    const user = c.get('user');

    try {
        const formData = await c.req.formData();
        const file = formData.get('receipt');

        if (!file || !(file instanceof File)) {
            return c.json({ message: 'No file provided' }, 400);
        }

        // Verify payment belongs to user
        const payment = await c.env.DB.prepare(
            'SELECT id, user_id FROM payments WHERE id = ?'
        ).bind(paymentId).first();

        if (!payment) {
            return c.json({ message: 'Payment not found' }, 404);
        }

        if (payment.user_id !== user.id) {
            return c.json({ message: 'Unauthorized' }, 403);
        }

        // Upload to R2
        const fileName = `receipts/${user.id}/${paymentId}_${Date.now()}_${file.name}`;
        const arrayBuffer = await file.arrayBuffer();

        // Use S3 API to upload to R2
        const R2_ACCOUNT_ID = c.env.R2_ACCOUNT_ID || '';
        const R2_BUCKET_NAME = c.env.R2_BUCKET_NAME || 'pr1-assets';
        const R2_ACCESS_KEY_ID = c.env.R2_ACCESS_KEY_ID || '';
        const R2_SECRET_ACCESS_KEY = c.env.R2_SECRET_ACCESS_KEY || '';

        // Create AWS Signature V4
        const region = 'auto';
        const service = 's3';
        const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
        const endpoint = `https://${host}/${R2_BUCKET_NAME}/${fileName}`;

        const uploadResponse = await fetch(endpoint, {
            method: 'PUT',
            headers: {
                'Content-Type': file.type,
            },
            body: arrayBuffer,
        });

        if (!uploadResponse.ok) {
            console.error('R2 Upload failed:', await uploadResponse.text());
            return c.json({ message: 'Failed to upload receipt' }, 500);
        }

        // Get public URL
        const PUBLIC_R2_URL = c.env.PUBLIC_R2_URL || '';
        const receiptUrl = `${PUBLIC_R2_URL}/${fileName}`;

        // Update payment with receipt URL
        await c.env.DB.prepare(
            'UPDATE payments SET receipt_image_url = ? WHERE id = ?'
        ).bind(receiptUrl, paymentId).run();

        return c.json({
            message: 'Receipt uploaded successfully',
            receipt_url: receiptUrl
        });
    } catch (error: any) {
        console.error('Receipt upload error:', error);
        return c.json({ message: error.message || 'Failed to upload receipt' }, 500);
    }
});

// GET /api/v1/payments/my - Get user's payments
app.get('/my', authMiddleware, async (c) => {
    const user = c.get('user');

    try {
        const payments = await c.env.DB.prepare(
            `SELECT p.*, c.title as course_title, c.thumbnail_url as course_thumbnail
             FROM payments p
             LEFT JOIN courses c ON p.course_id = c.id
             WHERE p.user_id = ?
             ORDER BY p.created_at DESC`
        ).bind(user.id).all();

        return c.json({
            results: payments.results || []
        });
    } catch (error: any) {
        console.error('Get payments error:', error);
        return c.json({ message: error.message || 'Failed to fetch payments' }, 500);
    }
});

// GET /api/v1/payments/:id - Get payment details
app.get('/:id', authMiddleware, async (c) => {
    const paymentId = c.req.param('id');
    const user = c.get('user');

    try {
        const payment = await c.env.DB.prepare(
            `SELECT p.*, c.title as course_title, c.thumbnail_url as course_thumbnail
             FROM payments p
             LEFT JOIN courses c ON p.course_id = c.id
             WHERE p.id = ? AND p.user_id = ?`
        ).bind(paymentId, user.id).first();

        if (!payment) {
            return c.json({ message: 'Payment not found' }, 404);
        }

        return c.json(payment);
    } catch (error: any) {
        console.error('Get payment error:', error);
        return c.json({ message: error.message || 'Failed to fetch payment' }, 500);
    }
});

// PUT /api/v1/payments/:id/confirm - Confirm payment (Admin only)
app.put('/:id/confirm', authMiddleware, async (c) => {
    const paymentId = c.req.param('id');
    const user = c.get('user');

    // Check if user is admin
    if (user.role !== 'admin') {
        return c.json({ message: 'Unauthorized - Admin access required' }, 403);
    }

    try {
        const { status } = await c.req.json();

        if (!['confirmed', 'rejected'].includes(status)) {
            return c.json({ message: 'Invalid status' }, 400);
        }

        // Update payment status
        await c.env.DB.prepare(
            `UPDATE payments SET status = ?, confirmed_at = datetime('now') WHERE id = ?`
        ).bind(status, paymentId).run();

        // If confirmed, enroll user in course
        if (status === 'confirmed') {
            const payment = await c.env.DB.prepare(
                'SELECT user_id, course_id FROM payments WHERE id = ?'
            ).bind(paymentId).first();

            if (payment) {
                // Check if already enrolled
                const existingEnrollment = await c.env.DB.prepare(
                    'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?'
                ).bind(payment.user_id, payment.course_id).first();

                if (!existingEnrollment) {
                    await c.env.DB.prepare(
                        `INSERT INTO enrollments (user_id, course_id, progress, created_at)
                         VALUES (?, ?, 0, datetime('now'))`
                    ).bind(payment.user_id, payment.course_id).run();
                }
            }
        }

        return c.json({
            message: `Payment ${status} successfully`
        });
    } catch (error: any) {
        console.error('Confirm payment error:', error);
        return c.json({ message: error.message || 'Failed to confirm payment' }, 500);
    }
});

export default app;
