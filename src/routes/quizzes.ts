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

const quizzes = new Hono<{ Bindings: any; Variables: Variables }>();

// GET /api/v1/quizzes/:lessonId - Get quiz for a lesson
quizzes.get('/:lessonId', authMiddleware, async (c) => {
    const lessonId = c.req.param('lessonId');
    const user = c.get('user');

    try {
        // Get quiz
        const quiz = await c.env.DB.prepare(
            'SELECT * FROM quizzes WHERE lesson_id = ?'
        ).bind(lessonId).first();

        if (!quiz) {
            return c.json({ quiz: null, questions: [] });
        }

        // Get questions with answers
        const questions = await c.env.DB.prepare(
            'SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_num'
        ).bind(quiz.id).all();

        const questionsWithAnswers = await Promise.all(
            (questions.results || []).map(async (q: any) => {
                if (q.type === 'multiple_choice') {
                    const answers = await c.env.DB.prepare(
                        'SELECT id, answer_text, is_correct, order_num FROM answers WHERE question_id = ? ORDER BY order_num'
                    ).bind(q.id).all();
                    return { ...q, answers: answers.results || [] };
                }
                return q;
            })
        );

        return c.json({
            quiz,
            questions: questionsWithAnswers
        });
    } catch (error: any) {
        console.error('Get quiz error:', error);
        return c.json({ message: error.message || 'Failed to fetch quiz' }, 500);
    }
});

