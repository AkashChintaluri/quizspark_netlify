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

        let query = supabase
            .from('teachers')
            .select(`
                id,
                name,
                email,
                bio,
                created_at
            `)
            .order('name');

        // Execute query
        const { data: teachers, error } = await query;

        if (error) {
            console.error('Teachers fetch error:', error);
            return createErrorResponse(500, 'Failed to fetch teachers');
        }

        // If student_id is provided, get their subscriptions
        let subscriptions = [];
        if (student_id) {
            const { data: subs, error: subError } = await supabase
                .from('subscriptions')
                .select('teacher_id')
                .eq('student_id', student_id);

            if (subError) {
                console.error('Subscriptions fetch error:', subError);
                return createErrorResponse(500, 'Failed to fetch subscriptions');
            }

            subscriptions = subs.map(sub => sub.teacher_id);
        }

        return createSuccessResponse({
            teachers: teachers.map(teacher => ({
                id: teacher.id,
                name: teacher.name,
                email: teacher.email,
                bio: teacher.bio,
                created_at: teacher.created_at,
                is_subscribed: student_id ? subscriptions.includes(teacher.id) : undefined
            }))
        });

    } catch (error) {
        console.error('Get teachers error:', error);
        return createErrorResponse(500, 'Internal server error', error.message);
    }
};