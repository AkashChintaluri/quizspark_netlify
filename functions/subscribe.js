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
        console.log('Received subscription request:', { student_id, teacher_id });

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

        // First check if the student exists
        const { data: student, error: studentError } = await supabase
            .from('student_login')
            .select('id')
            .eq('id', student_id)
            .single();

        if (studentError) {
            console.error('Student check error:', studentError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Failed to verify student',
                    details: studentError.message
                })
            };
        }

        if (!student) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Student not found'
                })
            };
        }

        // Check if teacher exists
        const { data: teacher, error: teacherError } = await supabase
            .from('teacher_login')
            .select('id')
            .eq('id', teacher_id)
            .single();

        if (teacherError) {
            console.error('Teacher check error:', teacherError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Failed to verify teacher',
                    details: teacherError.message
                })
            };
        }

        if (!teacher) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Teacher not found'
                })
            };
        }

        // Check if subscription already exists
        const { data: existingSub, error: checkError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('student_id', student_id)
            .eq('teacher_id', teacher_id)
            .maybeSingle();

        if (checkError) {
            console.error('Subscription check error:', checkError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Failed to check existing subscription',
                    details: checkError.message
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
        const subscriptionData = {
            student_id,
            teacher_id,
            subscribed_at: new Date().toISOString()
        };

        console.log('Attempting to create subscription:', subscriptionData);

        const { data: subscription, error: createError } = await supabase
            .from('subscriptions')
            .insert([subscriptionData])
            .select('*')
            .single();

        if (createError) {
            console.error('Subscribe error:', createError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Failed to subscribe to teacher',
                    details: createError.message
                })
            };
        }

        console.log('Successfully created subscription:', subscription);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Successfully subscribed to teacher',
                subscription: {
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