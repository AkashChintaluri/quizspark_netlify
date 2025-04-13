const { createClient } = require('@supabase/supabase-js');
const { 
    supabase, 
    handleCors, 
    createErrorResponse, 
    createSuccessResponse 
} = require('./supabase-client');

// Initialize Supabase client
const supabaseUrl = 'https://hntrpejpiboxnlbzrbbc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhudHJwZWpwaWJveG5sYnpyYmJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzI0MDg1MywiZXhwIjoyMDU4ODE2ODUzfQ.1ZCETVyCJaxcC-fqabKqrjWUESRagY9x0TcOgNTp0tI';
const supabaseClient = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event) => {
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

        // Query the appropriate table based on userType
        const table = `${userType}_login`;
        const { data, error } = await supabaseClient
            .from(table)
            .select('id, username, email, password')
            .eq('username', username)
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('Database query error:', error);
            return createErrorResponse(500, 'Database query failed', error.message);
        }

        if (!data) {
            return createErrorResponse(401, 'Invalid credentials');
        }

        // Compare passwords directly
        if (password !== data.password) {
            return createErrorResponse(401, 'Invalid credentials');
        }

        // Return success response
        return createSuccessResponse({
            user: {
                id: data.id,
                username: data.username,
                email: data.email,
                userType
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        return createErrorResponse(500, 'Internal server error', error.message);
    }
};