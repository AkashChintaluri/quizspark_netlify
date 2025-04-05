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

    const { quiz_code, user_id, answers } = JSON.parse(event.body);

    try {
        const quizQuery = `
      SELECT quiz_id, questions
      FROM quizzes
      WHERE quiz_code = $1
    `;
        const quizResult = await pool.query(quizQuery, [quiz_code]);
        if (quizResult.rows.length === 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Quiz not found' }),
                headers: { 'Content-Type': 'application/json' },
            };
        }

        const quiz = quizResult.rows[0];
        const questions = quiz.questions.questions;

        let score = 0;
        let totalQuestions = questions.length;

        questions.forEach((question, index) => {
            const correctAnswerIndex = question.options.findIndex(option => option.is_correct);
            const userAnswer = parseInt(answers[index]);
            if (correctAnswerIndex === userAnswer) {
                score++;
            }
        });

        const insertQuery = `
      INSERT INTO quiz_attempts (quiz_id, user_id, score, total_questions, answers)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING attempt_id
    `;
        const insertValues = [quiz.quiz_id, user_id, score, totalQuestions, JSON.stringify(answers)];
        const insertResult = await pool.query(insertQuery, insertValues);

        const attemptId = insertResult.rows[0].attempt_id;

        return {
            statusCode: 201,
            body: JSON.stringify({ attemptId, score, totalQuestions }),
            headers: { 'Content-Type': 'application/json' },
        };
    } catch (error) {
        console.error('Error submitting quiz:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to submit quiz', error: error.message }),
            headers: { 'Content-Type': 'application/json' },
        };
    }
};