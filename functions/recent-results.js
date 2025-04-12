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
        const { teacher_id, limit = 10 } = event.queryStringParameters || {};

        // Validate input
        if (!teacher_id) {
            return createErrorResponse(400, 'teacher_id is required');
        }

        // Get quizzes created by the teacher
        const { data: quizzes, error: quizError } = await supabase
            .from('quizzes')
            .select('id')
            .eq('teacher_id', teacher_id);

        if (quizError) {
            console.error('Quizzes fetch error:', quizError);
            return createErrorResponse(500, 'Failed to fetch teacher quizzes');
        }

        const quizIds = quizzes.map(q => q.id);

        if (quizIds.length === 0) {
            return createSuccessResponse({
                results: []
            });
        }

        // Get recent attempts for these quizzes
        const { data: attempts, error: attemptError } = await supabase
            .from('quiz_attempts')
            .select(`
                id,
                score,
                completed_at,
                student_id,
                students (
                    name,
                    email
                ),
                quizzes (
                    id,
                    title,
                    description,
                    due_date
                )
            `)
            .in('quiz_id', quizIds)
            .order('completed_at', { ascending: false })
            .limit(limit);

        if (attemptError) {
            console.error('Attempts fetch error:', attemptError);
            return createErrorResponse(500, 'Failed to fetch quiz attempts');
        }

        return createSuccessResponse({
            results: attempts.map(attempt => ({
                attempt_id: attempt.id,
                completed_at: attempt.completed_at,
                score: attempt.score,
                student: {
                    id: attempt.student_id,
                    name: attempt.students.name,
                    email: attempt.students.email
                },
                quiz: {
                    id: attempt.quizzes.id,
                    title: attempt.quizzes.title,
                    description: attempt.quizzes.description,
                    due_date: attempt.quizzes.due_date
                }
            }))
        });

    } catch (error) {
        console.error('Get recent results error:', error);
        return createErrorResponse(500, 'Internal server error', error.message);
    }
};