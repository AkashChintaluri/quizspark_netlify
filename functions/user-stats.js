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

        // Get total quizzes attempted
        const { data: attempts, error: attemptsError } = await supabase
            .from('quiz_attempts')
            .select('attempt_id, quiz_id, score, total_questions')
            .eq('user_id', student_id)
            .eq('is_completed', true);

        if (attemptsError) {
            console.error('Error fetching quiz attempts:', attemptsError);
            return createErrorResponse(500, 'Failed to fetch quiz attempts');
        }

        // Get unique teachers subscribed to
        const { data: subscriptions, error: subsError } = await supabase
            .from('subscriptions')
            .select('teacher_id')
            .eq('student_id', student_id);

        if (subsError) {
            console.error('Error fetching subscriptions:', subsError);
            return createErrorResponse(500, 'Failed to fetch subscriptions');
        }

        // Calculate statistics
        const totalQuizzes = attempts.length;
        const totalTeachers = new Set(subscriptions.map(sub => sub.teacher_id)).size;
        const totalScore = attempts.reduce((sum, attempt) => sum + attempt.score, 0);
        const totalQuestions = attempts.reduce((sum, attempt) => sum + attempt.total_questions, 0);
        const averageScore = totalQuizzes > 0 ? (totalScore / totalQuestions * 100).toFixed(2) : 0;

        return createSuccessResponse({
            total_attempts: totalQuizzes,
            average_score: parseFloat(averageScore),
            completed_quizzes: totalQuizzes,
            total_teachers: totalTeachers
        });

    } catch (error) {
        console.error('Get user stats error:', error);
        return createErrorResponse(500, 'Internal server error', error.message);
    }
};