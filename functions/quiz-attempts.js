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
        const { student_id, quiz_id } = event.queryStringParameters || {};

        // Validate input
        if (!student_id && !quiz_id) {
            return createErrorResponse(400, 'Either student_id or quiz_id is required');
        }

        let query = supabase
            .from('quiz_attempts')
            .select(`
                id,
                quiz_id,
                student_id,
                score,
                answers,
                completed_at,
                quizzes (
                    title,
                    due_date,
                    questions
                ),
                students (
                    name,
                    email
                )
            `);

        // Apply filters
        if (student_id) {
            query = query.eq('student_id', student_id);
        }
        if (quiz_id) {
            query = query.eq('quiz_id', quiz_id);
        }

        // Execute query
        const { data: attempts, error } = await query.order('completed_at', { ascending: false });

        if (error) {
            console.error('Quiz attempts fetch error:', error);
            return createErrorResponse(500, 'Failed to fetch quiz attempts');
        }

        return createSuccessResponse({
            attempts: attempts.map(attempt => ({
                id: attempt.id,
                quiz_id: attempt.quiz_id,
                student_id: attempt.student_id,
                score: attempt.score,
                answers: attempt.answers,
                completed_at: attempt.completed_at,
                quiz: attempt.quizzes,
                student: attempt.students
            }))
        });

    } catch (error) {
        console.error('Get quiz attempts error:', error);
        return createErrorResponse(500, 'Internal server error', error.message);
    }
};