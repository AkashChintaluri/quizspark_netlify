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
        const { quiz_id, student_id, reason } = JSON.parse(body);

        // Validate input
        if (!quiz_id || !student_id || !reason) {
            return createErrorResponse(400, 'Missing required fields');
        }

        // Check if student has attempted the quiz
        const { data: attempt, error: attemptError } = await supabase
            .from('quiz_attempts')
            .select('id, score')
            .eq('quiz_id', quiz_id)
            .eq('student_id', student_id)
            .single();

        if (attemptError && attemptError.code !== 'PGRST116') {
            console.error('Attempt check error:', attemptError);
            return createErrorResponse(500, 'Failed to check quiz attempt');
        }

        if (!attempt) {
            return createErrorResponse(400, 'You must attempt the quiz before requesting a retest');
        }

        // Check for existing retest request
        const { data: existingRequest, error: requestError } = await supabase
            .from('retest_requests')
            .select('id, status')
            .eq('quiz_id', quiz_id)
            .eq('student_id', student_id)
            .single();

        if (requestError && requestError.code !== 'PGRST116') {
            console.error('Request check error:', requestError);
            return createErrorResponse(500, 'Failed to check existing requests');
        }

        if (existingRequest) {
            return createErrorResponse(400, 'You have already submitted a retest request for this quiz');
        }

        // Create retest request
        const { data: request, error: createError } = await supabase
            .from('retest_requests')
            .insert([
                {
                    quiz_id,
                    student_id,
                    reason,
                    status: 'pending',
                    created_at: new Date().toISOString()
                }
            ])
            .select()
            .single();

        if (createError) {
            console.error('Create request error:', createError);
            return createErrorResponse(500, 'Failed to create retest request');
        }

        return createSuccessResponse({
            message: 'Retest request submitted successfully',
            request: {
                id: request.id,
                status: request.status,
                created_at: request.created_at
            }
        });

    } catch (error) {
        console.error('Create retest request error:', error);
        return createErrorResponse(500, 'Internal server error', error.message);
    }
};