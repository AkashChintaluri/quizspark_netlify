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

    const { quiz_code, user_id } = event.pathParameters || {};

    try {
        const quizQuery = `
      SELECT q.quiz_id, q.quiz_name, q.questions, qa.attempt_id, qa.answers, qa.score, qa.total_questions
      FROM quizzes q
      LEFT JOIN quiz_attempts qa ON q.quiz_id = qa.quiz_id AND qa.user_id = $2
      WHERE q.quiz_code = $1
      ORDER BY qa.attempt_date DESC
      LIMIT 1
    `;
        const quizResult = await pool.query(quizQuery, [quiz_code, user_id]);

        if (quizResult.rows.length === 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Quiz not found' }),
                headers: { 'Content-Type': 'application/json' },
            };
        }

        const quizData = quizResult.rows[0];
        const questions = quizData.questions.questions;

        let userAnswers = {};
        if (quizData.answers) {
            userAnswers = typeof quizData.answers === 'string' ? JSON.parse(quizData.answers) : quizData.answers;
        }

        const quizResults = {
            quiz_id: quizData.quiz_id,
            quizName: quizData.quiz_name,
            attemptId: quizData.attempt_id,
            score: quizData.score || 0,
            totalQuestions: quizData.total_questions || questions.length,
            questions: questions.map((question, index) => {
                const correctAnswerIndex = question.options.findIndex(option => option.is_correct);
                const userAnswer = userAnswers[index];

                return {
                    question_text: question.question_text,
                    options: question.options.map((option, optionIndex) => ({
                        ...option,
                        isSelected: userAnswer == optionIndex,
                        isCorrectAnswer: optionIndex == correctAnswerIndex,
                    })),
                };
            }),
            userAnswers: userAnswers,
        };

        return {
            statusCode: 200,
            body: JSON.stringify(quizResults),
            headers: { 'Content-Type': 'application/json' },
        };
    } catch (error) {
        console.error('Error fetching quiz result:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to fetch quiz result', error: error.message }),
            headers: { 'Content-Type': 'application/json' },
        };
    }
};