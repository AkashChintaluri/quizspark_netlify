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
        const { student_id } = event.queryStringParameters || {};

        // Validate input
        if (!student_id) {
            return createErrorResponse(400, 'student_id is required');
        }

        // Get all attempted quizzes for the student
        const { data: attempts, error } = await supabase
            .from('quiz_attempts')
            .select(`
                id,
                score,
                total_questions,
                time_taken,
                answers,
                is_completed,
                quiz:quizzes (
                    quiz_id,
                    quiz_name,
                    quiz_code,
                    created_by,
                    questions,
                    due_date,
                    created_at,
                    teacher:teacher_login (
                        id,
                        username,
                        email,
                        password
                    )
                )
            `)
            .eq('user_id', student_id)
            .order('time_taken', { ascending: false });

        if (error) {
            console.error('Attempted quizzes fetch error:', error);
            return createErrorResponse(500, 'Failed to fetch attempted quizzes');
        }

        return createSuccessResponse({
            quizzes: attempts.map(attempt => ({
                attempt_id: attempt.id,
                score: attempt.score,
                total_questions: attempt.total_questions,
                completed_at: attempt.time_taken,
                is_completed: attempt.is_completed,
                quiz: {
                    id: attempt.quiz.quiz_id,
                    title: attempt.quiz.quiz_name,
                    code: attempt.quiz.quiz_code,
                    due_date: attempt.quiz.due_date,
                    teacher: {
                        name: attempt.quiz.teacher.username,
                        email: attempt.quiz.teacher.email
                    }
                }
            }))
        });

    } catch (error) {
        console.error('Get attempted quizzes error:', error);
        return createErrorResponse(500, 'Internal server error', error.message);
    }
};