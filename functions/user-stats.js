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
                attempt_date
            `)
            .eq('user_id', student_id)
            .order('attempt_date', { ascending: false });

        if (attemptError) {
            console.error('Quiz attempts fetch error:', attemptError);
            return createErrorResponse(500, 'Failed to fetch quiz attempts');
        }

        // Calculate statistics
        const totalAttempts = attempts.length;
        const completedAttempts = attempts.filter(a => a.is_completed).length;
        const totalScore = attempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0);
        const totalQuestions = attempts.reduce((sum, attempt) => sum + (attempt.total_questions || 0), 0);
        const averageScore = totalQuestions > 0 ? (totalScore / totalQuestions) * 100 : 0;

        // Get retest requests
        const { data: retestRequests, error: retestError } = await supabase
            .from('retest_requests')
            .select('request_id, status')
            .eq('student_id', student_id);

        if (retestError) {
            console.error('Retest requests fetch error:', retestError);
            return createErrorResponse(500, 'Failed to fetch retest requests');
        }

        const pendingRetests = retestRequests.filter(r => r.status === 'pending').length;

        return createSuccessResponse({
            total_attempts: totalAttempts,
            completed_attempts: completedAttempts,
            average_score: Math.round(averageScore * 100) / 100,
            pending_retests: pendingRetests,
            recent_attempts: attempts.slice(0, 5).map(attempt => ({
                attempt_id: attempt.attempt_id,
                quiz_id: attempt.quiz_id,
                score: attempt.score,
                total_questions: attempt.total_questions,
                is_completed: attempt.is_completed,
                attempt_date: attempt.attempt_date
            }))
        });

    } catch (error) {
        console.error('Get user stats error:', error);
        return createErrorResponse(500, 'Internal server error', error.message);
    }
};