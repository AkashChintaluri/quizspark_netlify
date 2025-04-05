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

    const id = event.path.split('/')[3]; // /api/students/:id
    const { email, name } = JSON.parse(event.body);

    try {
        const query = `
      UPDATE student_login 
      SET email = $1, username = $2
      WHERE id = $3
      RETURNING id, username, email
    `;
        const result = await pool.query(query, [email, name, id]);

        if (result.rows.length === 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Student not found' }),
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(result.rows[0]),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        };
    } catch (error) {
        console.error('Error updating student profile:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to update profile' }),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        };
    }
};