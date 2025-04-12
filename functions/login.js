const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

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
        // Parse request body
        const body = event.isBase64Encoded
            ? Buffer.from(event.body, 'base64').toString('utf8')
            : event.body;
        const { username, password, userType } = JSON.parse(body);

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
                body: JSON.stringify({ 
                    error: 'Database query failed',
                    details: error.message
                })
            };
        }

        if (!data) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'Invalid credentials' 
                })
            };
        }

        // Compare passwords
        const isValidPassword = await bcrypt.compare(password, data.password);
        
        if (!isValidPassword) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'Invalid credentials' 
                })
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
        console.error('Login error:', {
            name: error.name,
            message: error.message,
            code: error.code,
            stack: error.stack
        });

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Login failed',
                details: error.message
            })
        };
    }
};