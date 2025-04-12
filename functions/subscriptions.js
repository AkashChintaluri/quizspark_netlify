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

        if (!student_id) {
            return createErrorResponse(400, 'Student ID is required');
        }

        // Fetch subscriptions with teacher details
        const { data: subscriptions, error: subscriptionsError } = await supabase
            .from('subscriptions')
            .select(`
                student_id,
                teacher_id,
                subscribed_at,
                teacher_login (
                    id,
                    username,
                    email
                )
            `)
            .eq('student_id', student_id);

        if (subscriptionsError) {
            console.error('Error fetching subscriptions:', subscriptionsError);
            return createErrorResponse(500, 'Failed to fetch subscriptions');
        }

        // Transform the data to match the expected format
        const formattedSubscriptions = subscriptions.map(sub => ({
            student_id: sub.student_id,
            teacher_id: sub.teacher_id,
            subscribed_at: sub.subscribed_at,
            teacher: {
                id: sub.teacher_login.id,
                username: sub.teacher_login.username,
                email: sub.teacher_login.email
            }
        }));

        return createSuccessResponse({
            subscriptions: formattedSubscriptions
        });
    } catch (error) {
        console.error('Error in subscriptions handler:', error);
        return createErrorResponse(500, 'Internal server error');
    }
}