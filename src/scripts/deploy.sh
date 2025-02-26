#!/bin/bash

# Zuri Backend Deployment Script
KEY_PATH="$HOME/downloads/GCP_shared_key"
if [ ! -f "$KEY_PATH" ] && [ -f "$HOME/downloads/GCP_shared_key (1)" ]; then
    KEY_PATH="$HOME/downloads/GCP_shared_key (1)"
fi

GCP_IP="34.1.218.136"
GCP_USER="ubuntu"
APP_DIR="/var/www/zuri-backend"
REPO_URL="https://github.com/Zuri-One/zuri-backend.git"
BRANCH="main"

echo "===== Deploying Zuri Backend ====="
echo

# Create a temporary directory for the repository
TEMP_DIR=$(mktemp -d)
echo "Cloning repository to temporary directory..."

# Clone the repository
git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$TEMP_DIR"
cd "$TEMP_DIR"

echo "Deploying to GCP instance at $GCP_IP..."

# Copy files to the GCP instance using SSH
echo "Transferring files to GCP instance..."
rsync -avz -e "ssh -i $KEY_PATH -o StrictHostKeyChecking=no" \
    --exclude ".git" \
    --exclude "node_modules" \
    --exclude ".env*" \
    . "$GCP_USER@$GCP_IP:$APP_DIR"

# SSH into GCP to run installation and restart services
echo "Running installation on GCP instance..."
ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no "$GCP_USER@$GCP_IP" << 'ENDSSH'
    cd /var/www/zuri-backend
    
    # Install dependencies
    echo "Installing Node.js dependencies..."
    npm install --production
    
    # Restart application with PM2
    echo "Starting/restarting application with PM2..."
    pm2 restart zuri-backend || pm2 start server.js --name zuri-backend
    
    # Save PM2 configuration to restart on reboot
    pm2 save
ENDSSH

# Clean up the temporary directory
rm -rf "$TEMP_DIR"

echo "Deployment process completed successfully!"