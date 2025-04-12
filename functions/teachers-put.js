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
        const { teacher_id, name, email, bio } = JSON.parse(body);

        // Validate input
        if (!teacher_id) {
            return createErrorResponse(400, 'teacher_id is required');
        }

        // Check if teacher exists
        const { data: teacher, error: teacherError } = await supabase
            .from('teachers')
            .select('id')
            .eq('id', teacher_id)
            .single();

        if (teacherError) {
            console.error('Teacher check error:', teacherError);
            return createErrorResponse(404, 'Teacher not found');
        }

        // Update teacher profile
        const updateData = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (bio) updateData.bio = bio;

        const { data: updatedTeacher, error: updateError } = await supabase
            .from('teachers')
            .update(updateData)
            .eq('id', teacher_id)
            .select()
            .single();

        if (updateError) {
            console.error('Teacher update error:', updateError);
            return createErrorResponse(500, 'Failed to update teacher profile');
        }

        return createSuccessResponse({
            message: 'Teacher profile updated successfully',
            teacher: {
                id: updatedTeacher.id,
                name: updatedTeacher.name,
                email: updatedTeacher.email,
                bio: updatedTeacher.bio
            }
        });

    } catch (error) {
        console.error('Update teacher error:', error);
        return createErrorResponse(500, 'Internal server error', error.message);
    }
};