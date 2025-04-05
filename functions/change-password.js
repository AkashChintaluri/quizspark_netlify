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

    const { username, currentPassword, newPassword, userType } = JSON.parse(event.body);
    const table = userType === 'student' ? 'student_login' : 'teacher_login';

    try {
        const verifyQuery = `
      SELECT id FROM ${table} 
      WHERE username = $1 AND password = $2
    `;
        const verifyResult = await pool.query(verifyQuery, [username, currentPassword]);

        if (verifyResult.rows.length === 0) {
            return {
                statusCode: 401,
                body: JSON.stringify({ success: false, message: 'Invalid credentials' }),
                headers: { 'Content-Type': 'application/json' },
            };
        }

        const updateQuery = `
      UPDATE ${table} 
      SET password = $1 
      WHERE username = $2
    `;
        await pool.query(updateQuery, [newPassword, username]);

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, message: 'Password updated' }),
            headers: { 'Content-Type': 'application/json' },
        };
    } catch (error) {
        console.error('Password change error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, error: 'Password update failed' }),
            headers: { 'Content-Type': 'application/json' },
        };
    }
};