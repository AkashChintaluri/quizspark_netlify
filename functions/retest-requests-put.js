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
        const request_id = event.path.split('/').pop();
        const body = event.isBase64Encoded
            ? Buffer.from(event.body, 'base64').toString('utf8')
            : event.body;
        const { status, feedback } = JSON.parse(body);

        // Validate input
        if (!request_id || !status) {
            return createErrorResponse(400, 'request_id and status are required');
        }

        // Check if request exists and is pending
        const { data: request, error: requestError } = await supabase
            .from('retest_requests')
            .select('request_id, status, quiz_id, attempt_id')
            .eq('request_id', request_id)
            .single();

        if (requestError || !request) {
            console.error('Request check error:', requestError);
            return createErrorResponse(404, 'Retest request not found');
        }

        if (request.status !== 'pending') {
            return createErrorResponse(400, 'Request has already been processed');
        }

        // Start a transaction to update request and handle quiz attempt
        const { data: updatedRequest, error: updateError } = await supabase.rpc(
            'handle_retest_request',
            {
                p_request_id: request_id,
                p_status: status,
                p_feedback: feedback
            }
        );

        if (updateError) {
            console.error('Update request error:', updateError);
            return createErrorResponse(500, 'Failed to update retest request');
        }

        return createSuccessResponse({
            message: 'Retest request updated successfully',
            request: updatedRequest
        });

    } catch (error) {
        console.error('Update retest request error:', error);
        return createErrorResponse(500, 'Internal server error', error.message);
    }
};