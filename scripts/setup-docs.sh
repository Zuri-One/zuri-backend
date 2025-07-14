#!/bin/bash

# ZuriHealth HMS Documentation Setup Script
# This script sets up the complete Docusaurus documentation system

set -e  # Exit on any error

echo "🏥 ZuriHealth HMS Documentation Setup"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root directory."
    exit 1
fi

print_status "Starting ZuriHealth HMS documentation setup..."

# Step 1: Install main project dependencies
print_status "Installing main project dependencies..."
npm install
if [ $? -eq 0 ]; then
    print_success "Main project dependencies installed"
else
    print_error "Failed to install main project dependencies"
    exit 1
fi

# Step 2: Check if docs directory exists
if [ ! -d "docs" ]; then
    print_error "Documentation directory not found. Please ensure the docs folder exists."
    exit 1
fi

# Step 3: Install documentation dependencies
print_status "Installing documentation dependencies..."
cd docs
npm install
if [ $? -eq 0 ]; then
    print_success "Documentation dependencies installed"
else
    print_error "Failed to install documentation dependencies"
    exit 1
fi

# Step 4: Build documentation
print_status "Building documentation for production..."
npm run build
if [ $? -eq 0 ]; then
    print_success "Documentation built successfully"
else
    print_error "Documentation build failed"
    exit 1
fi

# Step 5: Return to project root
cd ..

# Step 6: Test the setup
print_status "Testing the setup..."

# Check if build directory exists
if [ -d "docs/build" ] && [ -f "docs/build/index.html" ]; then
    print_success "Documentation build verified"
else
    print_error "Documentation build verification failed"
    exit 1
fi

# Step 7: Create necessary directories
print_status "Creating necessary directories..."
mkdir -p logs
mkdir -p public/uploads/receipts
print_success "Directories created"

# Step 8: Set up environment file if it doesn't exist
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        print_status "Creating environment file from example..."
        cp .env.example .env
        print_warning "Please edit .env file with your configuration"
    else
        print_warning "No .env.example found. Please create .env file manually"
    fi
fi

# Step 9: Display setup summary
echo ""
print_success "🎉 ZuriHealth HMS Documentation Setup Complete!"
echo ""
echo "📋 Setup Summary:"
echo "   ✅ Main project dependencies installed"
echo "   ✅ Documentation dependencies installed"
echo "   ✅ Documentation built for production"
echo "   ✅ Required directories created"
echo "   ✅ Environment configuration checked"
echo ""

# Step 10: Display next steps
echo "🚀 Next Steps:"
echo ""
echo "1. Configure Environment:"
echo "   • Edit .env file with your database and API configurations"
echo "   • Set up PostgreSQL database"
echo "   • Configure SMTP settings for email"
echo ""
echo "2. Database Setup:"
echo "   • Run database migrations: npm run migrate"
echo "   • Seed initial data: npm run seed (if available)"
echo ""
echo "3. Start the Application:"
echo "   • Development mode: npm run dev"
echo "   • Production mode: npm start"
echo "   • With documentation dev server: npm run dev:with-docs"
echo ""
echo "4. Access the Application:"
echo "   • API Server: http://localhost:3000"
echo "   • Documentation: http://localhost:3000/docs"
echo "   • API Documentation: http://localhost:3000/api-docs"
echo "   • Health Check: http://localhost:3000/health"
echo ""
echo "5. Development Commands:"
echo "   • Build docs: npm run docs:build"
echo "   • Start docs dev server: npm run docs:dev"
echo "   • Build everything: npm run build:all"
echo ""

# Step 11: Display file structure
echo "📁 Project Structure:"
echo "   zuri-backend/"
echo "   ├── src/                 # API source code"
echo "   ├── docs/                # Documentation"
echo "   │   ├── docs/           # Documentation content"
echo "   │   ├── build/          # Built documentation"
echo "   │   └── src/            # Docusaurus source"
echo "   ├── scripts/            # Build and setup scripts"
echo "   ├── public/             # Static files"
echo "   └── logs/               # Application logs"
echo ""

# Step 12: Display useful commands
echo "🔧 Useful Commands:"
echo ""
echo "Documentation:"
echo "   npm run docs:dev        # Start docs development server"
echo "   npm run docs:build      # Build docs for production"
echo "   npm run docs:serve      # Serve built docs locally"
echo ""
echo "Application:"
echo "   npm start               # Start production server"
echo "   npm run dev             # Start development server"
echo "   npm run dev:with-docs   # Start both API and docs in dev mode"
echo ""
echo "Maintenance:"
echo "   ./scripts/build-docs.sh # Rebuild documentation"
echo "   npm run migrate         # Run database migrations"
echo "   pm2 start ecosystem.config.js  # Start with PM2 (production)"
echo ""

# Step 13: Check for common issues
print_status "Checking for potential issues..."

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    print_warning "Node.js version $NODE_VERSION detected. Version 16+ recommended."
else
    print_success "Node.js version check passed"
fi

# Check npm version
NPM_VERSION=$(npm --version | cut -d'.' -f1)
if [ "$NPM_VERSION" -lt 8 ]; then
    print_warning "npm version $NPM_VERSION detected. Version 8+ recommended."
else
    print_success "npm version check passed"
fi

# Check available disk space
AVAILABLE_SPACE=$(df . | tail -1 | awk '{print $4}')
if [ "$AVAILABLE_SPACE" -lt 1000000 ]; then  # Less than 1GB
    print_warning "Low disk space detected. Ensure sufficient space for logs and uploads."
else
    print_success "Disk space check passed"
fi

echo ""
print_success "Setup completed successfully! 🎉"
echo ""
print_status "For deployment instructions, see: docs/docs/deployment/"
print_status "For API documentation, see: docs/docs/api/"
print_status "For integration guides, see: docs/docs/guides/"
echo ""

# Step 14: Offer to start development server
read -p "Would you like to start the development server now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Starting development server..."
    echo "Press Ctrl+C to stop the server"
    echo ""
    npm run dev
fi