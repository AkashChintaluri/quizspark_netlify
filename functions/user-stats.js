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

    const { user_id } = event.pathParameters || {};

    try {
        const query = `
      SELECT 
        COUNT(*) as total_attempts,
        COALESCE(AVG(CAST(score AS FLOAT) / total_questions * 100), 0) as average_score,
        COUNT(DISTINCT quiz_id) as completed_quizzes
      FROM quiz_attempts
      WHERE user_id = $1
    `;
        const result = await pool.query(query, [user_id]);

        return {
            statusCode: 200,
            body: JSON.stringify(result.rows[0]),
            headers: { 'Content-Type': 'application/json' },
        };
    } catch (error) {
        console.error('Error fetching user stats:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to fetch user stats' }),
            headers: { 'Content-Type': 'application/json' },
        };
    }
};