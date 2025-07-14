#!/bin/bash

# ZuriHealth HMS Documentation Build Script
# This script builds the Docusaurus documentation for production

set -e  # Exit on any error

echo "🏥 ZuriHealth HMS Documentation Build Script"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if docs directory exists
if [ ! -d "docs" ]; then
    print_error "docs directory not found. Please ensure Docusaurus is properly set up."
    exit 1
fi

print_status "Starting documentation build process..."

# Step 1: Install documentation dependencies
print_status "Installing documentation dependencies..."
cd docs

if [ ! -f "package.json" ]; then
    print_error "docs/package.json not found. Docusaurus may not be properly initialized."
    exit 1
fi

# Install dependencies
npm install
if [ $? -eq 0 ]; then
    print_success "Documentation dependencies installed successfully"
else
    print_error "Failed to install documentation dependencies"
    exit 1
fi

# Step 2: Build the documentation
print_status "Building documentation..."
npm run build

if [ $? -eq 0 ]; then
    print_success "Documentation built successfully"
else
    print_error "Documentation build failed"
    exit 1
fi

# Step 3: Verify build output
if [ -d "build" ] && [ -f "build/index.html" ]; then
    print_success "Build verification passed - index.html found"
else
    print_error "Build verification failed - build output incomplete"
    exit 1
fi

# Step 4: Get build statistics
BUILD_SIZE=$(du -sh build | cut -f1)
FILE_COUNT=$(find build -type f | wc -l)

print_success "Documentation build completed!"
echo ""
echo "📊 Build Statistics:"
echo "   📁 Build size: $BUILD_SIZE"
echo "   📄 Total files: $FILE_COUNT"
echo "   📍 Build location: $(pwd)/build"

# Step 5: Return to project root
cd ..

# Step 6: Install main project dependencies if needed
print_status "Checking main project dependencies..."
if [ ! -d "node_modules" ]; then
    print_warning "Main project dependencies not found. Installing..."
    npm install
    if [ $? -eq 0 ]; then
        print_success "Main project dependencies installed"
    else
        print_error "Failed to install main project dependencies"
        exit 1
    fi
fi

echo ""
print_success "🎉 Documentation build process completed successfully!"
echo ""
echo "📋 Next Steps:"
echo "   1. Start your server: npm start"
echo "   2. Access documentation at: http://your-server.com/docs"
echo "   3. Access API docs at: http://your-server.com/api-docs"
echo ""
echo "🔧 Development:"
echo "   • Run 'npm run docs:dev' for development mode"
echo "   • Run 'npm run dev:with-docs' for both API and docs in dev mode"
echo ""
echo "🚀 Deployment:"
echo "   • The built documentation is ready for production"
echo "   • Ensure your server serves static files from docs/build"
echo "   • Configure your reverse proxy (nginx) if needed"

# Create a deployment info file
cat > docs-build-info.json << EOF
{
  "buildDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "buildSize": "$BUILD_SIZE",
  "fileCount": $FILE_COUNT,
  "nodeVersion": "$(node --version)",
  "npmVersion": "$(npm --version)",
  "buildPath": "docs/build",
  "status": "success"
}
EOF

print_success "Build information saved to docs-build-info.json"