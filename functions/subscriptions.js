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

    const { student_id } = event.pathParameters || {};

    try {
        const studentIdInt = parseInt(student_id, 10);
        if (isNaN(studentIdInt)) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid student_id: must be a number' }),
                headers: { 'Content-Type': 'application/json' },
            };
        }

        const query = `
      SELECT t.id AS id, t.username, t.email
      FROM teacher_login t
      INNER JOIN subscriptions s ON t.id = s.teacher_id
      WHERE s.student_id = $1
    `;
        const result = await pool.query(query, [studentIdInt]);

        return {
            statusCode: 200,
            body: JSON.stringify(result.rows),
            headers: { 'Content-Type': 'application/json' },
        };
    } catch (error) {
        console.error('Error fetching subscriptions:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch subscriptions' }),
            headers: { 'Content-Type': 'application/json' },
        };
    }
};