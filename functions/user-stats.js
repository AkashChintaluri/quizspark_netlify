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
                id,
                score,
                completed_at,
                quizzes (
                    id,
                    title,
                    teacher_id
                )
            `)
            .eq('student_id', student_id)
            .order('completed_at', { ascending: false });

        if (attemptError) {
            console.error('Attempts fetch error:', attemptError);
            return createErrorResponse(500, 'Failed to fetch quiz attempts');
        }

        // Calculate statistics
        const totalAttempts = attempts.length;
        const totalScore = attempts.reduce((sum, attempt) => sum + attempt.score, 0);
        const averageScore = totalAttempts > 0 ? totalScore / totalAttempts : 0;

        // Get unique teachers
        const teacherIds = new Set(attempts.map(a => a.quizzes.teacher_id));
        const uniqueTeachers = teacherIds.size;

        // Get recent performance trend (last 5 attempts)
        const recentAttempts = attempts.slice(0, 5);
        const performanceTrend = recentAttempts.map(attempt => ({
            quiz_title: attempt.quizzes.title,
            score: attempt.score,
            completed_at: attempt.completed_at
        }));

        // Calculate score distribution
        const scoreDistribution = {
            excellent: attempts.filter(a => a.score >= 90).length,
            good: attempts.filter(a => a.score >= 70 && a.score < 90).length,
            average: attempts.filter(a => a.score >= 50 && a.score < 70).length,
            poor: attempts.filter(a => a.score < 50).length
        };

        // Get best and worst performances
        const bestAttempt = attempts.reduce((best, current) => 
            current.score > (best?.score || 0) ? current : best, null);
        const worstAttempt = attempts.reduce((worst, current) => 
            current.score < (worst?.score || 100) ? current : worst, null);

        return createSuccessResponse({
            overview: {
                total_attempts: totalAttempts,
                average_score: Math.round(averageScore * 100) / 100,
                unique_teachers: uniqueTeachers
            },
            score_distribution: scoreDistribution,
            performance_trend: performanceTrend,
            best_performance: bestAttempt ? {
                quiz_title: bestAttempt.quizzes.title,
                score: bestAttempt.score,
                completed_at: bestAttempt.completed_at
            } : null,
            worst_performance: worstAttempt ? {
                quiz_title: worstAttempt.quizzes.title,
                score: worstAttempt.score,
                completed_at: worstAttempt.completed_at
            } : null
        });

    } catch (error) {
        console.error('Get user stats error:', error);
        return createErrorResponse(500, 'Internal server error', error.message);
    }
};