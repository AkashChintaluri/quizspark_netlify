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
        const student_id = event.path.split('/').pop();
        const body = event.isBase64Encoded
            ? Buffer.from(event.body, 'base64').toString('utf8')
            : event.body;
        const { name, email } = JSON.parse(body);

        // Validate input
        if (!student_id) {
            return createErrorResponse(400, 'student_id is required');
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
        const updateData = {};
        if (name) updateData.username = name;
        if (email) updateData.email = email;

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
            message: 'Student profile updated successfully',
            student: {
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