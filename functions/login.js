const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Parse database URL and ensure SSL is properly configured
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

// Create pool with error logging
let pool;
try {
    const config = getDbConfig();
    console.log('Attempting to create pool with config type:', typeof config);
    pool = new Pool(config);
    console.log('Pool created successfully');
} catch (error) {
    console.error('Error creating pool:', error);
    throw error;
}

// Add error handler for pool
pool.on('error', (err) => {
    console.error('Unexpected error on idle client:', err);
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

        console.log('Attempting database connection...');
        client = await pool.connect();
        console.log('Database connection successful');

        // Query user table
        const table = `${userType}_login`;
        const query = `
            SELECT id, username, email, password
            FROM ${table}
            WHERE username = $1
        `;
        
        console.log('Executing query for user:', username);
        const result = await client.query(query, [username]);
        console.log('Query executed successfully');

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
            name: error.name,
            message: error.message,
            code: error.code,
            stack: error.stack
        });

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
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