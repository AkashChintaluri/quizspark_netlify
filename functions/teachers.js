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

    try {
        const result = await pool.query(`
      SELECT id AS id, username, email 
      FROM teacher_login
    `);

        return {
            statusCode: 200,
            body: JSON.stringify(result.rows),
            headers: { 'Content-Type': 'application/json' },
        };
    } catch (error) {
        console.error('Error fetching teachers:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch teachers' }),
            headers: { 'Content-Type': 'application/json' },
        };
    }
};