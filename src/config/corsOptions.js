const corsOptions = {
    origin: [
      'http://localhost:3000',
      'https://your-frontend-domain.vercel.app'
    ],
    credentials: true,
    optionsSuccessStatus: 200
  };
  
  module.exports = corsOptions;
  