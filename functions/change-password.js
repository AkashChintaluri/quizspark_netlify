const bcrypt = require('bcryptjs');
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
        const { username, currentPassword, newPassword, userType } = JSON.parse(body);

        // Validate input
        if (!username || !currentPassword || !newPassword || !userType) {
            return createErrorResponse(400, 'Missing required fields');
        }

        const validTypes = ['student', 'teacher'];
        if (!validTypes.includes(userType)) {
            return createErrorResponse(400, 'Invalid user type');
        }

        // Get user from database
        const table = `${userType}_login`;
        const { data: user, error: fetchError } = await supabase
            .from(table)
            .select('id, password')
            .eq('username', username)
            .maybeSingle();

        if (fetchError) {
            console.error('Database fetch error:', fetchError);
            return createErrorResponse(500, 'Failed to fetch user data');
        }

        if (!user) {
            return createErrorResponse(404, 'User not found');
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) {
            return createErrorResponse(401, 'Current password is incorrect');
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        const { error: updateError } = await supabase
            .from(table)
            .update({ password: hashedPassword })
            .eq('id', user.id);

        if (updateError) {
            console.error('Password update error:', updateError);
            return createErrorResponse(500, 'Failed to update password');
        }

        return createSuccessResponse({
            message: 'Password updated successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        return createErrorResponse(500, 'Internal server error', error.message);
    }
};