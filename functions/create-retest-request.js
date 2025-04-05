const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { student_id, quiz_id, attempt_id } = JSON.parse(event.body);

    try {
        if (!quiz_id) {
            console.error('Missing quiz_id in request');
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'quiz_id is required' }),
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            };
        }

        const result = await pool.query(
            `INSERT INTO retest_requests 
       (student_id, quiz_id, attempt_id) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
            [student_id, quiz_id, attempt_id]
        );

        return {
            statusCode: 201,
            body: JSON.stringify(result.rows[0]),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        };
    } catch (error) {
        console.error('Error creating retest request:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to create retest request' }),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        };
    }
};