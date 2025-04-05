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

    const { quiz_name, quiz_code, created_by, questions, due_date } = JSON.parse(event.body);

    try {
        const query = `
      INSERT INTO quizzes (quiz_name, quiz_code, created_by, questions, due_date)
      VALUES ($1, $2, $3, $4::jsonb, $5)
      RETURNING quiz_id
    `;
        const values = [quiz_name, quiz_code, created_by, JSON.stringify({ questions }), due_date];
        const result = await pool.query(query, values);
        const quizId = result.rows[0].quiz_id;

        return {
            statusCode: 201,
            body: JSON.stringify({
                message: 'Quiz created successfully',
                quizId: quizId,
            }),
            headers: { 'Content-Type': 'application/json' },
        };
    } catch (error) {
        console.error('Error creating quiz:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to create quiz', error: error.message }),
            headers: { 'Content-Type': 'application/json' },
        };
    }
};