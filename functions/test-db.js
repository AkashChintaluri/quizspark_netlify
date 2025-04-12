const { Pool } = require('pg');

const getDbConfig = () => {
    try {
        const connectionString = process.env.DATABASE_URL;
        
        // Parse the connection string to extract host
        const match = connectionString.match(/@([^:]+):/);
        const host = match ? match[1] : null;
        
        console.log('Database connection check:', {
            hasConnectionString: !!connectionString,
            host: host || 'not found',
            hasSSL: connectionString.includes('sslmode=require')
        });

        // Try direct connection parameters if URL parsing fails
        if (!host) {
            console.log('Falling back to direct connection parameters');
            return {
                host: 'db.hntrpejpiboxnlbzrbbc.supabase.co',
                port: 5432,
                database: 'postgres',
                user: 'postgres',
                password: process.env.DB_PASSWORD || 'CpI8sfi8CuIvp5Kw',
                ssl: {
                    rejectUnauthorized: false
                }
            };
        }

        return {
            connectionString,
            ssl: {
                rejectUnauthorized: false
            }
        };
    } catch (error) {
        console.error('Error in getDbConfig:', error);
        throw error;
    }
};

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    };

    let client;
    try {
        console.log('Testing database connection...');
        
        const config = getDbConfig();
        console.log('Creating pool with config type:', typeof config);
        
        const pool = new Pool(config);
        console.log('Pool created successfully');

        client = await pool.connect();
        console.log('Successfully connected to database');

        const result = await client.query('SELECT NOW()');
        console.log('Successfully executed test query');

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
            code: error.code,
            stack: error.stack
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
    } finally {
        if (client) {
            client.release();
        }
    }
}; 