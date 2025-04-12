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

        // Get all upcoming quizzes for the student's subscribed teachers
        const { data: subscriptions, error: subError } = await supabase
            .from('subscriptions')
            .select('teacher_id')
            .eq('student_id', student_id);

        if (subError) {
            console.error('Subscriptions fetch error:', subError);
            return createErrorResponse(500, 'Failed to fetch subscriptions');
        }

        const teacherIds = subscriptions.map(sub => sub.teacher_id);

        // Get upcoming quizzes from subscribed teachers
        const { data: quizzes, error: quizError } = await supabase
            .from('quizzes')
            .select(`
                id,
                quiz_name,
                quiz_code,
                created_by,
                questions,
                due_date,
                created_at,
                teacher_login (
                    id,
                    username,
                    email
                )
            `)
            .in('created_by', teacherIds)
            .gt('due_date', new Date().toISOString())
            .order('due_date', { ascending: true });

        if (quizError) {
            console.error('Upcoming quizzes fetch error:', quizError);
            return createErrorResponse(500, 'Failed to fetch upcoming quizzes');
        }

        // Check which quizzes have been attempted
        const { data: attempts, error: attemptError } = await supabase
            .from('quiz_attempts')
            .select('quiz_id')
            .eq('user_id', student_id)
            .eq('is_completed', true)
            .in('quiz_id', quizzes.map(q => q.id));

        if (attemptError) {
            console.error('Attempts fetch error:', attemptError);
            return createErrorResponse(500, 'Failed to fetch quiz attempts');
        }

        const attemptedQuizIds = new Set(attempts.map(a => a.quiz_id));

        return createSuccessResponse({
            quizzes: quizzes.map(quiz => ({
                quiz_id: quiz.id,
                quiz_name: quiz.quiz_name,
                quiz_code: quiz.quiz_code,
                due_date: quiz.due_date,
                created_at: quiz.created_at,
                teacher_login: {
                    id: quiz.teacher_login?.id || '',
                    username: quiz.teacher_login?.username || '',
                    email: quiz.teacher_login?.email || ''
                },
                is_attempted: attemptedQuizIds.has(quiz.id)
            }))
        });

    } catch (error) {
        console.error('Get upcoming quizzes error:', error);
        return createErrorResponse(500, 'Internal server error', error.message);
    }
};