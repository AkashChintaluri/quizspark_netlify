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

        if (!student_id) {
            return createErrorResponse(400, 'Student ID is required');
        }

        // Get teacher subscriptions
        const { data: subscriptions, error: subError } = await supabase
            .from('teacher_subscriptions')
            .select('teacher_id')
            .eq('student_id', student_id);

        if (subError) {
            console.error('Error fetching subscriptions:', subError);
            return createErrorResponse(500, 'Failed to fetch teacher subscriptions');
        }

        // If no subscriptions, return empty arrays
        if (!subscriptions || subscriptions.length === 0) {
            return createSuccessResponse({ 
                upcomingQuizzes: [],
                attemptedQuizzes: []
            });
        }

        const teacherIds = subscriptions.map(sub => sub.teacher_id);

        // Get all quizzes from subscribed teachers
        const { data: quizzes, error: quizError } = await supabase
            .from('quizzes')
            .select(`
                quiz_id,
                quiz_name,
                quiz_code,
                created_by,
                questions,
                due_date,
                created_at,
                teacher_login:created_by (
                    username
                )
            `)
            .in('created_by', teacherIds)
            .gt('due_date', new Date().toISOString())
            .order('created_at', { ascending: false });

        if (quizError) {
            console.error('Error fetching quizzes:', quizError);
            return createErrorResponse(500, 'Failed to fetch quizzes');
        }

        // Get all attempts for this student
        const { data: attempts, error: attemptsError } = await supabase
            .from('quiz_attempts')
            .select('*')
            .eq('user_id', student_id);

        if (attemptsError) {
            console.error('Error fetching attempts:', attemptsError);
            return createErrorResponse(500, 'Failed to fetch quiz attempts');
        }

        // Create a map of quiz_id to attempt
        const attemptMap = new Map();
        attempts?.forEach(attempt => {
            attemptMap.set(attempt.quiz_id, attempt);
        });

        // Transform quizzes and separate into upcoming and attempted
        const transformedQuizzes = (quizzes || []).map(quiz => ({
            quiz_id: quiz.quiz_id,
            quiz_name: quiz.quiz_name,
            quiz_code: quiz.quiz_code,
            created_by: quiz.created_by,
            questions: quiz.questions,
            due_date: quiz.due_date,
            created_at: quiz.created_at,
            teacher_login: {
                username: quiz.teacher_login?.username || 'Unknown Teacher'
            }
        }));

        // Separate quizzes into upcoming and attempted
        const upcomingQuizzes = transformedQuizzes.filter(quiz => !attemptMap.has(quiz.quiz_id));
        const attemptedQuizzes = transformedQuizzes.filter(quiz => attemptMap.has(quiz.quiz_id))
            .map(quiz => ({
                ...quiz,
                attempt: attemptMap.get(quiz.quiz_id)
            }));

        return createSuccessResponse({ 
            upcomingQuizzes,
            attemptedQuizzes
        });
    } catch (err) {
        console.error('Error in student-quizzes handler:', err);
        return createErrorResponse(500, 'Internal server error', err.message);
    }
}; 