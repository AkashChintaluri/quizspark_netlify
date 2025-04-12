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
        const { student_id, quiz_id, attempt_id } = JSON.parse(body);

        // Validate input
        if (!student_id || !quiz_id || !attempt_id) {
            return createErrorResponse(400, 'student_id, quiz_id, and attempt_id are required');
        }

        // Check if attempt exists and belongs to student
        const { data: attempt, error: attemptError } = await supabase
            .from('quiz_attempts')
            .select('attempt_id, user_id, quiz_id')
            .eq('attempt_id', attempt_id)
            .eq('user_id', student_id)
            .eq('quiz_id', quiz_id)
            .single();

        if (attemptError || !attempt) {
            console.error('Attempt check error:', attemptError);
            return createErrorResponse(404, 'Quiz attempt not found');
        }

        // Check if there's already a pending retest request
        const { data: existingRequest, error: requestError } = await supabase
            .from('retest_requests')
            .select('request_id')
            .eq('student_id', student_id)
            .eq('quiz_id', quiz_id)
            .eq('attempt_id', attempt_id)
            .eq('status', 'pending')
            .maybeSingle();

        if (requestError) {
            console.error('Request check error:', requestError);
            return createErrorResponse(500, 'Failed to check existing requests');
        }

        if (existingRequest) {
            return createErrorResponse(409, 'A pending retest request already exists for this quiz attempt');
        }

        // Create new retest request
        const { data: newRequest, error: createError } = await supabase
            .from('retest_requests')
            .insert([{
                student_id,
                quiz_id,
                attempt_id,
                request_date: new Date().toISOString(),
                status: 'pending'
            }])
            .select()
            .single();

        if (createError) {
            console.error('Request creation error:', createError);
            return createErrorResponse(500, 'Failed to create retest request');
        }

        return createSuccessResponse({
            message: 'Retest request created successfully',
            request: newRequest
        });

    } catch (error) {
        console.error('Retest request error:', error);
        return createErrorResponse(500, 'Internal server error', error.message);
    }
};