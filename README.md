# Hospital Management System (HMS) Backend

A comprehensive backend system for managing hospital operations including patient care, appointments, medical records, billing, and more.

- [API Documentation Link](https://zuri-8f5l.onrender.com/api-docs/)

## 📚 Documentation

### Complete Documentation Site
Comprehensive documentation is available at `/docs` when running the server, including:
- **API Reference**: Complete endpoint documentation
- **Integration Guides**: Step-by-step implementation guides
- **Deployment Guides**: Production deployment instructions
- **Best Practices**: Security and performance recommendations

### API Documentation
Interactive API documentation is available at `/api-docs` (Swagger UI) when running the server.

### Quick Access
- **Documentation**: `http://your-server.com/docs`
- **API Reference**: `http://your-server.com/api-docs`
- **Health Check**: `http://your-server.com/health`

Some key endpoints:

- Authentication: `/api/v1/auth/*`
- Patients: `/api/v1/patients/*`
- Doctors: `/api/v1/doctors/*`
- Appointments: `/api/v1/appointments/*`
- Medical Records: `/api/v1/medical-records/*`
- Prescriptions: `/api/v1/medications/*`
- Laboratory: `/api/v1/labs/*`
- Billing: `/api/v1/billing/*`

## 🚀 Features

- **User Management**

  - Multi-role authentication (Admin, Doctor, Nurse, Patient, etc.)
  - Role-based access control
  - Email verification
  - 2FA support

- **Patient Care**

  - Electronic Medical Records (EMR)
  - Patient history tracking
  - Appointment management
  - Prescription management
  - Test results management

- **Clinical Operations**

  - Triage system
  - Consultation queue management
  - Department management
  - Staff management
  - Emergency handling

- **Laboratory & Pharmacy**

  - Lab test management
  - Test result tracking
  - Medication inventory
  - Prescription dispensing
  - Critical value alerts

- **Administrative**
  - Billing and payments
  - Department management
  - Staff scheduling
  - Resource allocation
  - Analytics and reporting

## 🛠️ Tech Stack

- Node.js
- Express.js
- PostgreSQL with Sequelize ORM
- JSON Web Tokens (JWT)
- Swagger/OpenAPI Documentation
- Jest for Testing

## 📋 Prerequisites

- Node.js 16.x or higher
- PostgreSQL 13.x or higher
- npm or yarn package manager

## ⚙️ Quick Setup

### Automated Setup (Recommended)
```bash
git clone https://github.com/yourusername/hms-backend.git
cd hms-backend
./scripts/setup-docs.sh
```

This script will:
- Install all dependencies (API + Documentation)
- Build the documentation
- Set up required directories
- Provide next steps guidance

### Manual Setup

1. **Clone and install:**
```bash
git clone https://github.com/yourusername/hms-backend.git
cd hms-backend
npm install
```

2. **Setup documentation:**
```bash
npm run docs:install
npm run docs:build
```

3. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Setup database:**
```bash
npm run migrate
```

5. **Start development:**
```bash
# API only
npm run dev

# API + Documentation (recommended)
npm run dev:with-docs
```

## 📖 Available Scripts

### Main Application
```bash
npm start              # Start production server
npm run dev            # Start development server
npm run migrate        # Run database migrations
```

### Documentation
```bash
npm run docs:install   # Install documentation dependencies
npm run docs:dev       # Start documentation development server
npm run docs:build     # Build documentation for production
npm run dev:with-docs  # Start both API and docs in development
./scripts/build-docs.sh # Complete documentation build script
```

## 🚀 Production Deployment

### EC2 Deployment (Recommended)

For production deployment on EC2 with integrated documentation:

1. **Quick deployment:**
```bash
# On your EC2 instance
git clone <your-repo>
cd zuri-backend
./scripts/setup-docs.sh
./scripts/build-docs.sh
```

2. **Access your application:**
- API: `https://your-domain.com/api/v1`
- Documentation: `https://your-domain.com/docs`
- API Docs: `https://your-domain.com/api-docs`

See [EC2 Deployment Guide](./docs/docs/deployment/ec2-deployment.md) for detailed instructions.

### Render Deployment

### Prerequisites

- A Render account
- A PostgreSQL database (can be provisioned on Render)

### Setup Steps

1. Create a new Web Service on Render:

   - Connect your GitHub repository
   - Choose the branch to deploy
   - Select "Node" as the runtime

2. Configure Environment Variables:

   - Add all required environment variables in Render's dashboard
   - Make sure to add the Render-specific PostgreSQL connection string

3. Build and Start Commands:

   - Build Command: `npm install`
   - Start Command: `npm start`

4. Auto-Deploy Settings:
   - Enable auto-deploy for your selected branch
   - Configure branch deploy settings if needed

### Environment Variables for Render

Configure these in Render's dashboard:

```env
NODE_ENV=production
PORT=10000
DATABASE_URL=${RENDER_DATABASE_URL}  # Automatically provided by Render
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=24h
PAYSTACK_SECRET_KEY=your_paystack_key

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Video Conferencing
ZOOM_API_KEY=your_zoom_key
ZOOM_API_SECRET=your_zoom_secret
WHEREBY_API_KEY=your_whereby_key
```

### Database Migration on Render

Database migrations will run automatically during deployment if configured in the build command:

```bash
npm install && npm run migrate
```

### Monitoring on Render

- View logs in Render dashboard
- Set up alerts for application errors
- Monitor application metrics

## 📁 Project Structure

```
src/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── middleware/      # Custom middleware
├── models/          # Database models
├── routes/          # API routes
│   └── v1/         # API version 1
├── utils/          # Utility functions
├── services/       # Business logic
├── validations/    # Request validation schemas
└── app.js         # Application entry point
```

## 🔐 Authentication

The system uses JWT tokens for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_token>
```

## 🧪 Testing

Run tests:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

## 📈 Health Checks

The application includes a health check endpoint for Render:

- Health Check: `/health`

## 🔐 Security Features

- CORS protection
- Helmet security headers
- Rate limiting
- Input validation
- SQL injection protection
- XSS protection

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🙏 Acknowledgments

- Thanks to all contributors
- Inspired by modern healthcare needs
- Built with Node.js and Express.js community tools

## Team

- [Isaac Wambiri](https://www.linkedin.com/in/isaac-wambiri-8277a3237/) - Backend Developer
- [Elizabeth Odhiambo](https://www.linkedin.com/in/elizabethodhiambo/) - Frontend Developer
- [Brian Mugo](https://www.linkedin.com/in/briansmugo/) - UI/UX Designer
