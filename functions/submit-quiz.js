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
        const { quiz_id, student_id, answers } = JSON.parse(event.body);

        if (!quiz_id || !student_id || !answers) {
            return createErrorResponse(400, 'Missing required fields');
        }

        // Get quiz details
        const { data: quiz, error: quizError } = await supabase
            .from('quizzes')
            .select('*')
            .eq('quiz_id', quiz_id)
            .single();

        if (quizError) {
            console.error('Error fetching quiz:', quizError);
            return createErrorResponse(500, 'Failed to fetch quiz details');
        }

        if (!quiz) {
            return createErrorResponse(404, 'Quiz not found');
        }

        // Check if quiz is expired
        if (new Date(quiz.due_date) < new Date()) {
            return createErrorResponse(400, 'Quiz has expired');
        }

        // Check if student has already attempted
        const { data: existingAttempt, error: attemptError } = await supabase
            .from('quiz_attempts')
            .select('*')
            .eq('quiz_id', quiz_id)
            .eq('user_id', student_id)
            .single();

        if (attemptError && attemptError.code !== 'PGRST116') { // PGRST116 is "not found" error
            console.error('Error checking existing attempt:', attemptError);
            return createErrorResponse(500, 'Failed to check existing attempt');
        }

        if (existingAttempt) {
            return createErrorResponse(400, 'You have already attempted this quiz');
        }

        // Calculate score
        const questions = quiz.questions.questions;
        const totalQuestions = questions.length;
        let correctAnswers = 0;

        // Compare each answer
        Object.entries(answers).forEach(([questionIndex, selectedOption]) => {
            const question = questions[parseInt(questionIndex)];
            if (question && question.options[selectedOption]?.is_correct) {
                correctAnswers++;
            }
        });

        // Save attempt
        const { data: attempt, error: saveError } = await supabase
            .from('quiz_attempts')
            .insert({
                quiz_id,
                user_id: student_id,
                score: correctAnswers,
                total_questions: totalQuestions,
                answers,
                is_completed: true
            })
            .select()
            .single();

        if (saveError) {
            console.error('Error saving attempt:', saveError);
            return createErrorResponse(500, 'Failed to save quiz attempt');
        }

        return createSuccessResponse({
            success: true,
            score: correctAnswers,
            totalQuestions,
            attempt
        });
    } catch (err) {
        console.error('Error in submit-quiz handler:', err);
        return createErrorResponse(500, 'Internal server error', err.message);
    }
};