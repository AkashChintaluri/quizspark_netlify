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

    const quizCode = event.path.split('/').pop(); // /api/quiz-attempts/:quiz_code

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
      ORDER BY qa.attempt_date DESC
    `;
        const result = await pool.query(query, [quizCode]);

        if (result.rows.length === 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'No attempts found for this quiz' }),
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(result.rows),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        };
    } catch (error) {
        console.error('Error fetching quiz attempts:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch quiz attempts' }),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        };
    }
};