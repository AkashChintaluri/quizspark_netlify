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

    const { userId, userType } = event.pathParameters || {};
    const table = userType === 'student' ? 'student_login' : 'teacher_login';

    try {
        const query = `
      SELECT id, username, email 
      FROM ${table} 
      WHERE id = $1
    `;
        const result = await pool.query(query, [userId]);

        if (result.rows.length > 0) {
            return {
                statusCode: 200,
                body: JSON.stringify({ ...result.rows[0], userType }),
                headers: { 'Content-Type': 'application/json' },
            };
        } else {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'User not found' }),
                headers: { 'Content-Type': 'application/json' },
            };
        }
    } catch (error) {
        console.error('Current user error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch user' }),
            headers: { 'Content-Type': 'application/json' },
        };
    }
};