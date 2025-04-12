const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
}

// Create and export the Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Common headers for all responses
const commonHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
};

// Helper function to handle CORS preflight requests
const handleCors = () => ({
    statusCode: 200,
    headers: commonHeaders
});

// Helper function to create error response
const createErrorResponse = (statusCode, message, details = null) => ({
    statusCode,
    headers: commonHeaders,
    body: JSON.stringify({
        success: false,
        error: message,
        ...(details && { details })
    })
});

// Helper function to create success response
const createSuccessResponse = (data) => ({
    statusCode: 200,
    headers: commonHeaders,
    body: JSON.stringify({
        success: true,
        ...data
    })
});

module.exports = {
    supabase,
    commonHeaders,
    handleCors,
    createErrorResponse,
    createSuccessResponse
}; 