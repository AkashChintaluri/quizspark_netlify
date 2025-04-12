import { supabase, handleCors, createErrorResponse, createSuccessResponse } from './supabase-client';

export async function handler(event) {
    if (event.httpMethod === 'OPTIONS') {
        return handleCors();
    }

    if (event.httpMethod !== 'GET') {
        return createErrorResponse(405, 'Method not allowed');
    }

    try {
        const { student_id } = event.queryStringParameters;

        // Fetch all teachers
        const { data: teachers, error: teachersError } = await supabase
            .from('teacher_login')
            .select(`
                id,
                username,
                email
            `)
            .order('username');

        if (teachersError) {
            console.error('Error fetching teachers:', teachersError);
            return createErrorResponse(500, 'Failed to fetch teachers');
        }

        // If student_id is provided, fetch their subscriptions
        let subscriptions = new Set();
        if (student_id) {
            const { data: studentSubscriptions, error: subscriptionsError } = await supabase
                .from('subscriptions')
                .select('teacher_id')
                .eq('student_id', student_id);

            if (subscriptionsError) {
                console.error('Error fetching subscriptions:', subscriptionsError);
                return createErrorResponse(500, 'Failed to fetch subscriptions');
            }

            subscriptions = new Set(studentSubscriptions.map(sub => sub.teacher_id));
        }

        // Format the response
        const formattedTeachers = teachers.map(teacher => ({
            id: teacher.id,
            username: teacher.username,
            email: teacher.email,
            is_subscribed: subscriptions.has(teacher.id)
        }));

        return createSuccessResponse({
            teachers: formattedTeachers
        });
    } catch (error) {
        console.error('Error in teachers handler:', error);
        return createErrorResponse(500, 'Internal server error');
    }
}