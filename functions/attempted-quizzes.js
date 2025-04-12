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
                completed_at,
                quizzes (
                    id,
                    quiz_name,
                    quiz_code,
                    created_by,
                    due_date,
                    teacher_login (
                        username,
                        email
                    )
                )
            `)
            .eq('student_id', student_id)
            .order('completed_at', { ascending: false });

        if (error) {
            console.error('Attempted quizzes fetch error:', error);
            return createErrorResponse(500, 'Failed to fetch attempted quizzes');
        }

        return createSuccessResponse({
            quizzes: attempts.map(attempt => ({
                attempt_id: attempt.id,
                score: attempt.score,
                total_questions: attempt.total_questions,
                completed_at: attempt.completed_at,
                quiz: {
                    id: attempt.quizzes.id,
                    title: attempt.quizzes.quiz_name,
                    code: attempt.quizzes.quiz_code,
                    due_date: attempt.quizzes.due_date,
                    teacher: {
                        name: attempt.quizzes.teacher_login.username,
                        email: attempt.quizzes.teacher_login.email
                    }
                }
            }))
        });

    } catch (error) {
        console.error('Get attempted quizzes error:', error);
        return createErrorResponse(500, 'Internal server error', error.message);
    }
};