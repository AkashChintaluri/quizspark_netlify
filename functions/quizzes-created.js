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
        const body = event.isBase64Encoded
            ? Buffer.from(event.body, 'base64').toString('utf8')
            : event.body;
        const { teacher_id } = JSON.parse(body);

        // Validate input
        if (!teacher_id) {
            return createErrorResponse(400, 'Missing teacher ID');
        }

        // Get all quizzes created by the teacher
        const { data: quizzes, error } = await supabase
            .from('quizzes')
            .select(`
                id,
                quiz_name,
                quiz_code,
                due_date,
                created_at,
                quiz_attempts (
                    id,
                    score
                )
            `)
            .eq('teacher_id', teacher_id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Quizzes fetch error:', error);
            return createErrorResponse(500, 'Failed to fetch quizzes');
        }

        // Process quiz data to include statistics
        const processedQuizzes = quizzes.map(quiz => {
            const attempts = quiz.quiz_attempts || [];
            const stats = {
                total_attempts: attempts.length,
                average_score: attempts.length > 0
                    ? Math.round((attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length) * 100) / 100
                    : 0
            };

            return {
                id: quiz.id,
                quiz_name: quiz.quiz_name,
                quiz_code: quiz.quiz_code,
                due_date: quiz.due_date,
                created_at: quiz.created_at,
                ...stats
            };
        });

        return createSuccessResponse({
            quizzes: processedQuizzes
        });

    } catch (error) {
        console.error('Quizzes fetch error:', error);
        return createErrorResponse(500, 'Internal server error', error.message);
    }
};