const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to handle CORS
const handleCors = (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'PUT',
            },
            body: '',
        };
    }
};

// Helper function to send response
const sendResponse = (statusCode, body) => ({
    statusCode,
    headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
});

exports.handler = async (event) => {
    // Handle CORS
    const corsResponse = handleCors(event);
    if (corsResponse) return corsResponse;

    try {
        // Parse the request body
        const body = JSON.parse(event.body);
        const { currentPassword, newPassword } = body;

        // Extract student ID from path
        const pathParts = event.path.split('/');
        const student_id = pathParts[pathParts.length - 1];

        // Validate input
        if (!student_id || !currentPassword || !newPassword) {
            return sendResponse(400, {
                success: false,
                error: 'Missing required fields',
            });
        }

        // Check if student exists and verify current password
        const { data: student, error: fetchError } = await supabase
            .from('student_login')
            .select('id, password')
            .eq('id', student_id)
            .single();

        if (fetchError || !student) {
            return sendResponse(404, {
                success: false,
                error: 'Student not found',
            });
        }

        // Verify current password using bcrypt
        const isPasswordValid = await bcrypt.compare(currentPassword, student.password);
        if (!isPasswordValid) {
            return sendResponse(401, {
                success: false,
                error: 'Current password is incorrect',
            });
        }

        // Hash the new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        const { error: updateError } = await supabase
            .from('student_login')
            .update({ password: hashedNewPassword })
            .eq('id', student_id);

        if (updateError) {
            return sendResponse(500, {
                success: false,
                error: 'Failed to update password',
            });
        }

        return sendResponse(200, {
            success: true,
            message: 'Password updated successfully',
        });
    } catch (error) {
        console.error('Error:', error);
        return sendResponse(500, {
            success: false,
            error: 'Internal server error',
        });
    }
}; 