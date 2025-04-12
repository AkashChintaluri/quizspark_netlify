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
        const { student_id, teacher_id } = JSON.parse(body);

        // Validate input
        if (!student_id || !teacher_id) {
            return createErrorResponse(400, 'student_id and teacher_id are required');
        }

        // Check if subscription already exists
        const { data: existingSub, error: checkError } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('student_id', student_id)
            .eq('teacher_id', teacher_id)
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            console.error('Subscription check error:', checkError);
            return createErrorResponse(500, 'Failed to check existing subscription');
        }

        if (existingSub) {
            return createErrorResponse(400, 'Already subscribed to this teacher');
        }

        // Create subscription
        const { data: subscription, error: createError } = await supabase
            .from('subscriptions')
            .insert([{
                student_id,
                teacher_id,
                subscribed_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (createError) {
            console.error('Subscribe error:', createError);
            return createErrorResponse(500, 'Failed to subscribe to teacher');
        }

        return createSuccessResponse({
            message: 'Successfully subscribed to teacher',
            subscription: {
                id: subscription.id,
                student_id: subscription.student_id,
                teacher_id: subscription.teacher_id,
                subscribed_at: subscription.subscribed_at
            }
        });

    } catch (error) {
        console.error('Subscribe error:', error);
        return createErrorResponse(500, 'Internal server error', error.message);
    }
};