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
        const { student_id, name, email, bio } = JSON.parse(body);

        // Validate input
        if (!student_id) {
            return createErrorResponse(400, 'student_id is required');
        }

        // Check if student exists
        const { data: student, error: studentError } = await supabase
            .from('students')
            .select('id')
            .eq('id', student_id)
            .single();

        if (studentError) {
            console.error('Student check error:', studentError);
            return createErrorResponse(404, 'Student not found');
        }

        // Update student profile
        const updateData = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (bio) updateData.bio = bio;

        const { data: updatedStudent, error: updateError } = await supabase
            .from('students')
            .update(updateData)
            .eq('id', student_id)
            .select()
            .single();

        if (updateError) {
            console.error('Student update error:', updateError);
            return createErrorResponse(500, 'Failed to update student profile');
        }

        return createSuccessResponse({
            message: 'Student profile updated successfully',
            student: {
                id: updatedStudent.id,
                name: updatedStudent.name,
                email: updatedStudent.email,
                bio: updatedStudent.bio
            }
        });

    } catch (error) {
        console.error('Update student error:', error);
        return createErrorResponse(500, 'Internal server error', error.message);
    }
};