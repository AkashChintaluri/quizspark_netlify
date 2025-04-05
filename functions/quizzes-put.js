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

    const { quiz_id } = event.pathParameters || {};
    const { quiz_name, due_date, questions } = JSON.parse(event.body);

    try {
        const query = `
      UPDATE quizzes
      SET quiz_name = $1, due_date = $2, questions = $3::jsonb
      WHERE quiz_id = $4
      RETURNING quiz_id
    `;
        const values = [quiz_name, due_date, JSON.stringify(questions), quiz_id];
        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Quiz not found' }),
                headers: { 'Content-Type': 'application/json' },
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Quiz updated successfully' }),
            headers: { 'Content-Type': 'application/json' },
        };
    } catch (error) {
        console.error('Error updating quiz:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to update quiz', error: error.message }),
            headers: { 'Content-Type': 'application/json' },
        };
    }
};