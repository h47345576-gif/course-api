import { Hono } from 'hono';
import { cors } from 'hono/cors';

// Types for Environment Variables and Bindings
type Bindings = {
    DB: D1Database;
    STORAGE: R2Bucket;
    SESSIONS: KVNamespace;
    JWT_SECRET: string;
};

// Create Hono App
const app = new Hono<{ Bindings: Bindings }>();

// Global Middleware
app.use('*', cors({
    origin: (origin) => origin || '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'Upgrade-Insecure-Requests'],
    exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
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

// Import Routes (Placeholder for now)
import authRoutes from './routes/auth';
import coursesRoutes from './routes/courses';
import paymentsRoutes from './routes/payments';

app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/courses', coursesRoutes);
app.route('/api/v1/payments', paymentsRoutes);

// Error Handling
app.onError((err, c) => {
    console.error(`${err}`);
    return c.json({
        status: 'error',
        message: err.message || 'Internal Server Error'
    }, 500);
});

app.notFound((c) => {
    return c.json({
        status: 'error',
        message: 'Not Found'
    }, 404);
});

export default app;
