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

    if (event.httpMethod !== 'PUT') {
        return createErrorResponse(405, 'Method not allowed');
    }

    try {
        // Extract student_id from path, handling both formats:
        // 1. /.netlify/functions/students-put/1
        // 2. /api/students/1
        const pathParts = event.path.split('/');
        const student_id = pathParts[pathParts.length - 1];
        
        const body = event.isBase64Encoded
            ? Buffer.from(event.body, 'base64').toString('utf8')
            : event.body;
        const { name, email } = JSON.parse(body);

        // Validate input
        if (!student_id) {
            return createErrorResponse(400, 'student_id is required');
        }

        if (!name && !email) {
            return createErrorResponse(400, 'At least one field (name or email) is required');
        }

        // Check if student exists
        const { data: student, error: studentError } = await supabase
            .from('student_login')
            .select('id')
            .eq('id', student_id)
            .single();

        if (studentError || !student) {
            console.error('Student check error:', studentError);
            return createErrorResponse(404, 'Student not found');
        }

        // Update student profile
        // Map frontend 'name' field to database 'username' field
        const updateData = {};
        if (name) updateData.username = name;  // frontend 'name' maps to database 'username'
        if (email) updateData.email = email;   // email field name is the same in both

        const { data: updatedStudent, error: updateError } = await supabase
            .from('student_login')
            .update(updateData)
            .eq('id', student_id)
            .select('id, username, email')
            .single();

        if (updateError) {
            console.error('Student update error:', updateError);
            return createErrorResponse(500, 'Failed to update student profile');
        }

        return createSuccessResponse({
            success: true,
            user: {
                id: updatedStudent.id,
                username: updatedStudent.username,
                email: updatedStudent.email
            }
        });

    } catch (error) {
        console.error('Student update error:', error);
        return createErrorResponse(500, 'Internal server error', error.message);
    }
};