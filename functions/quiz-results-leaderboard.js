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
        const { quiz_id } = event.queryStringParameters || {};

        // Validate input
        if (!quiz_id) {
            return createErrorResponse(400, 'quiz_id is required');
        }

        // Get quiz details first
        const { data: quiz, error: quizError } = await supabase
            .from('quizzes')
            .select(`
                id,
                title,
                description,
                due_date,
                teacher_id,
                teachers (
                    name,
                    email
                )
            `)
            .eq('id', quiz_id)
            .single();

        if (quizError) {
            console.error('Quiz fetch error:', quizError);
            return createErrorResponse(404, 'Quiz not found');
        }

        // Get all attempts for this quiz
        const { data: attempts, error: attemptError } = await supabase
            .from('quiz_attempts')
            .select(`
                id,
                student_id,
                score,
                completed_at,
                students (
                    name,
                    email
                )
            `)
            .eq('quiz_id', quiz_id)
            .order('score', { ascending: false });

        if (attemptError) {
            console.error('Attempts fetch error:', attemptError);
            return createErrorResponse(500, 'Failed to fetch quiz attempts');
        }

        // Calculate statistics
        let totalScore = 0;
        let highestScore = 0;
        let lowestScore = 100;

        attempts.forEach(attempt => {
            totalScore += attempt.score;
            highestScore = Math.max(highestScore, attempt.score);
            lowestScore = Math.min(lowestScore, attempt.score);
        });

        const averageScore = attempts.length > 0 ? totalScore / attempts.length : 0;

        return createSuccessResponse({
            quiz: {
                id: quiz.id,
                title: quiz.title,
                description: quiz.description,
                due_date: quiz.due_date,
                teacher: quiz.teachers
            },
            statistics: {
                total_attempts: attempts.length,
                average_score: Math.round(averageScore * 100) / 100,
                highest_score: highestScore,
                lowest_score: lowestScore
            },
            leaderboard: attempts.map((attempt, index) => ({
                rank: index + 1,
                student: {
                    id: attempt.student_id,
                    name: attempt.students.name,
                    email: attempt.students.email
                },
                score: attempt.score,
                completed_at: attempt.completed_at
            }))
        });

    } catch (error) {
        console.error('Get quiz leaderboard error:', error);
        return createErrorResponse(500, 'Internal server error', error.message);
    }
};