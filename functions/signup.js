const { 
    supabase, 
    handleCors, 
    createErrorResponse, 
    createSuccessResponse 
} = require('./supabase-client');

exports.handler = async (event) => {
    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return handleCors();
    }

    try {
        const { username, password, userType } = JSON.parse(event.body);

        // Validate input
        if (!username || !password || !userType) {
            return createErrorResponse(400, 'Missing required fields');
        }

        const validTypes = ['student', 'teacher'];
        if (!validTypes.includes(userType)) {
            return createErrorResponse(400, 'Invalid user type');
        }

        // Check if username already exists
        const table = `${userType}_login`;
        const { data: existingUser, error: checkError } = await supabase
            .from(table)
            .select('username')
            .eq('username', username)
            .maybeSingle();

        if (checkError) {
            console.error('Database check error:', checkError);
            return createErrorResponse(500, 'Failed to check username availability');
        }

        if (existingUser) {
            return createErrorResponse(409, 'Username already exists');
        }

        // Insert new user with plain text password
        const { data, error } = await supabase
            .from(table)
            .insert([
                {
                    username,
                    password: password
                }
            ])
            .select('id, username, email')
            .single();

        if (error) {
            console.error('Signup error:', error);
            return createErrorResponse(500, 'Failed to create user', error.message);
        }

        return createSuccessResponse({
            message: 'User created successfully',
            user: {
                ...data,
                userType
            }
        });

    } catch (error) {
        console.error('Signup error:', error);
        return createErrorResponse(500, 'Internal server error', error.message);
    }
};