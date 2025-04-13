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

        if (!student_id) {
            return createErrorResponse(400, 'Student ID is required');
        }

        // Get all quizzes that:
        // 1. Student is subscribed to (through teacher subscriptions)
        // 2. Haven't been attempted by the student
        // 3. Are not past their due date
        const { data: quizzes, error } = await supabase
            .from('quizzes')
            .select(`
                quiz_id,
                quiz_name,
                quiz_code,
                created_by,
                questions,
                due_date,
                created_at,
                teacher_login:created_by (
                    username
                )
            `)
            .not('quiz_id', 'in', (
                supabase
                    .from('quiz_attempts')
                    .select('quiz_id')
                    .eq('user_id', student_id)
            ))
            .in('created_by', (
                supabase
                    .from('teacher_subscriptions')
                    .select('teacher_id')
                    .eq('student_id', student_id)
            ))
            .gt('due_date', new Date().toISOString())
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching quizzes:', error);
            return createErrorResponse(500, 'Failed to fetch quizzes');
        }

        return createSuccessResponse({ quizzes: quizzes || [] });
    } catch (err) {
        console.error('Error:', err);
        return createErrorResponse(500, 'Internal server error');
    }
};