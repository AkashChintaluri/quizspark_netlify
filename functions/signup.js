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

    const { username, email, password, userType } = JSON.parse(event.body);
    const table = userType === 'student' ? 'student_login' : 'teacher_login';

    try {
        const query = `
      INSERT INTO ${table} (username, email, password)
      VALUES ($1, $2, $3)
      RETURNING id
    `;
        const result = await pool.query(query, [username, email, password]);

        return {
            statusCode: 201,
            body: JSON.stringify({
                message: 'User registered successfully',
                userId: result.rows[0].id,
            }),
            headers: { 'Content-Type': 'application/json' },
        };
    } catch (error) {
        console.error('Signup error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Registration failed' }),
            headers: { 'Content-Type': 'application/json' },
        };
    }
};