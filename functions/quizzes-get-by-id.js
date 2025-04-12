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
        const { quiz_id } = JSON.parse(body);

        // Validate input
        if (!quiz_id) {
            return createErrorResponse(400, 'Missing quiz ID');
        }

        // Get quiz details
        const { data: quiz, error } = await supabase
            .from('quizzes')
            .select(`
                id,
                quiz_name,
                quiz_code,
                teacher_id,
                questions,
                due_date,
                teacher_login (
                    username
                )
            `)
            .eq('id', quiz_id)
            .single();

        if (error) {
            console.error('Quiz fetch error:', error);
            return createErrorResponse(500, 'Failed to fetch quiz');
        }

        if (!quiz) {
            return createErrorResponse(404, 'Quiz not found');
        }

        // Get quiz statistics
        const { data: attempts, error: statsError } = await supabase
            .from('quiz_attempts')
            .select('score')
            .eq('quiz_id', quiz_id);

        let stats = {
            total_attempts: 0,
            average_score: 0
        };

        if (!statsError && attempts) {
            stats.total_attempts = attempts.length;
            stats.average_score = attempts.length > 0
                ? Math.round((attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length) * 100) / 100
                : 0;
        }

        return createSuccessResponse({
            quiz: {
                ...quiz,
                teacher_name: quiz.teacher_login.username,
                ...stats
            }
        });

    } catch (error) {
        console.error('Quiz fetch error:', error);
        return createErrorResponse(500, 'Internal server error', error.message);
    }
};