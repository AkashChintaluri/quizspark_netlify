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
                completed_at,
                quizzes (
                    id,
                    title,
                    description,
                    due_date,
                    created_at,
                    teacher_id,
                    teachers (
                        name,
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
                completed_at: attempt.completed_at,
                quiz: {
                    id: attempt.quizzes.id,
                    title: attempt.quizzes.title,
                    description: attempt.quizzes.description,
                    due_date: attempt.quizzes.due_date,
                    created_at: attempt.quizzes.created_at,
                    teacher: attempt.quizzes.teachers
                }
            }))
        });

    } catch (error) {
        console.error('Get attempted quizzes error:', error);
        return createErrorResponse(500, 'Internal server error', error.message);
    }
};