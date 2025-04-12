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
        const student_id = event.queryStringParameters?.student_id;

        if (!student_id) {
            return createErrorResponse(400, 'student_id is required');
        }

        // Get all quiz attempts for the student
        const { data: attempts, error: attemptsError } = await supabase
            .from('quiz_attempts')
            .select('attempt_id, quiz_id, attempt_date, score, total_questions, time_taken, is_completed, answers')
            .eq('user_id', student_id);

        if (attemptsError) {
            console.error('Quiz attempts fetch error:', attemptsError);
            return createErrorResponse(500, 'Failed to fetch quiz attempts');
        }

        if (!attempts || attempts.length === 0) {
            return createSuccessResponse({
                quizzes: []
            });
        }

        // Get quiz details for all attempts
        const quizIds = [...new Set(attempts.map(a => a.quiz_id))];
        const { data: quizzes, error: quizzesError } = await supabase
            .from('quizzes')
            .select('quiz_id, quiz_name, quiz_code, created_by, due_date')
            .in('quiz_id', quizIds);

        if (quizzesError) {
            console.error('Quizzes fetch error:', quizzesError);
            return createErrorResponse(500, 'Failed to fetch quiz details');
        }

        // Get teacher details for all quizzes
        const teacherIds = [...new Set(quizzes.map(q => q.created_by))];
        const { data: teachers, error: teachersError } = await supabase
            .from('teacher_login')
            .select('id, username')
            .in('id', teacherIds);

        if (teachersError) {
            console.error('Teachers fetch error:', teachersError);
            return createErrorResponse(500, 'Failed to fetch teacher details');
        }

        // Create lookup maps for efficient joining
        const quizMap = new Map(quizzes.map(q => [q.quiz_id, q]));
        const teacherMap = new Map(teachers.map(t => [t.id, t]));

        // Combine the data
        const attemptedQuizzes = attempts.map(attempt => {
            const quiz = quizMap.get(attempt.quiz_id);
            const teacher = teacherMap.get(quiz.created_by);
            
            return {
                id: quiz.quiz_id,
                title: quiz.quiz_name,
                code: quiz.quiz_code,
                dueDate: quiz.due_date,
                teacher: {
                    id: teacher.id,
                    name: teacher.username
                },
                attempt: {
                    id: attempt.attempt_id,
                    score: attempt.score,
                    totalQuestions: attempt.total_questions,
                    attemptDate: attempt.attempt_date,
                    timeTaken: attempt.time_taken,
                    isCompleted: attempt.is_completed,
                    answers: attempt.answers
                }
            };
        });

        return createSuccessResponse({
            quizzes: attemptedQuizzes
        });

    } catch (error) {
        console.error('Attempted quizzes error:', error);
        return createErrorResponse(500, 'Internal server error', error.message);
    }
};