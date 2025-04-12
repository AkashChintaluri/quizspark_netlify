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

        // Get all completed quiz attempts for the student
        const { data: attempts, error: attemptError } = await supabase
            .from('quiz_attempts')
            .select(`
                attempt_id,
                quiz_id,
                score,
                completed_at,
                quiz:quizzes (
                    quiz_name,
                    quiz_code,
                    created_by,
                    due_date,
                    created_at
                )
            `)
            .eq('user_id', student_id)
            .eq('is_completed', true)
            .order('completed_at', { ascending: false });

        if (attemptError) {
            console.error('Quiz attempts fetch error:', attemptError);
            return createErrorResponse(500, 'Failed to fetch quiz attempts');
        }

        // Get teacher details for the quizzes
        const teacherIds = [...new Set(attempts.map(a => a.quiz.created_by))];
        const { data: teachers, error: teacherError } = await supabase
            .from('teacher_login')
            .select('id, username, email')
            .in('id', teacherIds);

        if (teacherError) {
            console.error('Teachers fetch error:', teacherError);
            return createErrorResponse(500, 'Failed to fetch teacher details');
        }

        const teacherMap = new Map(teachers.map(t => [t.id, t]));

        return createSuccessResponse({
            quizzes: attempts.map(attempt => ({
                quiz_id: attempt.quiz_id,
                quiz_name: attempt.quiz.quiz_name,
                quiz_code: attempt.quiz.quiz_code,
                score: attempt.score,
                completed_at: attempt.completed_at,
                due_date: attempt.quiz.due_date,
                created_at: attempt.quiz.created_at,
                teacher_login: {
                    id: attempt.quiz.created_by,
                    username: teacherMap.get(attempt.quiz.created_by)?.username || '',
                    email: teacherMap.get(attempt.quiz.created_by)?.email || ''
                }
            }))
        });

    } catch (error) {
        console.error('Get attempted quizzes error:', error);
        return createErrorResponse(500, 'Internal server error', error.message);
    }
};