const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
        ca: process.env.NODE_EXTRA_CA_CERTS // Only if using custom CA
    }
});

exports.handler = async (event) => {
    // Handle preflight request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        };
    }

    try {
        const { username, password, userType } = JSON.parse(event.body);
        const table = userType === 'student' ? 'student_login' : 'teacher_login';

        const query = `
      SELECT id, username, email 
      FROM ${table} 
      WHERE username = $1 AND password = $2
    `;
        const result = await pool.query(query, [username, password]);

        if (result.rows.length > 0) {
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    success: true,
                    user: { ...result.rows[0], userType }
                })
            };
        } else {
            return {
                statusCode: 401,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ success: false, message: 'Invalid credentials' })
            };
        }
    } catch (error) {
        console.error('Login error:', error);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Login failed' })
        };
    }
};
