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
        const { quiz_id, student_id, answers } = JSON.parse(body);

        // Validate input
        if (!quiz_id || !student_id || !answers || !Array.isArray(answers)) {
            return createErrorResponse(400, 'Missing or invalid required fields');
        }

        // Get quiz details and check if it's still active
        const { data: quiz, error: quizError } = await supabase
            .from('quizzes')
            .select('questions, due_date')
            .eq('id', quiz_id)
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
            .select('id')
            .eq('quiz_id', quiz_id)
            .eq('student_id', student_id)
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
        if (answers.length !== questions.length) {
            return createErrorResponse(400, 'Number of answers does not match number of questions');
        }

        let correctAnswers = 0;
        const detailedResults = answers.map((answer, index) => {
            const question = questions[index];
            const isCorrect = answer.toLowerCase() === question.correct_answer.toLowerCase();
            if (isCorrect) correctAnswers++;
            return {
                question_number: index + 1,
                your_answer: answer,
                correct_answer: question.correct_answer,
                is_correct: isCorrect
            };
        });

        const score = (correctAnswers / questions.length) * 100;

        // Save attempt
        const { data: attempt, error: saveError } = await supabase
            .from('quiz_attempts')
            .insert([
                {
                    quiz_id,
                    student_id,
                    score,
                    answers: { answers },
                    completed_at: new Date().toISOString()
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
                id: attempt.id,
                score,
                completed_at: attempt.completed_at,
                results: detailedResults
            }
        });

    } catch (error) {
        console.error('Quiz submission error:', error);
        return createErrorResponse(500, 'Internal server error', error.message);
    }
};