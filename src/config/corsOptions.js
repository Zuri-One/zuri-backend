const cors = require('cors');

const corsOptions = {
  origin: (origin, callback) => {
    // Allow any origin in development mode
    if (!origin || process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    // Whitelist specific production origins
    const allowedOrigins = [
      'https://zuri-nine-rouge.vercel.app',
      'http://localhost:3000',
    ];

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // Allow cookies
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
