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

    const studentId = event.path.split('/').pop(); // /api/upcoming-quizzes/:student_id

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
        const result = await pool.query(query, [studentId]);

        return {
            statusCode: 200,
            body: JSON.stringify(result.rows),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        };
    } catch (error) {
        console.error('Error fetching quizzes:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch quizzes' }),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        };
    }
};