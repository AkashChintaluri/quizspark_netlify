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
        const { student_id } = event.queryStringParameters || {};

        // Validate input
        if (!student_id) {
            return createErrorResponse(400, 'student_id is required');
        }

        // Get all attempted quizzes for the student
        const { data: attempts, error } = await supabase
            .from('quiz_attempts')
            .select(`
                attempt_id,
                score,
                total_questions,
                attempt_date,
                answers,
                is_completed,
                quiz_id,
                user_id
            `)
            .eq('user_id', student_id)
            .eq('is_completed', true)
            .order('attempt_date', { ascending: false });

        if (error) {
            console.error('Attempted quizzes fetch error:', error);
            return createErrorResponse(500, 'Failed to fetch attempted quizzes');
        }

        // Get quiz details
        const quizIds = attempts.map(a => a.quiz_id);
        const { data: quizzes, error: quizError } = await supabase
            .from('quizzes')
            .select(`
                quiz_id,
                quiz_name,
                quiz_code,
                created_by,
                due_date
            `)
            .in('quiz_id', quizIds);

        if (quizError) {
            console.error('Quiz fetch error:', quizError);
            return createErrorResponse(500, 'Failed to fetch quiz details');
        }

        // Get teacher details
        const teacherIds = [...new Set(quizzes.map(q => q.created_by))];
        const { data: teachers, error: teacherError } = await supabase
            .from('teacher_login')
            .select('id, username, email')
            .in('id', teacherIds);

        if (teacherError) {
            console.error('Teacher fetch error:', teacherError);
            return createErrorResponse(500, 'Failed to fetch teacher details');
        }

        // Create lookup maps
        const quizMap = new Map(quizzes.map(q => [q.quiz_id, q]));
        const teacherMap = new Map(teachers.map(t => [t.id, t]));

        return createSuccessResponse({
            quizzes: attempts.map(attempt => {
                const quiz = quizMap.get(attempt.quiz_id);
                const teacher = teacherMap.get(quiz.created_by);
                return {
                    attempt_id: attempt.attempt_id,
                    score: attempt.score,
                    total_questions: attempt.total_questions,
                    completed_at: attempt.attempt_date,
                    is_completed: attempt.is_completed,
                    quiz: {
                        id: quiz.quiz_id,
                        title: quiz.quiz_name,
                        code: quiz.quiz_code,
                        due_date: quiz.due_date,
                        teacher: {
                            name: teacher.username,
                            email: teacher.email
                        }
                    }
                };
            })
        });

    } catch (error) {
        console.error('Get attempted quizzes error:', error);
        return createErrorResponse(500, 'Internal server error', error.message);
    }
};