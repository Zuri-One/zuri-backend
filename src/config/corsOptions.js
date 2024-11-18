app.use(cors({
  origin: '*', // Allow all origins
  credentials: false, // Credentials cannot be used with '*' as origin
  optionsSuccessStatus: 200,
}));
