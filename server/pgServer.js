import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
    user: 'postgres',       // Replace with your local DB username
    host: 'localhost',                // Localhost for local execution
    database: 'quizspark',   // Replace with your local DB name
    password: 'akash', // Replace with your local DB password
    port: 5432                        // Default PostgreSQL port
});

// Test the database connection
pool.query('SELECT NOW()')
    .then(res => {
        console.log('Connected to database');
        console.log('Current time:', res.rows[0].now);
        startServer();
    })
    .catch(err => {
        console.error('Error connecting to the database', err);
        process.exit(1);
    });

function startServer() {
    app.post('/signup', async (req, res) => {
        const { username, email, password, userType } = req.body;
        const table = userType === 'student' ? 'student_login' : 'teacher_login';

        try {
            const query = `
                INSERT INTO ${table} (username, email, password)
                VALUES ($1, $2, $3)
                RETURNING id
            `;
            const result = await pool.query(query, [username, email, password]);
            res.status(201).json({
                message: 'User registered successfully',
                userId: result.rows[0].id
            });
        } catch (error) {
            console.error('Signup error:', error);
            res.status(500).json({ error: 'Registration failed' });
        }
    });

    app.post('/login', async (req, res) => {
        const { username, password, userType } = req.body;
        const table = userType === 'student' ? 'student_login' : 'teacher_login';

        try {
            const query = `
                SELECT id, username, email 
                FROM ${table} 
                WHERE username = $1 AND password = $2
            `;
            const result = await pool.query(query, [username, password]);

            if (result.rows.length > 0) {
                res.json({
                    success: true,
                    user: {
                        ...result.rows[0],
                        userType
                    }
                });
            } else {
                res.status(401).json({ success: false, message: 'Invalid credentials' });
            }
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Login failed' });
        }
    });

    app.post('/change-password', async (req, res) => {
        const { username, currentPassword, newPassword, userType } = req.body;
        const table = userType === 'student' ? 'student_login' : 'teacher_login';

        try {
            const verifyQuery = `
                SELECT id FROM ${table} 
                WHERE username = $1 AND password = $2
            `;
            const verifyResult = await pool.query(verifyQuery, [username, currentPassword]);

            if (verifyResult.rows.length === 0) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }

            const updateQuery = `
                UPDATE ${table} 
                SET password = $1 
                WHERE username = $2
            `;
            await pool.query(updateQuery, [newPassword, username]);
            res.json({ success: true, message: 'Password updated' });
        } catch (error) {
            console.error('Password change error:', error);
            res.status(500).json({ success: false, error: 'Password update failed' });
        }
    });

    app.get('/api/current-user/:userId/:userType', async (req, res) => {
        const { userId, userType } = req.params;
        const table = userType === 'student' ? 'student_login' : 'teacher_login';

        try {
            const query = `
                SELECT id, username, email 
                FROM ${table} 
                WHERE id = $1
            `;
            const result = await pool.query(query, [userId]);

            if (result.rows.length > 0) {
                res.json({ ...result.rows[0], userType });
            } else {
                res.status(404).json({ message: 'User not found' });
            }
        } catch (error) {
            console.error('Current user error:', error);
            res.status(500).json({ error: 'Failed to fetch user' });
        }
    });

    app.get('/api/subscriptions/:student_id', async (req, res) => {
        const { student_id } = req.params;
        try {
            const studentIdInt = parseInt(student_id, 10);
            if (isNaN(studentIdInt)) {
                return res.status(400).json({ error: 'Invalid student_id: must be a number' });
            }

            const query = `
                SELECT t.id AS id, t.username, t.email
                FROM teacher_login t
                INNER JOIN subscriptions s ON t.id = s.teacher_id
                WHERE s.student_id = $1;
            `;
            const result = await pool.query(query, [studentIdInt]);
            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching subscriptions:', error);
            res.status(500).json({ error: 'Failed to fetch subscriptions' });
        }
    });

    app.post('/api/quizzes', async (req, res) => {
        const { quiz_name, quiz_code, created_by, questions, due_date } = req.body;

        try {
            const query = `
                INSERT INTO quizzes (quiz_name, quiz_code, created_by, questions, due_date)
                VALUES ($1, $2, $3, $4::jsonb, $5)
                RETURNING quiz_id;
            `;
            const values = [quiz_name, quiz_code, created_by, JSON.stringify({ questions }), due_date];
            const result = await pool.query(query, values);
            const quizId = result.rows[0].quiz_id;

            res.status(201).json({
                message: 'Quiz created successfully',
                quizId: quizId
            });
        } catch (error) {
            console.error('Error creating quiz:', error);
            res.status(500).json({ message: 'Failed to create quiz', error: error.message });
        }
    });

    app.put('/api/quizzes/:quiz_id', async (req, res) => {
        const { quiz_id } = req.params;
        const { quiz_name, due_date, questions } = req.body;

        try {
            const query = `
                UPDATE quizzes
                SET quiz_name = $1, due_date = $2, questions = $3::jsonb
                WHERE quiz_id = $4
                RETURNING quiz_id;
            `;
            const values = [quiz_name, due_date, JSON.stringify(questions), quiz_id];
            const result = await pool.query(query, values);

            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Quiz not found' });
            }

            res.status(200).json({ message: 'Quiz updated successfully' });
        } catch (error) {
            console.error('Error updating quiz:', error);
            res.status(500).json({ message: 'Failed to update quiz', error: error.message });
        }
    });

    app.get('/api/quizzes/:quiz_code', async (req, res) => {
        const { quiz_code } = req.params;

        try {
            const query = `
                SELECT quiz_id, quiz_name, questions
                FROM quizzes
                WHERE quiz_code = $1;
            `;
            const result = await pool.query(query, [quiz_code]);

            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Quiz not found' });
            }

            const quiz = result.rows[0];
            res.status(200).json({
                quiz_id: quiz.quiz_id,
                quiz_name: quiz.quiz_name,
                questions: quiz.questions
            });
        } catch (error) {
            console.error('Error fetching quiz:', error);
            res.status(500).json({ message: 'Failed to fetch quiz', error: error.message });
        }
    });

    app.get('/api/quizzes/id/:quiz_id', async (req, res) => {
        const { quiz_id } = req.params;

        try {
            const query = `
                SELECT quiz_id, quiz_code, quiz_name
                FROM quizzes
                WHERE quiz_id = $1;
            `;
            const result = await pool.query(query, [quiz_id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Quiz not found' });
            }

            const quiz = result.rows[0];
            res.status(200).json({
                quiz_id: quiz.quiz_id,
                quiz_code: quiz.quiz_code,
                quiz_name: quiz.quiz_name
            });
        } catch (error) {
            console.error('Error fetching quiz:', error);
            res.status(500).json({ message: 'Failed to fetch quiz', error: error.message });
        }
    });

    app.post('/api/submit-quiz', async (req, res) => {
        const { quiz_code, user_id, answers } = req.body;
        try {
            const quizQuery = `
                SELECT quiz_id, questions
                FROM quizzes
                WHERE quiz_code = $1;
            `;
            const quizResult = await pool.query(quizQuery, [quiz_code]);
            if (quizResult.rows.length === 0) {
                return res.status(404).json({ message: 'Quiz not found' });
            }

            const quiz = quizResult.rows[0];
            const questions = quiz.questions.questions;

            let score = 0;
            let totalQuestions = questions.length;

            questions.forEach((question, index) => {
                const correctAnswerIndex = question.options.findIndex(option => option.is_correct);
                const userAnswer = parseInt(answers[index]);
                if (correctAnswerIndex === userAnswer) {
                    score++;
                }
            });

            const insertQuery = `
                INSERT INTO quiz_attempts (quiz_id, user_id, score, total_questions, answers)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING attempt_id;
            `;
            const insertValues = [quiz.quiz_id, user_id, score, totalQuestions, JSON.stringify(answers)];
            const insertResult = await pool.query(insertQuery, insertValues);

            const attemptId = insertResult.rows[0].attempt_id;

            res.status(201).json({ attemptId, score, totalQuestions });
        } catch (error) {
            console.error('Error submitting quiz:', error);
            res.status(500).json({ message: 'Failed to submit quiz', error: error.message });
        }
    });

    app.get('/api/quiz-result/:quiz_code/:user_id', async (req, res) => {
        const { quiz_code, user_id } = req.params;

        try {
            const quizQuery = `
                SELECT q.quiz_id, q.quiz_name, q.questions, qa.attempt_id, qa.answers, qa.score, qa.total_questions
                FROM quizzes q
                LEFT JOIN quiz_attempts qa ON q.quiz_id = qa.quiz_id AND qa.user_id = $2
                WHERE q.quiz_code = $1
                ORDER BY qa.attempt_date DESC
                LIMIT 1;
            `;
            const quizResult = await pool.query(quizQuery, [quiz_code, user_id]);

            if (quizResult.rows.length === 0) {
                return res.status(404).json({ message: 'Quiz not found' });
            }

            const quizData = quizResult.rows[0];
            const questions = quizData.questions.questions;

            let userAnswers = {};
            if (quizData.answers) {
                userAnswers = typeof quizData.answers === 'string' ? JSON.parse(quizData.answers) : quizData.answers;
            }

            const quizResults = {
                quiz_id: quizData.quiz_id,
                quizName: quizData.quiz_name,
                attemptId: quizData.attempt_id,
                score: quizData.score || 0,
                totalQuestions: quizData.total_questions || questions.length,
                questions: questions.map((question, index) => {
                    const correctAnswerIndex = question.options.findIndex(option => option.is_correct);
                    const userAnswer = userAnswers[index];

                    return {
                        question_text: question.question_text,
                        options: question.options.map((option, optionIndex) => ({
                            ...option,
                            isSelected: userAnswer == optionIndex,
                            isCorrectAnswer: optionIndex == correctAnswerIndex,
                        })),
                    };
                }),
                userAnswers: userAnswers
            };

            res.json(quizResults);
        } catch (error) {
            console.error('Error fetching quiz result:', error);
            res.status(500).json({ message: 'Failed to fetch quiz result', error: error.message });
        }
    });

    app.get('/api/check-quiz-attempt/:quizCode/:userId', async (req, res) => {
        const { quizCode, userId } = req.params;

        try {
            const quizQuery = 'SELECT quiz_id FROM quizzes WHERE quiz_code = $1';
            const quizResult = await pool.query(quizQuery, [quizCode]);

            if (quizResult.rows.length === 0) {
                return res.status(404).json({ message: 'Quiz not found' });
            }

            const quizId = quizResult.rows[0].quiz_id;

            const attemptQuery = `
                SELECT qa.*, rr.status 
                FROM quiz_attempts qa
                LEFT JOIN retest_requests rr ON qa.attempt_id = rr.attempt_id
                WHERE qa.quiz_id = $1 AND qa.user_id = $2
                ORDER BY qa.attempt_date DESC
                LIMIT 1
            `;
            const attemptResult = await pool.query(attemptQuery, [quizId, userId]);

            if (attemptResult.rows.length > 0) {
                const latestAttempt = attemptResult.rows[0];
                const canRetake = latestAttempt.status === 'approved';
                res.json({
                    hasAttempted: !canRetake,
                    message: canRetake ? 'Retest approved' : 'You have already attempted this quiz.',
                    attemptId: latestAttempt.attempt_id
                });
            } else {
                res.json({ hasAttempted: false });
            }
        } catch (error) {
            console.error('Error checking quiz attempt:', error);
            res.status(500).json({ message: 'Error checking quiz attempt', error: error.message });
        }
    });

    app.get('/api/recent-results/:user_id', async (req, res) => {
        const { user_id } = req.params;
        try {
            const query = `
                SELECT q.quiz_name, qa.attempt_id, qa.score, qa.total_questions, qa.attempt_date
                FROM quiz_attempts qa
                JOIN quizzes q ON q.quiz_id = qa.quiz_id
                WHERE qa.user_id = $1
                ORDER BY qa.attempt_date DESC
                LIMIT 5;
            `;
            const result = await pool.query(query, [user_id]);
            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching recent results:', error);
            res.status(500).json({ message: 'Failed to fetch recent results' });
        }
    });

    app.get('/api/user-stats/:user_id', async (req, res) => {
        const { user_id } = req.params;
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_attempts,
                    COALESCE(AVG(CAST(score AS FLOAT) / total_questions * 100), 0) as average_score,
                    COUNT(DISTINCT quiz_id) as completed_quizzes
                FROM quiz_attempts
                WHERE user_id = $1;
            `;
            const result = await pool.query(query, [user_id]);
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Error fetching user stats:', error);
            res.status(500).json({ message: 'Failed to fetch user stats' });
        }
    });

    app.get('/api/teachers', async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT id AS id, username, email 
                FROM teacher_login
            `);
            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching teachers:', error);
            res.status(500).json({ error: 'Failed to fetch teachers' });
        }
    });

    app.post('/api/subscribe', async (req, res) => {
        const { student_id, teacher_id } = req.body;
        try {
            await pool.query(`
                INSERT INTO subscriptions (student_id, teacher_id)
                VALUES ($1, $2)
                ON CONFLICT (student_id, teacher_id) DO NOTHING
            `, [student_id, teacher_id]);
            res.json({ success: true });
        } catch (error) {
            console.error('Subscription error:', error);
            res.status(500).json({ error: 'Subscription failed' });
        }
    });

    app.post('/api/unsubscribe', async (req, res) => {
        const { student_id, teacher_id } = req.body;
        try {
            await pool.query(`
                DELETE FROM subscriptions 
                WHERE student_id = $1 AND teacher_id = $2
            `, [student_id, teacher_id]);
            res.json({ success: true });
        } catch (error) {
            console.error('Unsubscription error:', error);
            res.status(500).json({ error: 'Unsubscription failed' });
        }
    });

    app.get('/api/upcoming-quizzes/:student_id', async (req, res) => {
        const { student_id } = req.params;
        try {
            const query = `
                SELECT q.*, t.username AS teacher_name
                FROM quizzes q
                JOIN teacher_login t ON q.created_by = t.id
                WHERE q.created_by IN (
                    SELECT teacher_id 
                    FROM subscriptions 
                    WHERE student_id = $1
                )
                AND q.due_date > NOW()
                AND NOT EXISTS (
                    SELECT 1 
                    FROM quiz_attempts 
                    WHERE quiz_id = q.quiz_id 
                    AND user_id = $1
                )
                ORDER BY q.due_date ASC
            `;
            const result = await pool.query(query, [student_id]);
            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching quizzes:', error);
            res.status(500).json({ error: 'Failed to fetch quizzes' });
        }
    });

    app.get('/api/attempted-quizzes/:user_id', async (req, res) => {
        const { user_id } = req.params;
        try {
            const query = `
                SELECT DISTINCT q.quiz_id, q.quiz_name, q.quiz_code, t.username AS teacher_name, q.due_date
                FROM quiz_attempts qa
                JOIN quizzes q ON qa.quiz_id = q.quiz_id
                JOIN teacher_login t ON q.created_by = t.id
                WHERE qa.user_id = $1;
            `;
            const result = await pool.query(query, [user_id]);
            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching attempted quizzes:', error);
            res.status(500).json({ message: 'Failed to fetch attempted quizzes' });
        }
    });

    app.get('/api/quizzes/created/:user_id', async (req, res) => {
        const { user_id } = req.params;
        try {
            const query = `
                SELECT quiz_id, quiz_name, quiz_code, questions, due_date, created_at
                FROM quizzes
                WHERE created_by = $1
                ORDER BY created_at DESC
            `;
            const result = await pool.query(query, [user_id]);
            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching created quizzes:', error);
            res.status(500).json({ error: 'Failed to fetch created quizzes' });
        }
    });

    app.get('/api/quiz-attempts/:quiz_code', async (req, res) => {
        const { quiz_code } = req.params;

        try {
            const query = `
                SELECT 
                    qa.attempt_id,
                    qa.user_id,
                    s.username AS student_username,
                    qa.score,
                    qa.total_questions,
                    qa.attempt_date,
                    q.quiz_name,
                    rr.request_id,
                    rr.status AS retest_status
                FROM quiz_attempts qa
                JOIN quizzes q ON qa.quiz_id = q.quiz_id
                JOIN student_login s ON qa.user_id = s.id
                LEFT JOIN retest_requests rr ON qa.attempt_id = rr.attempt_id
                WHERE q.quiz_code = $1
                ORDER BY qa.attempt_date DESC;
            `;
            const result = await pool.query(query, [quiz_code]);

            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'No attempts found for this quiz' });
            }

            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching quiz attempts:', error);
            res.status(500).json({ error: 'Failed to fetch quiz attempts' });
        }
    });

    // Retest Requests Endpoints
    app.post('/api/retest-requests', async (req, res) => {
        try {
            console.log('Received retest request:', req.body);
            const { student_id, quiz_id, attempt_id } = req.body;

            if (!quiz_id) {
                console.error('Missing quiz_id in request');
                return res.status(400).json({ error: 'quiz_id is required' });
            }

            const result = await pool.query(
                `INSERT INTO retest_requests 
                 (student_id, quiz_id, attempt_id) 
                 VALUES ($1, $2, $3) 
                 RETURNING *`,
                [student_id, quiz_id, attempt_id]
            );
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Error creating retest request:', error);
            res.status(500).json({ error: 'Failed to create retest request' });
        }
    });

    app.get('/api/retest-requests/teacher/:teacher_id', async (req, res) => {
        try {
            const { teacher_id } = req.params;
            const query = `
                SELECT 
                    rr.request_id,
                    rr.student_id,
                    sl.username AS student_name,
                    q.quiz_id,
                    q.quiz_name,
                    q.quiz_code,
                    rr.attempt_id,
                    rr.request_date,
                    rr.status
                FROM retest_requests rr
                JOIN student_login sl ON rr.student_id = sl.id
                JOIN quizzes q ON rr.quiz_id = q.quiz_id
                WHERE q.created_by = $1
                ORDER BY rr.request_date DESC
            `;
            const result = await pool.query(query, [teacher_id]);
            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching retest requests:', error);
            res.status(500).json({ error: 'Failed to fetch retest requests' });
        }
    });

    app.put('/api/retest-requests/:request_id', async (req, res) => {
        try {
            const { request_id } = req.params;
            const { status, teacher_password } = req.body;

            // Verify teacher password
            const teacherQuery = `
            SELECT t.password 
            FROM quizzes q
            JOIN teacher_login t ON q.created_by = t.id
            JOIN retest_requests rr ON q.quiz_id = rr.quiz_id
            WHERE rr.request_id = $1
        `;
            const teacherResult = await pool.query(teacherQuery, [request_id]);

            if (teacherResult.rows.length === 0 || teacherResult.rows[0].password !== teacher_password) {
                return res.status(401).json({ error: 'Invalid teacher password' });
            }

            // Update retest request status
            const updateQuery = `
            UPDATE retest_requests 
            SET status = $1,
                updated_at = NOW()
            WHERE request_id = $2
            RETURNING *
        `;
            const result = await pool.query(updateQuery, [status, request_id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Retest request not found' });
            }

            // If approved, delete the retest request and then the quiz attempt
            if (status === 'approved') {
                // First, delete the retest request
                await pool.query(`
                DELETE FROM retest_requests 
                WHERE request_id = $1
            `, [request_id]);

                // Then, delete the quiz attempt
                await pool.query(`
                DELETE FROM quiz_attempts 
                WHERE attempt_id = $1
            `, [result.rows[0].attempt_id]);
            }

            res.json(result.rows[0]);
        } catch (error) {
            console.error('Error updating retest request:', error);
            res.status(500).json({ error: 'Failed to update retest request' });
        }
    });

    app.put('/api/teachers/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { email, name } = req.body;

            const query = `
                UPDATE teacher_login 
                SET email = $1, username = $2
                WHERE id = $3
                RETURNING id, username, email
            `;
            const result = await pool.query(query, [email, name, id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Teacher not found' });
            }

            res.json(result.rows[0]);
        } catch (error) {
            console.error('Error updating teacher profile:', error);
            res.status(500).json({ message: 'Failed to update profile' });
        }
    });

    app.put('/api/students/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { email, name } = req.body;

            const query = `
                UPDATE student_login 
                SET email = $1, username = $2
                WHERE id = $3
                RETURNING id, username, email
            `;
            const result = await pool.query(query, [email, name, id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Student not found' });
            }

            res.json(result.rows[0]);
        } catch (error) {
            console.error('Error updating student profile:', error);
            res.status(500).json({ message: 'Failed to update profile' });
        }
    });

    app.get('/api/quiz-results/:quiz_code/leaderboard', async (req, res) => {
        const { quiz_code } = req.params;

        try {
            // First get the quiz details
            const quizQuery = `
                SELECT quiz_id, quiz_name
                FROM quizzes
                WHERE quiz_code = $1;
            `;
            const quizResult = await pool.query(quizQuery, [quiz_code]);

            if (quizResult.rows.length === 0) {
                return res.status(404).json({ message: 'Quiz not found' });
            }

            const quizId = quizResult.rows[0].quiz_id;
            const quizName = quizResult.rows[0].quiz_name;

            // Then get the leaderboard data with NULL handling
            const leaderboardQuery = `
                WITH RankedResults AS (
                    SELECT 
                        qa.user_id,
                        s.username AS student_name,
                        COALESCE(qa.score, 0) as score,
                        COALESCE(qa.total_questions, 1) as total_questions,
                        qa.attempt_date,
                        DENSE_RANK() OVER (
                            ORDER BY 
                                (CAST(COALESCE(qa.score, 0) AS FLOAT) / NULLIF(COALESCE(qa.total_questions, 1), 0)) DESC,
                                qa.attempt_date ASC
                        ) as rank
                    FROM quiz_attempts qa
                    JOIN student_login s ON qa.user_id = s.id
                    WHERE qa.quiz_id = $1
                )
                SELECT * FROM RankedResults
                ORDER BY rank;
            `;
            const leaderboardResult = await pool.query(leaderboardQuery, [quizId]);

            if (leaderboardResult.rows.length === 0) {
                return res.status(404).json({ message: 'No attempts found for this quiz' });
            }

            // Format the data for the frontend
            const leaderboardData = {
                quiz_name: quizName,
                rankings: leaderboardResult.rows.map(row => ({
                    student_id: row.user_id,
                    student_name: row.student_name,
                    score: Math.round((row.score / row.total_questions) * 100) || 0,
                    rank: row.rank
                }))
            };

            res.json(leaderboardData);
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            res.status(500).json({
                error: 'Failed to fetch leaderboard data',
                details: error.message
            });
        }
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}