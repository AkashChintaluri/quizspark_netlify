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

    const quizCode = event.path.split('/')[3]; // /api/quiz-results/:quiz_code/leaderboard

    try {
        const quizQuery = `
      SELECT quiz_id, quiz_name
      FROM quizzes
      WHERE quiz_code = $1
    `;
        const quizResult = await pool.query(quizQuery, [quizCode]);

        if (quizResult.rows.length === 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Quiz not found' }),
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            };
        }

        const quizId = quizResult.rows[0].quiz_id;
        const quizName = quizResult.rows[0].quiz_name;

        const leaderboardQuery = `
      WITH RankedResults AS (
        SELECT 
          qa.user_id,
          s.username AS student_name,
          COALESCE(qa.score, 0) as score,
          COALESCE(qa.total_questions, 1) as total_questions,
          qa.attempt_date,
          DENSE_RANK() OVER (
            ORDER BY 
              (CAST(COALESCE(qa.score, 0) AS FLOAT) / NULLIF(COALESCE(qa.total_questions, 1), 0)) DESC,
              qa.attempt_date ASC
          ) as rank
        FROM quiz_attempts qa
        JOIN student_login s ON qa.user_id = s.id
        WHERE qa.quiz_id = $1
      )
      SELECT * FROM RankedResults
      ORDER BY rank
    `;
        const leaderboardResult = await pool.query(leaderboardQuery, [quizId]);

        if (leaderboardResult.rows.length === 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'No attempts found for this quiz' }),
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            };
        }

        const leaderboardData = {
            quiz_name: quizName,
            rankings: leaderboardResult.rows.map(row => ({
                student_id: row.user_id,
                student_name: row.student_name,
                score: Math.round((row.score / row.total_questions) * 100) || 0,
                rank: row.rank,
            })),
        };

        return {
            statusCode: 200,
            body: JSON.stringify(leaderboardData),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        };
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch leaderboard data', details: error.message }),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        };
    }
};