const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Parse database URL and ensure SSL is properly configured
const getDbConfig = () => {
    const connectionString = process.env.DATABASE_URL;
    return {
        connectionString,
        ssl: {
            rejectUnauthorized: false,
            sslmode: 'require'
        },
        // Add connection timeout and retry settings
        connectionTimeoutMillis: 5000,
        query_timeout: 10000,
        statement_timeout: 10000,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionRetryAttempts: 3
    };
};

const pool = new Pool(getDbConfig());

// Add error handler for pool
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

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

    let client;
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

        // Test database connection before proceeding
        try {
            client = await pool.connect();
        } catch (dbError) {
            console.error('Database connection error:', dbError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    error: 'Database connection failed',
                    details: dbError.message
                })
            };
        }

        // Query user table
        const table = `${userType}_login`;
        const query = `
            SELECT id, username, email, password
            FROM ${table}
            WHERE username = $1
        `;
        
        const result = await client.query(query, [username]);

        if (result.rows.length === 0) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'Invalid credentials' 
                })
            };
        }

        const user = result.rows[0];
        
        // Compare passwords
        const isValidPassword = await bcrypt.compare(password, user.password);
        
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
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    userType
                }
            })
        };

    } catch (error) {
        console.error('Login error:', {
            message: error.message,
            code: error.code,
            stack: error.stack,
            details: error.detail
        });

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                details: error.message
            })
        };
    } finally {
        if (client) {
            client.release();
        }
    }
};