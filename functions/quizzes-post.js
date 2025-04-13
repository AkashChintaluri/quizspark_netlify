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
        const { quiz_name, questions, due_date, teacher_id } = JSON.parse(event.body);

        // Validate input
        if (!quiz_name || !questions || !due_date || !teacher_id) {
            return createErrorResponse(400, 'Missing required fields');
        }

        // Generate a unique quiz code
        const quiz_code = Math.random().toString(36).substring(2, 8).toUpperCase();

        // Create quiz
        const { data: quiz, error: quizError } = await supabase
            .from('quizzes')
            .insert([
                {
                    quiz_name,
                    teacher_id,
                    quiz_code,
                    questions: { questions },
                    due_date
                }
            ])
            .select()
            .single();

        if (quizError) {
            console.error('Quiz creation error:', quizError);
            return createErrorResponse(500, 'Failed to create quiz');
        }

        return createSuccessResponse({
            message: 'Quiz created successfully',
            quiz
        });

    } catch (error) {
        console.error('Quiz creation error:', error);
        return createErrorResponse(500, 'Internal server error', error.message);
    }
};