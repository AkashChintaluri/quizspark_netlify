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
        const { userId, userType } = JSON.parse(body);

        // Validate input
        if (!userId || !userType) {
            return createErrorResponse(400, 'Missing required fields');
        }

        const validTypes = ['student', 'teacher'];
        if (!validTypes.includes(userType)) {
            return createErrorResponse(400, 'Invalid user type');
        }

        // Get user details
        const table = `${userType}_login`;
        const { data: user, error } = await supabase
            .from(table)
            .select('id, username, email')
            .eq('id', userId)
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
        
        if (userType === 'student') {
            // Get student's quiz attempts count and average score
            const { data: stats, error: statsError } = await supabase
                .from('quiz_attempts')
                .select('score')
                .eq('student_id', userId);

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
                .eq('teacher_id', userId);

            if (!quizError) {
                additionalData = {
                    totalQuizzes: count || 0
                };
            }
        }

        return createSuccessResponse({
            user: {
                ...user,
                userType,
                ...additionalData
            }
        });

    } catch (error) {
        console.error('Current user fetch error:', error);
        return createErrorResponse(500, 'Internal server error', error.message);
    }
};