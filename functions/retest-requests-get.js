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

    const teacherId = event.path.split('/')[4]; // /api/retest-requests/teacher/:teacher_id

    try {
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
        const result = await pool.query(query, [teacherId]);

        return {
            statusCode: 200,
            body: JSON.stringify(result.rows),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        };
    } catch (error) {
        console.error('Error fetching retest requests:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch retest requests' }),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        };
    }
};