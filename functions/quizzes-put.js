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
        const { id, quiz_name, questions, due_date } = JSON.parse(event.body);

        // Validate input
        if (!id || !quiz_name || !questions || !due_date) {
            return createErrorResponse(400, 'Missing required fields');
        }

        // Verify teacher owns this quiz
        const { data: existingQuiz, error: verifyError } = await supabase
            .from('quizzes')
            .select('teacher_id')
            .eq('id', id)
            .single();

        if (verifyError || !existingQuiz) {
            return createErrorResponse(404, 'Quiz not found');
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
            .eq('id', id)
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