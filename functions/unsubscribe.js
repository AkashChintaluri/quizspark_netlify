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
        const { student_id, teacher_id } = JSON.parse(event.body);

        // Validate input
        if (!student_id || !teacher_id) {
            return createErrorResponse(400, 'Missing required fields');
        }

        // Delete subscription
        const { error: deleteError } = await supabase
            .from('subscriptions')
            .delete()
            .eq('student_id', student_id)
            .eq('teacher_id', teacher_id);

        if (deleteError) {
            console.error('Unsubscribe error:', deleteError);
            return createErrorResponse(500, 'Failed to unsubscribe from teacher');
        }

        return createSuccessResponse({
            message: 'Successfully unsubscribed from teacher'
        });

    } catch (error) {
        console.error('Unsubscribe error:', error);
        return createErrorResponse(500, 'Internal server error', error.message);
    }
};