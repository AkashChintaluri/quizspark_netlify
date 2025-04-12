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
        const { request_id, status, feedback, teacher_id } = JSON.parse(body);

        // Validate input
        if (!request_id || !status || !teacher_id) {
            return createErrorResponse(400, 'request_id, status, and teacher_id are required');
        }

        // Check if request exists and belongs to the teacher's quiz
        const { data: request, error: requestError } = await supabase
            .from('retest_requests')
            .select(`
                id,
                status,
                quiz_id,
                student_id,
                quizzes (
                    teacher_id
                )
            `)
            .eq('id', request_id)
            .single();

        if (requestError) {
            console.error('Request check error:', requestError);
            return createErrorResponse(404, 'Retest request not found');
        }

        // Verify teacher owns the quiz
        if (request.quizzes.teacher_id !== teacher_id) {
            return createErrorResponse(403, 'Not authorized to update this retest request');
        }

        if (request.status !== 'pending') {
            return createErrorResponse(400, 'Request has already been processed');
        }

        // Start a transaction using RPC
        const { data: result, error: rpcError } = await supabase.rpc('handle_retest_request', {
            p_request_id: request_id,
            p_status: status,
            p_feedback: feedback,
            p_quiz_id: request.quiz_id,
            p_student_id: request.student_id
        });

        if (rpcError) {
            console.error('Update request error:', rpcError);
            return createErrorResponse(500, 'Failed to update retest request');
        }

        return createSuccessResponse({
            message: `Retest request ${status}`,
            request: {
                id: request_id,
                status,
                feedback,
                updated_at: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Update retest request error:', error);
        return createErrorResponse(500, 'Internal server error', error.message);
    }
};