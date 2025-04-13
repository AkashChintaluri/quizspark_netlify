const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://hntrpejpiboxnlbzrbbc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhudHJwZWpwaWJveG5sYnpyYmJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzI0MDg1MywiZXhwIjoyMDU4ODE2ODUzfQ.1ZCETVyCJaxcC-fqabKqrjWUESRagY9x0TcOgNTp0tI';
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers
        };
    }

    try {
        const { username, password, userType } = JSON.parse(event.body);

        // Validate input
        if (!username || !password || !userType) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required fields' })
            };
        }

        const validTypes = ['student', 'teacher'];
        if (!validTypes.includes(userType)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid user type' })
            };
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
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Failed to check username availability' })
            };
        }

        if (existingUser) {
            return {
                statusCode: 409,
                headers,
                body: JSON.stringify({ error: 'Username already exists' })
            };
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
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Failed to create user', details: error.message })
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'User created successfully',
                user: {
                    ...data,
                    userType
                }
            })
        };

    } catch (error) {
        console.error('Signup error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error', details: error.message })
        };
    }
};