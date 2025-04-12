const axios = require('axios');

exports.handler = async function(event, context) {
    const { quizCode } = event.queryStringParameters;
    
    if (!quizCode) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Quiz code is required' })
        };
    }

    try {
        const response = await axios.get(`https://quizspark-backend.onrender.com/api/quizzes/code/${quizCode}`);
        
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, OPTIONS'
            },
            body: JSON.stringify(response.data)
        };
    } catch (error) {
        return {
            statusCode: error.response?.status || 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, OPTIONS'
            },
            body: JSON.stringify({ error: error.message })
        };
    }
}; 