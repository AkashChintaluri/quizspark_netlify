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

    const userId = event.path.split('/').pop(); // /api/quizzes/created/:user_id

    try {
        const query = `
      SELECT quiz_id, quiz_name, quiz_code, questions, due_date, created_at
      FROM quizzes
      WHERE created_by = $1
      ORDER BY created_at DESC
    `;
        const result = await pool.query(query, [userId]);

        return {
            statusCode: 200,
            body: JSON.stringify(result.rows),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        };
    } catch (error) {
        console.error('Error fetching created quizzes:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch created quizzes' }),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        };
    }
};