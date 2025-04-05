const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { quizCode, userId } = event.pathParameters || {};

    try {
        const quizQuery = 'SELECT quiz_id FROM quizzes WHERE quiz_code = $1';
        const quizResult = await pool.query(quizQuery, [quizCode]);

        if (quizResult.rows.length === 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Quiz not found' }),
                headers: { 'Content-Type': 'application/json' },
            };
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
            return {
                statusCode: 200,
                body: JSON.stringify({
                    hasAttempted: !canRetake,
                    message: canRetake ? 'Retest approved' : 'You have already attempted this quiz.',
                    attemptId: latestAttempt.attempt_id,
                }),
                headers: { 'Content-Type': 'application/json' },
            };
        } else {
            return {
                statusCode: 200,
                body: JSON.stringify({ hasAttempted: false }),
                headers: { 'Content-Type': 'application/json' },
            };
        }
    } catch (error) {
        console.error('Error checking quiz attempt:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error checking quiz attempt', error: error.message }),
            headers: { 'Content-Type': 'application/json' },
        };
    }
};