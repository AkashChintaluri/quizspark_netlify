const supabase = require('./supabase');

exports.handler = async (event) => {
    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers
        };
    }

    try {
        const { student_id, teacher_id } = JSON.parse(event.body);

        // Validate input
        if (!student_id || !teacher_id) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'student_id and teacher_id are required'
                })
            };
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
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Failed to check existing subscription'
                })
            };
        }

        if (existingSub) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Already subscribed to this teacher'
                })
            };
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
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Failed to subscribe to teacher'
                })
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Successfully subscribed to teacher',
                subscription: {
                    id: subscription.id,
                    student_id: subscription.student_id,
                    teacher_id: subscription.teacher_id,
                    subscribed_at: subscription.subscribed_at
                }
            })
        };

    } catch (error) {
        console.error('Subscribe error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Internal server error',
                details: error.message
            })
        };
    }
};