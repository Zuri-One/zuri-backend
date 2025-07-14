# ZuriHealth HMS Documentation

This directory contains the complete documentation for the ZuriHealth Hospital Management System API, built with [Docusaurus](https://docusaurus.io/).

## 📚 Documentation Structure

```
docs/
├── docs/                    # Documentation content
│   ├── api/                # API Reference
│   │   ├── auth/           # Authentication endpoints
│   │   ├── patients/       # Patient management
│   │   ├── doctors/        # Doctor management
│   │   ├── appointments/   # Appointment system
│   │   ├── lab/           # Laboratory operations
│   │   ├── pharmacy/      # Pharmacy management
│   │   ├── billing/       # Billing & payments
│   │   └── ...            # Other API modules
│   ├── guides/            # Integration guides
│   │   ├── getting-started.md
│   │   ├── authentication.md
│   │   ├── integration/   # Workflow guides
│   │   └── best-practices/
│   └── deployment/        # Deployment guides
├── src/                   # Docusaurus source files
├── static/               # Static assets
├── docusaurus.config.ts  # Docusaurus configuration
├── sidebars.ts          # Sidebar configuration
└── package.json         # Dependencies
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18.x or higher
- npm or yarn

### Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm start
   ```
   
   This starts a local development server at `http://localhost:3001` with hot reloading.

3. **Build for production:**
   ```bash
   npm run build
   ```
   
   This generates static content into the `build` directory.

### Integration with Main API

The documentation is integrated with the main ZuriHealth HMS API server:

1. **From project root, build documentation:**
   ```bash
   ./scripts/build-docs.sh
   ```

2. **Start the main server:**
   ```bash
   npm start
   ```

3. **Access documentation:**
   - Documentation: `http://localhost:3000/docs`
   - API Documentation: `http://localhost:3000/api-docs`
   - Health Check: `http://localhost:3000/docs-health`

## 📖 Documentation Content

### API Reference
Complete documentation for all API endpoints including:
- Authentication and authorization
- Patient management
- Doctor profiles and availability
- Appointment scheduling
- Medical records
- Laboratory operations
- Pharmacy management
- Billing and payments
- Video consultations
- Triage system

### Integration Guides
Step-by-step guides for:
- Getting started with the API
- Authentication flows
- Common workflows
- Role-based integrations
- Best practices

### Deployment Guides
Comprehensive deployment documentation:
- EC2 deployment
- Environment setup
- Database configuration
- SSL setup
- Monitoring and maintenance

## 🛠️ Development

### Adding New Documentation

1. **Create new markdown files** in the appropriate directory under `docs/`

2. **Update sidebars.ts** to include new pages in navigation

3. **Use Docusaurus features:**
   ```markdown
   # Page Title
   
   ## Code Examples
   ```javascript
   const api = new ZuriHealthAPI();
   ```
   
   ## API Endpoints
   ```http
   GET /api/v1/patients/all
   Authorization: Bearer <token>
   ```
   
   ## Admonitions
   :::tip
   This is a helpful tip!
   :::
   
   :::warning
   This is a warning!
   :::
   ```

### Customization

#### Styling
- Edit `src/css/custom.css` for custom styles
- Modify theme colors in `docusaurus.config.ts`

#### Components
- Add custom React components in `src/components/`
- Use MDX for interactive documentation

#### Configuration
- Main config: `docusaurus.config.ts`
- Sidebar config: `sidebars.ts`
- Navigation: Update navbar items in config

## 🔧 Available Scripts

### Documentation Scripts
```bash
# Start development server
npm start

# Build for production
npm run build

# Serve built site locally
npm run serve

# Clear cache
npm run clear

# Deploy to GitHub Pages
npm run deploy
```

### Main Project Scripts
```bash
# Install documentation dependencies
npm run docs:install

# Start documentation in development mode
npm run docs:dev

# Build documentation for production
npm run docs:build

# Build everything (API + docs)
npm run build:all

# Run both API and docs in development
npm run dev:with-docs
```

## 🚀 Deployment

### Production Build

1. **Build documentation:**
   ```bash
   cd docs
   npm run build
   ```

2. **Verify build:**
   ```bash
   ls -la build/
   # Should contain index.html and assets
   ```

3. **The built files are served by the main Express server** at `/docs`

### EC2 Deployment

The documentation is automatically deployed with the main application:

1. **Clone repository on EC2**
2. **Run build script:**
   ```bash
   ./scripts/build-docs.sh
   ```
3. **Start main server:**
   ```bash
   pm2 start ecosystem.config.js
   ```

### Nginx Configuration

The documentation is served through the main application, so no additional Nginx configuration is needed. The main server handles:
- `/docs` - Documentation site
- `/api-docs` - Swagger UI
- `/api/v1/*` - API endpoints

## 📊 Features

### Built-in Features
- **Search**: Full-text search across all documentation
- **Dark Mode**: Automatic dark/light theme switching
- **Mobile Responsive**: Optimized for all devices
- **Fast**: Static site generation for optimal performance
- **SEO Friendly**: Proper meta tags and structured data

### Custom Features
- **API Integration**: Links to live API documentation
- **Code Examples**: Interactive code samples
- **Multi-language Support**: Ready for internationalization
- **Version Control**: Documentation versioning support

## 🔍 Search

The documentation includes built-in search functionality:
- Full-text search across all pages
- Keyboard shortcut: `Ctrl+K` or `Cmd+K`
- Search results include page context

## 🌐 Accessibility

The documentation follows accessibility best practices:
- Semantic HTML structure
- Keyboard navigation support
- Screen reader compatibility
- High contrast color schemes
- Alt text for images

## 📱 Mobile Support

Fully responsive design with:
- Mobile-optimized navigation
- Touch-friendly interface
- Readable typography on small screens
- Fast loading on mobile networks

## 🔧 Troubleshooting

### Common Issues

#### Build Fails
```bash
# Clear cache and reinstall
npm run clear
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### Development Server Won't Start
```bash
# Check port availability
lsof -i :3001

# Use different port
npm start -- --port 3002
```

#### Documentation Not Loading in Main App
```bash
# Verify build exists
ls -la build/

# Rebuild documentation
npm run build

# Restart main server
pm2 restart zurihealth-hms
```

### Getting Help

- **Documentation Issues**: Check the build logs
- **Content Issues**: Review markdown syntax
- **Integration Issues**: Check main server logs
- **Performance Issues**: Analyze bundle size

## 🤝 Contributing

### Adding Content

1. **Fork the repository**
2. **Create a feature branch**
3. **Add or update documentation**
4. **Test locally:**
   ```bash
   npm start
   ```
5. **Build and verify:**
   ```bash
   npm run build
   ```
6. **Submit a pull request**

### Style Guide

- Use clear, concise language
- Include code examples for all endpoints
- Add screenshots for UI-related content
- Follow existing file naming conventions
- Update navigation when adding new sections

## 📄 License

This documentation is part of the ZuriHealth HMS project and follows the same license terms.

## 🆘 Support

For documentation-related issues:
- **Technical Issues**: Check troubleshooting section
- **Content Questions**: Review existing documentation
- **Feature Requests**: Submit an issue
- **General Support**: Contact the development team

---

**Built with ❤️ using [Docusaurus](https://docusaurus.io/)**