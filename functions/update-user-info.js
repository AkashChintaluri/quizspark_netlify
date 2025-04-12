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

    if (event.httpMethod !== 'POST') {
        return createErrorResponse(405, 'Method not allowed');
    }

    try {
        const body = event.isBase64Encoded
            ? Buffer.from(event.body, 'base64').toString('utf8')
            : event.body;
        const { userId, userType, name, email } = JSON.parse(body);

        // Validate input
        if (!userId || !userType || (!name && !email)) {
            return createErrorResponse(400, 'Missing required fields');
        }

        const validTypes = ['student', 'teacher'];
        if (!validTypes.includes(userType)) {
            return createErrorResponse(400, 'Invalid user type');
        }

        // Check if user exists
        const table = `${userType}_login`;
        const { data: user, error: userError } = await supabase
            .from(table)
            .select('id')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            console.error('User check error:', userError);
            return createErrorResponse(404, 'User not found');
        }

        // Update user profile
        const updateData = {};
        if (name) updateData.username = name;
        if (email) updateData.email = email;

        const { data: updatedUser, error: updateError } = await supabase
            .from(table)
            .update(updateData)
            .eq('id', userId)
            .select('id, username, email')
            .single();

        if (updateError) {
            console.error('User update error:', updateError);
            return createErrorResponse(500, 'Failed to update user profile');
        }

        return createSuccessResponse({
            success: true,
            message: 'User profile updated successfully',
            user: {
                id: updatedUser.id,
                username: updatedUser.username,
                email: updatedUser.email
            }
        });

    } catch (error) {
        console.error('User update error:', error);
        return createErrorResponse(500, 'Internal server error', error.message);
    }
}; 