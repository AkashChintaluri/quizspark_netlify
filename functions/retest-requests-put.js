const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'PUT') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const requestId = event.path.split('/')[3]; // /api/retest-requests/:request_id
    const { status, teacher_password } = JSON.parse(event.body);

    try {
        const teacherQuery = `
      SELECT t.password 
      FROM quizzes q
      JOIN teacher_login t ON q.created_by = t.id
      JOIN retest_requests rr ON q.quiz_id = rr.quiz_id
      WHERE rr.request_id = $1
    `;
        const teacherResult = await pool.query(teacherQuery, [requestId]);

        if (teacherResult.rows.length === 0 || teacherResult.rows[0].password !== teacher_password) {
            return {
                statusCode: 401,
                body: JSON.stringify({ error: 'Invalid teacher password' }),
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            };
        }

        const updateQuery = `
      UPDATE retest_requests 
      SET status = $1,
          updated_at = NOW()
      WHERE request_id = $2
      RETURNING *
    `;
        const result = await pool.query(updateQuery, [status, requestId]);

        if (result.rows.length === 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Retest request not found' }),
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            };
        }

        if (status === 'approved') {
            await pool.query(`DELETE FROM retest_requests WHERE request_id = $1`, [requestId]);
            await pool.query(`DELETE FROM quiz_attempts WHERE attempt_id = $1`, [result.rows[0].attempt_id]);
        }

        return {
            statusCode: 200,
            body: JSON.stringify(result.rows[0]),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        };
    } catch (error) {
        console.error('Error updating retest request:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to update retest request' }),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        };
    }
};