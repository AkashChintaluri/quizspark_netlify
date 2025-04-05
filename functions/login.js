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

    const { username, password, userType } = JSON.parse(event.body);
    const table = userType === 'student' ? 'student_login' : 'teacher_login';

    try {
        const query = `
      SELECT id, username, email 
      FROM ${table} 
      WHERE username = $1 AND password = $2
    `;
        const result = await pool.query(query, [username, password]);

        if (result.rows.length > 0) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    user: { ...result.rows[0], userType },
                }),
                headers: { 'Content-Type': 'application/json' },
            };
        } else {
            return {
                statusCode: 401,
                body: JSON.stringify({ success: false, message: 'Invalid credentials' }),
                headers: { 'Content-Type': 'application/json' },
            };
        }
    } catch (error) {
        console.error('Login error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Login failed' }),
            headers: { 'Content-Type': 'application/json' },
        };
    }
};