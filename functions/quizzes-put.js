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
        const { quiz_id, quiz_name, questions, due_date, teacher_id } = JSON.parse(body);

        // Validate input
        if (!quiz_id || !teacher_id) {
            return createErrorResponse(400, 'Missing required fields');
        }

        // Verify teacher owns this quiz
        const { data: existingQuiz, error: verifyError } = await supabase
            .from('quizzes')
            .select('teacher_id')
            .eq('id', quiz_id)
            .single();

        if (verifyError || !existingQuiz) {
            return createErrorResponse(404, 'Quiz not found');
        }

        if (existingQuiz.teacher_id !== teacher_id) {
            return createErrorResponse(403, 'Unauthorized to modify this quiz');
        }

        // Build update object with only provided fields
        const updateData = {};
        if (quiz_name) updateData.quiz_name = quiz_name;
        if (questions) updateData.questions = { questions };
        if (due_date) updateData.due_date = due_date;

        // Update quiz
        const { data: updatedQuiz, error: updateError } = await supabase
            .from('quizzes')
            .update(updateData)
            .eq('id', quiz_id)
            .select()
            .single();

        if (updateError) {
            console.error('Quiz update error:', updateError);
            return createErrorResponse(500, 'Failed to update quiz');
        }

        return createSuccessResponse({
            message: 'Quiz updated successfully',
            quiz: updatedQuiz
        });

    } catch (error) {
        console.error('Quiz update error:', error);
        return createErrorResponse(500, 'Internal server error', error.message);
    }
};