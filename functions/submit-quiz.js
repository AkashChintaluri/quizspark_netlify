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

        // Validate input
        if (!quiz_id || !student_id || !answers) {
            return createErrorResponse(400, 'Missing required fields');
        }

        // Get quiz details and check if it's still active
        const { data: quiz, error: quizError } = await supabase
            .from('quizzes')
            .select('questions, due_date')
            .eq('quiz_id', quiz_id)
            .single();

        if (quizError || !quiz) {
            return createErrorResponse(404, 'Quiz not found');
        }

        const now = new Date();
        const dueDate = new Date(quiz.due_date);
        if (now > dueDate) {
            return createErrorResponse(403, 'Quiz has expired');
        }

        // Check if student has already attempted this quiz
        const { data: existingAttempt, error: attemptError } = await supabase
            .from('quiz_attempts')
            .select('attempt_id')
            .eq('quiz_id', quiz_id)
            .eq('user_id', student_id)
            .single();

        if (attemptError && attemptError.code !== 'PGRST116') {
            console.error('Attempt check error:', attemptError);
            return createErrorResponse(500, 'Failed to check existing attempts');
        }

        if (existingAttempt) {
            return createErrorResponse(403, 'You have already attempted this quiz');
        }

        // Calculate score
        const questions = quiz.questions.questions;
        if (Object.keys(answers).length !== questions.length) {
            return createErrorResponse(400, 'Number of answers does not match number of questions');
        }

        let correctAnswers = 0;
        Object.entries(answers).forEach(([questionIndex, selectedOptionIndex]) => {
            const question = questions[questionIndex];
            const selectedOption = question.options[selectedOptionIndex];
            if (selectedOption.is_correct) {
                correctAnswers++;
            }
        });

        const score = Math.round((correctAnswers / questions.length) * 100);

        // Save attempt
        const { data: attempt, error: saveError } = await supabase
            .from('quiz_attempts')
            .insert([
                {
                    quiz_id: quiz_id,
                    user_id: student_id,
                    score: score,
                    answers: answers,
                    attempt_date: new Date().toISOString(),
                    is_completed: true
                }
            ])
            .select()
            .single();

        if (saveError) {
            console.error('Save attempt error:', saveError);
            return createErrorResponse(500, 'Failed to save quiz attempt');
        }

        return createSuccessResponse({
            message: 'Quiz submitted successfully',
            attempt: {
                id: attempt.attempt_id,
                score: score,
                total_questions: questions.length
            }
        });
    } catch (error) {
        console.error('Error submitting quiz:', error);
        return createErrorResponse(500, 'Internal server error');
    }
};