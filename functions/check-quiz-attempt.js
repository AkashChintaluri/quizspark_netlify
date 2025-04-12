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
        const { quiz_id, student_id } = JSON.parse(body);

        // Validate input
        if (!quiz_id || !student_id) {
            return createErrorResponse(400, 'Missing required fields');
        }

        // Check if quiz exists and is not expired
        const { data: quiz, error: quizError } = await supabase
            .from('quizzes')
            .select('due_date')
            .eq('id', quiz_id)
            .single();

        if (quizError || !quiz) {
            return createErrorResponse(404, 'Quiz not found');
        }

        const now = new Date();
        const dueDate = new Date(quiz.due_date);
        if (now > dueDate) {
            return createErrorResponse(403, 'Quiz has expired');
        }

        // Check if student has already attempted this quiz
        const { data: attempt, error: attemptError } = await supabase
            .from('quiz_attempts')
            .select('id, score, completed_at')
            .eq('quiz_id', quiz_id)
            .eq('student_id', student_id)
            .single();

        if (attemptError && attemptError.code !== 'PGRST116') { // PGRST116 means no rows returned
            console.error('Attempt check error:', attemptError);
            return createErrorResponse(500, 'Failed to check quiz attempt');
        }

        if (attempt) {
            // Check for existing retest request
            const { data: retestRequest, error: retestError } = await supabase
                .from('retest_requests')
                .select('id, status')
                .eq('quiz_id', quiz_id)
                .eq('student_id', student_id)
                .single();

            if (retestError && retestError.code !== 'PGRST116') {
                console.error('Retest request check error:', retestError);
                return createErrorResponse(500, 'Failed to check retest request');
            }

            return createSuccessResponse({
                has_attempted: true,
                attempt: {
                    id: attempt.id,
                    score: attempt.score,
                    completed_at: attempt.completed_at
                },
                retest_request: retestRequest ? {
                    id: retestRequest.id,
                    status: retestRequest.status
                } : null
            });
        }

        return createSuccessResponse({
            has_attempted: false
        });

    } catch (error) {
        console.error('Quiz attempt check error:', error);
        return createErrorResponse(500, 'Internal server error', error.message);
    }
};