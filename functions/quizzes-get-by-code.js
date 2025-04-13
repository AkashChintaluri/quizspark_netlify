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
        const { quiz_code } = JSON.parse(event.body);

        // Validate input
        if (!quiz_code) {
            return createErrorResponse(400, 'Missing quiz code');
        }

        // Get quiz details with teacher info
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
            .eq('quiz_code', quiz_code.toUpperCase())
            .single();

        if (error) {
            console.error('Quiz fetch error:', error);
            return createErrorResponse(500, 'Failed to fetch quiz');
        }

        if (!quiz) {
            return createErrorResponse(404, 'Quiz not found');
        }

        // Check if quiz is past due date
        const now = new Date();
        const dueDate = new Date(quiz.due_date);
        if (now > dueDate) {
            return createErrorResponse(403, 'Quiz has expired');
        }

        // Get quiz statistics
        const { data: attempts, error: statsError } = await supabase
            .from('quiz_attempts')
            .select('score')
            .eq('quiz_id', quiz.id);

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