// POST /api/v1/quizzes - Create quiz for a lesson
quizzes.post('/', authMiddleware, async (c) => {
    const user = c.get('user');
    const { lesson_id, title, description, time_limit_minutes, passing_score, max_attempts } = await c.req.json();

    if (!lesson_id) {
        return c.json({ message: 'Lesson ID is required' }, 400);
    }

    try {
        // Check if user owns the course
        const lesson = await c.env.DB.prepare(
            'SELECT c.instructor_id, c.instructor FROM courses c JOIN lessons l ON l.course_id = c.id WHERE l.id = ?'
        ).bind(lesson_id).first();

        if (!lesson) {
            return c.json({ message: 'Lesson not found' }, 404);
        }

        if (user.role !== 'admin' && lesson.instructor_id !== user.id && lesson.instructor !== user.name) {
            return c.json({ message: 'Unauthorized - Only the course instructor can create quizzes' }, 403);
        }

        // Check if quiz already exists
        const existing = await c.env.DB.prepare(
            'SELECT id FROM quizzes WHERE lesson_id = ?'
        ).bind(lesson_id).first();

        if (existing) {
            return c.json({ quiz_id: existing.id, message: 'Quiz already exists' });
        }

        const result = await c.env.DB.prepare(
            `INSERT INTO quizzes (lesson_id, title, description, time_limit_minutes, passing_score, max_attempts)
             VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(
            lesson_id,
            title || 'Quiz',
            description || null,
            time_limit_minutes || 0,
            passing_score || 60,
            max_attempts || 1
        ).run();

        return c.json({
            message: 'Quiz created successfully',
            quiz_id: result.meta.last_row_id
        }, 201);
    } catch (error: any) {
        console.error('Create quiz error:', error);
        return c.json({ message: error.message || 'Failed to create quiz' }, 500);
    }
});

// POST /api/v1/quizzes/questions - Add a question
quizzes.post('/questions', authMiddleware, async (c) => {
    const user = c.get('user');
    const { lesson_id, question_text, type, points, answers, correct_answer } = await c.req.json();

    if (!lesson_id || !question_text) {
        return c.json({ message: 'Lesson ID and question text are required' }, 400);
    }

    try {
        // Check ownership
        const lesson = await c.env.DB.prepare(
            'SELECT c.instructor_id, c.instructor FROM courses c JOIN lessons l ON l.course_id = c.id WHERE l.id = ?'
        ).bind(lesson_id).first();

        if (!lesson) {
            return c.json({ message: 'Lesson not found' }, 404);
        }

        if (user.role !== 'admin' && lesson.instructor_id !== user.id && lesson.instructor !== user.name) {
            return c.json({ message: 'Unauthorized' }, 403);
        }

        // Get or create quiz
        let quiz = await c.env.DB.prepare(
            'SELECT id FROM quizzes WHERE lesson_id = ?'
        ).bind(lesson_id).first();

        if (!quiz) {
            const quizResult = await c.env.DB.prepare(
                'INSERT INTO quizzes (lesson_id, title) VALUES (?, ?)'
            ).bind(lesson_id, 'Quiz').run();
            quiz = { id: quizResult.meta.last_row_id };
        }

        // Get max order_num
        const maxOrder = await c.env.DB.prepare(
            'SELECT MAX(order_num) as max FROM questions WHERE quiz_id = ?'
        ).bind(quiz.id).first();
        const orderNum = (maxOrder?.max || 0) + 1;

        // Insert question
        const questionResult = await c.env.DB.prepare(
            `INSERT INTO questions (quiz_id, question_text, type, points, order_num)
             VALUES (?, ?, ?, ?, ?)`
        ).bind(
            quiz.id,
            question_text,
            type || 'multiple_choice',
            points || 1,
            orderNum
        ).run();

        const questionId = questionResult.meta.last_row_id;

        // Insert answers for multiple choice
        if (type === 'multiple_choice' && answers && answers.length > 0) {
            for (let i = 0; i < answers.length; i++) {
                await c.env.DB.prepare(
                    `INSERT INTO answers (question_id, answer_text, is_correct, order_num)
                     VALUES (?, ?, ?, ?)`
                ).bind(
                    questionId,
                    answers[i].answer_text,
                    answers[i].is_correct ? 1 : 0,
                    i + 1
                ).run();
            }
        }

        return c.json({
            message: 'Question added successfully',
            question_id: questionId
        }, 201);
    } catch (error: any) {
        console.error('Add question error:', error);
        return c.json({ message: error.message || 'Failed to add question' }, 500);
    }
});

// DELETE /api/v1/quizzes/questions/:questionId - Delete a question
quizzes.delete('/questions/:questionId', authMiddleware, async (c) => {
    const questionId = c.req.param('questionId');
    const user = c.get('user');

    try {
        // Check ownership through quiz -> lesson -> course
        const question = await c.env.DB.prepare(
            `SELECT q.id, q.quiz_id
             FROM questions q
             JOIN quizzes qz ON q.quiz_id = qz.id
             JOIN lessons l ON qz.lesson_id = l.id
             JOIN courses c ON l.course_id = c.id
             WHERE q.id = ?`
        ).bind(questionId).first();

        if (!question) {
            return c.json({ message: 'Question not found' }, 404);
        }

        const courseInfo = await c.env.DB.prepare(
            `SELECT c.instructor_id, c.instructor
             FROM questions q
             JOIN quizzes qz ON q.quiz_id = qz.id
             JOIN lessons l ON qz.lesson_id = l.id
             JOIN courses c ON l.course_id = c.id
             WHERE q.id = ?`
        ).bind(questionId).first();

        if (user.role !== 'admin' && courseInfo?.instructor_id !== user.id && courseInfo?.instructor !== user.name) {
            return c.json({ message: 'Unauthorized' }, 403);
        }

        // Delete answers first, then question
        await c.env.DB.prepare('DELETE FROM answers WHERE question_id = ?').bind(questionId).run();
        await c.env.DB.prepare('DELETE FROM questions WHERE id = ?').bind(questionId).run();

        return c.json({ message: 'Question deleted successfully' });
    } catch (error: any) {
        console.error('Delete question error:', error);
        return c.json({ message: error.message || 'Failed to delete question' }, 500);
    }
});

// POST /api/v1/quizzes/:quizId/submit - Submit quiz answers (student)
quizzes.post('/:quizId/submit', authMiddleware, async (c) => {
    const quizId = c.req.param('quizId');
    const user = c.get('user');
    const { answers } = await c.req.json();

    try {
        // Get quiz with questions
        const quiz = await c.env.DB.prepare(
            'SELECT * FROM quizzes WHERE id = ?'
        ).bind(quizId).first();

        if (!quiz) {
            return c.json({ message: 'Quiz not found' }, 404);
        }

        // Check attempts
        const attempts = await c.env.DB.prepare(
            'SELECT COUNT(*) as count FROM quiz_attempts WHERE quiz_id = ? AND user_id = ?'
        ).bind(quizId, user.id).first();

        if (attempts && attempts.count >= quiz.max_attempts) {
            return c.json({ message: 'Maximum attempts reached' }, 400);
        }

        // Get questions
        const questions = await c.env.DB.prepare(
            'SELECT * FROM questions WHERE quiz_id = ?'
        ).bind(quizId).all();

        let score = 0;
        let totalPoints = 0;

        // Create attempt
        const attemptResult = await c.env.DB.prepare(
            `INSERT INTO quiz_attempts (quiz_id, user_id, started_at)
             VALUES (?, ?, datetime('now'))`
        ).bind(quizId, user.id).run();
        const attemptId = attemptResult.meta.last_row_id;

        // Check answers
        for (const question of (questions.results || [])) {
            totalPoints += question.points || 1;
            const userAnswer = answers.find((a: any) => a.question_id === question.id);

            if (question.type === 'true_false') {
                const isCorrect = userAnswer?.answer === true;
                if (isCorrect) score += question.points || 1;

                await c.env.DB.prepare(
                    `INSERT INTO quiz_answers (attempt_id, question_id, is_correct)
                     VALUES (?, ?, ?)`
                ).bind(attemptId, question.id, isCorrect ? 1 : 0).run();
            } else {
                // Multiple choice - check if selected answer is correct
                if (userAnswer?.answer_id) {
                    const correctAnswer = await c.env.DB.prepare(
                        'SELECT is_correct FROM answers WHERE id = ?'
                    ).bind(userAnswer.answer_id).first();

                    if (correctAnswer?.is_correct) {
                        score += question.points || 1;
                    }

                    await c.env.DB.prepare(
                        `INSERT INTO quiz_answers (attempt_id, question_id, answer_id, is_correct)
                         VALUES (?, ?, ?, ?)`
                    ).bind(attemptId, question.id, userAnswer.answer_id, correctAnswer?.is_correct ? 1 : 0).run();
                }
            }
        }

        const passed = score >= quiz.passing_score;

        // Update attempt
        await c.env.DB.prepare(
            `UPDATE quiz_attempts SET score = ?, total_points = ?, passed = ?, completed_at = datetime('now')
             WHERE id = ?`
        ).bind(score, totalPoints, passed ? 1 : 0, attemptId).run();

        return c.json({
            score,
            total_points: totalPoints,
            percentage: Math.round((score / totalPoints) * 100),
            passed,
            passing_score: quiz.passing_score
        });
    } catch (error: any) {
        console.error('Submit quiz error:', error);
        return c.json({ message: error.message || 'Failed to submit quiz' }, 500);
    }
});

export default quizzes;