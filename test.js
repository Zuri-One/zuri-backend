require('dotenv').config();
console.log('WHEREBY_API_KEY:', process.env.WHEREBY_API_KEY ? 'Configured' : 'Missing');