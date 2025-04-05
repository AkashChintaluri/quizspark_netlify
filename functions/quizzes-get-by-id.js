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

    const { quiz_id } = event.pathParameters || {};

    try {
        const query = `
      SELECT quiz_id, quiz_code, quiz_name
      FROM quizzes
      WHERE quiz_id = $1
    `;
        const result = await pool.query(query, [quiz_id]);

        if (result.rows.length === 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Quiz not found' }),
                headers: { 'Content-Type': 'application/json' },
            };
        }

        const quiz = result.rows[0];
        return {
            statusCode: 200,
            body: JSON.stringify({
                quiz_id: quiz.quiz_id,
                quiz_code: quiz.quiz_code,
                quiz_name: quiz.quiz_name,
            }),
            headers: { 'Content-Type': 'application/json' },
        };
    } catch (error) {
        console.error('Error fetching quiz:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to fetch quiz', error: error.message }),
            headers: { 'Content-Type': 'application/json' },
        };
    }
};