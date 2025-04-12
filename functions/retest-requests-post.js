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
        const { request_id, status, feedback } = JSON.parse(body);

        // Validate input
        if (!request_id || !status) {
            return createErrorResponse(400, 'Missing required fields');
        }

        // Check if request exists
        const { data: request, error: requestError } = await supabase
            .from('retest_requests')
            .select('id, status')
            .eq('id', request_id)
            .single();

        if (requestError) {
            console.error('Request check error:', requestError);
            return createErrorResponse(404, 'Retest request not found');
        }

        if (request.status !== 'pending') {
            return createErrorResponse(400, 'Request has already been processed');
        }

        // Update request status
        const { data: updatedRequest, error: updateError } = await supabase
            .from('retest_requests')
            .update({
                status,
                feedback,
                updated_at: new Date().toISOString()
            })
            .eq('id', request_id)
            .select()
            .single();

        if (updateError) {
            console.error('Update request error:', updateError);
            return createErrorResponse(500, 'Failed to update retest request');
        }

        return createSuccessResponse({
            message: 'Retest request updated successfully',
            request: {
                id: updatedRequest.id,
                status: updatedRequest.status,
                feedback: updatedRequest.feedback,
                updated_at: updatedRequest.updated_at
            }
        });

    } catch (error) {
        console.error('Update retest request error:', error);
        return createErrorResponse(500, 'Internal server error', error.message);
    }
};