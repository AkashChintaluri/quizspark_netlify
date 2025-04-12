const { Pool } = require('pg');

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    };

    try {
        console.log('Testing database connection...');
        
        // Log the database URL format (without sensitive data)
        const dbUrl = process.env.DATABASE_URL;
        console.log('Database URL check:', {
            hasUrl: !!dbUrl,
            startsWithPostgres: dbUrl?.startsWith('postgresql://'),
            includesSSL: dbUrl?.includes('sslmode=require')
        });

        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized: false
            }
        });

        // Test the connection
        const client = await pool.connect();
        console.log('Successfully connected to database');

        // Try a simple query
        const result = await client.query('SELECT NOW()');
        console.log('Successfully executed test query');

        client.release();

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Database connection successful',
                timestamp: result.rows[0].now
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
                details: error.message,
                code: error.code
            })
        };
    }
}; 