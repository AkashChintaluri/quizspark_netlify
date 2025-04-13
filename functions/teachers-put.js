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
        const { id, username, email } = JSON.parse(event.body);

        // Validate input
        if (!id || !username || !email) {
            return createErrorResponse(400, 'Missing required fields');
        }

        // Check if teacher exists
        const { data: teacher, error: teacherError } = await supabase
            .from('teachers')
            .select('id')
            .eq('id', id)
            .single();

        if (teacherError) {
            console.error('Teacher check error:', teacherError);
            return createErrorResponse(404, 'Teacher not found');
        }

        // Update teacher profile
        const updateData = {};
        if (username) updateData.name = username;
        if (email) updateData.email = email;

        const { data: updatedTeacher, error: updateError } = await supabase
            .from('teachers')
            .update(updateData)
            .eq('id', id)
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