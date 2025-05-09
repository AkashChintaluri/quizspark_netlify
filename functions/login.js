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

        // Query the appropriate table based on userType
        const table = `${userType}_login`;
        const { data, error } = await supabase
            .from(table)
            .select('id, username, email, password')
            .eq('username', username)
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('Database query error:', error);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Database query failed', details: error.message })
            };
        }

        if (!data) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'Invalid credentials' })
            };
        }

        // Compare passwords directly
        if (password !== data.password) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'Invalid credentials' })
            };
        }

        // Return success response
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                user: {
                    id: data.id,
                    username: data.username,
                    email: data.email,
                    userType
                }
            })
        };

    } catch (error) {
        console.error('Login error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error', details: error.message })
        };
    }
};