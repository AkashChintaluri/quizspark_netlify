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
        const { student_id, teacher_id, status } = event.queryStringParameters || {};

        let query = supabase
            .from('retest_requests')
            .select(`
                id,
                quiz_id,
                student_id,
                reason,
                status,
                created_at,
                quizzes (
                    title,
                    due_date
                ),
                students (
                    name,
                    email
                )
            `);

        // Apply filters based on role
        if (student_id) {
            query = query.eq('student_id', student_id);
        } else if (teacher_id) {
            // Get quizzes created by the teacher
            const { data: teacherQuizzes, error: quizError } = await supabase
                .from('quizzes')
                .select('id')
                .eq('teacher_id', teacher_id);

            if (quizError) {
                console.error('Quiz fetch error:', quizError);
                return createErrorResponse(500, 'Failed to fetch teacher quizzes');
            }

            const quizIds = teacherQuizzes.map(q => q.id);
            query = query.in('quiz_id', quizIds);
        }

        // Apply status filter if provided
        if (status) {
            query = query.eq('status', status);
        }

        // Execute query
        const { data: requests, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error('Retest requests fetch error:', error);
            return createErrorResponse(500, 'Failed to fetch retest requests');
        }

        return createSuccessResponse({
            requests: requests.map(request => ({
                id: request.id,
                quiz_id: request.quiz_id,
                student_id: request.student_id,
                reason: request.reason,
                status: request.status,
                created_at: request.created_at,
                quiz: request.quizzes,
                student: request.students
            }))
        });

    } catch (error) {
        console.error('Get retest requests error:', error);
        return createErrorResponse(500, 'Internal server error', error.message);
    }
};