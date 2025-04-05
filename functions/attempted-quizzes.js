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

    const userId = event.path.split('/').pop(); // /api/attempted-quizzes/:user_id

    try {
        const query = `
      SELECT DISTINCT q.quiz_id, q.quiz_name, q.quiz_code, t.username AS teacher_name, q.due_date
      FROM quiz_attempts qa
      JOIN quizzes q ON qa.quiz_id = q.quiz_id
      JOIN teacher_login t ON q.created_by = t.id
      WHERE qa.user_id = $1
    `;
        const result = await pool.query(query, [userId]);

        return {
            statusCode: 200,
            body: JSON.stringify(result.rows),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        };
    } catch (error) {
        console.error('Error fetching attempted quizzes:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to fetch attempted quizzes' }),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        };
    }
};