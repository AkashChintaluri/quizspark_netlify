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
        const { user_id, user_type } = JSON.parse(event.body);

        // Validate input
        if (!user_id || !user_type) {
            return createErrorResponse(400, 'Missing user ID or type');
        }

        const validTypes = ['student', 'teacher'];
        if (!validTypes.includes(user_type)) {
            return createErrorResponse(400, 'Invalid user type');
        }

        // Get user details
        const table = `${user_type}_login`;
        const { data: user, error } = await supabase
            .from(table)
            .select('id, username, email')
            .eq('id', user_id)
            .maybeSingle();

        if (error) {
            console.error('Database fetch error:', error);
            return createErrorResponse(500, 'Failed to fetch user data');
        }

        if (!user) {
            return createErrorResponse(404, 'User not found');
        }

        // Get additional user stats based on type
        let additionalData = {};
        
        if (user_type === 'student') {
            // Get student's quiz attempts count and average score
            const { data: stats, error: statsError } = await supabase
                .from('quiz_attempts')
                .select('score')
                .eq('student_id', user_id);

            if (!statsError && stats) {
                const attempts = stats.length;
                const averageScore = attempts > 0
                    ? stats.reduce((sum, attempt) => sum + attempt.score, 0) / attempts
                    : 0;

                additionalData = {
                    totalAttempts: attempts,
                    averageScore: Math.round(averageScore * 100) / 100
                };
            }
        } else {
            // Get teacher's created quizzes count
            const { count, error: quizError } = await supabase
                .from('quizzes')
                .select('*', { count: 'exact', head: true })
                .eq('teacher_id', user_id);

            if (!quizError) {
                additionalData = {
                    totalQuizzes: count || 0
                };
            }
        }

        return createSuccessResponse({
            user: {
                ...user,
                user_type,
                ...additionalData
            }
        });

    } catch (error) {
        console.error('Current user fetch error:', error);
        return createErrorResponse(500, 'Internal server error', error.message);
    }
};