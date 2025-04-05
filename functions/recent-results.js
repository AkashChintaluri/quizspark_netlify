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

    const { user_id } = event.pathParameters || {};

    try {
        const query = `
      SELECT q.quiz_name, qa.attempt_id, qa.score, qa.total_questions, qa.attempt_date
      FROM quiz_attempts qa
      JOIN quizzes q ON q.quiz_id = qa.quiz_id
      WHERE qa.user_id = $1
      ORDER BY qa.attempt_date DESC
      LIMIT 5
    `;
        const result = await pool.query(query, [user_id]);

        return {
            statusCode: 200,
            body: JSON.stringify(result.rows),
            headers: { 'Content-Type': 'application/json' },
        };
    } catch (error) {
        console.error('Error fetching recent results:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to fetch recent results' }),
            headers: { 'Content-Type': 'application/json' },
        };
    }
};