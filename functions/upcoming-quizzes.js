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

        // First, get the teacher subscriptions
        const { data: subscriptions, error: subError } = await supabase
            .from('teacher_subscriptions')
            .select('teacher_id')
            .eq('student_id', student_id);

        // If no subscriptions found, return empty list instead of error
        if (!subscriptions || subscriptions.length === 0) {
            return createSuccessResponse({ quizzes: [] });
        }

        if (subError) {
            console.error('Error fetching subscriptions:', subError);
            return createErrorResponse(500, 'Failed to fetch teacher subscriptions');
        }

        // Get attempted quiz IDs - get all attempts regardless of completion status
        const { data: attempts, error: attemptsError } = await supabase
            .from('quiz_attempts')
            .select('quiz_id')
            .eq('user_id', student_id);

        if (attemptsError) {
            console.error('Error fetching attempts:', attemptsError);
            return createErrorResponse(500, 'Failed to fetch quiz attempts');
        }

        // Get teacher IDs and attempted quiz IDs
        const teacherIds = subscriptions.map(sub => sub.teacher_id);
        const attemptedQuizIds = attempts?.map(attempt => attempt.quiz_id) || [];

        // Get quizzes that:
        // 1. Are created by subscribed teachers
        // 2. Have not been attempted at all
        // 3. Are not past due date
        const { data: quizzes, error: quizError } = await supabase
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
            .in('created_by', teacherIds)
            .not('quiz_id', 'in', attemptedQuizIds)
            .gt('due_date', new Date().toISOString())
            .order('created_at', { ascending: false });

        if (quizError) {
            console.error('Error fetching quizzes:', quizError);
            return createErrorResponse(500, 'Failed to fetch quizzes');
        }

        // Transform the response to match the expected format
        const transformedQuizzes = (quizzes || []).map(quiz => ({
            quiz_id: quiz.quiz_id,
            quiz_name: quiz.quiz_name,
            quiz_code: quiz.quiz_code,
            created_by: quiz.created_by,
            questions: quiz.questions,
            due_date: quiz.due_date,
            created_at: quiz.created_at,
            teacher_login: {
                username: quiz.teacher_login?.username || 'Unknown Teacher'
            }
        }));

        return createSuccessResponse({ quizzes: transformedQuizzes });
    } catch (err) {
        console.error('Error in upcoming-quizzes handler:', err);
        return createErrorResponse(500, 'Internal server error', err.message);
    }
};