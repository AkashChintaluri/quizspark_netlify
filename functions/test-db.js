const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://hntrpejpiboxnlbzrbbc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhudHJwZWpwaWJveG5sYnpyYmJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzI0MDg1MywiZXhwIjoyMDU4ODE2ODUzfQ.1ZCETVyCJaxcC-fqabKqrjWUESRagY9x0TcOgNTp0tI';
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    };

    try {
        console.log('Testing Supabase connection...');
        
        // Test the connection by fetching system time
        const { data, error } = await supabase
            .from('student_login')
            .select('count(*)')
            .single();

        if (error) {
            throw error;
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Supabase connection successful',
                data
            })
        };
    } catch (error) {
        console.error('Database test error:', {
            name: error.name,
            message: error.message,
            code: error.code
        });

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Database connection failed',
                details: error.message
            })
        };
    }
}; 