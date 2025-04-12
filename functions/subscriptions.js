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
        const { student_id } = event.queryStringParameters || {};

        // Validate input
        if (!student_id) {
            return createErrorResponse(400, 'student_id is required');
        }

        // Get all subscriptions with teacher details
        const { data: subscriptions, error } = await supabase
            .from('subscriptions')
            .select(`
                id,
                subscribed_at,
                teachers (
                    id,
                    name,
                    email,
                    bio
                )
            `)
            .eq('student_id', student_id)
            .order('subscribed_at', { ascending: false });

        if (error) {
            console.error('Subscriptions fetch error:', error);
            return createErrorResponse(500, 'Failed to fetch subscriptions');
        }

        return createSuccessResponse({
            subscriptions: subscriptions.map(sub => ({
                id: sub.id,
                subscribed_at: sub.subscribed_at,
                teacher: {
                    id: sub.teachers.id,
                    name: sub.teachers.name,
                    email: sub.teachers.email,
                    bio: sub.teachers.bio
                }
            }))
        });

    } catch (error) {
        console.error('Get subscriptions error:', error);
        return createErrorResponse(500, 'Internal server error', error.message);
    }
};