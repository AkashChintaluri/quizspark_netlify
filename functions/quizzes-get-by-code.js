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
        // Try to get quiz_code from query parameters first, then from body
        let quiz_code = event.queryStringParameters?.quiz_code;
        if (!quiz_code && event.body) {
            const body = JSON.parse(event.body);
            quiz_code = body.quiz_code;
        }

        // Validate input
        if (!quiz_code) {
            return createErrorResponse(400, 'Missing quiz code');
        }

        // Get quiz details with teacher info
        const { data: quiz, error } = await supabase
            .from('quizzes')
            .select(`
                quiz_id,
                quiz_name,
                quiz_code,
                created_by,
                questions,
                due_date,
                created_at,
                teacher_login!inner (
                    id,
                    username,
                    email
                )
            `)
            .eq('quiz_code', quiz_code.toUpperCase())
            .single();

        if (error) {
            console.error('Quiz fetch error:', error);
            return createErrorResponse(500, 'Failed to fetch quiz', error.message);
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
            .select('score, total_questions')
            .eq('quiz_id', quiz.quiz_id);

        let stats = {
            total_attempts: 0,
            average_score: 0
        };

        if (!statsError && attempts && attempts.length > 0) {
            stats.total_attempts = attempts.length;
            const totalScore = attempts.reduce((sum, a) => sum + (a.score || 0), 0);
            const totalQuestions = attempts.reduce((sum, a) => sum + (a.total_questions || 0), 0);
            stats.average_score = totalQuestions > 0 
                ? Math.round((totalScore / totalQuestions) * 100) / 100 
                : 0;
        }

        return createSuccessResponse({
            quiz: {
                quiz_id: quiz.quiz_id,
                quiz_name: quiz.quiz_name,
                quiz_code: quiz.quiz_code,
                questions: quiz.questions,
                due_date: quiz.due_date,
                created_at: quiz.created_at,
                teacher: {
                    id: quiz.teacher_login?.id || '',
                    username: quiz.teacher_login?.username || '',
                    email: quiz.teacher_login?.email || ''
                },
                ...stats
            }
        });

    } catch (error) {
        console.error('Quiz fetch error:', error);
        return createErrorResponse(500, 'Internal server error', error.message);
    }
};