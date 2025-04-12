const { 
    supabase, 
    handleCors, 
    createErrorResponse, 
    createSuccessResponse 
} = require('./supabase-client');

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return handleCors();
    }

    try {
        const { quiz_id, student_id } = event.queryStringParameters || {};

        // Validate input
        if (!quiz_id || !student_id) {
            return createErrorResponse(400, 'quiz_id and student_id are required');
        }

        // Get quiz details and attempt
        const { data: attempt, error: attemptError } = await supabase
            .from('quiz_attempts')
            .select(`
                id,
                score,
                answers,
                completed_at,
                quizzes (
                    id,
                    title,
                    description,
                    questions,
                    due_date,
                    teacher_id,
                    teachers (
                        name,
                        email
                    )
                )
            `)
            .eq('quiz_id', quiz_id)
            .eq('student_id', student_id)
            .single();

        if (attemptError) {
            console.error('Attempt fetch error:', attemptError);
            return createErrorResponse(404, 'Quiz attempt not found');
        }

        // Get student's rank
        const { data: betterScores, error: rankError } = await supabase
            .from('quiz_attempts')
            .select('id', { count: 'exact' })
            .eq('quiz_id', quiz_id)
            .gt('score', attempt.score);

        if (rankError) {
            console.error('Rank calculation error:', rankError);
            return createErrorResponse(500, 'Failed to calculate rank');
        }

        // Get total attempts for percentile calculation
        const { count: totalAttempts, error: countError } = await supabase
            .from('quiz_attempts')
            .select('id', { count: 'exact' })
            .eq('quiz_id', quiz_id);

        if (countError) {
            console.error('Count error:', countError);
            return createErrorResponse(500, 'Failed to get total attempts');
        }

        const rank = betterScores.length + 1;
        const percentile = Math.round(((totalAttempts - rank + 1) / totalAttempts) * 100);

        // Process answers and questions
        const questions = attempt.quizzes.questions.questions;
        const studentAnswers = attempt.answers.answers;
        const detailedResults = questions.map((question, index) => ({
            question_number: index + 1,
            question: question.question,
            your_answer: studentAnswers[index],
            correct_answer: question.correct_answer,
            is_correct: studentAnswers[index].toLowerCase() === question.correct_answer.toLowerCase()
        }));

        return createSuccessResponse({
            quiz: {
                id: attempt.quizzes.id,
                title: attempt.quizzes.title,
                description: attempt.quizzes.description,
                due_date: attempt.quizzes.due_date,
                teacher: attempt.quizzes.teachers
            },
            attempt: {
                id: attempt.id,
                score: attempt.score,
                completed_at: attempt.completed_at,
                rank,
                total_attempts: totalAttempts,
                percentile
            },
            detailed_results: detailedResults
        });

    } catch (error) {
        console.error('Get quiz result error:', error);
        return createErrorResponse(500, 'Internal server error', error.message);
    }
};