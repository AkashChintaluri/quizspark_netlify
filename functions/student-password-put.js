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
        console.log('Received event:', JSON.stringify(event, null, 2));

        // Parse the request body
        const body = JSON.parse(event.body);
        console.log('Parsed body:', body);
        
        const { currentPassword, newPassword } = body;

        // Extract student ID from path
        const pathParts = event.path.split('/');
        const student_id = pathParts[pathParts.length - 1];
        console.log('Student ID:', student_id);

        // Validate input
        if (!student_id || !currentPassword || !newPassword) {
            console.log('Missing fields:', { student_id, currentPassword, newPassword });
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Missing required fields'
                })
            };
        }

        // Check if student exists
        const { data: student, error: fetchError } = await supabase
            .from('student_login')
            .select('id, password')
            .eq('id', student_id)
            .single();

        if (fetchError) {
            console.error('Database fetch error:', fetchError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Database error',
                    details: fetchError.message
                })
            };
        }

        if (!student) {
            console.log('Student not found:', student_id);
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Student not found'
                })
            };
        }

        // Verify current password
        if (student.password !== currentPassword) {
            console.log('Password mismatch');
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Current password is incorrect'
                })
            };
        }

        // Update password
        const { error: updateError } = await supabase
            .from('student_login')
            .update({ password: newPassword })
            .eq('id', student_id);

        if (updateError) {
            console.error('Update error:', updateError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Failed to update password',
                    details: updateError.message
                })
            };
        }

        console.log('Password updated successfully for student:', student_id);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Password updated successfully'
            })
        };
    } catch (error) {
        console.error('Unexpected error:', error);
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