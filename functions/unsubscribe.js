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

    const { student_id, teacher_id } = JSON.parse(event.body);

    try {
        await pool.query(`
      DELETE FROM subscriptions 
      WHERE student_id = $1 AND teacher_id = $2
    `, [student_id, teacher_id]);

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true }),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        };
    } catch (error) {
        console.error('Unsubscription error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Unsubscription failed' }),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        };
    }
};