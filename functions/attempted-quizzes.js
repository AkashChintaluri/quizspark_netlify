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

        // Get all quiz attempts for the student
        const { data: attempts, error: attemptError } = await supabase
            .from('quiz_attempts')
            .select(`
                attempt_id,
                quiz_id,
                score,
                total_questions,
                is_completed,
                attempt_date,
                answers
            `)
            .eq('user_id', student_id)
            .order('attempt_date', { ascending: false });

        if (attemptError) {
            console.error('Quiz attempts fetch error:', attemptError);
            return createErrorResponse(500, 'Failed to fetch quiz attempts');
        }

        // Get quiz details for each attempt
        const quizIds = attempts.map(attempt => attempt.quiz_id);
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
                teacher_login (
                    id,
                    username,
                    email
                )
            `)
            .in('quiz_id', quizIds);

        if (quizError) {
            console.error('Quizzes fetch error:', quizError);
            return createErrorResponse(500, 'Failed to fetch quizzes');
        }

        // Get retest requests
        const { data: retestRequests, error: retestError } = await supabase
            .from('retest_requests')
            .select('quiz_id, status')
            .eq('student_id', student_id)
            .in('quiz_id', quizIds);

        if (retestError) {
            console.error('Retest requests fetch error:', retestError);
            return createErrorResponse(500, 'Failed to fetch retest requests');
        }

        const retestStatusMap = new Map(
            retestRequests.map(request => [request.quiz_id, request.status])
        );

        // Combine attempts with quiz details
        const attemptedQuizzes = attempts.map(attempt => {
            const quiz = quizzes.find(q => q.quiz_id === attempt.quiz_id);
            return {
                attempt_id: attempt.attempt_id,
                quiz_id: attempt.quiz_id,
                quiz_name: quiz?.quiz_name || '',
                quiz_code: quiz?.quiz_code || '',
                score: attempt.score,
                total_questions: attempt.total_questions,
                is_completed: attempt.is_completed,
                attempt_date: attempt.attempt_date,
                due_date: quiz?.due_date || '',
                teacher_login: {
                    id: quiz?.teacher_login?.id || '',
                    username: quiz?.teacher_login?.username || '',
                    email: quiz?.teacher_login?.email || ''
                },
                retest_status: retestStatusMap.get(attempt.quiz_id) || null
            };
        });

        return createSuccessResponse({
            quizzes: attemptedQuizzes
        });

    } catch (error) {
        console.error('Get attempted quizzes error:', error);
        return createErrorResponse(500, 'Internal server error', error.message);
    }
};